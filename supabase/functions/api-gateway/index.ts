/**
 * ProcurBosse v8.0 -- Stub (reserved for future implementation)
 * EL5 MediProcure | Embu Level 5 Hospital
 */
const cors = { "Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type" };
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  return new Response(JSON.stringify({ status:"ok", version:"8.0.0" }), { headers: { ...cors, "Content-Type":"application/json" } });
});
