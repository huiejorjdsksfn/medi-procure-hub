// PDF generation utilities using browser print API
export function printDocument(title: string, content: string) {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head>
    <title>${title}</title>
    <style>
      body{font-family:Arial,sans-serif;font-size:11px;margin:20px;color:#000}
      h1{font-size:14px;text-align:center;margin:0}
      h2{font-size:12px;text-align:center;color:#444;margin:2px 0 8px}
      table{width:100%;border-collapse:collapse;margin-top:8px}
      th,td{border:1px solid #999;padding:4px 6px;text-align:left}
      th{background:#f0f0f0;font-weight:bold}
      .header{text-align:center;border-bottom:2px solid #000;margin-bottom:10px;padding-bottom:8px}
      .meta{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin:8px 0;font-size:10px}
      .meta span{display:block}.key{font-weight:bold}
      .footer{margin-top:20px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
      .sig{border-top:1px solid #000;padding-top:4px;font-size:9px;text-align:center}
      .total{text-align:right;font-weight:bold;font-size:12px;margin-top:6px}
      @media print{body{margin:0}.no-print{display:none}}
    </style>
  </head><body>${content}
  <script>window.onload=()=>{window.print();}<\/script>
  </body></html>`);
  win.document.close();
}

export function formatKES(n: number) {
  return `KES ${Number(n || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
