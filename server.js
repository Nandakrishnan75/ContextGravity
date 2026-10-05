/**
 * Antigravity Continuity Portal - Local Server
 * Zero-dependency Node.js backend (Windows & Linux compatible)
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const readline = require('node:readline');
const { exec } = require('node:child_process');

// Optional sqlite module in Node 22+
let DatabaseSync = null;
try {
  DatabaseSync = require('node:sqlite').DatabaseSync;
} catch (e) {
  // Graceful fallback to transcript regex extraction
}

const PORT = process.env.PORT || 4242;

// Determine default Antigravity data directory
function getDefaultDataDir() {
  const home = os.homedir();
  const geminiDir = path.join(home, '.gemini', 'antigravity-ide');
  if (fs.existsSync(geminiDir)) {
    return geminiDir;
  }
  const altDir = path.join(home, '.antigravity-ide');
  if (fs.existsSync(altDir)) {
    return altDir;
  }
  return geminiDir;
}

let DATA_DIR = getDefaultDataDir();
const USER_DATA_FILE = path.join(__dirname, 'portal_userdata.json');

// Load user bookmarks & tags
function loadUserData() {
  try {
    if (fs.existsSync(USER_DATA_FILE)) {
      return JSON.parse(fs.readFileSync(USER_DATA_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error loading user data:', e.message);
  }
  return { favorites: {}, tags: {}, customTitles: {} };
}

function saveUserData(data) {
  try {
    fs.writeFileSync(USER_DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving user data:', e.message);
  }
}

let userData = loadUserData();
let cachedConversations = null;
let cacheTimestamp = 0;

// Extract workspace from SQLite db if available
function extractWorkspaceFromDb(convId) {
  if (!DatabaseSync) return null;
  const dbPath = path.join(DATA_DIR, 'conversations', `${convId}.db`);
  if (!fs.existsSync(dbPath)) return null;
  try {
    const db = new DatabaseSync(dbPath, { readOnly: true });
    const row = db.prepare("SELECT data FROM trajectory_metadata_blob WHERE id='main'").get();
    if (row && row.data) {
      const text = Buffer.from(row.data).toString('utf-8');
      const match = text.match(/file:\/\/\/([^\x00-\x1f\x7f-\xff]+)/i);
      if (match) {
        let p = match[1].replace(/\\/g, '/');
        p = p.replace(/[,\s]+$/, '');
        return p;
      }
    }
  } catch (e) {}
  return null;
}

// Clean user prompt text
function cleanPrompt(raw) {
  if (!raw) return '';
  let cleaned = raw;
  const match = raw.match(/<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/i);
  if (match) {
    cleaned = match[1];
  }
  cleaned = cleaned.replace(/<[^>]+>/g, ' ');
  cleaned = cleaned.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
  return cleaned;
}

// Format relative time
function getRelativeTime(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString();
}

// Deep artifact scanner for a conversation
function scanArtifactsForConv(convId, convBrainDir, transcriptPath) {
  const artifacts = [];
  let summarySnippet = '';

  // 1. Files in brain folder root (markdown, plans, reports, media)
  if (fs.existsSync(convBrainDir)) {
    try {
      const files = fs.readdirSync(convBrainDir);
      for (const file of files) {
        if (file.startsWith('.') || file === 'scratch' || file === 'browser') continue;
        if (file.endsWith('.metadata.json')) continue;
        const filePath = path.join(convBrainDir, file);
        try {
          const fstat = fs.statSync(filePath);
          if (fstat.isFile()) {
            let meta = null;
            const metaPath = path.join(convBrainDir, `${file}.metadata.json`);
            if (fs.existsSync(metaPath)) {
              try {
                meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
                if (meta.summary && !summarySnippet) summarySnippet = meta.summary;
              } catch (e) {}
            }
            artifacts.push({
              name: file,
              path: filePath.replace(/\\/g, '/'),
              type: file.endsWith('.md') ? 'plan' : (file.match(/\.(png|jpg|webp|jpeg)$/i) ? 'image' : 'file'),
              badge: file.endsWith('.md') ? 'Document' : 'Media',
              sizeBytes: fstat.size,
              updatedAt: fstat.mtime.toISOString(),
              metadata: meta
            });
          }
        } catch (e) {}
      }

      // 2. Files in brain/scratch/
      const scratchDir = path.join(convBrainDir, 'scratch');
      if (fs.existsSync(scratchDir)) {
        const scratchFiles = fs.readdirSync(scratchDir);
        for (const sf of scratchFiles) {
          if (sf.startsWith('.') || sf.endsWith('.metadata.json')) continue;
          const sPath = path.join(scratchDir, sf);
          try {
            const sstat = fs.statSync(sPath);
            if (sstat.isFile()) {
              artifacts.push({
                name: `scratch/${sf}`,
                path: sPath.replace(/\\/g, '/'),
                type: 'scratch',
                badge: 'Scratch Script',
                sizeBytes: sstat.size,
                updatedAt: sstat.mtime.toISOString(),
                metadata: null
              });
            }
          } catch (e) {}
        }
      }
    } catch (e) {}
  }

  return { artifacts, summarySnippet };
}

// Scan all conversations in brain and conversations folder
async function scanConversations(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedConversations && (now - cacheTimestamp < 15000)) {
    return cachedConversations;
  }

  const brainDir = path.join(DATA_DIR, 'brain');
  if (!fs.existsSync(brainDir)) {
    return [];
  }

  const entries = fs.readdirSync(brainDir, { withFileTypes: true });
  const results = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
    const convId = entry.name;
    const convBrainDir = path.join(brainDir, convId);
    const transcriptPath = path.join(convBrainDir, '.system_generated', 'logs', 'transcript.jsonl');

    if (!fs.existsSync(transcriptPath)) {
      continue;
    }

    try {
      const stat = fs.statSync(transcriptPath);
      let stepCount = 0;
      let userMsgCount = 0;
      let assistantMsgCount = 0;
      let toolCount = 0;
      let firstPrompt = '';
      let lastPrompt = '';
      let detectedWorkspace = extractWorkspaceFromDb(convId);
      const createdFiles = new Set();

      // Fast streaming read of transcript
      const rl = readline.createInterface({
        input: fs.createReadStream(transcriptPath),
        crlfDelay: Infinity
      });

      for await (const line of rl) {
        if (!line.trim()) continue;
        stepCount++;
        try {
          const item = JSON.parse(line);
          if (item.type === 'USER_INPUT') {
            userMsgCount++;
            const promptText = cleanPrompt(item.content);
            if (!firstPrompt && promptText) {
              firstPrompt = promptText;
            }
            if (promptText) {
              lastPrompt = promptText;
            }
          } else if (item.type === 'PLANNER_RESPONSE') {
            assistantMsgCount++;
            if (item.tool_calls && Array.isArray(item.tool_calls)) {
              toolCount += item.tool_calls.length;
              for (const tc of item.tool_calls) {
                if (tc.name === 'write_to_file' && tc.args && tc.args.TargetFile) {
                  const cleanedTarget = String(tc.args.TargetFile).replace(/^["']|["']$/g, '').trim();
                  createdFiles.add(cleanedTarget);
                }
              }
            }
          } else if (item.source === 'MODEL' || (item.type && (item.type.includes('COMMAND') || item.type.includes('FILE') || item.type.includes('SEARCH')))) {
            toolCount++;
          }

          // Fallback workspace detection from file paths if not found in db
          if (!detectedWorkspace && item.content) {
            const m = item.content.match(/(?:file:\/\/\/|Cwd[\"':\s]+)([a-zA-Z]:[\\\/][^\",\n\r<>]+|\/[a-zA-Z0-9_\-\.]+)/i);
            if (m) {
              detectedWorkspace = m[1].replace(/\\/g, '/');
            }
          }
        } catch (e) {}
      }

      // Read artifacts in brain directory
      const { artifacts, summarySnippet } = scanArtifactsForConv(convId, convBrainDir, transcriptPath);

      // Also add deliverables created with write_to_file
      for (const cf of createdFiles) {
        const basename = path.basename(cf);
        // Avoid duplicate if already in brain artifacts
        if (!artifacts.some(a => a.name === basename || a.name === `scratch/${basename}`)) {
          artifacts.push({
            name: basename,
            path: cf.replace(/\\/g, '/'),
            type: 'deliverable',
            badge: 'Code Deliverable',
            sizeBytes: 0,
            updatedAt: stat.mtime.toISOString(),
            metadata: null
          });
        }
      }

      // Project name derived from workspace
      let projectName = 'General';
      if (detectedWorkspace) {
        const parts = detectedWorkspace.replace(/\/$/, '').split('/');
        projectName = parts[parts.length - 1] || detectedWorkspace;
      }

      // Title fallback
      let title = userData.customTitles[convId] || firstPrompt || `Session ${convId.substring(0, 8)}`;
      if (title.length > 120) {
        title = title.substring(0, 117) + '...';
      }

      results.push({
        id: convId,
        title,
        customTitle: userData.customTitles[convId] || null,
        firstPrompt: firstPrompt || '(No prompt captured)',
        lastPrompt: lastPrompt || firstPrompt || '',
        projectName,
        projectPath: detectedWorkspace || '',
        mtime: stat.mtime.toISOString(),
        timestamp: stat.mtime.getTime(),
        relativeTime: getRelativeTime(stat.mtime),
        formattedDate: stat.mtime.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        sizeKb: Math.round(stat.size / 1024),
        stepCount,
        userMsgCount,
        assistantMsgCount,
        toolCount,
        artifacts,
        hasArtifacts: artifacts.length > 0,
        summarySnippet,
        isFavorite: !!userData.favorites[convId],
        tags: userData.tags[convId] || []
      });
    } catch (e) {
      console.error(`Error processing conversation ${convId}:`, e.message);
    }
  }

  // Sort by latest modified first
  results.sort((a, b) => b.timestamp - a.timestamp);

  cachedConversations = results;
  cacheTimestamp = Date.now();
  return results;
}

// Helper to finalize a conversation turn
function finalizeTurn(t) {
  const lastResp = t.responses.length > 0 ? t.responses[t.responses.length - 1] : null;
  const commands = t.actions.filter(a => a.category === 'command').length;
  const edits = t.actions.filter(a => a.category === 'edit').length;
  const reads = t.actions.filter(a => a.category === 'read').length;

  return {
    turnIndex: t.turnIndex,
    user: t.user,
    thought: t.thoughts.join('\n\n'),
    actions: t.actions,
    actionStats: {
      total: t.actions.length,
      commands,
      edits,
      reads
    },
    finalResponse: lastResp ? lastResp.content : (t.responses.map(r => r.content).join('\n\n') || ''),
    responseStep: lastResp ? lastResp.step : null
  };
}

// Parse full conversation details
async function getConversationDetails(convId) {
  const convBrainDir = path.join(DATA_DIR, 'brain', convId);
  const transcriptPath = path.join(convBrainDir, '.system_generated', 'logs', 'transcript.jsonl');

  if (!fs.existsSync(transcriptPath)) {
    throw new Error('Transcript not found for conversation ' + convId);
  }

  const stat = fs.statSync(transcriptPath);
  const filesTouched = new Set();
  const createdFilesMap = new Map();
  const toolStats = {};
  let firstPrompt = '';
  let lastPrompt = '';

  // Read all items from transcript
  const rawLines = fs.readFileSync(transcriptPath, 'utf-8').split('\n');
  const rawItems = [];
  for (const line of rawLines) {
    if (!line.trim()) continue;
    try { rawItems.push(JSON.parse(line)); } catch(e) {}
  }

  const messages = [];
  const turns = [];
  let currentTurn = null;

  for (let i = 0; i < rawItems.length; i++) {
    const item = rawItems[i];
    const stepIndex = item.step_index !== undefined ? item.step_index : i;

    if (item.type === 'USER_INPUT') {
      const raw = item.content || '';
      const clean = cleanPrompt(raw);
      if (!firstPrompt && clean) firstPrompt = clean;
      if (clean) lastPrompt = clean;

      let metaSnippet = '';
      const metaMatch = raw.match(/<ADDITIONAL_METADATA>([\s\S]*?)<\/ADDITIONAL_METADATA>/i);
      if (metaMatch) {
        metaSnippet = metaMatch[1].trim();
      }

      if (currentTurn) {
        turns.push(finalizeTurn(currentTurn));
      }

      currentTurn = {
        turnIndex: turns.length + 1,
        user: {
          prompt: clean,
          rawPrompt: raw,
          hasMetadata: !!metaSnippet,
          metadataSnippet: metaSnippet,
          step: stepIndex
        },
        thoughts: [],
        actions: [],
        responses: []
      };

      messages.push({
        step: stepIndex,
        type: 'USER_INPUT',
        role: 'user',
        content: clean,
        rawContent: raw,
        status: item.status || 'DONE'
      });
    } else if (item.type === 'PLANNER_RESPONSE') {
      let content = item.content || '';
      let thought = '';

      const thoughtMatch = content.match(/<thought>([\s\S]*?)<\/thought>/i);
      if (thoughtMatch) {
        thought = thoughtMatch[1].trim();
        content = content.replace(/<thought>[\s\S]*?<\/thought>/gi, '').trim();
      }

      if (thought && currentTurn) {
        currentTurn.thoughts.push(thought);
      }

      const toolCalls = [];
      if (Array.isArray(item.tool_calls) && item.tool_calls.length > 0) {
        for (const tc of item.tool_calls) {
          const name = tc.name || tc.tool_name || 'unknown_tool';
          toolStats[name] = (toolStats[name] || 0) + 1;
          const args = tc.args || tc.arguments || {};

          let category = 'other';
          const lowerName = name.toLowerCase();
          if (lowerName.includes('command')) category = 'command';
          else if (lowerName.includes('write') || lowerName.includes('replace') || lowerName.includes('edit')) category = 'edit';
          else if (lowerName.includes('view') || lowerName.includes('list') || lowerName.includes('grep') || lowerName.includes('search')) category = 'read';

          if (args.TargetFile) {
            const cleanedFile = String(args.TargetFile).replace(/^["']|["']$/g, '').trim();
            filesTouched.add(cleanedFile);
            if (name === 'write_to_file') {
              createdFilesMap.set(cleanedFile, {
                description: args.Description || 'Created file',
                content: args.CodeContent || '',
                metadata: args.ArtifactMetadata || null
              });
            }
          }
          if (args.AbsolutePath) filesTouched.add(args.AbsolutePath);
          if (args.SearchPath) filesTouched.add(args.SearchPath);

          let output = '';
          for (let j = i + 1; j < Math.min(i + 4, rawItems.length); j++) {
            if (rawItems[j].source === 'MODEL' || (rawItems[j].type && (rawItems[j].type.includes('COMMAND') || rawItems[j].type.includes('FILE') || rawItems[j].type.includes('DIRECTORY') || rawItems[j].type.includes('SEARCH')))) {
              output = rawItems[j].content || '';
              break;
            }
          }

          const actionObj = {
            name,
            category,
            args,
            output: output.substring(0, 3000),
            summary: tc.toolSummary || '',
            action: tc.toolAction || '',
            step: stepIndex
          };

          toolCalls.push(actionObj);
          if (currentTurn) {
            currentTurn.actions.push(actionObj);
          }
        }
      }

      if (content && currentTurn) {
        currentTurn.responses.push({ content, step: stepIndex });
      }

      messages.push({
        step: stepIndex,
        type: 'PLANNER_RESPONSE',
        role: 'assistant',
        content,
        thought,
        toolCalls,
        status: item.status || 'DONE'
      });
    } else {
      const isTool = item.source === 'MODEL' || (item.type && (item.type.includes('COMMAND') || item.type.includes('FILE') || item.type.includes('SEARCH') || item.type.includes('DIRECTORY')));
      if (isTool) {
        toolStats[item.type] = (toolStats[item.type] || 0) + 1;
        messages.push({
          step: stepIndex,
          type: item.type || 'TOOL_RESULT',
          role: 'tool',
          content: (item.content || '').substring(0, 1000),
          fullContentLength: (item.content || '').length,
          status: item.status || 'DONE'
        });
      }
    }
  }

  if (currentTurn) {
    turns.push(finalizeTurn(currentTurn));
  }

  // Get all artifacts
  const { artifacts, summarySnippet } = scanArtifactsForConv(convId, convBrainDir, transcriptPath);

  // Read content for local artifacts
  for (const a of artifacts) {
    if (fs.existsSync(a.path)) {
      try {
        const fstat = fs.statSync(a.path);
        if (fstat.size < 200000 && !a.path.match(/\.(png|jpg|webp|jpeg)$/i)) {
          a.content = fs.readFileSync(a.path, 'utf-8');
        }
      } catch (e) {}
    }
  }

  // Add recorded workspace deliverables
  for (const [filePath, info] of createdFilesMap.entries()) {
    const basename = path.basename(filePath);
    if (!artifacts.some(a => a.name === basename || a.name === `scratch/${basename}`)) {
      let content = info.content;
      let sizeBytes = content ? Buffer.byteLength(content, 'utf-8') : 0;
      if (!content && fs.existsSync(filePath)) {
        try {
          const fstat = fs.statSync(filePath);
          sizeBytes = fstat.size;
          if (sizeBytes < 200000) content = fs.readFileSync(filePath, 'utf-8');
        } catch (e) {}
      }
      artifacts.push({
        name: basename,
        path: filePath.replace(/\\/g, '/'),
        type: 'deliverable',
        badge: 'Code Deliverable',
        sizeBytes,
        updatedAt: stat.mtime.toISOString(),
        content: content || `// File path: ${filePath}\n// ${info.description}`,
        metadata: info.metadata
      });
    }
  }

  const detectedWorkspace = extractWorkspaceFromDb(convId);
  let projectName = 'General';
  if (detectedWorkspace) {
    const parts = detectedWorkspace.replace(/\/$/, '').split('/');
    projectName = parts[parts.length - 1] || detectedWorkspace;
  }

  // Create an auto-synthesized Executive Session Deliverable
  const synthesizedSummaryMd = `# Session Continuity Summary: ${userData.customTitles[convId] || firstPrompt.substring(0, 80)}

- **Session ID**: \`${convId}\`
- **Project**: ${projectName} (\`${detectedWorkspace || 'Not recorded'}\`)
- **Total Steps**: ${messages.length} (${stat.size ? Math.round(stat.size / 1024) : 0} KB)
- **Last Active**: ${stat.mtime.toLocaleString()}

## Objective
${firstPrompt}

## Latest Status / Outcome
${lastPrompt}

${summarySnippet ? `## Highlights & Accomplishments\n${summarySnippet}\n` : ''}

## Files Touched (${filesTouched.size})
${Array.from(filesTouched).slice(0, 20).map(f => `- \`${f}\``).join('\n') || '- None recorded'}

## Generated Artifacts (${artifacts.length})
${artifacts.map(a => `- **${a.name}** (${a.badge}): \`${a.path}\``).join('\n') || '- None recorded'}
`;

  // Always include the synthesized summary as the first key document
  artifacts.unshift({
    name: 'session_summary.md',
    path: path.join(convBrainDir, 'session_summary.md').replace(/\\/g, '/'),
    type: 'plan',
    badge: 'Executive Summary',
    sizeBytes: Buffer.byteLength(synthesizedSummaryMd, 'utf-8'),
    updatedAt: stat.mtime.toISOString(),
    content: synthesizedSummaryMd,
    metadata: { summary: summarySnippet || 'Automated session recap' }
  });

  const transcriptNormPath = transcriptPath.replace(/\\/g, '/');
  const brainNormPath = convBrainDir.replace(/\\/g, '/');
  const filesListStr = Array.from(filesTouched).slice(0, 15).map(f => `- \`${f}\``).join('\n') || '- None recorded';
  const artifactListStr = artifacts.map(a => `- \`${a.name}\``).join('\n') || '- None';

  // 1. One-Shot Agent Recall Prompt (instructs Antigravity to load context)
  const agentRecallPrompt = `Please resume and continue our work from previous session (Conversation ID: \`${convId}\`).
Project Workspace: \`${detectedWorkspace || projectName}\`

Transcripts and artifacts are stored locally at:
- Transcript: \`${transcriptNormPath}\`
- Brain folder: \`${brainNormPath}\`

Context Recap:
- Initial Goal: ${firstPrompt}
- Latest Prompt / State: ${lastPrompt}
${summarySnippet ? `\nSummary of Accomplishments:\n${summarySnippet}\n` : ''}
Key Deliverables / Artifacts:
${artifactListStr}

Files Touched:
${filesListStr}

Please check the transcript and artifacts using view_file or review_transcript to restore complete continuity, and tell me what the next step is.`;

  // 2. Compact Prompt (Token Saver)
  const compactPrompt = `Resume context from past session \`${convId}\` (Project: ${projectName}).
Goal was: "${firstPrompt.substring(0, 150)}".
Latest state: "${lastPrompt.substring(0, 150)}".
Inspect \`${transcriptNormPath}\` if details are needed. Ready to continue.`;

  // 3. Slash command hint
  const slashCommandPrompt = `@${convId} Please load previous session context and resume from our last step.`;

  return {
    id: convId,
    title: userData.customTitles[convId] || firstPrompt || `Session ${convId.substring(0, 8)}`,
    projectName,
    projectPath: detectedWorkspace || '',
    brainPath: brainNormPath,
    transcriptPath: transcriptNormPath,
    mtime: stat.mtime.toISOString(),
    sizeKb: Math.round(stat.size / 1024),
    stepCount: messages.length,
    filesTouched: Array.from(filesTouched),
    toolStats,
    artifacts,
    summarySnippet,
    turns,
    messages,
    prompts: {
      agentRecallPrompt,
      compactPrompt,
      slashCommandPrompt
    },
    isFavorite: !!userData.favorites[convId],
    tags: userData.tags[convId] || []
  };
}

// Generate Markdown export for a conversation
function generateMarkdownExport(details) {
  let md = `# Conversation Export: ${details.title}\n\n`;
  md += `- **Conversation ID**: \`${details.id}\`\n`;
  md += `- **Project**: ${details.projectName} (\`${details.projectPath}\`)\n`;
  md += `- **Date**: ${details.mtime}\n`;
  md += `- **Total Steps**: ${details.stepCount}\n\n`;

  if (details.summarySnippet) {
    md += `## Executive Summary\n\n${details.summarySnippet}\n\n`;
  }

  if (details.artifacts && details.artifacts.length > 0) {
    md += `## Artifacts & Deliverables\n\n`;
    for (const a of details.artifacts) {
      md += `### ${a.name} (${Math.round(a.sizeBytes / 1024)} KB)\n\n`;
      if (a.content) {
        md += '```markdown\n' + a.content + '\n```\n\n';
      }
    }
  }

  md += `## Transcript\n\n`;
  for (const m of details.messages) {
    if (m.role === 'user') {
      md += `### User (Step ${m.step})\n\n${m.content}\n\n`;
    } else if (m.role === 'assistant') {
      md += `### Assistant (Step ${m.step})\n\n`;
      if (m.thought) {
        md += `> **Thought Process:**\n> ${m.thought.replace(/\n/g, '\n> ')}\n\n`;
      }
      if (m.content) {
        md += `${m.content}\n\n`;
      }
      if (m.toolCalls && m.toolCalls.length > 0) {
        md += `*Executed Tools:*\n`;
        for (const tc of m.toolCalls) {
          md += `- \`${tc.name}\`: ${tc.action || JSON.stringify(tc.args).substring(0, 100)}\n`;
        }
        md += '\n';
      }
    }
  }

  return md;
}

// Serve static files
function serveStatic(res, filePath, contentType) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File Not Found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });
    res.end(data);
  });
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  const pathname = urlObj.pathname;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    // API: Status
    if (pathname === '/api/status' && req.method === 'GET') {
      const brainDir = path.join(DATA_DIR, 'brain');
      const convsDir = path.join(DATA_DIR, 'conversations');
      const brainExists = fs.existsSync(brainDir);
      const convsExists = fs.existsSync(convsDir);
      const brainCount = brainExists ? fs.readdirSync(brainDir).filter(f => !f.startsWith('.')).length : 0;
      const convsCount = convsExists ? fs.readdirSync(convsDir).filter(f => f.endsWith('.db')).length : 0;

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'online',
        dataDir: DATA_DIR,
        platform: process.platform,
        nodeVersion: process.version,
        hasSqlite: !!DatabaseSync,
        brainCount,
        convsCount,
        defaultDir: getDefaultDataDir()
      }));
      return;
    }

    // API: Update data directory
    if (pathname === '/api/set-dir' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.path && fs.existsSync(parsed.path)) {
            DATA_DIR = parsed.path;
            cachedConversations = null;
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, dataDir: DATA_DIR }));
          } else {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Directory does not exist' }));
          }
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: e.message }));
        }
      });
      return;
    }

    // API: List conversations
    if (pathname === '/api/conversations' && req.method === 'GET') {
      const force = urlObj.searchParams.get('refresh') === 'true';
      const convs = await scanConversations(force);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, count: convs.length, conversations: convs }));
      return;
    }

    // API: Get conversation details
    if (pathname.startsWith('/api/conversation/') && req.method === 'GET') {
      const convId = pathname.replace('/api/conversation/', '').trim();
      const details = await getConversationDetails(convId);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, conversation: details }));
      return;
    }

    // API: Toggle Favorite
    if (pathname.startsWith('/api/favorite/') && req.method === 'POST') {
      const convId = pathname.replace('/api/favorite/', '').trim();
      userData.favorites[convId] = !userData.favorites[convId];
      saveUserData(userData);
      if (cachedConversations) {
        const item = cachedConversations.find(c => c.id === convId);
        if (item) item.isFavorite = !!userData.favorites[convId];
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, isFavorite: !!userData.favorites[convId] }));
      return;
    }

    // API: Set custom title or tags
    if (pathname.startsWith('/api/meta/') && req.method === 'POST') {
      const convId = pathname.replace('/api/meta/', '').trim();
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.customTitle !== undefined) {
            userData.customTitles[convId] = parsed.customTitle.trim();
          }
          if (parsed.tags !== undefined) {
            userData.tags[convId] = parsed.tags;
          }
          saveUserData(userData);
          cachedConversations = null;
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: e.message }));
        }
      });
      return;
    }

    // API: Export conversation (Markdown, JSON, HTML)
    if (pathname.startsWith('/api/export/') && req.method === 'GET') {
      const convId = pathname.replace('/api/export/', '').trim();
      const format = urlObj.searchParams.get('format') || 'markdown';
      const details = await getConversationDetails(convId);

      if (format === 'json') {
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="antigravity-${convId}.json"`
        });
        res.end(JSON.stringify(details, null, 2));
        return;
      }

      if (format === 'markdown') {
        const md = generateMarkdownExport(details);
        res.writeHead(200, {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': `attachment; filename="antigravity-${convId}.md"`
        });
        res.end(md);
        return;
      }

      if (format === 'html') {
        const md = generateMarkdownExport(details);
        const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${details.title} - Antigravity Export</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #ffffff; color: #0f172a; line-height: 1.6; max-width: 900px; margin: 0 auto; padding: 2rem; }
    pre { background: #f8fafc; border: 1px solid #e2e8f0; padding: 1rem; border-radius: 6px; overflow-x: auto; }
    code { font-family: monospace; color: #0f172a; }
    h1, h2, h3 { color: #0f172a; }
    blockquote { border-left: 3px solid #0f172a; margin: 0; padding-left: 1rem; color: #475569; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; background: #f1f5f9; font-size: 0.85rem; margin-right: 6px; border: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div style="margin-bottom: 2rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 1rem;">
    <h1>${details.title}</h1>
    <span class="badge">ID: ${details.id}</span>
    <span class="badge">Project: ${details.projectName}</span>
    <span class="badge">${details.mtime}</span>
  </div>
  <pre style="white-space: pre-wrap;">${md.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
</body>
</html>`;
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `attachment; filename="antigravity-${convId}.html"`
        });
        res.end(html);
        return;
      }
    }

    // API: Open folder in OS file explorer
    if (pathname.startsWith('/api/open-folder/') && req.method === 'POST') {
      const convId = pathname.replace('/api/open-folder/', '').trim();
      const folderPath = path.join(DATA_DIR, 'brain', convId);
      if (fs.existsSync(folderPath)) {
        if (process.platform === 'win32') {
          exec(`explorer.exe "${folderPath}"`);
        } else if (process.platform === 'darwin') {
          exec(`open "${folderPath}"`);
        } else {
          exec(`xdg-open "${folderPath}"`);
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
        return;
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Folder not found' }));
        return;
      }
    }

    // Serve vendor libraries
    if (pathname.startsWith('/vendor/')) {
      const filename = pathname.replace('/vendor/', '');
      const filePath = path.join(__dirname, 'public', 'vendor', filename);
      if (fs.existsSync(filePath)) {
        serveStatic(res, filePath, filename.endsWith('.css') ? 'text/css' : 'application/javascript');
        return;
      }
    }

    // Static Web App Files
    if (pathname === '/' || pathname === '/index.html') {
      serveStatic(res, path.join(__dirname, 'public', 'index.html'), 'text/html; charset=utf-8');
      return;
    }
    if (pathname === '/style.css') {
      serveStatic(res, path.join(__dirname, 'public', 'style.css'), 'text/css; charset=utf-8');
      return;
    }
    if (pathname === '/app.js') {
      serveStatic(res, path.join(__dirname, 'public', 'app.js'), 'application/javascript; charset=utf-8');
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  } catch (err) {
    console.error('Server error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: err.message }));
  }
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`Antigravity Continuity Portal`);
  console.log(`Running at: http://localhost:${PORT}`);
  console.log(`Data Dir:   ${DATA_DIR}`);
  console.log(`OS:         ${process.platform} (${os.type()})`);
  console.log(`======================================================\n`);
});
