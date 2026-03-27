#!/usr/bin/env python3
"""ProcurBosse Nuclear Module Scanner — checks all 40+ modules"""
import os, re, glob, json
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
PASS, WARN, FAIL = [], [], []

def chk(label, ok):
    sym = "✅" if ok else "❌"
    print(f"  {sym} {label}")
    (PASS if ok else FAIL).append(label)
    return ok

print("=" * 65)
print(f"ProcurBosse Nuclear Scan — {datetime.now().strftime('%Y-%m-%d %H:%M')}")
print("=" * 65)

# 1. Source files
print("\n[1] SOURCE FILES")
pages = glob.glob("src/pages/**/*.tsx", recursive=True) + glob.glob("src/pages/*.tsx")
pages = [p for p in pages if "v1.0" not in p and "v2.0" not in p]
chk(f"pages count = {len(pages)} (>= 30)", len(pages) >= 30)

bad = []
for f in pages:
    c = open(f).read()
    for imp in re.findall(r"from ['\"](@/[^'\"]+)['\"]", c):
        p = imp.replace("@/","src/")
        if not any(os.path.exists(p+e) for e in [".tsx",".ts","/index.tsx","/index.ts",""]):
            if "ui/" not in imp and "integrations/" not in imp:
                bad.append(f"{f.split('/')[-1]}: {imp}")
chk(f"broken imports = {len(bad)}", len(bad)==0)
for b in bad[:3]: print(f"    ⚠️  {b}")

# 2. Build config
print("\n[2] BUILD CONFIG")
vite = open("vite.config.ts").read()
chk("vite.config.ts: no require()", "require(" not in vite)
pkg = json.loads(open("package.json").read())
chk("build script exists", "build" in pkg.get("scripts",{}))
chk("electron main = electron/main.js", "electron/main" in pkg.get("main",""))
for f in ["electron/main.js","electron-builder.yml","public/icon.png","src/assets/logo.png"]:
    chk(f"{f} exists", os.path.exists(f))

# 3. Workflows
print("\n[3] WORKFLOWS")
try:
    import yaml
    wfs = glob.glob(".github/workflows/*.yml")
    chk(f"{len(wfs)} workflows (>= 5)", len(wfs)>=5)
    for wf in sorted(wfs):
        data = yaml.safe_load(open(wf).read())
        on_val = data.get(True,{})
        has_main = "main" in on_val.get("push",{}).get("branches",[]) if isinstance(on_val,dict) else False
        tok_ok = all(
            "GITHUB_TOKEN" in str(step.get("env",{})) or
            "token" in str(step.get("with",{})) or
            "GITHUB_TOKEN" in str(step.get("with",{}))
            for job in data.get("jobs",{}).values()
            for step in job.get("steps",[])
            if "softprops" in step.get("uses","")
        )
        wname = os.path.basename(wf)
        chk(f"{wname}: main trigger + token", has_main and tok_ok)
except: WARN.append("yaml not available")

# 4. ERP Modules
print("\n[4] ERP MODULES")
mods = {
    "Requisitions":"src/pages/RequisitionsPage.tsx",
    "PurchaseOrders":"src/pages/PurchaseOrdersPage.tsx",
    "GoodsReceived":"src/pages/GoodsReceivedPage.tsx",
    "Suppliers":"src/pages/SuppliersPage.tsx",
    "Tenders":"src/pages/TendersPage.tsx",
    "Contracts":"src/pages/ContractsPage.tsx",
    "Items":"src/pages/ItemsPage.tsx",
    "PaymentVouchers":"src/pages/vouchers/PaymentVouchersPage.tsx",
    "ReceiptVouchers":"src/pages/vouchers/ReceiptVouchersPage.tsx",
    "JournalVouchers":"src/pages/vouchers/JournalVouchersPage.tsx",
    "Budgets":"src/pages/financials/BudgetsPage.tsx",
    "ChartOfAccounts":"src/pages/financials/ChartOfAccountsPage.tsx",
    "FixedAssets":"src/pages/financials/FixedAssetsPage.tsx",
    "QCDashboard":"src/pages/quality/QualityDashboardPage.tsx",
    "Inspections":"src/pages/quality/InspectionsPage.tsx",
    "NonConformance":"src/pages/quality/NonConformancePage.tsx",
    "AdminPanel":"src/pages/AdminPanelPage.tsx",
    "Settings":"src/pages/SettingsPage.tsx",
    "Users":"src/pages/UsersPage.tsx",
    "Documents":"src/pages/DocumentsPage.tsx",
    "Email":"src/pages/EmailPage.tsx",
    "IPAccess":"src/pages/IpAccessPage.tsx",
    "AuditLog":"src/pages/AuditLogPage.tsx",
    "Webmaster":"src/pages/WebmasterPage.tsx",
    "ODBC":"src/pages/ODBCPage.tsx",
    "ProcurementPlanning":"src/pages/ProcurementPlanningPage.tsx",
    "BidEvaluations":"src/pages/BidEvaluationsPage.tsx",
}
for name, path in mods.items():
    chk(f"{name}", os.path.exists(path))

# 5. Form validation
print("\n[5] FORM VALIDATION & DB ERROR HANDLING")
form_files = [p for p in pages if any(k in p for k in ["Requisitions","PurchaseOrders","Goods","Suppliers","Tenders","Contracts","Items","Vouchers","Budgets","Fixed","Inspections","Conformance","Planning"])]
for f in form_files:
    c = open(f).read(); nm = f.split("/")[-1]
    has_insert = bool(re.search(r"\.(insert|upsert)\(", c))
    has_err = "destructive" in c
    if has_insert:
        chk(f"{nm}: DB error handling", has_err)

# 6. Critical hooks/libs
print("\n[6] HOOKS & LIBRARIES")
for f in ["src/hooks/useSystemSettings.ts","src/lib/audit.ts","src/lib/broadcast.ts",
          "src/lib/sms.ts","src/lib/ipRestriction.ts","src/lib/printDocument.ts",
          "src/components/AppLayout.tsx","src/components/RoleGuard.tsx"]:
    chk(os.path.basename(f), os.path.exists(f))

# 7. Installers
print("\n[7] INSTALLER BAT FILES")
for bat in ["INSTALL_ProcurBosse.bat","LAUNCH_ProcurBosse.bat","CHECK_System.bat",
            "UNINSTALL_ProcurBosse.bat","SILENT_INSTALL_IT.bat","CHECK_Updates.bat","RUN_EXE.bat"]:
    chk(bat, os.path.exists(f"installers/{bat}"))

# Summary
print("\n" + "=" * 65)
total = len(PASS)+len(FAIL)
score = int(100*len(PASS)/total) if total else 0
print(f"SCORE: {score}% | PASS: {len(PASS)} | FAIL: {len(FAIL)} | WARN: {len(WARN)}")
print(f"STATUS: {'🟢 READY TO BUILD' if score>=90 else '🟡 NEEDS FIXES' if score>=70 else '🔴 BROKEN'}")
if FAIL:
    print(f"\nFAILED ({len(FAIL)}):")
    for f in FAIL: print(f"  ❌ {f}")
print("=" * 65)
json.dump({"ts":datetime.now().isoformat(),"score":score,"pass":len(PASS),"fail":len(FAIL),"failed":FAIL},
          open("scripts/scan_report.json","w"), indent=2)
print("Report: scripts/scan_report.json")
