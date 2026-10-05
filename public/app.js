/**
 * Antigravity Continuity Portal - Frontend Application Logic
 * Professional, high-contrast, productive dashboard
 */

// Application State
const state = {
  conversations: [],
  filteredConversations: [],
  selectedConvId: null,
  currentConvDetails: null,
  activeFilter: 'all',
  activeProject: 'ALL',
  searchQuery: '',
  sortBy: 'recent',
  activeTab: 'timeline',
  timelineViewMode: 'turns',
  allActionsExpanded: false,
  theme: localStorage.getItem('antigravity_theme') || 'light',
  systemStatus: null
};

// DOM Elements
const dom = {
  statusSummary: document.getElementById('statusSummary'),
  headerDirPath: document.getElementById('headerDirPath'),
  osBadge: document.getElementById('osBadge'),
  searchInput: document.getElementById('searchInput'),
  clearSearchBtn: document.getElementById('clearSearchBtn'),
  projectFilter: document.getElementById('projectFilter'),
  sortFilter: document.getElementById('sortFilter'),
  filterChips: document.querySelectorAll('.chip'),
  totalCountBadge: document.getElementById('totalCountBadge'),
  favCountBadge: document.getElementById('favCountBadge'),
  artifactCountBadge: document.getElementById('artifactCountBadge'),
  conversationList: document.getElementById('conversationList'),
  footerConvsCount: document.getElementById('footerConvsCount'),
  footerProjectsCount: document.getElementById('footerProjectsCount'),
  refreshBtn: document.getElementById('refreshBtn'),
  themeToggleBtn: document.getElementById('themeToggleBtn'),
  themeIcon: document.getElementById('themeIcon'),
  themeText: document.getElementById('themeText'),

  // Panels
  emptyState: document.getElementById('emptyState'),
  detailContainer: document.getElementById('detailContainer'),

  // Detail Elements
  detailProjectBadge: document.getElementById('detailProjectBadge'),
  detailTitle: document.getElementById('detailTitle'),
  detailStarBtn: document.getElementById('detailStarBtn'),
  starBtnText: document.getElementById('starBtnText'),
  detailIdPill: document.getElementById('detailIdPill'),
  detailId: document.getElementById('detailId'),
  detailWorkspaceItem: document.getElementById('detailWorkspaceItem'),
  detailWorkspace: document.getElementById('detailWorkspace'),
  detailDate: document.getElementById('detailDate'),
  detailStats: document.getElementById('detailStats'),

  // Action Buttons
  copyContinuityBtn: document.getElementById('copyContinuityBtn'),
  copyCompactPromptBtn: document.getElementById('copyCompactPromptBtn'),
  openBrainFolderBtn: document.getElementById('openBrainFolderBtn'),
  exportDropdownBtn: document.getElementById('exportDropdownBtn'),
  exportMenu: document.getElementById('exportMenu'),
  exportMdBtn: document.getElementById('exportMdBtn'),
  exportJsonBtn: document.getElementById('exportJsonBtn'),
  exportHtmlBtn: document.getElementById('exportHtmlBtn'),

  // Tabs
  tabBtns: document.querySelectorAll('.tab-btn'),
  tabContents: document.querySelectorAll('.tab-content'),
  tabMsgCount: document.getElementById('tabMsgCount'),
  tabArtifactsCount: document.getElementById('tabArtifactsCount'),
  tabFilesCount: document.getElementById('tabFilesCount'),

  // Timeline
  timelineSearch: document.getElementById('timelineSearch'),
  viewModeTurns: document.getElementById('viewModeTurns'),
  viewModeSteps: document.getElementById('viewModeSteps'),
  allStepsCount: document.getElementById('allStepsCount'),
  toggleAllActionsBtn: document.getElementById('toggleAllActionsBtn'),
  toggleAllActionsText: document.getElementById('toggleAllActionsText'),
  messagesContainer: document.getElementById('messagesContainer'),

  // Continuity Prompts
  agentRecallPromptArea: document.getElementById('agentRecallPromptArea'),
  compactPromptArea: document.getElementById('compactPromptArea'),
  slashPromptArea: document.getElementById('slashPromptArea'),

  // Artifacts
  artifactsGrid: document.getElementById('artifactsGrid'),
  artifactPreviewCard: document.getElementById('artifactPreviewCard'),
  previewFileName: document.getElementById('previewFileName'),
  previewBadge: document.getElementById('previewBadge'),
  previewContent: document.getElementById('previewContent'),
  copyArtifactBtn: document.getElementById('copyArtifactBtn'),

  // Files & Tools
  toolsSummary: document.getElementById('toolsSummary'),
  filesCountHeader: document.getElementById('filesCountHeader'),
  filesList: document.getElementById('filesList'),

  // Notes
  customTitleInput: document.getElementById('customTitleInput'),
  tagsInput: document.getElementById('tagsInput'),
  saveMetaBtn: document.getElementById('saveMetaBtn'),

  // Modals
  dirModal: document.getElementById('dirModal'),
  openDirModalBtn: document.getElementById('openDirModalBtn'),
  closeDirModalBtn: document.getElementById('closeDirModalBtn'),
  cancelDirBtn: document.getElementById('cancelDirBtn'),
  saveDirBtn: document.getElementById('saveDirBtn'),
  dirInput: document.getElementById('dirInput'),
  suggestWindowsBtn: document.getElementById('suggestWindowsBtn'),
  suggestLinuxBtn: document.getElementById('suggestLinuxBtn'),

  helpModal: document.getElementById('helpModal'),
  helpModalBtn: document.getElementById('helpModalBtn'),
  closeHelpModalBtn: document.getElementById('closeHelpModalBtn'),
  dismissHelpBtn: document.getElementById('dismissHelpBtn'),

  quickPromptModal: document.getElementById('quickPromptModal'),
  quickPromptModalBtn: document.getElementById('quickPromptModalBtn'),
  closeQuickPromptBtn: document.getElementById('closeQuickPromptBtn'),
  closeQuickPromptBtn2: document.getElementById('closeQuickPromptBtn2'),
  copyLatestPromptBtn: document.getElementById('copyLatestPromptBtn'),
  latestSessionTitle: document.getElementById('latestSessionTitle'),
  latestPromptText: document.getElementById('latestPromptText'),

  toastContainer: document.getElementById('toastContainer')
};

