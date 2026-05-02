#!/usr/bin/env bash
# ================================================================
# ProcurBosse — Build ALL Release Packages
# Produces standalone zip packages for each major version
# ================================================================
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/releases"
mkdir -p "$OUT"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║   ProcurBosse Multi-Version Release Builder          ║"
echo "║   $(date +'%Y-%m-%d %H:%M:%S UTC')                     ║"
echo "╚══════════════════════════════════════════════════════╝"

make_release() {
  local VER="$1"
  local NAME="$2"
  local STATUS="$3"
  local NOTES="$4"
  local DIR="$OUT/procurbosse-v${VER}"
  mkdir -p "$DIR/web" "$DIR/sql" "$DIR/docs" "$DIR/installers"

  echo ""
  echo "▶ Building v${VER} — ${NAME}..."

  # Build web
  cd "$ROOT"
  npx vite build --outDir "$DIR/web" --emptyOutDir 2>&1 | tail -2

  # Copy SPA routing
  [ -f "$ROOT/edgeone.json" ] && cp "$ROOT/edgeone.json" "$DIR/web/"
  [ -f "$ROOT/public/404.html" ] && cp "$ROOT/public/404.html" "$DIR/web/"

  # Copy SQL migrations
  cp "$ROOT/supabase/migrations/"*.sql "$DIR/sql/" 2>/dev/null || true

  # Copy docs
  cp "$ROOT/docs/"*.md "$DIR/docs/" 2>/dev/null || true
  cp "$ROOT/docs/USER_MANUAL_v5.8.md" "$DIR/docs/" 2>/dev/null || true

  # Windows installer scripts
  cat > "$DIR/installers/INSTALL.bat" << BAT
@echo off
title ProcurBosse v${VER} Installer
echo ================================================
echo  EL5 MediProcure - ProcurBosse v${VER}
echo  Embu Level 5 Hospital
echo ================================================
echo.
echo Opening ProcurBosse web application...
start https://procurbosse.edgeone.app
echo.
echo For desktop app: Run ProcurBosse-Setup.exe
pause
BAT

  cat > "$DIR/installers/LAUNCH.bat" << BAT2
@echo off
title ProcurBosse v${VER}
start https://procurbosse.edgeone.app
BAT2

  # Release manifest
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
  "roles": ["admin","database_admin","procurement_manager","procurement_officer","accountant","inventory_manager","warehouse_officer","requisitioner","reception"],
  "modules": ["Procurement","Finance","Vouchers","Quality","Inventory","Communications","Administration","Accountant Workspace","ERP Integration"],
  "demo_accounts": {
    "admin":               {"email":"tecnojin03@gmail.com",    "password":"Admin@1234"},
    "procurement_manager": {"email":"manager@el5.co.ke",       "password":"Manager@1234"},
    "accountant":          {"email":"accountant@el5.co.ke",    "password":"Account@1234"},
    "procurement_officer": {"email":"officer@el5.co.ke",       "password":"Officer@1234"},
    "requisitioner":       {"email":"requisitioner@el5.co.ke", "password":"Req@12345"},
    "warehouse_officer":   {"email":"warehouse@el5.co.ke",     "password":"Warehouse@1234"},
    "inventory_manager":   {"email":"inventory@el5.co.ke",     "password":"Inventory@1234"},
    "reception":           {"email":"reception@el5.co.ke",     "password":"Reception@1234"},
    "database_admin":      {"email":"dbadmin@el5.co.ke",       "password":"DBAdmin@1234"}
  }
}
JSON

  # README
  cat > "$DIR/README.md" << README
# ProcurBosse v${VER} — ${NAME}

**EL5 MediProcure** | Embu Level 5 Hospital | Embu County Government | Kenya

> Status: **${STATUS}** | Built: $(date +'%Y-%m-%d')

## 🌐 Live URL
https://procurbosse.edgeone.app

## 🔐 Sample Login Accounts

| Role | Email | Password |
|------|-------|----------|
| Administrator | tecnojin03@gmail.com | Admin@1234 |
| Proc. Manager | manager@el5.co.ke | Manager@1234 |
| Accountant | accountant@el5.co.ke | Account@1234 |
| Proc. Officer | officer@el5.co.ke | Officer@1234 |
| Requisitioner | requisitioner@el5.co.ke | Req@12345 |
| Warehouse | warehouse@el5.co.ke | Warehouse@1234 |
| Inventory Mgr | inventory@el5.co.ke | Inventory@1234 |
| Reception | reception@el5.co.ke | Reception@1234 |
| DB Admin | dbadmin@el5.co.ke | DBAdmin@1234 |

## 📦 Package Contents

\`\`\`
procurbosse-v${VER}/
├── web/              ← Deploy this folder to EdgeOne/Vercel/Nginx
│   ├── index.html
│   ├── assets/
│   └── edgeone.json  ← SPA routing config
├── sql/              ← Run migrations in Supabase SQL Editor
│   └── *.sql
├── docs/             ← User manuals
├── installers/       ← Windows BAT scripts
│   ├── INSTALL.bat
│   └── LAUNCH.bat
├── RELEASE.json      ← Machine-readable release info
└── README.md         ← This file
\`\`\`

## 🚀 Web Deployment

### EdgeOne (Current)
\`\`\`bash
# Upload web/ folder contents to EdgeOne project
# edgeone.json handles SPA routing automatically
\`\`\`

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

## 🖥️ Desktop App (Windows)

Build EXE locally:
\`\`\`bash
npm ci --ignore-scripts
npx vite build
npx electron-builder --win --x64
\`\`\`
Produces: \`dist-electron/ProcurBosse-Setup.exe\`

## 🗄️ Database Setup

1. Create Supabase project at supabase.com
2. Run migrations: paste each \`sql/*.sql\` in Supabase SQL Editor
3. Create demo users in Supabase > Auth > Users (see table above)
4. Run \`sql/20260502100000_v583_demo_roles_seed.sql\` to assign roles

## 📋 Version Notes
${NOTES}

## 🔧 System Requirements
- **Web**: Any modern browser (Chrome 90+, Firefox 90+, Edge 90+)
- **Desktop**: Windows 10/11 x64, 4GB RAM, 500MB disk
- **Server**: Node.js 20+, Supabase account
README

  echo "  ✓ v${VER} package ready: $DIR"
}

# ── Build all releases ──
make_release "5.8.3" "Stable Full Release" "stable" \
  "54 pages, all 9 roles, all modules, JS errors fixed, demo accounts, Supabase fallback keys"

make_release "3.2.0" "v3 Module Restore" "lts" \
  "v3.1 modules restored, 14 previously missing pages wired, Communications & Accountant nav groups added"

# ── Zip all releases ──
echo ""
echo "📦 Creating zip archives..."
cd "$OUT"
for dir in procurbosse-v*/; do
  if [ -d "$dir" ]; then
    ver="${dir%/}"
    zip -r "${ver}.zip" "$dir" -x "*.DS_Store" -x "__MACOSX/*" > /dev/null
    SIZE=$(du -sh "${ver}.zip" | cut -f1)
    echo "  ✓ ${ver}.zip (${SIZE})"
  fi
done

echo ""
echo "══════════════════════════════════════════════════════"
echo "  RELEASES BUILT SUCCESSFULLY"
echo "  Location: $OUT"
echo "══════════════════════════════════════════════════════"
ls -lh "$OUT"/*.zip 2>/dev/null
