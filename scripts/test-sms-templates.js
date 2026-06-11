/**
 * SMS Template Test Suite
 * EL5 MediProcure - Embu Level 5 Hospital
 * Tests all built-in SMS templates
 */

const SUPABASE_URL = "https://yvjfehnzbzjliizjvuhq.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2amZlaG56YnpqbGlpemp2dWhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwMDg0NjYsImV4cCI6MjA3NjU4NDQ2Nn0.mkDvC1s90bbRBRKYZI6nOTxEpFrGKMNmWgTENeMTSnc";

// Test recipients
const TEST_RECIPIENT = "+254720425195";

// Template definitions (matching SMSPage.tsx)
const TEMPLATES = [
  {
    key: "requisition_submitted",
    label: "Requisition Submitted",
    vars: { num: "REQ-2026-001", dept: "Pharmacy" },
    content: "[EL5 MediProcure] Requisition {{num}} submitted by {{dept}}. Status: Pending Approval."
  },
  {
    key: "requisition_approved",
    label: "Requisition Approved",
    vars: { num: "REQ-2026-001", approver: "Dr. Kimani" },
    content: "[EL5 MediProcure] ✓ Requisition {{num}} APPROVED by {{approver}}. PO will be raised shortly."
  },
  {
    key: "requisition_rejected",
    label: "Requisition Rejected",
    vars: { num: "REQ-2026-001", reason: "Budget exceeded" },
    content: "[EL5 MediProcure] ✗ Requisition {{num}} REJECTED. Reason: {{reason}}."
  },
  {
    key: "po_raised",
    label: "PO Raised",
    vars: { num: "LPO-2026-001", supplier: "MediCare Supplies Ltd", eta: "14 days" },
    content: "[EL5 MediProcure] PO {{num}} raised for {{supplier}}. Expected delivery: {{eta}}."
  },
  {
    key: "goods_received",
    label: "Goods Received",
    vars: { num: "LPO-2026-001", items: "500 units Paracetamol 500mg", grn: "GRN-2026-001" },
    content: "[EL5 MediProcure] GRN recorded for PO {{num}}. Items: {{items}}. GRN#: {{grn}}. Inventory updated."
  },
  {
    key: "low_stock_alert",
    label: "Low Stock Alert",
    vars: { item: "Surgical Gloves (L)", qty: "5", unit: "boxes", reorder: "100 boxes" },
    content: "[EL5 MediProcure] ⚠ LOW STOCK: {{item}} — {{qty}} {{unit}} remaining. Reorder: {{reorder}}. Urgent!"
  },
  {
    key: "payment_approved",
    label: "Payment Approved",
    vars: { num: "PV-2026-001", amount: "125,000.00", payee: "MediCare Supplies Ltd", date: "15/06/2026" },
    content: "[EL5 MediProcure] ✓ Payment Voucher {{num}} of KES {{amount}} APPROVED. Payee: {{payee}}. Date: {{date}}."
  },
  {
    key: "payment_processed",
    label: "Payment Processed",
    vars: { amount: "125,000.00", payee: "MediCare Supplies Ltd", num: "PV-2026-001", ref: "EFT-12345" },
    content: "[EL5 MediProcure] ✓ Payment KES {{amount}} to {{payee}} processed. Voucher: {{num}}. Ref: {{ref}}."
  },
  {
    key: "invoice_matched",
    label: "Invoice Matched",
    vars: { inv: "INV-2026-001", po: "LPO-2026-001", amount: "95,000.00" },
    content: "[EL5 MediProcure] Invoice {{inv}} matched to PO {{po}}. Amount: KES {{amount}}. Status: MATCHED."
  },
  {
    key: "budget_alert",
    label: "Budget Alert",
    vars: { dept: "Pharmacy", pct: "85", code: "BUD-2026-PH" },
    content: "[EL5 MediProcure] ⚠ BUDGET ALERT: {{dept}} has consumed {{pct}}% of budget {{code}}. CFO approval required."
  },
  {
    key: "contract_expiry",
    label: "Contract Expiry",
    vars: { num: "CON-2026-001", supplier: "PharmaKenya Ltd", date: "30/06/2026" },
    content: "[EL5 MediProcure] ⚠ Contract {{num}} with {{supplier}} expires on {{date}}. Initiate renewal."
  },
  {
    key: "welcome",
    label: "Welcome / Onboarding",
    vars: { name: "John Kamau", phone: "+254700123456" },
    content: "Welcome to EL5 MediProcure! Hello {{name}}, your account is active. IT Support: {{phone}}."
  },
  {
    key: "visitor_arrival",
    label: "Visitor Arrival",
    vars: { host_name: "Dr. Wanjiku", visitor_name: "Jane Doe", time: "10:30 AM" },
    content: "Hello {{host_name}}, your visitor {{visitor_name}} has arrived at EL5 Hospital. Time: {{time}}."
  },
  {
    key: "appointment_reminder",
    label: "Appointment Reminder",
    vars: { date: "15/06/2026", time: "2:00 PM", host: "Dr. Ochieng", dept: "Radiology" },
    content: "Reminder: Appointment at EL5 Hospital on {{date}} at {{time}} with {{host}}, {{dept}}. Bring National ID."
  },
  {
    key: "system_alert",
    label: "System Alert",
    vars: { message: "Scheduled maintenance tonight 10PM-12AM" },
    content: "[EL5 MediProcure] {{message}} — " + new Date().toLocaleDateString("en-KE")
  }
];