// Render Lucide icons safely
function renderIcons() {
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

// Show Toast Notification
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<i data-lucide="check" class="icon-xs"></i><span>${escapeHtml(message)}</span>`;
  dom.toastContainer.appendChild(toast);
  renderIcons();
  setTimeout(() => {
    if (toast.parentNode) toast.parentNode.removeChild(toast);
  }, 3000);
}

// Copy to Clipboard
async function copyToClipboard(text, successMsg = 'Copied to clipboard!') {
  try {
    await navigator.clipboard.writeText(text);
    showToast(successMsg);
  } catch (err) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast(successMsg);
  }
}

// Apply Theme
function applyTheme(theme) {
  state.theme = theme;
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('antigravity_theme', theme);

  if (theme === 'dark') {
    dom.themeIcon.setAttribute('data-lucide', 'sun');
    dom.themeText.textContent = 'Light';
  } else {
    dom.themeIcon.setAttribute('data-lucide', 'moon');
    dom.themeText.textContent = 'Dark';
  }
  renderIcons();
}

// Load System Status
async function loadStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    state.systemStatus = data;
    dom.headerDirPath.textContent = data.dataDir;
    dom.headerDirPath.title = data.dataDir;
    dom.dirInput.value = data.dataDir;
    dom.osBadge.textContent = `${data.platform.toUpperCase()} (${data.nodeVersion})`;
    dom.statusSummary.textContent = `${data.convsCount || data.brainCount} Sessions`;
  } catch (e) {
    console.error('Error loading status:', e);
    dom.statusSummary.textContent = 'Offline';
  }
}

// Load Conversations
async function loadConversations(forceRefresh = false) {
  dom.conversationList.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <span>Indexing Antigravity sessions from disk...</span>
    </div>
  `;

  try {
    const res = await fetch(`/api/conversations${forceRefresh ? '?refresh=true' : ''}`);
    const data = await res.json();
    if (data.success) {
      state.conversations = data.conversations;
      updateFilterOptions();
      applyFilters();
      updateBadgeCounts();

      // If a conversation was selected, keep it selected
      if (state.selectedConvId) {
        selectConversation(state.selectedConvId, false);
      }
    }
  } catch (e) {
    console.error('Error loading conversations:', e);
    dom.conversationList.innerHTML = `
      <div class="loading-state" style="color: #ef4444">
        Error indexing sessions: ${escapeHtml(e.message)}
      </div>
    `;
  }
}

// Populate Project Filter Dropdown
function updateFilterOptions() {
  const projects = new Set();
  for (const c of state.conversations) {
    if (c.projectName) projects.add(c.projectName);
  }

  const currentSelection = dom.projectFilter.value;
  dom.projectFilter.innerHTML = '<option value="ALL">All Projects</option>';
  Array.from(projects).sort().forEach(p => {
    const opt = document.createElement('option');
    opt.value = p;
    opt.textContent = p;
    dom.projectFilter.appendChild(opt);
  });
  if (projects.has(currentSelection)) {
    dom.projectFilter.value = currentSelection;
  }
}

// Update Badge Counts
function updateBadgeCounts() {
  dom.totalCountBadge.textContent = state.conversations.length;
  dom.favCountBadge.textContent = state.conversations.filter(c => c.isFavorite).length;
  dom.artifactCountBadge.textContent = state.conversations.filter(c => c.hasArtifacts).length;

  const projects = new Set(state.conversations.map(c => c.projectName));
  dom.footerConvsCount.textContent = `${state.conversations.length} sessions`;
  dom.footerProjectsCount.textContent = `${projects.size} projects`;
}

