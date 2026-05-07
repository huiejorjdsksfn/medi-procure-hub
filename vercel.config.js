/**
 * ProcurBosse — Vercel config (converted from vercel.json)
 * EL5 MediProcure · Embu Level 5 Hospital
 */
export default {
  rewrites: [{ source: "/((?!assets/).*)", destination: "/index.html" }],
  headers: [
    {
      source: "/assets/(.*)",
      headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }]
    }
  ]
};
