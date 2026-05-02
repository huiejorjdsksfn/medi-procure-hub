#!/usr/bin/env bash
# ================================================================
# ProcurBosse — Build ALL Standalone Release Packages
# Produces: web/, sql/, docs/, src/, installers/, .bat, RELEASE.json
# ================================================================
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/releases"
DIST="$ROOT/dist"
mkdir -p "$OUT"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║   ProcurBosse Multi-Version Release Builder          ║"
echo "║   $(date +'%Y-%m-%d %H:%M:%S')                       ║"
echo "╚══════════════════════════════════════════════════════╝"

# ── Build web once ──
echo ""
echo "▶ Building web assets..."
cd "$ROOT"
npx vite build 2>&1 | tail -3

make_release() {
  local VER="$1"
  local NAME="$2"
  local STATUS="$3"
  local DIR="$OUT/procurbosse-v${VER}"

  echo ""
  echo "▶ Packaging v${VER} — ${NAME}..."

  mkdir -p "$DIR/web" "$DIR/sql" "$DIR/docs" "$DIR/src" "$DIR/installers" "$DIR/electron"

  # ── Web assets ──
  cp -r "$DIST/"* "$DIR/web/"
  [ -f "$ROOT/edgeone.json" ]        && cp "$ROOT/edgeone.json" "$DIR/web/"
  [ -f "$ROOT/public/404.html" ]     && cp "$ROOT/public/404.html" "$DIR/web/"

  # ── SQL migrations ──
  cp "$ROOT/supabase/migrations/"*.sql "$DIR/sql/" 2>/dev/null || true

  # ── Source code snapshot ──
  cp -r "$ROOT/src" "$DIR/src/"
  cp "$ROOT/package.json" "$DIR/"
  cp "$ROOT/vite.config.ts" "$DIR/"
  cp "$ROOT/tsconfig.json" "$DIR/" 2>/dev/null || true
  cp "$ROOT/tailwind.config.ts" "$DIR/" 2>/dev/null || true
  cp "$ROOT/index.html" "$DIR/"

  # ── Electron source ──
  cp -r "$ROOT/electron" "$DIR/electron/"
  cp "$ROOT/electron-builder.yml" "$DIR/"

  # ── Docs ──
  cp "$ROOT/docs/"*.md "$DIR/docs/" 2>/dev/null || true

  # ── Windows installers ──
  cat > "$DIR/installers/SETUP.bat" << BAT
@echo off
title ProcurBosse v${VER} Setup
color 0B
echo.
echo  ╔═══════════════════════════════════════════════╗
echo  ║   EL5 MediProcure — ProcurBosse v${VER}       ║
echo  ║   Embu Level 5 Hospital                        ║
echo  ║   Embu County Government · Kenya               ║
echo  ╚═══════════════════════════════════════════════╝
echo.
echo  ADMIN LOGIN:
echo    Email:    samwise@gmail.com
echo    Password: samwise@gmail.com
echo.
echo  Live URL: https://procurbosse.edgeone.app
echo.
echo  [1] Open in browser (web app)
echo  [2] Build desktop EXE (requires Node.js 20)
echo  [3] Exit
echo.
set /p choice=Choose option (1-3):
if "%choice%"=="1" start https://procurbosse.edgeone.app
if "%choice%"=="2" call npm ci --ignore-scripts && call npm run build:exe
echo.
pause
BAT

  cat > "$DIR/installers/LAUNCH.bat" << BAT2
@echo off
start https://procurbosse.edgeone.app
BAT2

  cat > "$DIR/installers/BUILD_EXE.bat" << BAT3
@echo off
title Build ProcurBosse EXE
echo Building ProcurBosse Windows EXE...
cd /d "%~dp0.."
call npm ci --ignore-scripts
call npx vite build
call npx electron-builder --win --x64 --config electron-builder.yml
echo.
echo EXE built in: dist-electron\
pause
BAT3

  # ── README ──
  cat > "$DIR/README.md" << README
# 🏥 ProcurBosse v${VER} — ${NAME}

**EL5 MediProcure** | Embu Level 5 Hospital | Embu County Government | Kenya

> **Status**: ${STATUS} | Built: $(date +'%Y-%m-%d %H:%M UTC')

---

## 🌐 Live Application
**https://procurbosse.edgeone.app**

---

## 🔐 Login Credentials

### Primary Admin
| Field | Value |
|-------|-------|
| Email | \`samwise@gmail.com\` |
| Password | \`samwise@gmail.com\` |
| Role | Administrator (full access) |

### All Demo Accounts
| Role | Email | Password |
|------|-------|----------|
| 🔴 Administrator | \`samwise@gmail.com\` | \`samwise@gmail.com\` |
| 🟠 Proc. Manager | \`manager@el5.co.ke\` | \`Manager@1234\` |
| 🔵 Accountant | \`accountant@el5.co.ke\` | \`Account@1234\` |
| 🟢 Proc. Officer | \`officer@el5.co.ke\` | \`Officer@1234\` |
| 🟣 Requisitioner | \`requisitioner@el5.co.ke\` | \`Req@12345\` |
| 🔵 Warehouse | \`warehouse@el5.co.ke\` | \`Warehouse@1234\` |
| 🟤 Inventory | \`inventory@el5.co.ke\` | \`Inventory@1234\` |
| ⚪ Reception | \`reception@el5.co.ke\` | \`Reception@1234\` |
| ⚫ DB Admin | \`dbadmin@el5.co.ke\` | \`DBAdmin@1234\` |

---

## 📦 Package Contents

\`\`\`
procurbosse-v${VER}/
├── web/              ← Deploy to EdgeOne / Vercel / Nginx / Apache
│   ├── index.html    ← SPA entry point
│   ├── assets/       ← JS / CSS / images (13 optimized chunks)
│   └── edgeone.json  ← SPA routing (all paths → index.html)
│
├── src/              ← Full TypeScript source code
│   ├── pages/        ← 54 page components
│   ├── components/   ← Shared components
│   ├── contexts/     ← AuthContext, SettingsContext
│   ├── lib/          ← Business logic, engines
│   └── integrations/ ← Supabase client
│
├── electron/         ← Electron desktop app source
│   └── main.js       ← Main process
│
├── sql/              ← All Supabase DB migrations (50 files)
├── docs/             ← User manuals & technical guides
├── installers/       ← Windows BAT scripts
│   ├── SETUP.bat     ← Interactive setup
│   ├── LAUNCH.bat    ← Quick launch browser
│   └── BUILD_EXE.bat ← Build Windows EXE locally
│
├── package.json      ← NPM dependencies
├── vite.config.ts    ← Build config
├── electron-builder.yml ← EXE packaging config
├── RELEASE.json      ← Machine-readable release info
└── README.md         ← This file
\`\`\`

---

## 🚀 Web Deployment

### EdgeOne (Production)
Upload contents of \`web/\` folder to your EdgeOne project. \`edgeone.json\` handles SPA routing.

### Vercel
\`\`\`bash
cd web && vercel --prod
\`\`\`

### Nginx
\`\`\`nginx
server {
  root /var/www/procurbosse;
  location / { try_files \$uri /index.html; }
}
\`\`\`

### Apache
\`\`\`apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^ /index.html [L]
\`\`\`

---

## 🖥️ Desktop EXE Build (Windows)

**Requirements**: Node.js 20+, Windows 10/11

\`\`\`cmd
cd procurbosse-v${VER}
npm ci --ignore-scripts
npx vite build
npx electron-builder --win --x64 --config electron-builder.yml
\`\`\`

Output: \`dist-electron/ProcurBosse-v${VER}-Windows-Setup.exe\`

Or run: \`installers\\BUILD_EXE.bat\`

---

## 🗄️ Database Setup

1. Create project at [supabase.com](https://supabase.com)
2. Run SQL migrations in **Supabase SQL Editor** (in order):
   - Run all files in \`sql/\` directory chronologically
   - Key file: \`sql/20260502200000_samwise_admin.sql\` — creates admin trigger
3. Create user in **Supabase > Authentication > Users**:
   - Email: \`samwise@gmail.com\`, Password: \`samwise@gmail.com\`
4. Run: \`SELECT assign_role_by_email('samwise@gmail.com', 'admin');\`

---

## 📋 Modules (54 pages, 9 roles)

| Module | Pages | Roles |
|--------|-------|-------|
| Procurement | Requisitions, POs, GRN, Suppliers, Tenders, Bid Eval, Contracts | admin, procurement_manager, procurement_officer, requisitioner |
| Finance | Dashboard, Budgets, Chart of Accounts, Fixed Assets | admin, accountant, procurement_manager |
| Vouchers | Payment, Receipt, Journal, Purchase, Sales | admin, accountant |
| Quality | Dashboard, Inspections, Non-Conformance | admin, warehouse_officer |
| Inventory | Items, Categories, Departments, Scanner | admin, inventory_manager |
| Communications | Email, SMS, Telephony, Notifications, Reception | all roles |
| Administration | Panel, DB, Users, Settings, Backup, Webmaster, ODBC, Facilities, IP, GUI, Changelog | admin, database_admin |
| Accountant Workspace | Full accountant module | admin, accountant |
| Reports | Analytics & reports | admin, procurement_manager |

---

*Built with React 18 · TypeScript · Vite 5 · Supabase · Tailwind CSS · Electron*
README

  # ── RELEASE.json ──
  cat > "$DIR/RELEASE.json" << JSON
{
  "product": "EL5 MediProcure (ProcurBosse)",
  "version": "${VER}",
  "release_name": "${NAME}",
  "status": "${STATUS}",
  "built": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "hospital": "Embu Level 5 Hospital",
  "county": "Embu County Government",
  "country": "Kenya",
  "live_url": "https://procurbosse.edgeone.app",
  "supabase_project": "yvjfehnzbzjliizjvuhq",
  "tech_stack": ["React 18", "TypeScript", "Vite 5", "Supabase", "Tailwind CSS", "Electron"],
  "pages": 54,
  "chunks": 13,
  "roles": [
    "admin","database_admin","procurement_manager","procurement_officer",
    "accountant","inventory_manager","warehouse_officer","requisitioner","reception"
  ],
  "modules": [
    "Procurement","Finance","Vouchers","Quality","Inventory",
    "Communications","Administration","Accountant Workspace","Reports","Documents"
  ],
  "primary_admin": {
    "email": "samwise@gmail.com",
    "password": "samwise@gmail.com",
    "role": "admin"
  },
  "demo_accounts": {
    "admin":               {"email":"samwise@gmail.com",         "password":"samwise@gmail.com"},
    "procurement_manager": {"email":"manager@el5.co.ke",         "password":"Manager@1234"},
    "accountant":          {"email":"accountant@el5.co.ke",      "password":"Account@1234"},
    "procurement_officer": {"email":"officer@el5.co.ke",         "password":"Officer@1234"},
    "requisitioner":       {"email":"requisitioner@el5.co.ke",   "password":"Req@12345"},
    "warehouse_officer":   {"email":"warehouse@el5.co.ke",       "password":"Warehouse@1234"},
    "inventory_manager":   {"email":"inventory@el5.co.ke",       "password":"Inventory@1234"},
    "reception":           {"email":"reception@el5.co.ke",       "password":"Reception@1234"},
    "database_admin":      {"email":"dbadmin@el5.co.ke",         "password":"DBAdmin@1234"}
  }
}
JSON

  echo "  ✓ v${VER} packaged → $DIR"
}

# ── Build both releases ──
make_release "5.8.3" "Stable Full Release — samwise admin" "stable"
make_release "3.2.0" "v3 Module Restore" "lts"

# ── Zip both ──
echo ""
echo "📦 Creating zip archives..."
cd "$OUT"
for dir in procurbosse-v*/; do
  [ -d "$dir" ] || continue
  zipname="${dir%/}.zip"
  zip -r "$zipname" "$dir" -x "*.DS_Store" -x "__MACOSX/*" -x "*/node_modules/*" > /dev/null
  echo "  ✓ $zipname ($(du -sh $zipname | cut -f1))"
done

echo ""
echo "═══════════════════════════════════════════════════"
echo "  ALL RELEASES COMPLETE"
ls -lh "$OUT"/*.zip 2>/dev/null
echo "═══════════════════════════════════════════════════"
