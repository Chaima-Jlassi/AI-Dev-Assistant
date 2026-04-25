import * as vscode from 'vscode';

export function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri): string {
  const nonce = getNonce();

  return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src https: data:;"/>
<title>AI Dev Assistant</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#0d1117;--surface:#161b22;--surface2:#21262d;--border:#30363d;
  --accent:#58a6ff;--accent2:#3fb950;--accent3:#d2a8ff;--warn:#f78166;--orange:#ffa657;
  --text:#e6edf3;--muted:#8b949e;--radius:8px;
  --font:'Segoe UI',system-ui,sans-serif;--mono:'Cascadia Code','Fira Code',monospace;
}
body{background:var(--bg);color:var(--text);font-family:var(--font);font-size:13px;height:100vh;display:flex;flex-direction:column;overflow:hidden;}

/* Header */
.header{background:var(--surface);border-bottom:1px solid var(--border);padding:10px 12px 0;flex-shrink:0;}
.header-top{display:flex;align-items:center;gap:8px;margin-bottom:10px;}
.logo{width:22px;height:22px;background:linear-gradient(135deg,var(--accent),var(--accent3));border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;flex-shrink:0;}
.header-title{font-size:13px;font-weight:600;flex:1;}
.file-badge{font-size:10px;color:var(--muted);background:var(--surface2);border:1px solid var(--border);border-radius:4px;padding:2px 6px;max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.tabs{display:flex;gap:2px;}
.tab{flex:1;padding:7px 4px;background:transparent;border:none;border-bottom:2px solid transparent;color:var(--muted);font-family:var(--font);font-size:11px;font-weight:500;cursor:pointer;transition:all .15s;display:flex;align-items:center;justify-content:center;gap:4px;text-transform:uppercase;letter-spacing:.4px;}
.tab:hover{color:var(--text);}
.tab.active{color:var(--accent);border-bottom-color:var(--accent);}

/* Content */
.content{flex:1;overflow:hidden;display:flex;flex-direction:column;}
.panel{display:none;flex-direction:column;height:100%;overflow:hidden;}
.panel.active{display:flex;}
.scroll-area{flex:1;overflow-y:auto;padding:12px;}
.scroll-area::-webkit-scrollbar{width:4px;}
.scroll-area::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px;}
.section-title{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.8px;color:var(--muted);margin-bottom:8px;margin-top:4px;}

