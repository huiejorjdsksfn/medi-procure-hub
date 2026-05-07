/**
 * ProcurBosse IT Admin — electron-builder config
 * Converted from electron-builder.json → .cjs for universal Node compatibility
 * EL5 MediProcure · Embu Level 5 Hospital
 */
'use strict';

module.exports = {
  appId: "ke.go.embu.mediprocure.itadmin",
  productName: "ProcurBosse IT Admin",
  copyright: "© 2026 Embu County Government",
  directories: { buildResources: "../build-admin", output: "dist-electron" },
  files: ["dist/**/*", "electron/**/*", "package.json"],
  extraResources: [{ from: "assets/icon-256.png", to: "icon.png" }],
  win: {
    icon: "../build-admin/icon.ico",
    target: [{ target: "nsis", arch: ["x64", "ia32"] }]
  },
  nsis: {
    oneClick: false,
    allowElevation: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: "ProcurBosse IT Admin",
    artifactName: "ProcurBosse-ITAdmin-v${version}-${arch}-Setup.exe",
    runAfterFinish: true
  },
  publish: {
    provider: "github",
    owner: "huiejorjdsksfn",
    repo: "medi-procure-hub"
  }
};
