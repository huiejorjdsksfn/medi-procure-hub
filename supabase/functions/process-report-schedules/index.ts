/**
 * EL5 MediProcure — process-report-schedules Edge Function v1.0
 * The actual execution engine behind PrintEnginePage's "Scheduled
 * Reports" sub-app. That UI could create/toggle/delete rows in
 * report_schedules, but nothing anywhere ever ran them — this is what
 * makes them live: invoked by pg_cron every 15 minutes, finds due
 * schedules, generates the report data, delivers it (in-app
 * notification always; email as a best-effort bonus, same reliable-
 * channel-first pattern used for form broadcasts), logs a print_jobs
 * row so it shows up in Print History too, and advances next_run_at.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(SUPABASE_URL, SERVICE_KEY);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

// Mirrors PrintEnginePage's REPORT_TYPES table map — kept in sync
// manually since this runs server-side and can't import the frontend
// constant directly.
const REPORT_TABLES: Record<string, string> = {
  requisitions: "requisitions", purchase_orders: "purchase_orders",
  goods_received: "goods_received", payment_vouchers: "payment_vouchers",
  receipt_vouchers: "receipt_vouchers", journal_vouchers: "journal_vouchers",
  suppliers: "suppliers", items: "items", contracts: "contracts",
  tenders: "tenders", budgets: "budgets", audit_log: "audit_log",
  profiles: "profiles", notifications: "notifications",
};

// Matches the 4 fixed presets PrintEnginePage's Scheduled Reports form
// offers — not a general cron parser, deliberately, since those are the
// only patterns a schedule can actually be created with from the UI.
function computeNextRun(cron: string, from: Date): Date {
  const next = new Date(from);
  switch (cron) {
    case "0 8 * * *": // Daily 8am
      next.setDate(next.getDate() + 1); next.setHours(8, 0, 0, 0);
      return next;
    case "0 7 * * 1": { // Every Monday 7am
      const d = next.getDay();
      const add = d <= 1 ? (1 - d) + 7 : (8 - d);
      next.setDate(next.getDate() + add); next.setHours(7, 0, 0, 0);
      return next;
    }
    case "0 17 * * 5": { // Every Friday 5pm
      const d = next.getDay();
      const add = d <= 5 ? (5 - d) + 7 : (12 - d);
      next.setDate(next.getDate() + add); next.setHours(17, 0, 0, 0);
      return next;
    }
    case "0 6 1 * *": // 1st of month 6am
      next.setMonth(next.getMonth() + 1, 1); next.setHours(6, 0, 0, 0);
      return next;
    default: { // Unknown pattern — fall back to +24h so it doesn't stall forever
      next.setDate(next.getDate() + 1);
      return next;
    }
  }
}

function buildReportHtml(name: string, reportType: string, rows: any[]): string {
  if (!rows.length) return `<p>No records found for this run.</p>`;
  const cols = Object.keys(rows[0]).filter(k => k !== "id").slice(0, 6);
  const esc = (v: any) => String(v ?? "—").replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));
  return `
    <table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:8px">
      <thead><tr>${cols.map(c => `<th style="background:#0a2558;color:#fff;padding:6px 8px;text-align:left;font-size:10px;text-transform:uppercase">${esc(c.replace(/_/g," "))}</th>`).join("")}</tr></thead>
      <tbody>${rows.slice(0, 25).map(r => `<tr>${cols.map(c => `<td style="padding:5px 8px;border-bottom:1px solid #e5e7eb">${esc(r[c])}</td>`).join("")}</tr>`).join("")}</tbody>
    </table>
    ${rows.length > 25 ? `<p style="font-size:11px;color:#94a3b8;margin-top:6px">+ ${rows.length - 25} more record(s) — open ${reportType} in the app for the full list.</p>` : ""}
  `;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const nowIso = new Date().toISOString();
    const { data: due, error: dueErr } = await db
      .from("report_schedules")
      .select("*")
      .eq("is_active", true)
      .or(`next_run_at.is.null,next_run_at.lte.${nowIso}`)
      .limit(10);
    if (dueErr) return new Response(JSON.stringify({ ok: false, error: dueErr.message }), { status: 500, headers: CORS });
    if (!due || due.length === 0) return new Response(JSON.stringify({ ok: true, processed: 0 }), { headers: CORS });

    const processed: { id: string; ok: boolean; rows?: number; error?: string }[] = [];

    for (const sched of due) {
      try {
        const table = REPORT_TABLES[sched.report_type] || sched.report_type;
        const { data: rows, error: rowsErr } = await db.from(table).select("*")
          .order("created_at", { ascending: false }).limit(500);
        if (rowsErr) throw rowsErr;
        const reportRows = rows || [];

        // Reliable channel: an in-app notification to whoever created the
        // schedule, always succeeds regardless of email config.
        if (sched.created_by) {
          await db.from("notifications").insert({
            user_id: sched.created_by,
            title: `Scheduled report ready: ${sched.name}`,
            message: `${reportRows.length} record(s) as of ${new Date().toLocaleString("en-KE")}.`,
            type: "report_ready", category: "reports", priority: "normal", icon: "📊",
            record_id: sched.id, record_type: "report_schedules",
            created_at: new Date().toISOString(),
          }).then(() => {}).catch(() => {});
        }

        // Best-effort email to the configured recipient list, using the
        // same real SMTP path notification-hub already has working.
        const recipients: string[] = Array.isArray(sched.recipients) ? sched.recipients : [];
        let emailOk = 0;
        if (recipients.length) {
          const html = buildReportHtml(sched.name, sched.report_type, reportRows);
          for (const email of recipients) {
            try {
              const r = await fetch(`${SUPABASE_URL}/functions/v1/notification-hub`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
                body: JSON.stringify({
                  action: "send", channel: "email", to: email,
                  subject: `Scheduled report: ${sched.name}`,
                  message: `Your scheduled "${sched.name}" report (${reportRows.length} records).`,
                  html: `<div style="font-family:Segoe UI,Arial,sans-serif"><h3>${sched.name}</h3><p>${reportRows.length} record(s) as of ${new Date().toLocaleString("en-KE")}.</p>${html}</div>`,
                }),
              });
              const d = await r.json();
              if (d?.ok) emailOk++;
            } catch { /* one recipient failing shouldn't stop the rest */ }
          }
        }

        // Log to print_jobs so this run shows up in Print History
        // alongside every other print/report generated in the app.
        await db.from("print_jobs").insert({
          job_type: "scheduled_report", reference_number: sched.name,
          template: sched.report_type, copies: 1, status: "completed",
          printed_at: new Date().toISOString(),
          metadata: { schedule_id: sched.id, rows: reportRows.length, email_sent: emailOk, recipients: recipients.length },
        }).then(() => {}).catch(() => {});

        const nextRun = computeNextRun(sched.cron, new Date());
        await db.from("report_schedules").update({
          last_run_at: new Date().toISOString(),
          next_run_at: nextRun.toISOString(),
        }).eq("id", sched.id);

        processed.push({ id: sched.id, ok: true, rows: reportRows.length });
      } catch (e: any) {
        processed.push({ id: sched.id, ok: false, error: e?.message });
        // Still push next_run_at forward so a persistently-broken schedule
        // doesn't get retried every 15 minutes forever, spamming logs.
        await db.from("report_schedules").update({
          next_run_at: computeNextRun(sched.cron, new Date()).toISOString(),
        }).eq("id", sched.id).catch(() => {});
      }
    }

    return new Response(JSON.stringify({ ok: true, processed: processed.length, details: processed }), { headers: CORS });
  } catch (e: any) {
    console.error("process-report-schedules error:", e);
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: CORS });
  }
});