// Filter and Sort Conversations
function applyFilters() {
  let list = [...state.conversations];

  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    list = list.filter(c => {
      return (c.title && c.title.toLowerCase().includes(q)) ||
             (c.id && c.id.toLowerCase().includes(q)) ||
             (c.projectName && c.projectName.toLowerCase().includes(q)) ||
             (c.firstPrompt && c.firstPrompt.toLowerCase().includes(q)) ||
             (c.lastPrompt && c.lastPrompt.toLowerCase().includes(q)) ||
             (c.tags && c.tags.some(t => t.toLowerCase().includes(q)));
    });
  }

  if (state.activeProject !== 'ALL') {
    list = list.filter(c => c.projectName === state.activeProject);
  }

  if (state.activeFilter === 'favorites') {
    list = list.filter(c => c.isFavorite);
  } else if (state.activeFilter === 'artifacts') {
    list = list.filter(c => c.hasArtifacts);
  }

  if (state.sortBy === 'recent') {
    list.sort((a, b) => b.timestamp - a.timestamp);
  } else if (state.sortBy === 'steps') {
    list.sort((a, b) => b.stepCount - a.stepCount);
  } else if (state.sortBy === 'size') {
    list.sort((a, b) => b.sizeKb - a.sizeKb);
  } else if (state.sortBy === 'name') {
    list.sort((a, b) => (a.projectName || '').localeCompare(b.projectName || ''));
  }

  state.filteredConversations = list;
  renderConversationList();
}

// Render Conversation List
function renderConversationList() {
  if (state.filteredConversations.length === 0) {
    dom.conversationList.innerHTML = `
      <div class="loading-state">
        No sessions found matching filters.
      </div>
    `;
    return;
  }

  dom.conversationList.innerHTML = '';
  state.filteredConversations.forEach(c => {
    const card = document.createElement('div');
    card.className = `conv-card ${c.id === state.selectedConvId ? 'active' : ''}`;
    card.dataset.id = c.id;

    card.innerHTML = `
      <div class="conv-card-top">
        <span class="project-tag">${escapeHtml(c.projectName || 'General')}</span>
        <span class="conv-time">${c.relativeTime}</span>
      </div>
      <div class="conv-title">${escapeHtml(c.title)}</div>
      <div class="conv-card-bottom">
        <div class="conv-badges">
          <span class="badge-item">${c.stepCount} steps</span>
          <span class="badge-item">${c.sizeKb} KB</span>
          ${c.hasArtifacts ? `<span class="badge-item">${c.artifacts.length} artifacts</span>` : ''}
        </div>
        <div class="conv-card-actions">
          <button class="card-action-btn copy-prompt-btn" title="Copy Continuity Prompt" data-id="${c.id}">
            <i data-lucide="sparkles" class="icon-xs"></i>
          </button>
          <button class="card-action-btn star-btn ${c.isFavorite ? 'star-active' : ''}" title="Star" data-id="${c.id}">
            <i data-lucide="star" class="icon-xs"></i>
          </button>
        </div>
      </div>
    `;

    card.addEventListener('click', (e) => {
      if (e.target.closest('.card-action-btn')) return;
      selectConversation(c.id);
    });

    const promptBtn = card.querySelector('.copy-prompt-btn');
    promptBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await copyQuickPromptForId(c.id);
    });

    const starBtn = card.querySelector('.star-btn');
    starBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await toggleFavorite(c.id);
    });

    dom.conversationList.appendChild(card);
  });

  renderIcons();
}

// Select Conversation
async function selectConversation(convId, scrollIntoView = true) {
  state.selectedConvId = convId;

  document.querySelectorAll('.conv-card').forEach(el => {
    el.classList.toggle('active', el.dataset.id === convId);
  });

  dom.emptyState.style.display = 'none';
  dom.detailContainer.style.display = 'flex';

  try {
    const res = await fetch(`/api/conversation/${convId}`);
    const data = await res.json();
    if (data.success) {
      state.currentConvDetails = data.conversation;
      renderConversationDetails(data.conversation);
    }
  } catch (e) {
    console.error('Error fetching conversation details:', e);
    showToast('Failed to load conversation details');
  }
}

// Render Conversation Details
function renderConversationDetails(details) {
  dom.detailTitle.textContent = details.title;
  dom.detailProjectBadge.textContent = details.projectName || 'General';

  dom.detailId.textContent = details.id;
  dom.detailWorkspace.textContent = details.projectPath || '(Workspace not recorded)';
  dom.detailWorkspaceItem.title = details.projectPath || '';
  dom.detailDate.textContent = new Date(details.mtime).toLocaleString();
  dom.detailStats.textContent = `${details.stepCount} steps • ${details.sizeKb} KB`;

  dom.detailStarBtn.classList.toggle('active', details.isFavorite);
  dom.starBtnText.textContent = details.isFavorite ? 'Starred' : 'Star';

  dom.agentRecallPromptArea.value = details.prompts.agentRecallPrompt;
  dom.compactPromptArea.value = details.prompts.compactPrompt;
  dom.slashPromptArea.value = details.prompts.slashCommandPrompt;

  dom.tabMsgCount.textContent = details.messages.length;
  dom.tabArtifactsCount.textContent = details.artifacts ? details.artifacts.length : 0;
  dom.tabFilesCount.textContent = details.filesTouched ? details.filesTouched.length : 0;

  renderTimeline(details);
  renderArtifacts(details);
  renderFilesAndTools(details);
  renderNotes(details);
  renderIcons();
}

