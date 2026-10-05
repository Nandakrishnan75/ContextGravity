# Antigravity Continuity Portal

> **Plug-and-play session continuity and context restoration hub for Google Antigravity IDE.**  
> Seamlessly bridges past chats, brainstorms, tool calls, and artifacts across reboots on **Windows** and **Linux**.

---

## The Problem Solved

When you finish your work in Google Antigravity and shut down or restart your computer, your previous conversations disappear from the IDE's active conversation list. Starting a new chat normally forces you to:
1. Re-explain your entire architecture from scratch.
2. Waste precious context and token limits.
3. Guess which cryptic UUID folder (`05f514c1-...`, `10753614-...`) belongs to which project.

### The Reality
Your conversations are **never deleted**. Antigravity writes every prompt, thought, code edit, and artifact directly to:
- **Windows:** `%USERPROFILE%\.gemini\antigravity-ide\`
- **Linux:** `~/.gemini/antigravity-ide/`

This **Antigravity Continuity Portal** turns that raw file storage into an instant, human-friendly command center. With **1 click**, you can copy a context-restoring prompt that instructs Antigravity to reload its own past memory from disk.

---

## Quick Start (Plug and Play)

### Windows
Just double-click:
```cmd
start.bat
```
*Or via PowerShell / CMD:*
```powershell
node server.js
```
The portal opens immediately at `http://localhost:4242`.

### Linux / macOS
```bash
chmod +x start.sh
./start.sh
```
*Or manually:*
```bash
node server.js
```

> **Zero Dependencies:** Built with native Node.js (`http`, `fs`, `readline`, `sqlite`). No `npm install` required!

---

## Key Features

1. **Automatic Session Discovery**:
   - Indexes all 60+ historical conversations from disk in under 1 second.
   - Extracts the real human task/prompt (stripping internal XML tags).
   - Detects the project/workspace (e.g. `cfc-arch`, `Sugar-dunes`, `Kappaa`, `Wordcrush`).

2. **The "Instant Continuity" Prompt (Token Saver)**:
   - Click **"Copy Continuity Prompt"** on any session.
   - Open a fresh chat in Antigravity and paste it.
   - Antigravity uses its built-in inspection tools (`view_file` or `read_transcript`) to read the exact transcript and artifacts directly from disk.
   - **Result:** 100% full context restored with **zero tokens wasted** on human re-explaining!

3. **Interactive Chat Timeline**:
   - Visual replay of user prompts and assistant replies in grouped conversation turns.
   - View agent reasoning and thought processes.
   - Collapsible tool execution blocks (terminal commands, file edits, and tool results).

4. **Artifacts & Deliverables**:
   - Browse implementation plans, walkthroughs, and generated files for every past session.
   - Live Markdown preview, 1-click copy, and file downloads.

5. **Files Touched & Tool Metrics**:
   - Complete inventory of all files touched or edited during that session.
   - Frequency breakdown of commands and tools executed.

6. **Search & Organization**:
   - Global instant search across prompt text, UUIDs, project names, and tags.
   - Star/Bookmark favorite sessions.
   - Custom nicknames, notes, and tags saved locally.
   - Filter by Project, Starred, or Has Artifacts.

7. **Multi-Format Export**:
   - Export any session as clean **Markdown (`.md`)**, **JSON transcript (`.json`)**, or **Standalone HTML (`.html`)**.

8. **Direct Brain Folder Access**:
   - Click "Open Folder" to open the exact brain folder in Windows Explorer or Linux file manager (`xdg-open`).

---

## File Structure

```
antigravity-portal/
├── server.js          # Pure Node.js API & static server (zero npm dependencies)
├── start.bat          # 1-Click Windows launcher (auto-opens browser)
├── start.sh           # 1-Click Linux launcher (auto-opens browser)
├── package.json       # Metadata & npm scripts ("npm start")
├── portal_userdata.json # Local store for bookmarks, custom names & tags
└── public/
    ├── index.html     # Semantic single-page web app
    ├── style.css      # Clean dark and light dashboard styling
    ├── app.js         # Client-side searching, filtering & prompt generator
    └── vendor/        # Pre-bundled Lucide icons & Marked markdown renderer
```

---

## Supported Environments

- **Windows 10 / 11** (`%USERPROFILE%\.gemini\antigravity-ide`)
- **Linux (Ubuntu, Debian, Fedora, Arch, WSL2)** (`~/.gemini/antigravity-ide`)
- **macOS** (`~/.gemini/antigravity-ide`)
- **Node.js 18, 20, 22, 24+**
