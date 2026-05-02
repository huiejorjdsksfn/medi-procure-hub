#!/usr/bin/env bash
# ================================================================
# ProcurBosse — Multi-Release Build Script
# Builds standalone packages for v5.8, v3.2, and current
# ================================================================
set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RELEASES_DIR="$PROJECT_ROOT/releases"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "╔══════════════════════════════════════════╗"
echo "║  ProcurBosse Multi-Release Builder        ║"
echo "║  $(date)                       ║"
echo "╚══════════════════════════════════════════╝"

mkdir -p "$RELEASES_DIR"

build_release() {
  local VERSION="$1"
  local LABEL="$2"
  local OUT="$RELEASES_DIR/procurbosse-${VERSION}"
  
  echo ""
  echo "▶ Building $LABEL (v$VERSION)..."
  
  # Build web assets
  cd "$PROJECT_ROOT"
  npx vite build --outDir "$OUT/web" 2>&1 | tail -3
  
  # Copy SPA routing files
  cp edgeone.json "$OUT/web/" 2>/dev/null || true
  [ -f "public/404.html" ] && cp public/404.html "$OUT/web/" || true
  
  # Create release manifest
  cat > "$OUT/RELEASE.json" << MANIFEST
{
  "name": "EL5 MediProcure (ProcurBosse)",
  "version": "${VERSION}",
  "label": "${LABEL}",
  "buildDate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "hospital": "Embu Level 5 Hospital",
  "county": "Embu County Government",
  "supabaseProject": "yvjfehnzbzjliizjvuhq",
  "deployUrl": "https://procurbosse.edgeone.app",
  "demoAccounts": {
    "admin":             {"email": "tecnojin03@gmail.com",    "password": "Admin@1234"},
    "procurement_manager":{"email": "manager@el5.co.ke",     "password": "Manager@1234"},
    "accountant":        {"email": "accountant@el5.co.ke",   "password": "Account@1234"},
    "procurement_officer":{"email": "officer@el5.co.ke",     "password": "Officer@1234"},
    "requisitioner":     {"email": "requisitioner@el5.co.ke","password": "Req@12345"},
    "warehouse_officer": {"email": "warehouse@el5.co.ke",    "password": "Warehouse@1234"}
  }
}
MANIFEST

  # Create README
  cat > "$OUT/README.md" << README
# ProcurBosse v${VERSION} — ${LABEL}

**EL5 MediProcure** | Embu Level 5 Hospital | Embu County Government

## Quick Start

### Web Deployment (EdgeOne / Vercel / Netlify)
1. Deploy the \`web/\` folder to your CDN
2. Configure SPA routing (all paths → index.html)
3. Set environment variables:
   \`\`\`
   VITE_SUPABASE_URL=https://yvjfehnzbzjliizjvuhq.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key>
   \`\`\`

### Electron (Windows Desktop App)
\`\`\`bash
npm run electron:build
\`\`\`
Produces: \`dist-electron/ProcurBosse Setup.exe\`

## Demo Login Accounts
| Role | Email | Password |
|------|-------|----------|
| Administrator | tecnojin03@gmail.com | Admin@1234 |
| Proc. Manager | manager@el5.co.ke | Manager@1234 |
| Accountant | accountant@el5.co.ke | Account@1234 |
| Proc. Officer | officer@el5.co.ke | Officer@1234 |
| Requisitioner | requisitioner@el5.co.ke | Req@12345 |
| Warehouse | warehouse@el5.co.ke | Warehouse@1234 |

## System Requirements
- Node.js 20+
- Windows 10/11 (for Electron), any browser (for web)
- Supabase account with database provisioned

## Version: ${VERSION}
README

  echo "  ✓ Release package built: $OUT"
}

# Build current version
build_release "5.8.3" "Stable — Full v3.2 Modules"

echo ""
echo "══════════════════════════════════════════"
echo "  All releases built in: $RELEASES_DIR"
echo "══════════════════════════════════════════"
ls -la "$RELEASES_DIR/"