/* Context bar */
.context-bar{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:8px 10px;margin-bottom:10px;display:flex;align-items:center;gap:8px;}
.ctx-dot{width:6px;height:6px;border-radius:50%;background:var(--border);flex-shrink:0;transition:background .2s;}
.ctx-dot.on{background:var(--accent2);}
.ctx-info{flex:1;min-width:0;}
.ctx-file{font-size:12px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.ctx-lang{font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;}

/* Selection banner */
.sel-banner{background:rgba(210,168,255,.08);border:1px solid rgba(210,168,255,.25);border-radius:var(--radius);padding:7px 10px;margin-bottom:10px;display:none;align-items:center;gap:8px;font-size:11px;}
.sel-banner.on{display:flex;}
.sel-text{flex:1;color:var(--muted);}
.sel-text strong{color:var(--accent3);}
.sel-clear{background:transparent;border:none;color:var(--muted);cursor:pointer;font-size:14px;padding:0 2px;}
.sel-clear:hover{color:var(--warn);}

/* Scope */
.scope-row{display:flex;align-items:center;gap:6px;margin-bottom:10px;}
.scope-label{font-size:10px;color:var(--muted);white-space:nowrap;}
.scope-toggle{display:flex;background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:2px;gap:2px;}
.scope-btn{background:transparent;border:none;border-radius:4px;padding:3px 8px;color:var(--muted);font-family:var(--font);font-size:10px;font-weight:500;cursor:pointer;transition:all .12s;white-space:nowrap;}
.scope-btn.active{background:var(--surface);color:var(--text);box-shadow:0 1px 3px rgba(0,0,0,.3);}

/* Tool grid */
.tool-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;}
.tool-btn{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:11px 8px;color:var(--text);font-family:var(--font);font-size:11px;font-weight:500;cursor:pointer;transition:all .15s;display:flex;flex-direction:column;align-items:center;gap:5px;text-align:center;line-height:1.3;}
.tool-btn:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,0,0,.3);}
.tool-btn:active{transform:scale(.97);}
.tool-btn .t-icon{font-size:18px;line-height:1;}
.tool-btn .t-desc{font-size:9px;color:var(--muted);line-height:1.3;}
.tool-btn.uml:hover{border-color:var(--accent3);color:var(--accent3);background:rgba(210,168,255,.05);}
.tool-btn.test:hover{border-color:var(--accent2);color:var(--accent2);background:rgba(63,185,80,.05);}
.tool-btn.readme:hover{border-color:var(--orange);color:var(--orange);background:rgba(255,166,87,.05);}
.tool-btn.arch:hover{border-color:#79c0ff;color:#79c0ff;background:rgba(121,192,255,.05);}
.tool-btn.explain:hover{border-color:var(--accent);color:var(--accent);background:rgba(88,166,255,.05);}
.tool-btn.review:hover{border-color:var(--warn);color:var(--warn);background:rgba(247,129,102,.05);}

/* Output */
.output-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;}
.output-label{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.8px;color:var(--muted);}
.output-tag{font-size:10px;background:var(--surface2);border:1px solid var(--border);border-radius:4px;padding:1px 6px;color:var(--accent);display:none;}
.output-area{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:10px;min-height:80px;font-family:var(--mono);font-size:11px;line-height:1.6;color:var(--text);white-space:pre-wrap;word-break:break-word;max-height:320px;overflow-y:auto;}
.output-area::-webkit-scrollbar{width:3px;}
.output-area::-webkit-scrollbar-thumb{background:var(--border);}
.placeholder{color:var(--muted);font-family:var(--font);font-size:12px;font-style:italic;}
.output-actions{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;}
.mini-btn{background:var(--surface2);border:1px solid var(--border);border-radius:5px;padding:4px 10px;color:var(--muted);font-family:var(--font);font-size:11px;cursor:pointer;transition:all .12s;}
.mini-btn:hover{color:var(--text);border-color:var(--accent);}
.uml-wrap{background:#fff;border-radius:var(--radius);margin-top:8px;overflow:hidden;display:none;}
.uml-wrap img{width:100%;display:block;}

/* Spinner */
.spin{display:inline-block;width:13px;height:13px;border:2px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin .7s linear infinite;vertical-align:middle;margin-right:6px;}
@keyframes spin{to{transform:rotate(360deg)}}

/* Chat */
.chat-messages{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:10px;}
.chat-messages::-webkit-scrollbar{width:4px;}
.chat-messages::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px;}
.chat-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:8px;color:var(--muted);text-align:center;}
.chat-empty-icon{font-size:30px;}
.chat-empty-title{font-size:13px;font-weight:600;color:var(--text);}
.chat-empty-sub{font-size:11px;line-height:1.5;max-width:200px;}
.suggestions{display:flex;flex-direction:column;gap:5px;margin-top:8px;width:100%;}
.suggestion{background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:6px 10px;font-size:11px;color:var(--muted);cursor:pointer;text-align:left;transition:all .12s;width:100%;}
.suggestion:hover{border-color:var(--accent);color:var(--text);}
.message{max-width:100%;display:flex;flex-direction:column;gap:3px;}
.message-role{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;}
.message.user .message-role{color:var(--accent);}
.message.assistant .message-role{color:var(--accent2);}
.message-bubble{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:8px 10px;font-size:12px;line-height:1.6;white-space:pre-wrap;word-break:break-word;}
.message.user .message-bubble{background:rgba(88,166,255,.06);border-color:rgba(88,166,255,.2);}
.message-bubble code{background:var(--surface2);padding:1px 4px;border-radius:3px;font-family:var(--mono);font-size:11px;}

