#!/usr/bin/env python3
"""
ProcurBosse Build Script — Python
Builds both v1 (Win7/8 ia32) and v2 (Win10/11 x64) EXE installers
and packages them into a ZIP with all required DLLs.
Run: python build_procurbosse.py [--v1] [--v2] [--all] [--zip]
"""

import os, sys, shutil, subprocess, json, zipfile, argparse, platform
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).parent.resolve()
DIST_WEB = ROOT / "dist"
DIST_EXE = ROOT / "dist-electron"
PKG_FILE = ROOT / "package.json"
BUILDER_CFG = ROOT / "electron-builder.yml"
BUILDS_DIR = ROOT / "builds"

# ── DLL list required for Windows 7/8/10/11 ──────────────────
WIN7_DLLS = [
    "vcruntime140.dll", "vcruntime140_1.dll", "ucrtbase.dll",
    "msvcp140.dll", "msvcp140_1.dll",
]
ELECTRON_DLLS = [
    "electron.dll", "node.dll", "ffmpeg.dll",
    "d3dcompiler_47.dll", "chrome_elf.dll",
    "libEGL.dll", "libGLESv2.dll",
]

def log(msg, level="INFO"):
    ts = datetime.now().strftime("%H:%M:%S")
    symbols = {"INFO":"ℹ️","OK":"✅","ERR":"❌","WARN":"⚠️","BUILD":"🔨"}
    print(f"[{ts}] {symbols.get(level,'·')} {msg}")

def run(cmd, cwd=None, env=None):
    """Run command and return exit code."""
    log(f"RUN: {' '.join(cmd) if isinstance(cmd, list) else cmd}", "BUILD")
    result = subprocess.run(
        cmd, cwd=cwd or ROOT, env=env or os.environ.copy(),
        shell=isinstance(cmd, str)
    )
    return result.returncode

def get_version():
    pkg = json.loads(PKG_FILE.read_text())
    return pkg.get("version", "2.0.0")

def set_version(version):
    pkg = json.loads(PKG_FILE.read_text())
    pkg["version"] = version
    PKG_FILE.write_text(json.dumps(pkg, indent=2))
    log(f"Version set to {version}", "OK")

def npm_install(electron_version=None):
    """Install npm dependencies, optionally pinning electron version."""
    if electron_version:
        pkg = json.loads(PKG_FILE.read_text())
        pkg.setdefault("devDependencies", {})["electron"] = electron_version
        PKG_FILE.write_text(json.dumps(pkg, indent=2))
        log(f"Pinned electron to {electron_version}", "WARN")
    code = run(["npm", "install", "--no-audit", "--prefer-offline"])
    if code != 0:
        code = run(["npm", "install", "--no-audit"])
    return code == 0

def build_web():
    """Build React/Vite frontend."""
    log("Building React/Vite frontend...", "BUILD")
    env = os.environ.copy()
    env["VITE_SUPABASE_URL"] = "https://yvjfehnzbzjliizjvuhq.supabase.co"
    env["VITE_SUPABASE_PUBLISHABLE_KEY"] = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2amZlaG56YnpqbGlpemp2dWhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwMDg0NjYsImV4cCI6MjA3NjU4NDQ2Nn0.mkDvC1s90bbRBRKYZI6nOTxEpFrGKMNmWgTENeMTSnc"
    code = run(["npm", "run", "build"], env=env)
    if code != 0:
        log("Web build failed!", "ERR"); return False
    log(f"Web build OK — {sum(1 for _ in (DIST_WEB/'assets').glob('*'))} assets", "OK")
    return True

def build_exe(arch="x64", version=None):
    """Build Windows EXE installer for given architecture."""
    label = "v2 (Win10/11 x64)" if arch == "x64" else "v1 (Win7/8 ia32)"
    log(f"Building {label} installer...", "BUILD")
    
    if version:
        set_version(version)
    
    code = run([
        "npx", "electron-builder",
        "--win", f"--{arch}",
        "--config", str(BUILDER_CFG),
    ], env={**os.environ, "CSC_IDENTITY_AUTO_DISCOVERY": "false"})
    
    if code != 0:
        log(f"{label} build failed (exit {code})", "ERR")
        return None
    
    # Find the output exe
    exes = list(DIST_EXE.glob("*.exe"))
    if not exes:
        log("No EXE found in dist-electron/", "ERR")
        return None
    
    latest = max(exes, key=lambda p: p.stat().st_mtime)
    log(f"Built: {latest.name} ({latest.stat().st_size // 1024 // 1024} MB)", "OK")
    return latest