// Custom Markdown Renderer with code block headers and copy buttons
function renderMarkdown(content) {
  if (!content) return '';
  if (!window.marked || typeof window.marked.parse !== 'function') {
    return `<div class="msg-content">${escapeHtml(content)}</div>`;
  }

  try {
    const renderer = new window.marked.Renderer();
    renderer.code = function(code, language) {
      const lang = language || 'code';
      const cleanCode = typeof code === 'object' && code !== null && code.text ? code.text : String(code);
      return `
        <div class="code-block-wrapper">
          <div class="code-block-header">
            <span class="code-lang">${escapeHtml(lang)}</span>
            <button class="code-copy-btn" onclick="copyCodeSnippet(this)">
              <i data-lucide="copy" class="icon-xs"></i>
              <span>Copy</span>
            </button>
          </div>
          <pre><code class="language-${escapeHtml(lang)}">${escapeHtml(cleanCode)}</code></pre>
        </div>
      `;
    };

    let html = window.marked.parse(content, { renderer });
    // Tag any <a> that wraps <code> with class 'has-code' to prevent nested boxes
    html = html.replace(/<a\s+([^>]*?)>(\s*<code[^>]*>)/gi, '<a $1 class="has-code">$2');
    return `<div class="markdown-body">${html}</div>`;
  } catch (e) {
    return `<div class="msg-content">${escapeHtml(content)}</div>`;
  }
}

// Global code copy helper
window.copyCodeSnippet = async function(btn) {
  const wrapper = btn.closest('.code-block-wrapper');
  if (!wrapper) return;
  const codeEl = wrapper.querySelector('pre code');
  if (!codeEl) return;
  const text = codeEl.innerText || codeEl.textContent;
  await copyToClipboard(text, 'Copied code snippet!');
  btn.innerHTML = `<i data-lucide="check" class="icon-xs"></i><span>Copied</span>`;
  renderIcons();
  setTimeout(() => {
    btn.innerHTML = `<i data-lucide="copy" class="icon-xs"></i><span>Copy</span>`;
    renderIcons();
  }, 2000);
};

// Render Timeline Controller
function renderTimeline(details) {
  dom.messagesContainer.innerHTML = '';
  if (dom.allStepsCount) {
    dom.allStepsCount.textContent = details.messages ? details.messages.length : 0;
  }

  const searchFilter = (dom.timelineSearch.value || '').toLowerCase();

  if (state.timelineViewMode === 'steps' || (!details.turns || details.turns.length === 0)) {
    renderTimelineSteps(details, searchFilter);
  } else {
    renderTimelineTurns(details, searchFilter);
  }

  renderIcons();
}

// Render Refined Turn-Based Conversation
function renderTimelineTurns(details, searchFilter) {
  const turns = details.turns || [];

  const filteredTurns = turns.filter(t => {
    if (!searchFilter) return true;
    const u = (t.user && t.user.prompt ? t.user.prompt : '').toLowerCase();
    const r = (t.finalResponse || '').toLowerCase();
    const th = (t.thought || '').toLowerCase();
    return u.includes(searchFilter) || r.includes(searchFilter) || th.includes(searchFilter);
  });

  if (filteredTurns.length === 0) {
    dom.messagesContainer.innerHTML = `<div class="loading-state">No conversation turns match filter.</div>`;
    return;
  }

  filteredTurns.forEach(turn => {
    const card = document.createElement('div');
    card.className = 'turn-card';

    // 1. User Message Section
    let metaAccordionHtml = '';
    if (turn.user && turn.user.hasMetadata && turn.user.metadataSnippet) {
      metaAccordionHtml = `
        <details class="meta-accordion">
          <summary>Session Context & Active Files</summary>
          <pre>${escapeHtml(turn.user.metadataSnippet)}</pre>
        </details>
      `;
    }

    const userHtml = `
      <div class="turn-user-box">
        <div class="user-header">
          <div class="user-author">
            <div class="user-author-avatar">
              <i data-lucide="user" class="icon-xs"></i>
            </div>
            <span>User</span>
          </div>
          <div style="display:flex; align-items:center; gap:0.5rem;">
            <span class="monospace text-muted" style="font-size:0.7rem;">Step ${turn.user ? turn.user.step : 0}</span>
            <button class="card-action-btn" title="Copy Prompt" onclick="copyToClipboard('${escapeHtml(turn.user ? turn.user.prompt : '').replace(/'/g, "\\'")}', 'Copied prompt!')">
              <i data-lucide="copy" class="icon-xs"></i>
            </button>
          </div>
        </div>
        <div class="user-prompt-text">${escapeHtml(turn.user ? turn.user.prompt : '')}</div>
        ${metaAccordionHtml}
      </div>
    `;

    // 2. Action Cluster (Tools & Reasoning)
    let actionsHtml = '';
    const stats = turn.actionStats || { total: 0, commands: 0, edits: 0, reads: 0 };
    if (turn.actions && turn.actions.length > 0) {
      let thoughtHtml = '';
      if (turn.thought) {
        thoughtHtml = `
          <div class="turn-thought-card">
            <div class="turn-thought-header">
              <i data-lucide="brain" class="icon-xs"></i>
              <span>Reasoning & Thought Process</span>
            </div>
            <div class="turn-thought-content">${escapeHtml(turn.thought)}</div>
          </div>
        `;
      }

      const actionItemsHtml = turn.actions.map(act => {
        let catIcon = 'activity';
        let catLabel = 'Action';
        if (act.category === 'command') { catIcon = 'terminal'; catLabel = 'Command'; }
        else if (act.category === 'edit') { catIcon = 'file-edit'; catLabel = 'Modified'; }
        else if (act.category === 'read') { catIcon = 'search'; catLabel = 'Inspected'; }

        let outputDetailsHtml = '';
        if (act.output && act.output.trim()) {
          outputDetailsHtml = `
            <details class="action-output-details">
              <summary>Output & Logs</summary>
              <pre>${escapeHtml(act.output)}</pre>
            </details>
          `;
        }

        let descText = act.action || act.summary || '';
        if (!descText && act.args) {
          if (act.args.CommandLine) descText = act.args.CommandLine;
          else if (act.args.TargetFile) descText = act.args.TargetFile;
          else if (act.args.AbsolutePath) descText = act.args.AbsolutePath;
        }

        return `
          <div class="action-item">
            <div class="action-item-top">
              <div class="action-item-header">
                <i data-lucide="${catIcon}" class="icon-xs"></i>
                <span class="monospace">${escapeHtml(act.name)}</span>
                <span class="action-category-badge">${catLabel}</span>
              </div>
              <span class="monospace text-muted" style="font-size:0.68rem;">Step ${act.step}</span>
            </div>
            ${descText ? `<div class="action-item-desc monospace">${escapeHtml(descText)}</div>` : ''}
            ${outputDetailsHtml}
          </div>
        `;
      }).join('');

      actionsHtml = `
        <div class="turn-actions-cluster">
          <div class="action-cluster-header" onclick="this.parentElement.classList.toggle('open')">
            <div class="action-cluster-title">
              <i data-lucide="activity" class="icon-xs"></i>
              <span>Executed ${stats.total} operations</span>
              <span class="action-cluster-count">(${stats.edits} edits, ${stats.commands} commands, ${stats.reads} inspected)</span>
            </div>
            <i data-lucide="chevron-down" class="icon-xs action-cluster-chevron"></i>
          </div>
          <div class="action-cluster-body">
            ${thoughtHtml}
            ${actionItemsHtml}
          </div>
        </div>
      `;
    }

    // 3. Assistant Final Response
    let assistantHtml = '';
    if (turn.finalResponse) {
      assistantHtml = `
        <div class="turn-assistant-box">
          <div class="assistant-header">
            <div class="assistant-author">
              <div class="assistant-author-avatar">
                <i data-lucide="bot" class="icon-xs"></i>
              </div>
              <span>Antigravity Assistant</span>
            </div>
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <span class="monospace text-muted" style="font-size:0.7rem;">Step ${turn.responseStep || ''}</span>
              <button class="card-action-btn" title="Copy Response" onclick="copyToClipboard('${escapeHtml(turn.finalResponse).replace(/'/g, "\\'")}', 'Copied response!')">
                <i data-lucide="copy" class="icon-xs"></i>
              </button>
            </div>
          </div>
          ${renderMarkdown(turn.finalResponse)}
        </div>
      `;
    }

    card.innerHTML = `
      <div class="turn-header">
        <span class="turn-badge">Turn ${turn.turnIndex} of ${turns.length}</span>
      </div>
      ${userHtml}
      ${actionsHtml}
      ${assistantHtml}
    `;

    dom.messagesContainer.appendChild(card);
  });
}