/* Chat input */
.chat-input-area{border-top:1px solid var(--border);padding:8px;background:var(--surface);flex-shrink:0;}
.chat-pills{display:flex;gap:5px;margin-bottom:6px;flex-wrap:wrap;}
.pill{display:flex;align-items:center;gap:4px;background:var(--surface2);border:1px solid var(--border);border-radius:20px;padding:2px 8px 2px 5px;font-size:10px;color:var(--muted);cursor:pointer;transition:all .12s;}
.pill:hover{border-color:var(--accent);color:var(--text);}
.pill-dot{width:5px;height:5px;border-radius:50%;}
.input-row{display:flex;gap:6px;align-items:flex-end;}
.chat-input{flex:1;background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius);padding:7px 10px;color:var(--text);font-family:var(--font);font-size:12px;resize:none;min-height:36px;max-height:100px;line-height:1.5;transition:border-color .15s;outline:none;}
.chat-input:focus{border-color:var(--accent);}
.chat-input::placeholder{color:var(--muted);}
.send-btn{width:34px;height:34px;background:var(--accent);border:none;border-radius:var(--radius);color:#fff;font-size:14px;cursor:pointer;flex-shrink:0;transition:all .15s;display:flex;align-items:center;justify-content:center;}
.send-btn:hover{background:#79b8ff;transform:scale(1.05);}
.send-btn:active{transform:scale(.97);}
.send-btn:disabled{background:var(--border);cursor:not-allowed;transform:none;}

/* Files */
.file-tree{display:flex;flex-direction:column;gap:2px;}
.file-item{display:flex;align-items:center;gap:6px;padding:5px 8px;border-radius:5px;cursor:pointer;transition:background .1s;font-size:12px;}
.file-item:hover{background:var(--surface2);}
.file-icon{font-size:13px;flex-shrink:0;}
.file-name{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.file-dir{font-size:10px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:80px;}
.refresh-btn{background:transparent;border:1px solid var(--border);border-radius:5px;color:var(--muted);font-size:11px;padding:3px 8px;cursor:pointer;transition:all .12s;margin-bottom:8px;}
.refresh-btn:hover{color:var(--text);border-color:var(--accent);}

/* Status */
.status-bar{background:var(--surface);border-top:1px solid var(--border);padding:4px 10px;display:flex;align-items:center;gap:6px;font-size:10px;color:var(--muted);flex-shrink:0;}
.status-dot{width:5px;height:5px;border-radius:50%;background:var(--border);}
.status-dot.on{background:var(--accent2);}
</style>
</head>
<body>

<div class="header">
  <div class="header-top">
    <div class="logo">AI</div>
    <span class="header-title">Dev Assistant</span>
    <span class="file-badge" id="fileBadge">No file</span>
  </div>
  <div class="tabs">
    <button class="tab active" onclick="switchTab('chat')">💬 Chat</button>
    <button class="tab" onclick="switchTab('tools')">⚡ Tools</button>
    <button class="tab" onclick="switchTab('files')">📁 Files</button>
  </div>
</div>

<div class="content">

  <!-- CHAT -->
  <div class="panel active" id="panel-chat">
    <div class="chat-messages" id="chatMessages">
      <div class="chat-empty" id="chatEmpty">
        <div class="chat-empty-icon">🤖</div>
        <div class="chat-empty-title">Ask about your code</div>
        <div class="chat-empty-sub">Full workspace access. Ask anything.</div>
        <div class="suggestions">
          <button class="suggestion" onclick="fillChat('Explain what this file does')">💡 Explain this file</button>
          <button class="suggestion" onclick="fillChat('What bugs do you see in this code?')">🐛 Find bugs</button>
          <button class="suggestion" onclick="fillChat('How can I improve this code?')">🚀 Suggest improvements</button>
          <button class="suggestion" onclick="fillChat('Generate unit tests for this file')">🧪 Generate unit tests</button>
        </div>
      </div>
    </div>
    <div class="chat-input-area">
      <div class="chat-pills">
        <div class="pill" onclick="toggleChatScope()" id="scopePill">
          <span class="pill-dot" id="scopeDot" style="background:var(--accent)"></span>
          <span id="scopeLabel">Current file</span>
        </div>
        <div class="pill" id="selPill" style="display:none" onclick="setChatScopeSelection()">
          <span class="pill-dot" style="background:var(--accent3)"></span>
          <span id="selPillLabel">Selected code</span>
        </div>
      </div>
      <div class="input-row">
        <textarea class="chat-input" id="chatInput" placeholder="Ask anything about your code…" rows="1"
          onkeydown="handleKey(event)" oninput="autoResize(this)"></textarea>
        <button class="send-btn" id="sendBtn" onclick="sendChat()">➤</button>
      </div>
    </div>
  </div>

  <!-- TOOLS -->
  <div class="panel" id="panel-tools">
    <div class="scroll-area">

      <div class="context-bar">
        <div class="ctx-dot" id="ctxDot"></div>
        <div class="ctx-info">
          <div class="ctx-file" id="ctxFile">No file open</div>
          <div class="ctx-lang" id="ctxLang">Open a file to use tools</div>
        </div>
      </div>

      <div class="sel-banner" id="selBanner">
        <span style="font-size:14px">✂️</span>
        <span class="sel-text">Tools will use <strong id="selLineCount">0 lines</strong> of selected code</span>
        <button class="sel-clear" onclick="clearSelection()">✕</button>
      </div>

      <div class="scope-row">
        <span class="scope-label">Scope:</span>
        <div class="scope-toggle">
          <button class="scope-btn active" id="sCurrent" onclick="setToolScope('current')">Current file</button>
          <button class="scope-btn" id="sAll" onclick="setToolScope('all')">Whole project</button>
        </div>
      </div>

      <div class="section-title">Generate</div>
      <div class="tool-grid">
        <button class="tool-btn uml" onclick="runTool('uml')">
          <span class="t-icon">📊</span>
          <span>UML Diagram</span>
          <span class="t-desc">Class &amp; sequence diagrams</span>
        </button>
        <button class="tool-btn test" onclick="runTool('tests')">
          <span class="t-icon">🧪</span>
          <span>Unit Tests</span>
          <span class="t-desc">Full suite + edge cases</span>
        </button>
        <button class="tool-btn readme" onclick="runTool('readme')">
          <span class="t-icon">📝</span>
          <span>README</span>
          <span class="t-desc">Project documentation</span>
        </button>
        <button class="tool-btn arch" onclick="runTool('architecture')">
          <span class="t-icon">🏗️</span>
          <span>Architecture</span>
          <span class="t-desc">System design overview</span>
        </button>
      </div>

      <div class="section-title">Analyze</div>
      <div class="tool-grid">
        <button class="tool-btn explain" onclick="runTool('explain')">
          <span class="t-icon">💡</span>
          <span>Explain Code</span>
          <span class="t-desc">Works on selection too</span>
        </button>
        <button class="tool-btn review" onclick="runTool('review')">
          <span class="t-icon">🔍</span>
          <span>Code Review</span>
          <span class="t-desc">Bugs, security, quality</span>
        </button>
      </div>

      <div class="output-header">
        <span class="output-label">Output</span>
        <span class="output-tag" id="outputTag"></span>
      </div>
      <div class="output-area" id="toolOutput">
        <span class="placeholder">Run a tool to see output here…</span>
      </div>
      <div class="uml-wrap" id="umlWrap"><img id="umlImg" src="" alt="UML"/></div>
      <div class="output-actions" id="outputActions" style="display:none">
        <button class="mini-btn" onclick="copyOutput()">📋 Copy</button>
        <button class="mini-btn" onclick="insertOutput()">📝 Insert to editor</button>
        <button class="mini-btn" onclick="clearOutput()">✕ Clear</button>
      </div>

    </div>
  </div>

  <!-- FILES -->
  <div class="panel" id="panel-files">
    <div class="scroll-area">
      <div class="section-title">Workspace Files</div>
      <button class="refresh-btn" onclick="loadFiles()">↻ Refresh</button>
      <div class="file-tree" id="fileTree">
        <div style="color:var(--muted);font-size:11px">Loading…</div>
      </div>
    </div>
  </div>

</div>

<div class="status-bar">
  <div class="status-dot" id="statusDot"></div>
  <span id="statusText">Connecting to backend…</span>
</div>

<script nonce="${nonce}">
const vscode = acquireVsCodeApi();

// ── State ──────────────────────────────────────────────────────────
let currentFile = { name:'', path:'', language:'', content:'' };
let selectedCode = '';
let selectedLines = 0;
let workspaceFiles = [];
let chatHistory = [];
let chatScope = 'current';
let toolScope = 'current';
let outputText = '';
let pendingTool = null;
let pendingChat = null;

// ── VS Code messages ────────────────────────────────────────────────
window.addEventListener('message', e => {
  const m = e.data;
  if (m.command === 'activeFileChanged') {
    currentFile = { name:m.fileName, path:m.filePath, language:m.language, content:m.content };
    updateCtx();
  } else if (m.command === 'selectionChanged') {
    if (m.text && m.text.trim()) {
      selectedCode = m.text;
      selectedLines = m.lines;
      showSelUI();
    }
  } else if (m.command === 'workspaceFiles') {
    workspaceFiles = m.files;
    renderFiles();
  } else if (m.command === 'allFilesContent') {
    handleAllFiles(m.files);
  } else if (m.command === 'backendResponse') {
    handleBackend(m.requestId, m.data, m.error);
  }
});

// ── Tabs ────────────────────────────────────────────────────────────
function switchTab(name) {
  ['chat','tools','files'].forEach((n,i) => {
    document.querySelectorAll('.tab')[i].classList.toggle('active', n===name);
    const p = document.getElementById('panel-'+n);
    p.classList.toggle('active', n===name);
    p.style.display = n===name ? 'flex' : 'none';
  });
  if (name==='files' && workspaceFiles.length===0) loadFiles();
}
// init panel display
document.querySelectorAll('.panel').forEach((p,i) => { if(i>0) p.style.display='none'; });

// ── Context ─────────────────────────────────────────────────────────
function updateCtx() {
  const has = !!currentFile.name;
  document.getElementById('fileBadge').textContent = currentFile.name || 'No file';
  document.getElementById('ctxDot').classList.toggle('on', has);
  document.getElementById('ctxFile').textContent = currentFile.name || 'No file open';
  document.getElementById('ctxLang').textContent = has ? currentFile.language : 'Open a file to use tools';
}

// ── Selection ───────────────────────────────────────────────────────
function showSelUI() {
  document.getElementById('selBanner').classList.add('on');
  document.getElementById('selLineCount').textContent = selectedLines + ' lines';
  document.getElementById('selPill').style.display = 'flex';
  document.getElementById('selPillLabel').textContent = selectedLines + ' lines selected';
}
function clearSelection() {
  selectedCode = ''; selectedLines = 0;
  document.getElementById('selBanner').classList.remove('on');
  document.getElementById('selPill').style.display = 'none';
  if (chatScope === 'selection') { chatScope = 'current'; updateScopePill(); }
}

// ── Chat scope ──────────────────────────────────────────────────────
function toggleChatScope() {
  chatScope = chatScope === 'current' ? 'all' : 'current';
  updateScopePill();
}
function setChatScopeSelection() {
  chatScope = 'selection';
  updateScopePill();
}
function updateScopePill() {
  const labels = { current:'Current file', all:'Whole project', selection:'Selected code' };
  const colors = { current:'var(--accent)', all:'var(--accent3)', selection:'var(--accent3)' };
  document.getElementById('scopeLabel').textContent = labels[chatScope];
  document.getElementById('scopeDot').style.background = colors[chatScope];
}

// ── Tool scope ──────────────────────────────────────────────────────
function setToolScope(s) {
  toolScope = s;
  document.getElementById('sCurrent').classList.toggle('active', s==='current');
  document.getElementById('sAll').classList.toggle('active', s==='all');
}

// ── Build context ───────────────────────────────────────────────────
function buildContext(scope, useSelection) {
  if (useSelection && selectedCode) {
    return 'File: ' + currentFile.name + ' (' + currentFile.language + ')\\n\\nSelected code:\\n' + selectedCode;
  }
  if (scope === 'current') {
    if (!currentFile.content) return 'No file is currently open.';
    return 'File: ' + currentFile.name + ' (' + currentFile.language + ')\\n\\n' + currentFile.content;
  }
  return null; // triggers async all-files fetch
}

// ── Run tool ────────────────────────────────────────────────────────
function runTool(tool) {
  const prompts = {
    uml: 'Analyze the following code and generate a PlantUML diagram. For classes use class diagram, for flows use sequence diagram. Output ONLY valid PlantUML from @startuml to @enduml with no extra text.',
    tests: 'Generate comprehensive unit tests for the following code. Use the appropriate testing framework for the language. Include: happy path, edge cases, error cases, and boundary conditions. Add a comment for each test.',
    readme: 'Generate a professional README.md for the following code. Include: # Title, ## Description, ## Features, ## Installation, ## Usage with code examples. Use proper markdown.',
    architecture: 'Analyze the following code and provide: 1) High-level architecture overview 2) Main components and responsibilities 3) Data flow 4) Design patterns used 5) Strengths and improvements.',
    explain: 'Explain the following code clearly: what it does, how it works step by step, key functions/classes, and any important patterns or gotchas.',
    review: 'Do a thorough code review. Report: 1) Bugs or logic errors 2) Security vulnerabilities 3) Performance bottlenecks 4) Code quality issues 5) Concrete improvements with examples.'
  };

  const useSelection = !!(selectedCode && (tool === 'explain' || tool === 'review'));
  const ctx = buildContext(toolScope, useSelection);

  document.getElementById('umlWrap').style.display = 'none';
  document.getElementById('outputActions').style.display = 'none';
  document.getElementById('outputTag').textContent = tool;
  document.getElementById('outputTag').style.display = 'inline';
  document.getElementById('toolOutput').innerHTML = '<span class="spin"></span>Running ' + tool + '…';

  if (!ctx) {
    pendingTool = tool;
    vscode.postMessage({ command:'getAllFilesContent' });
    return;
  }
  callBackend('/api/analyze', { prompt: prompts[tool], context: ctx, type: tool }, 'tool_' + Date.now());
}

// ── Chat ────────────────────────────────────────────────────────────
function fillChat(text) {
  document.getElementById('chatInput').value = text;
  document.getElementById('chatInput').focus();
}
function handleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
}
function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 100) + 'px';
}
function sendChat() {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text) return;
  addMessage('user', text);
  input.value = ''; input.style.height = 'auto';
  document.getElementById('sendBtn').disabled = true;

  const useSelection = chatScope === 'selection';
  const ctx = buildContext(chatScope, useSelection);
  if (!ctx) {
    pendingChat = text;
    vscode.postMessage({ command:'getAllFilesContent' });
    return;
  }
  dispatchChat(text, ctx);
}

