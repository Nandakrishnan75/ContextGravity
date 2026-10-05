/**
 * ContextGravity Packaging Script
 * Packs both the IDE Extension and the Standalone Web Portal into:
 *   1. ContextGravity-Complete-Bundle.zip (Unified bundle with both Extension and Portal)
 *   2. ContextGravity-Extension.zip (IDE Extension + VSIX + 1-Click Installers)
 *   3. ContextGravity-Portal.zip (Standalone Web Dashboard Server)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PORTAL_DIR = __dirname;
const EXTENSION_DIR = path.resolve(__dirname, '..', 'antigravity-extension');
const DIST_DIR = path.join(PORTAL_DIR, 'dist');
const USER_HOME = path.resolve(__dirname, '..');
const TEMP_BUILD = path.join(PORTAL_DIR, '.pack_temp');

console.log('======================================================');
console.log('       ContextGravity Packaging Tool');
console.log('======================================================');
console.log('Portal Directory:   ', PORTAL_DIR);
console.log('Extension Directory:', EXTENSION_DIR);
console.log('Output Directory:   ', DIST_DIR);
console.log('Home Directory:     ', USER_HOME);
console.log('');

// Clean up build directories
if (fs.existsSync(TEMP_BUILD)) {
  fs.rmSync(TEMP_BUILD, { recursive: true, force: true });
}
fs.mkdirSync(TEMP_BUILD, { recursive: true });
fs.mkdirSync(DIST_DIR, { recursive: true });

function copyRecursive(src, dest, filterFn = null) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (filterFn && !filterFn(src, true)) return;
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    const items = fs.readdirSync(src);
    for (const item of items) {
      copyRecursive(path.join(src, item), path.join(dest, item), filterFn);
    }
  } else {
    if (filterFn && !filterFn(src, false)) return;
    const parent = path.dirname(dest);
    if (!fs.existsSync(parent)) fs.mkdirSync(parent, { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

// 1. Prepare Portal files
console.log('[1/4] Staging Standalone Web Portal...');
const stagePortal = path.join(TEMP_BUILD, 'portal');
fs.mkdirSync(stagePortal, { recursive: true });

const portalFiles = [
  'server.js',
  'package.json',
  'start.bat',
  'start.sh',
  'README.md',
  'portal_userdata.json',
  'contextgravity-1.0.0.vsix'
];

for (const file of portalFiles) {
  const src = path.join(PORTAL_DIR, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(stagePortal, file));
  }
}

// Copy public directory
if (fs.existsSync(path.join(PORTAL_DIR, 'public'))) {
  copyRecursive(path.join(PORTAL_DIR, 'public'), path.join(stagePortal, 'public'));
}

// 2. Prepare Extension files
console.log('[2/4] Staging IDE Extension...');
const stageExtension = path.join(TEMP_BUILD, 'extension');
fs.mkdirSync(stageExtension, { recursive: true });

const extFiles = [
  'extension.js',
  'package.json',
  'README.md',
  'install.bat',
  'install.sh',
  'contextgravity-1.0.0.vsix'
];

for (const file of extFiles) {
  const src = path.join(EXTENSION_DIR, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(stageExtension, file));
  }
}

if (fs.existsSync(path.join(EXTENSION_DIR, 'resources'))) {
  copyRecursive(path.join(EXTENSION_DIR, 'resources'), path.join(stageExtension, 'resources'));
}

if (fs.existsSync(path.join(EXTENSION_DIR, 'media'))) {
  copyRecursive(path.join(EXTENSION_DIR, 'media'), path.join(stageExtension, 'media'));
}

// 3. Prepare Unified Master Bundle
console.log('[3/4] Staging Unified Master Bundle...');
const stageBundle = path.join(TEMP_BUILD, 'bundle');
fs.mkdirSync(stageBundle, { recursive: true });

// Copy extension and portal into bundle subdirectories
copyRecursive(stageExtension, path.join(stageBundle, 'extension'));
copyRecursive(stagePortal, path.join(stageBundle, 'portal'));

// Create master README in bundle root
const bundleReadme = `# ContextGravity Suite - Full Continuity & Persistent Memory Hub

> **Unified session continuity, memory recall, and full session timeline replay for Google Antigravity IDE, VS Code, and Kiro.**

This package includes both options for session continuity:
1. **IDE Extension (\`extension/\`)**: Native sidebar and in-editor dashboard tab.
2. **Standalone Web Portal (\`portal/\`)**: Zero-dependency browser dashboard running locally.

---

## 🚀 Quick Start

### Option A: Install Native IDE Extension (Recommended)
Works with **Google Antigravity IDE**, **VS Code**, and **Kiro / Cursor**.

- **Windows 1-Click Install:**
  Double-click:
  \`\`\`cmd
  INSTALL-EXTENSION.bat
  \`\`\`
- **Linux / macOS 1-Click Install:**
  \`\`\`bash
  chmod +x INSTALL-EXTENSION.sh
  ./INSTALL-EXTENSION.sh
  \`\`\`
- **Or Direct VSIX Install inside IDE:**
  1. Open Extensions in your IDE (\`Ctrl+Shift+X\`).
  2. Click the \`...\` menu at the top right.
  3. Select **Install from VSIX...**
  4. Choose \`extension/contextgravity-1.0.0.vsix\`.

*After installing, reload window (\`Ctrl+Shift+P\` -> "Reload Window"). You will see the ContextGravity planet icon in your activity bar!*

---

### Option B: Run Standalone Web Dashboard
Works in any browser with zero npm dependencies (pure Node.js).

- **Windows:**
  Double-click:
  \`\`\`cmd
  START-PORTAL.bat
  \`\`\`
- **Linux / macOS:**
  \`\`\`bash
  chmod +x START-PORTAL.sh
  ./START-PORTAL.sh
  \`\`\`
- Opens immediately at \`http://localhost:4242\`.

---

## 📦 What's Inside

\`\`\`
ContextGravity/
├── INSTALL-EXTENSION.bat       # 1-Click Windows Extension Installer
├── INSTALL-EXTENSION.sh        # 1-Click Linux/macOS Extension Installer
├── START-PORTAL.bat            # 1-Click Windows Web Portal Launcher
├── START-PORTAL.sh             # 1-Click Linux/macOS Web Portal Launcher
├── README.md                   # This master documentation
│
├── extension/                  # Native IDE Extension
│   ├── contextgravity-1.0.0.vsix # Packaged VSIX extension
│   ├── install.bat             # Dedicated Windows extension installer
│   ├── install.sh              # Dedicated Linux/macOS extension installer
│   ├── extension.js            # Extension background logic
│   ├── package.json            # Manifest & IDE contributions
│   ├── resources/              # Extension icons & graphics
│   └── media/                  # Sidebar & webview interface
│
└── portal/                     # Standalone Web Dashboard
    ├── start.bat               # Windows launcher
    ├── start.sh                # Linux/macOS launcher
    ├── server.js               # Zero-dependency Node.js server
    ├── portal_userdata.json    # Local bookmarks, custom names & notes
    └── public/                 # HTML, CSS, client scripts & vendor libraries
\`\`\`

---

## 💡 How Context Restoration Works
When you shut down your machine or restart your IDE, previous chat sessions are preserved in:
- **Windows:** \`%USERPROFILE%\\.gemini\\antigravity-ide\\brain\\\`
- **Linux / macOS:** \`~/.gemini/antigravity-ide/brain/\`

ContextGravity scans these transcripts on disk and gives you a **1-Click Continuity Prompt**. Pasting this prompt into any fresh chat allows the agent to immediately reload its past thoughts, file edits, and artifacts with **zero tokens wasted** re-explaining!
`;

fs.writeFileSync(path.join(stageBundle, 'README.md'), bundleReadme, 'utf-8');

// Create 1-click root scripts
const rootInstallBat = `@echo off
title Installing ContextGravity IDE Extension
cd /d "%~dp0extension"
call install.bat
`;
fs.writeFileSync(path.join(stageBundle, 'INSTALL-EXTENSION.bat'), rootInstallBat, 'utf-8');

const rootStartBat = `@echo off
title Launching ContextGravity Web Portal
cd /d "%~dp0portal"
call start.bat
`;
fs.writeFileSync(path.join(stageBundle, 'START-PORTAL.bat'), rootStartBat, 'utf-8');

const rootInstallSh = `#!/usr/bin/env bash
ROOT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR/extension" && chmod +x install.sh && ./install.sh
`;
fs.writeFileSync(path.join(stageBundle, 'INSTALL-EXTENSION.sh'), rootInstallSh, 'utf-8');

const rootStartSh = `#!/usr/bin/env bash
ROOT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR/portal" && chmod +x start.sh && ./start.sh
`;
fs.writeFileSync(path.join(stageBundle, 'START-PORTAL.sh'), rootStartSh, 'utf-8');

// 4. Create ZIP archives using PowerShell
console.log('[4/4] Creating ZIP archives...');

function createZip(sourceDir, zipFilePath) {
  if (fs.existsSync(zipFilePath)) {
    fs.unlinkSync(zipFilePath);
  }
  const psCmd = `powershell -NoProfile -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory('${sourceDir.replace(/\\/g, '/')}', '${zipFilePath.replace(/\\/g, '/')}', [System.IO.Compression.CompressionLevel]::Optimal, $false)"`;
  execSync(psCmd, { stdio: 'inherit' });
}

// 1. Master Bundle ZIP
const bundleZipDist = path.join(DIST_DIR, 'ContextGravity-Complete-Bundle.zip');
console.log(' -> Creating', path.basename(bundleZipDist), '...');
createZip(stageBundle, bundleZipDist);

// 2. Extension standalone ZIP
const extZipDist = path.join(DIST_DIR, 'ContextGravity-Extension.zip');
console.log(' -> Creating', path.basename(extZipDist), '...');
createZip(stageExtension, extZipDist);

// 3. Portal standalone ZIP
const portalZipDist = path.join(DIST_DIR, 'ContextGravity-Portal.zip');
console.log(' -> Creating', path.basename(portalZipDist), '...');
createZip(stagePortal, portalZipDist);

// Copy to user home directory and workspace root for instant access
console.log('\nCopying convenience archives to home directory and workspace root...');

const copies = [
  // In workspace root
  { src: bundleZipDist, dest: path.join(PORTAL_DIR, 'ContextGravity-Complete-Bundle.zip') },
  { src: bundleZipDist, dest: path.join(PORTAL_DIR, 'ContextGravity-Suite.zip') },
  { src: extZipDist,    dest: path.join(PORTAL_DIR, 'ContextGravity-Extension.zip') },
  { src: portalZipDist, dest: path.join(PORTAL_DIR, 'ContextGravity-Portal.zip') },
  
  // In User Home (C:\Users\Mottapuffs)
  { src: bundleZipDist, dest: path.join(USER_HOME, 'ContextGravity-Complete-Bundle.zip') },
  { src: bundleZipDist, dest: path.join(USER_HOME, 'ContextGravity-Suite.zip') },
  { src: extZipDist,    dest: path.join(USER_HOME, 'ContextGravity-Extension.zip') },
  { src: extZipDist,    dest: path.join(USER_HOME, 'antigravity-extension.zip') },
  { src: portalZipDist, dest: path.join(USER_HOME, 'ContextGravity-Portal.zip') },
  { src: portalZipDist, dest: path.join(USER_HOME, 'antigravity-portal.zip') }
];

for (const cp of copies) {
  try {
    fs.copyFileSync(cp.src, cp.dest);
    console.log('  [OK] -> ' + cp.dest);
  } catch (err) {
    console.error('  [WARN] Failed to copy to ' + cp.dest + ': ' + err.message);
  }
}

// Clean up staging directory
fs.rmSync(TEMP_BUILD, { recursive: true, force: true });

console.log('\n======================================================');
console.log('  PACKAGING COMPLETE! SUMMARY OF CREATED PACKAGES:');
console.log('======================================================');

function printFile(p) {
  if (fs.existsSync(p)) {
    const sz = (fs.statSync(p).size / (1024 * 1024)).toFixed(2);
    console.log(`- ${path.basename(p)} (${sz} MB)`);
    console.log(`  Path: ${p}`);
  }
}

console.log('\n1. ALL-IN-ONE MASTER BUNDLE (Extension + Web Portal):');
printFile(path.join(PORTAL_DIR, 'ContextGravity-Complete-Bundle.zip'));
printFile(path.join(USER_HOME, 'ContextGravity-Complete-Bundle.zip'));

console.log('\n2. IDE EXTENSION ONLY (VSIX + 1-Click Installers):');
printFile(path.join(PORTAL_DIR, 'ContextGravity-Extension.zip'));
printFile(path.join(USER_HOME, 'ContextGravity-Extension.zip'));

console.log('\n3. STANDALONE WEB PORTAL ONLY:');
printFile(path.join(PORTAL_DIR, 'ContextGravity-Portal.zip'));
printFile(path.join(USER_HOME, 'ContextGravity-Portal.zip'));

console.log('\nAll ZIP packages are ready to be shared or distributed!');