// Render Step-by-Step Developer Trace
function renderTimelineSteps(details, searchFilter) {
  const filteredMsgs = (details.messages || []).filter(m => {
    if (searchFilter) {
      const c = (m.content || '').toLowerCase();
      const t = (m.thought || '').toLowerCase();
      return c.includes(searchFilter) || t.includes(searchFilter);
    }
    return true;
  });

  if (filteredMsgs.length === 0) {
    dom.messagesContainer.innerHTML = `<div class="loading-state">No steps match filter.</div>`;
    return;
  }

  filteredMsgs.forEach(m => {
    const bubble = document.createElement('div');
    bubble.className = `msg-bubble msg-${m.role}`;

    let authorName = 'User';
    let iconName = 'user';
    if (m.role === 'assistant') {
      authorName = 'Antigravity Assistant';
      iconName = 'bot';
    } else if (m.role === 'tool') {
      authorName = `Tool: ${m.type}`;
      iconName = 'terminal';
    }

    let thoughtHtml = '';
    if (m.thought) {
      thoughtHtml = `
        <div class="thought-box">
          <div class="thought-header">Reasoning</div>
          ${escapeHtml(m.thought)}
        </div>
      `;
    }

    let toolCallsHtml = '';
    if (m.toolCalls && m.toolCalls.length > 0) {
      toolCallsHtml = m.toolCalls.map(tc => `
        <div class="tool-accordion">
          <div class="tool-header" onclick="this.parentElement.classList.toggle('open')">
            <span>${escapeHtml(tc.name)}: ${escapeHtml(tc.action || tc.summary || 'Command')}</span>
            <span style="font-size:0.7rem; color:var(--text-muted); font-family:inherit;">click to view</span>
          </div>
          <div class="tool-body">${escapeHtml(JSON.stringify(tc.args, null, 2))}</div>
        </div>
      `).join('');
    }

    let renderedContent = '';
    if (m.role === 'assistant') {
      renderedContent = renderMarkdown(m.content || '');
    } else {
      renderedContent = `<div class="msg-content">${escapeHtml(m.content || '')}</div>`;
    }

    bubble.innerHTML = `
      <div class="msg-header">
        <span class="msg-author">
          <i data-lucide="${iconName}" class="icon-xs"></i>
          <span>${authorName}</span>
        </span>
        <span class="msg-step monospace">Step ${m.step}</span>
      </div>
      ${thoughtHtml}
      ${renderedContent}
      ${toolCallsHtml}
    `;

    dom.messagesContainer.appendChild(bubble);
  });
}