function dispatchChat(msg, ctx) {
  // Build messages array matching what your backend expects
  const messages = [
    { role: 'user', content: 'Here is the code context I am working with:\\n\\n' + ctx },
    { role: 'assistant', content: 'I have read your code. What would you like to know?' },
    ...chatHistory,
    { role: 'user', content: msg }
  ];
  callBackend('/api/chat', { messages }, 'chat_' + Date.now());
}

function addMessage(role, text) {
  const empty = document.getElementById('chatEmpty');
  if (empty) empty.remove();
  const box = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = 'message ' + role;
  div.innerHTML = '<div class="message-role">' + (role==='user'?'You':'AI Assistant') + '</div>' +
    '<div class="message-bubble">' + esc(text).replace(/\`([^\`]+)\`/g,'<code>$1</code>') + '</div>';
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
  if (role === 'assistant') chatHistory.push({ role:'assistant', content:text });
  if (role === 'user') chatHistory.push({ role:'user', content:text });
}

// ── All files handler ───────────────────────────────────────────────
function handleAllFiles(files) {
  const ctx = files.map(f => '// === ' + f.relativePath + ' ===\\n' + f.content).join('\\n\\n');
  if (pendingTool) {
    const t = pendingTool; pendingTool = null;
    const projectPrompts = {
      uml: 'Generate a PlantUML architecture diagram for this entire project. Output ONLY PlantUML from @startuml to @enduml.',
      tests: 'Generate unit tests covering key functions across this project.',
      readme: 'Generate a complete professional README.md for this entire project.',
      architecture: 'Provide a complete architecture analysis of this entire project.',
      explain: 'Explain the overall structure and purpose of this project.',
      review: 'Review this entire codebase for issues and improvements.'
    };
    callBackend('/api/analyze', { prompt: projectPrompts[t], context: ctx, type: t }, 'tool_' + Date.now());
  }
  if (pendingChat) {
    const msg = pendingChat; pendingChat = null;
    dispatchChat(msg, ctx);
  }
}

// ── Backend calls ───────────────────────────────────────────────────
function callBackend(endpoint, payload, reqId) {
  vscode.postMessage({ command:'callBackend', endpoint, payload, requestId: reqId });
}

function handleBackend(reqId, data, error) {
  // Health check
  if (reqId.startsWith('health_')) {
    const ok = !error && !!data;
    document.getElementById('statusDot').classList.toggle('on', ok);
    document.getElementById('statusText').textContent = ok ? 'Backend connected ✓' : 'Backend offline — start api_server.py';
    return;
  }

  // Chat response
  if (reqId.startsWith('chat_')) {
    document.getElementById('sendBtn').disabled = false;
    if (error || !data) {
      addMessage('assistant', '❌ Backend error: ' + (error||'Unknown') + '\\n\\nMake sure api_server.py is running on port 8000.');
      return;
    }
    // Support both 'reply' (your backend) and 'response' (generic)
    const reply = data.reply || data.response || data.result || JSON.stringify(data);
    addMessage('assistant', reply);
    return;
  }

  // Tool response
  if (error || !data) {
    document.getElementById('toolOutput').innerHTML = '❌ Backend error: ' + esc(error||'Unknown') + '\\n\\nMake sure api_server.py is running on port 8000.';
    document.getElementById('outputActions').style.display = 'none';
    return;
  }

  const result = data.response || data.reply || data.result || data.output || JSON.stringify(data);
  outputText = result;
  document.getElementById('toolOutput').textContent = result;
  document.getElementById('outputActions').style.display = 'flex';

  // Auto-render UML if output starts with @startuml
  if (result.trim().startsWith('@startuml')) {
    renderUML(result);
  }
}

// ── Output actions ──────────────────────────────────────────────────
function copyOutput() {
  navigator.clipboard.writeText(outputText).then(() =>
    vscode.postMessage({ command:'showInfo', text:'Copied to clipboard!' })
  );
}
function insertOutput() {
  vscode.postMessage({ command:'insertText', text: outputText });
}
function clearOutput() {
  document.getElementById('toolOutput').innerHTML = '<span class="placeholder">Run a tool to see output here…</span>';
  document.getElementById('outputActions').style.display = 'none';
  document.getElementById('umlWrap').style.display = 'none';
  document.getElementById('outputTag').style.display = 'none';
  outputText = '';
}

// ── UML render ──────────────────────────────────────────────────────
function renderUML(code) {
  try {
    const enc = plantEncode(code);
    document.getElementById('umlImg').src = 'https://www.plantuml.com/plantuml/svg/' + enc;
    document.getElementById('umlWrap').style.display = 'block';
  } catch(_) {}
}
function plantEncode(s) {
  function e6(b){ if(b<10)return String.fromCharCode(48+b); b-=10; if(b<26)return String.fromCharCode(65+b); b-=26; if(b<26)return String.fromCharCode(97+b); return b===0?'-':'_'; }
  function a3(b1,b2,b3){ return e6(b1>>2)+e6(((b1&3)<<4)|(b2>>4))+e6(((b2&0xf)<<2)|(b3>>6))+e6(b3&0x3f); }
  const bytes = new TextEncoder().encode(s);
  let r='';
  for(let i=0;i<bytes.length;i+=3) r+=a3(bytes[i],bytes[i+1]||0,bytes[i+2]||0);
  return r;
}

// ── Files ───────────────────────────────────────────────────────────
function loadFiles() {
  document.getElementById('fileTree').innerHTML = '<div style="color:var(--muted);font-size:11px">Loading…</div>';
  vscode.postMessage({ command:'getWorkspaceFiles' });
}
function renderFiles() {
  const tree = document.getElementById('fileTree');
  if (!workspaceFiles.length) {
    tree.innerHTML = '<div style="color:var(--muted);font-size:11px">No files found.</div>';
    return;
  }
  const icons = {ts:'🔷',tsx:'⚛️',js:'🟨',jsx:'⚛️',py:'🐍',java:'☕',cs:'🎯',cpp:'⚙️',c:'⚙️',go:'🔵',rs:'🦀',vue:'💚',html:'🌐',css:'🎨',json:'📋',md:'📝'};
  tree.innerHTML = workspaceFiles.map(f => {
    const ext = (f.name.split('.').pop()||'').toLowerCase();
    const parts = f.relativePath.split(/[\\/]/);
    const dir = parts.slice(0,-1).join('/');
    const safePath = f.path.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
    return '<div class="file-item" onclick="openFile(\\'' + safePath + '\\')">' +
      '<span class="file-icon">' + (icons[ext]||'📄') + '</span>' +
      '<span class="file-name">' + esc(f.name) + '</span>' +
      (dir ? '<span class="file-dir">' + esc(dir) + '</span>' : '') + '</div>';
  }).join('');
}
function openFile(p) { vscode.postMessage({ command:'openFile', filePath:p }); }

// ── Utils ────────────────────────────────────────────────────────────
function esc(t){ return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// ── Health check ─────────────────────────────────────────────────────
function checkHealth() { callBackend('/health', {}, 'health_' + Date.now()); }

// ── Init ──────────────────────────────────────────────────────────────
vscode.postMessage({ command:'getCurrentFile' });
loadFiles();
checkHealth();
setInterval(checkHealth, 30000);
</script>
</body>
</html>`;
}

function getNonce() {
  let t = '';
  const c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) t += c.charAt(Math.floor(Math.random() * c.length));
  return t;
}