// Template variable renderer
function renderTemplate(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || `{{${key}}}`);
}

async function testTemplate(template, testNumber = TEST_RECIPIENT) {
  const rendered = renderTemplate(template.content, template.vars);
  
  console.log(`\n── ${template.label} ──`);
  console.log(`Key: ${template.key}`);
  console.log(`Vars: ${JSON.stringify(template.vars)}`);
  console.log(`Rendered: ${rendered}`);
  
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/send-sms`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": ANON_KEY },
      body: JSON.stringify({
        to: testNumber,
        message: rendered,
        channel: "sms",
        module: `template_${template.key}`
      })
    });
    const d = await r.json();
    const success = d.ok && d.sent > 0;
    console.log(`Result: ${success ? '✓ SUCCESS' : '✗ FAILED'}`);
    if (!success) console.log(`  Error: ${d.results?.[0]?.error || d.error || 'Unknown'}`);
    return success;
  } catch (e) {
    console.log(`Result: ✗ ERROR - ${e.message}`);
    return false;
  }
}

async function testDatabaseTemplates() {
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║   Testing Database-Stored SMS Templates                  ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/sms_templates?select=*&is_active=eq.true&order=category,asc`,
      { headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` } }
    );
    const templates = await r.json();
    
    if (!templates.length) {
      console.log("No active templates in database. Using built-in templates.");
      return false;
    }
    
    console.log(`\nFound ${templates.length} active templates:`);
    templates.forEach(t => {
      console.log(`  - [${t.category}] ${t.name}: ${t.content?.slice(0, 60)}...`);
    });
    
    return true;
  } catch (e) {
    console.log(`Could not fetch templates: ${e.message}`);
    return false;
  }
}

async function seedBuiltInTemplates() {
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║   Seeding Built-in Templates to Database                 ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  
  const insertPromises = TEMPLATES.map(async (t) => {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/sms_templates`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": ANON_KEY,
          "Authorization": `Bearer ${ANON_KEY}`,
          "Prefer": "resolution=merge-duplicates"
        },
        body: JSON.stringify({
          name: t.label,
          content: t.content,
          variables: Object.keys(t.vars),
          category: t.label.includes("Requisition") || t.label.includes("PO") || t.label.includes("Contract") ? "procurement" :
                    t.label.includes("Payment") || t.label.includes("Invoice") || t.label.includes("Budget") ? "finance" :
                    t.label.includes("Stock") ? "inventory" :
                    t.label.includes("Visitor") || t.label.includes("Appointment") ? "reception" : "system",
          is_active: true,
          use_count: 0
        })
      });
      return { name: t.label, ok: r.ok };
    } catch (e) {
      return { name: t.label, ok: false, error: e.message };
    }
  });
  
  const results = await Promise.all(insertPromises);
  const successCount = results.filter(r => r.ok).length;
  console.log(`\nSeeded ${successCount}/${results.length} templates`);
  return successCount;
}

async function runTemplateTests() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║   EL5 MediProcure - SMS Template Test Suite              ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log(`Test Number: ${TEST_RECIPIENT}`);
  console.log(`Time: ${new Date().toISOString()}`);
  
  // First check if database templates exist
  const hasDbTemplates = await testDatabaseTemplates();
  
  if (!hasDbTemplates) {
    console.log("\nNo database templates. Seeding built-in templates...");
    await seedBuiltInTemplates();
  }
  
  // Test each template
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║   Sending Test Messages for Each Template                ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  
  let successCount = 0;
  let failCount = 0;
  
  for (const template of TEMPLATES) {
    const success = await testTemplate(template);
    if (success) successCount++;
    else failCount++;
    
    // Small delay between tests
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║   Test Results Summary                                   ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log(`Total Templates: ${TEMPLATES.length}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Success Rate: ${Math.round((successCount / TEMPLATES.length) * 100)}%`);
  
  if (failCount > 0) {
    console.log("\n⚠️  Note: Failures may be due to:");
    console.log("  - Twilio FROM number not configured correctly");
    console.log("  - Network issues");
    console.log("  - Rate limiting");
    console.log("\nSee TWILIO_FIX_GUIDE.md for configuration fixes.");
  }
}

runTemplateTests();