// Render Artifacts
function renderArtifacts(details) {
  dom.artifactsGrid.innerHTML = '';
  const artifacts = details.artifacts || [];

  if (artifacts.length === 0) {
    dom.artifactsGrid.innerHTML = `
      <div class="loading-state" style="grid-column: 1 / -1;">
        No artifacts or deliverables recorded in this session.
      </div>
    `;
    dom.artifactPreviewCard.style.display = 'none';
    return;
  }

  artifacts.forEach((a, idx) => {
    const card = document.createElement('div');
    card.className = `artifact-card ${idx === 0 ? 'active' : ''}`;
    card.dataset.index = idx;

    let icon = 'file-text';
    if (a.type === 'scratch') icon = 'code';
    if (a.type === 'deliverable') icon = 'file-code';
    if (a.type === 'image') icon = 'image';

    card.innerHTML = `
      <div class="artifact-card-top">
        <i data-lucide="${icon}" class="icon-sm"></i>
        <span class="badge">${escapeHtml(a.badge || 'Document')}</span>
      </div>
      <div class="artifact-card-title">${escapeHtml(a.name)}</div>
      <div class="artifact-card-meta">
        ${a.sizeBytes ? `${Math.round(a.sizeBytes / 1024)} KB` : 'Created'} &bull; ${new Date(a.updatedAt).toLocaleDateString()}
      </div>
    `;

    card.addEventListener('click', () => {
      document.querySelectorAll('.artifact-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      previewArtifact(a);
    });

    dom.artifactsGrid.appendChild(card);
  });

  // Automatically preview the first artifact by default
  previewArtifact(artifacts[0]);
  renderIcons();
}

// Preview Artifact in Markdown or Raw
function previewArtifact(artifact) {
  dom.previewFileName.textContent = artifact.name;
  dom.previewBadge.textContent = artifact.badge || 'Document';

  const content = artifact.content || '(File is binary or large)';

  if (artifact.name.endsWith('.md') && window.marked && typeof window.marked.parse === 'function') {
    try {
      dom.previewContent.innerHTML = window.marked.parse(content);
    } catch (e) {
      dom.previewContent.innerHTML = `<pre class="monospace">${escapeHtml(content)}</pre>`;
    }
  } else {
    dom.previewContent.innerHTML = `<pre class="monospace" style="white-space: pre-wrap;">${escapeHtml(content)}</pre>`;
  }

  dom.artifactPreviewCard.style.display = 'block';

  dom.copyArtifactBtn.onclick = () => {
    copyToClipboard(artifact.content || '', `Copied ${artifact.name}!`);
  };

  renderIcons();
}

// Render Files and Tools
function renderFilesAndTools(details) {
  dom.toolsSummary.innerHTML = '';
  const stats = details.toolStats || {};
  const toolKeys = Object.keys(stats);
  if (toolKeys.length === 0) {
    dom.toolsSummary.innerHTML = `<span class="text-muted text-sm">No tool executions recorded.</span>`;
  } else {
    toolKeys.sort((a, b) => stats[b] - stats[a]).forEach(k => {
      const chip = document.createElement('div');
      chip.className = 'tool-chip-stat';
      chip.innerHTML = `
        <span class="tool-chip-name">${escapeHtml(k)}:</span>
        <span class="tool-chip-count">${stats[k]}</span>
      `;
      dom.toolsSummary.appendChild(chip);
    });
  }

  dom.filesList.innerHTML = '';
  const files = details.filesTouched || [];
  dom.filesCountHeader.textContent = files.length;
  if (files.length === 0) {
    dom.filesList.innerHTML = `<li class="text-muted text-sm">No file paths recorded in tool calls.</li>`;
  } else {
    files.forEach(f => {
      const li = document.createElement('li');
      li.innerHTML = `
        <i data-lucide="file" class="icon-xs"></i>
        <span class="monospace" style="flex:1;">${escapeHtml(f)}</span>
        <button class="card-action-btn" title="Copy Path" onclick="copyToClipboard('${escapeHtml(f).replace(/'/g, "\\'")}', 'Copied file path!')">
          <i data-lucide="copy" class="icon-xs"></i>
        </button>
      `;
      dom.filesList.appendChild(li);
    });
  }
  renderIcons();
}

// Render Notes
function renderNotes(details) {
  dom.customTitleInput.value = details.title !== details.firstPrompt ? details.title : '';
  dom.tagsInput.value = (details.tags || []).join(', ');
}

// Toggle Favorite
async function toggleFavorite(convId) {
  try {
    const res = await fetch(`/api/favorite/${convId}`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      const c = state.conversations.find(item => item.id === convId);
      if (c) c.isFavorite = data.isFavorite;
      if (state.currentConvDetails && state.currentConvDetails.id === convId) {
        state.currentConvDetails.isFavorite = data.isFavorite;
        dom.detailStarBtn.classList.toggle('active', data.isFavorite);
        dom.starBtnText.textContent = data.isFavorite ? 'Starred' : 'Star';
      }
      applyFilters();
      updateBadgeCounts();
      showToast(data.isFavorite ? 'Starred session' : 'Removed star');
    }
  } catch (e) {
    console.error('Error toggling favorite:', e);
  }
}

// Quick Copy Prompt For ID
async function copyQuickPromptForId(convId) {
  try {
    const res = await fetch(`/api/conversation/${convId}`);
    const data = await res.json();
    if (data.success && data.conversation.prompts) {
      await copyToClipboard(
        data.conversation.prompts.agentRecallPrompt,
        'Copied Continuity Prompt! Paste in Antigravity chat'
      );
    }
  } catch (e) {
    console.error('Error copying prompt:', e);
  }
}

// Utility: HTML Escaping
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Setup Event Listeners
function setupEventListeners() {
  // Theme Toggle
  dom.themeToggleBtn.addEventListener('click', () => {
    const nextTheme = state.theme === 'light' ? 'dark' : 'light';
    applyTheme(nextTheme);
  });

  // Search
  dom.searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.trim();
    dom.clearSearchBtn.style.display = state.searchQuery ? 'flex' : 'none';
    applyFilters();
  });

  dom.clearSearchBtn.addEventListener('click', () => {
    dom.searchInput.value = '';
    state.searchQuery = '';
    dom.clearSearchBtn.style.display = 'none';
    applyFilters();
  });

  // Project Filter
  dom.projectFilter.addEventListener('change', (e) => {
    state.activeProject = e.target.value;
    applyFilters();
  });

  // Sort Filter
  dom.sortFilter.addEventListener('change', (e) => {
    state.sortBy = e.target.value;
    applyFilters();
  });

  // Filter Chips
  dom.filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      dom.filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.activeFilter = chip.dataset.filter;
      applyFilters();
    });
  });

  // Refresh Button
  dom.refreshBtn.addEventListener('click', () => {
    showToast('Refreshing sessions from disk...');
    loadConversations(true);
  });

  // Copy ID
  dom.detailIdPill.addEventListener('click', () => {
    if (state.currentConvDetails) {
      copyToClipboard(state.currentConvDetails.id, 'Copied Conversation ID!');
    }
  });

  // Star in detail
  dom.detailStarBtn.addEventListener('click', () => {
    if (state.currentConvDetails) {
      toggleFavorite(state.currentConvDetails.id);
    }
  });

  // Copy Continuity Prompt
  dom.copyContinuityBtn.addEventListener('click', () => {
    if (state.currentConvDetails) {
      copyToClipboard(
        state.currentConvDetails.prompts.agentRecallPrompt,
        'Copied Continuity Prompt! Paste in Antigravity chat'
      );
    }
  });

  // Copy Compact Prompt
  dom.copyCompactPromptBtn.addEventListener('click', () => {
    if (state.currentConvDetails) {
      copyToClipboard(
        state.currentConvDetails.prompts.compactPrompt,
        'Copied Compact Prompt!'
      );
    }
  });

  // Open Folder
  dom.openBrainFolderBtn.addEventListener('click', async () => {
    if (state.currentConvDetails) {
      try {
        const res = await fetch(`/api/open-folder/${state.currentConvDetails.id}`, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          showToast('Opened folder in File Explorer');
        } else {
          copyToClipboard(state.currentConvDetails.brainPath, 'Copied folder path!');
        }
      } catch (e) {
        copyToClipboard(state.currentConvDetails.brainPath, 'Copied folder path!');
      }
    }
  });

  // Export Dropdown
  dom.exportDropdownBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dom.exportMenu.classList.toggle('show');
  });

  document.addEventListener('click', () => {
    dom.exportMenu.classList.remove('show');
  });

  dom.exportMdBtn.addEventListener('click', () => {
    if (state.currentConvDetails) {
      window.location.href = `/api/export/${state.currentConvDetails.id}?format=markdown`;
    }
  });

  dom.exportJsonBtn.addEventListener('click', () => {
    if (state.currentConvDetails) {
      window.location.href = `/api/export/${state.currentConvDetails.id}?format=json`;
    }
  });

  dom.exportHtmlBtn.addEventListener('click', () => {
    if (state.currentConvDetails) {
      window.location.href = `/api/export/${state.currentConvDetails.id}?format=html`;
    }
  });

  // Tab Switching
  dom.tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      dom.tabBtns.forEach(b => b.classList.remove('active'));
      dom.tabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const tabId = btn.dataset.tab;
      document.getElementById(`tab-${tabId}`).classList.add('active');
      renderIcons();
    });
  });

  // Copy Buttons in Continuity Hub
  document.querySelectorAll('.copy-prompt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const el = document.getElementById(targetId);
      if (el) {
        copyToClipboard(el.value, 'Copied Prompt to Clipboard!');
      }
    });
  });

  // Timeline Controls
  if (dom.timelineSearch) {
    dom.timelineSearch.addEventListener('input', () => {
      if (state.currentConvDetails) renderTimeline(state.currentConvDetails);
    });
  }

  if (dom.viewModeTurns) {
    dom.viewModeTurns.addEventListener('click', () => {
      dom.viewModeTurns.classList.add('active');
      dom.viewModeSteps.classList.remove('active');
      state.timelineViewMode = 'turns';
      if (state.currentConvDetails) renderTimeline(state.currentConvDetails);
    });
  }

  if (dom.viewModeSteps) {
    dom.viewModeSteps.addEventListener('click', () => {
      dom.viewModeSteps.classList.add('active');
      dom.viewModeTurns.classList.remove('active');
      state.timelineViewMode = 'steps';
      if (state.currentConvDetails) renderTimeline(state.currentConvDetails);
    });
  }

  if (dom.toggleAllActionsBtn) {
    dom.toggleAllActionsBtn.addEventListener('click', () => {
      state.allActionsExpanded = !state.allActionsExpanded;
      dom.toggleAllActionsText.textContent = state.allActionsExpanded ? 'Collapse Actions' : 'Expand Actions';
      document.querySelectorAll('.turn-actions-cluster').forEach(el => {
        el.classList.toggle('open', state.allActionsExpanded);
      });
      renderIcons();
    });
  }

  // Save Custom Metadata
  dom.saveMetaBtn.addEventListener('click', async () => {
    if (!state.currentConvDetails) return;
    const customTitle = dom.customTitleInput.value.trim();
    const tags = dom.tagsInput.value.split(',').map(t => t.trim()).filter(Boolean);

    try {
      const res = await fetch(`/api/meta/${state.currentConvDetails.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customTitle, tags })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Saved metadata');
        if (customTitle) {
          dom.detailTitle.textContent = customTitle;
          state.currentConvDetails.title = customTitle;
        }
        state.currentConvDetails.tags = tags;
        loadConversations(true);
      }
    } catch (e) {
      showToast('Error saving metadata');
    }
  });

  // Change Directory Modal
  dom.openDirModalBtn.addEventListener('click', () => {
    dom.dirModal.classList.add('open');
    renderIcons();
  });
  dom.closeDirModalBtn.addEventListener('click', () => {
    dom.dirModal.classList.remove('open');
  });
  dom.cancelDirBtn.addEventListener('click', () => {
    dom.dirModal.classList.remove('open');
  });
  dom.suggestWindowsBtn.addEventListener('click', () => {
    if (state.systemStatus && state.systemStatus.defaultDir) {
      dom.dirInput.value = state.systemStatus.defaultDir;
    }
  });
  dom.suggestLinuxBtn.addEventListener('click', () => {
    dom.dirInput.value = '~/.gemini/antigravity-ide';
  });

  dom.saveDirBtn.addEventListener('click', async () => {
    const newPath = dom.dirInput.value.trim();
    if (!newPath) return;

    try {
      const res = await fetch('/api/set-dir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: newPath })
      });
      const data = await res.json();
      if (data.success) {
        dom.dirModal.classList.remove('open');
        showToast('Antigravity directory updated');
        loadStatus();
        loadConversations(true);
      } else {
        showToast(data.error || 'Invalid directory path');
      }
    } catch (e) {
      showToast('Failed to update directory');
    }
  });

  // Help Modal
  dom.helpModalBtn.addEventListener('click', () => {
    dom.helpModal.classList.add('open');
    renderIcons();
  });
  dom.closeHelpModalBtn.addEventListener('click', () => {
    dom.helpModal.classList.remove('open');
  });
  dom.dismissHelpBtn.addEventListener('click', () => {
    dom.helpModal.classList.remove('open');
  });

  // Quick Prompt Modal (Latest Session)
  dom.quickPromptModalBtn.addEventListener('click', async () => {
    if (state.conversations.length === 0) {
      showToast('No sessions indexed yet');
      return;
    }
    const latest = state.conversations[0];
    dom.latestSessionTitle.textContent = latest.title;

    try {
      const res = await fetch(`/api/conversation/${latest.id}`);
      const data = await res.json();
      if (data.success) {
        dom.latestPromptText.value = data.conversation.prompts.agentRecallPrompt;
        dom.quickPromptModal.classList.add('open');
        renderIcons();
      }
    } catch (e) {
      showToast('Error loading latest session');
    }
  });

  dom.closeQuickPromptBtn.addEventListener('click', () => {
    dom.quickPromptModal.classList.remove('open');
  });
  dom.closeQuickPromptBtn2.addEventListener('click', () => {
    dom.quickPromptModal.classList.remove('open');
  });
  dom.copyLatestPromptBtn.addEventListener('click', () => {
    copyToClipboard(dom.latestPromptText.value, 'Copied Continuity Prompt!');
    dom.quickPromptModal.classList.remove('open');
  });

  // Delegated click handler for file links in markdown
  document.addEventListener('click', (e) => {
    const fileLink = e.target.closest('a[href^="file:"]');
    if (fileLink) {
      e.preventDefault();
      const rawHref = fileLink.getAttribute('href') || '';
      const filePath = decodeURIComponent(rawHref.replace(/^file:\/\/\/?/, ''));
      copyToClipboard(filePath, `Copied file path: ${filePath.split(/[\/\\]/).pop()}`);
    }
  });

  // Global Keyboard Shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== dom.searchInput && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      e.preventDefault();
      dom.searchInput.focus();
    }
    if (e.key === 'Escape') {
      dom.dirModal.classList.remove('open');
      dom.helpModal.classList.remove('open');
      dom.quickPromptModal.classList.remove('open');
      dom.exportMenu.classList.remove('show');
    }
  });
}

// Initialize Application
async function init() {
  applyTheme(state.theme);
  setupEventListeners();
  await loadStatus();
  await loadConversations();
  renderIcons();
}

init();