def create_zip(v1_exe=None, v2_exe=None):
    """Create a ZIP containing both installers + dependency info."""
    BUILDS_DIR.mkdir(exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M")
    zip_path = BUILDS_DIR / f"ProcurBosse_v2.0_{ts}_Windows.zip"
    
    readme = f"""ProcurBosse — EL5 MediProcure Windows Installer Package
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}
Hospital: Embu Level 5 Hospital, Embu County Government
System: EL5 MediProcure v2.0 — All 40+ ERP Modules

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FILES IN THIS PACKAGE:
  ┌─ ProcurBosse-v2.x-Win10-x64-Setup.exe
  │     → For Windows 10 / 11 (64-bit) — RECOMMENDED
  │     → Modern PCs, laptops, workstations
  │
  └─ ProcurBosse-v1.x-Win7-ia32-Setup.exe
        → For Windows 7 SP1 / 8 / 8.1 / 10 (32-bit)
        → Legacy hospital PCs

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INSTALLATION:
  1. Right-click the correct .exe → "Run as Administrator"
  2. Follow the setup wizard
  3. Choose installation folder (default: C:\\Program Files\\ProcurBosse)
  4. Launch from Desktop shortcut or Start Menu

SYSTEM REQUIREMENTS:
  ┌────────────────┬─────────────────────┬──────────────────────┐
  │                │ v2 (Modern)         │ v1 (Legacy)          │
  ├────────────────┼─────────────────────┼──────────────────────┤
  │ Windows        │ 10 / 11             │ 7 SP1 / 8 / 8.1 / 10│
  │ Architecture   │ 64-bit              │ 32 or 64-bit         │
  │ RAM            │ 4 GB minimum        │ 2 GB minimum         │
  │ Disk           │ 500 MB              │ 350 MB               │
  │ Internet       │ Required            │ Required             │
  └────────────────┴─────────────────────┴──────────────────────┘

DATABASE:
  Live connection to: yvjfehnzbzjliizjvuhq.supabase.co
  All data is stored securely in Supabase PostgreSQL

INCLUDED DLLs (automatically installed by setup):
  • vcruntime140.dll / vcruntime140_1.dll — Visual C++ Runtime
  • ucrtbase.dll      — Universal C Runtime (Win7 support)
  • d3dcompiler_47.dll — DirectX Shader Compiler
  • chrome_elf.dll   — Chromium Error Reporting
  • libEGL.dll / libGLESv2.dll — SwiftShader Software Renderer
  • ffmpeg.dll       — Multimedia Framework

IP RESTRICTION:
  This app enforces IP whitelisting when configured by admin.
  Unauthorized IPs are automatically disconnected.
  Configure in: Admin → Settings → Security → IP Restriction

SUPPORT:
  Repository: https://github.com/huiejorjdsksfn/medi-procure-hub
  Hospital IT: IT Department — Embu Level 5 Hospital
"""
    
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        zf.writestr("README.txt", readme)
        
        if v1_exe and v1_exe.exists():
            new_name = f"ProcurBosse-v1.0-Win7-ia32-Setup.exe"
            log(f"Adding {new_name} ({v1_exe.stat().st_size // 1024 // 1024} MB)", "OK")
            zf.write(v1_exe, new_name)
        
        if v2_exe and v2_exe.exists():
            new_name = f"ProcurBosse-v2.0-Win10-x64-Setup.exe"
            log(f"Adding {new_name} ({v2_exe.stat().st_size // 1024 // 1024} MB)", "OK")
            zf.write(v2_exe, new_name)
        
        # Add DLL requirements doc
        dll_info = "\n".join([
            "Required DLLs for ProcurBosse Windows Installation",
            "=" * 50,
            "",
            "The NSIS installer automatically handles these DLLs.",
            "If running the portable version, ensure these exist in the app folder:",
            "",
            "CRITICAL (Windows 7/8 compatibility):",
        ] + [f"  - {dll}" for dll in WIN7_DLLS] + [
            "",
            "Electron/Chromium runtime:",
        ] + [f"  - {dll}" for dll in ELECTRON_DLLS] + [
            "",
            "Source: Electron v41 (x64) / Electron v22 LTS (ia32/Win7)",
        ])
        zf.writestr("DLL_REQUIREMENTS.txt", dll_info)
    
    size_mb = zip_path.stat().st_size / 1024 / 1024
    log(f"ZIP created: {zip_path.name} ({size_mb:.1f} MB)", "OK")
    return zip_path

def main():
    parser = argparse.ArgumentParser(description="ProcurBosse Build Tool")
    parser.add_argument("--v1",   action="store_true", help="Build v1 Win7/8 ia32")
    parser.add_argument("--v2",   action="store_true", help="Build v2 Win10/11 x64")
    parser.add_argument("--all",  action="store_true", help="Build both")
    parser.add_argument("--zip",  action="store_true", help="Package into ZIP")
    parser.add_argument("--web",  action="store_true", help="Build web only")
    parser.add_argument("--version", default=None, help="Override version (e.g. 2.1.0)")
    args = parser.parse_args()

    log("ProcurBosse Build System v1.0", "BUILD")
    log(f"Platform: {platform.system()} {platform.machine()}", "INFO")
    log(f"Root: {ROOT}", "INFO")

    if args.web:
        ok = build_web()
        sys.exit(0 if ok else 1)

    if not (args.v1 or args.v2 or args.all):
        parser.print_help()
        log("Specify --v1, --v2, --all, or --web", "WARN")
        sys.exit(0)

    # Always build web first
    if not build_web():
        sys.exit(1)

    v1_exe = v2_exe = None
    run_number = os.environ.get("GITHUB_RUN_NUMBER", "local")

    if args.v2 or args.all:
        ver = args.version or f"2.0.{run_number}"
        if not npm_install():
            log("npm install failed for v2", "ERR"); sys.exit(1)
        v2_exe = build_exe("x64", ver)

    if args.v1 or args.all:
        ver = args.version.replace("2.", "1.") if args.version else f"1.0.{run_number}"
        if not npm_install(electron_version="22.3.27"):
            log("npm install failed for v1", "ERR"); sys.exit(1)
        v1_exe = build_exe("ia32", ver)

    if args.zip and (v1_exe or v2_exe):
        zip_path = create_zip(v1_exe, v2_exe)
        log(f"Package ready: {zip_path}", "OK")

    # Summary
    log("=" * 50, "INFO")
    log("BUILD SUMMARY:", "INFO")
    if v2_exe: log(f"v2 EXE: {v2_exe.name}", "OK")
    else: log("v2 EXE: not built", "WARN")
    if v1_exe: log(f"v1 EXE: {v1_exe.name}", "OK")
    else: log("v1 EXE: not built", "WARN")
    log("Done!", "OK")

if __name__ == "__main__":
    main()
