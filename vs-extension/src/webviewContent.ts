import * as vscode from 'vscode';

export function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri): string {
  const nonce = getNonce();

  return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src https: http: data:;"/>
<title>AI Dev Assistant</title>
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{
    --bg:var(--vscode-sideBar-background);
    --surface:var(--vscode-editor-background);
    --surface2:var(--vscode-input-background);
    --border:var(--vscode-panel-border, rgba(127,127,127,.18));
    --text:var(--vscode-foreground);
    --muted:var(--vscode-descriptionForeground);
    --accent:var(--vscode-button-background);
    --accent-text:var(--vscode-button-foreground);
    --accent-hover:var(--vscode-button-hoverBackground);
    --radius:10px;
    --font:'Segoe UI',system-ui,-apple-system,sans-serif;
    --mono:'Cascadia Code','Fira Code',monospace;
  }
  body{height:100vh;display:flex;flex-direction:column;overflow:hidden;background:var(--bg);color:var(--text);font-family:var(--font);font-size:13px}
  .shell{display:flex;flex-direction:column;min-height:0;height:100%}
  .header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:14px 14px 10px;border-bottom:1px solid var(--border);background:var(--surface)}
  .title{font-size:14px;font-weight:600;line-height:1.3}
  .subtitle{margin-top:3px;font-size:11px;color:var(--muted)}
  .header-badges{display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end}
  .badge{display:inline-flex;align-items:center;gap:6px;padding:4px 8px;border:1px solid var(--border);border-radius:999px;background:var(--surface2);color:var(--muted);font-size:11px;line-height:1.2;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .badge strong{color:var(--text);font-weight:500}
  .badge.status.on{border-color:rgba(63,185,80,.35);color:var(--text)}
  .main{flex:1;min-height:0;overflow:auto;padding:12px;display:flex;flex-direction:column;gap:10px}
  .main::-webkit-scrollbar{width:8px}
  .main::-webkit-scrollbar-thumb{background:var(--border);border-radius:999px}
  .card{border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);overflow:hidden}
  .card-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;border-bottom:1px solid var(--border)}
  .card-title{font-size:11px;font-weight:600;letter-spacing:.6px;text-transform:uppercase;color:var(--muted)}
  .link-btn{border:none;background:transparent;color:var(--muted);font:inherit;font-size:12px;cursor:pointer;padding:0}
  .link-btn:hover{color:var(--text)}
  .context-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;padding:12px}
  .context-label{font-size:10px;letter-spacing:.6px;text-transform:uppercase;color:var(--muted);margin-bottom:4px}
  .context-value{min-height:18px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .context-value.muted{color:var(--muted)}
  .chat-messages{min-height:240px;max-height:320px;overflow:auto;padding:12px;display:flex;flex-direction:column;gap:10px}
  .chat-messages::-webkit-scrollbar{width:8px}
  .chat-messages::-webkit-scrollbar-thumb{background:var(--border);border-radius:999px}
  .empty{padding:18px;border:1px dashed var(--border);border-radius:var(--radius);color:var(--muted);display:flex;flex-direction:column;gap:10px}
  .empty h3{font-size:13px;color:var(--text);font-weight:600}
  .empty p{font-size:12px;line-height:1.5}
  .suggestions{display:flex;flex-wrap:wrap;gap:8px}
  .chip{border:1px solid var(--border);background:var(--surface2);color:var(--text);border-radius:999px;padding:6px 10px;font-size:12px;cursor:pointer;transition:border-color .12s,background-color .12s}
  .chip:hover{border-color:var(--accent);background:color-mix(in srgb, var(--accent) 10%, var(--surface2))}
  .message{display:flex;flex-direction:column;gap:4px}
  .message-role{font-size:10px;letter-spacing:.6px;text-transform:uppercase;color:var(--muted)}
  .message-bubble{border:1px solid var(--border);border-radius:var(--radius);background:var(--surface2);padding:10px 12px;line-height:1.6;white-space:pre-wrap;word-break:break-word}
  .message.user .message-bubble{border-color:color-mix(in srgb, var(--accent) 35%, var(--border));background:color-mix(in srgb, var(--accent) 8%, var(--surface2))}
  .message-bubble code{padding:1px 4px;border-radius:4px;background:rgba(127,127,127,.14);font-family:var(--mono);font-size:11px}
  .message-bubble .msg-link{color:var(--accent);text-decoration:none;border-bottom:1px dotted currentColor}
  .composer{display:flex;flex-direction:column;gap:8px}
  .scope-row{display:flex;align-items:center;justify-content:space-between;gap:8px}
  .scope-group{display:flex;gap:6px;flex-wrap:wrap}
  .scope-btn{border:1px solid var(--border);background:var(--surface);color:var(--muted);border-radius:999px;padding:5px 10px;font-size:12px;cursor:pointer}
  .scope-btn.active{border-color:var(--accent);color:var(--text);background:color-mix(in srgb, var(--accent) 10%, var(--surface))}
  .composer-row{display:flex;gap:8px;align-items:flex-end}
  .chat-input{flex:1;min-height:44px;max-height:120px;resize:none;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);color:var(--text);padding:10px 12px;font:inherit;line-height:1.5;outline:none}
  .chat-input:focus{border-color:var(--accent)}
  .chat-input::placeholder{color:var(--muted)}
  .send-btn{min-width:84px;height:44px;border:none;border-radius:var(--radius);background:var(--accent);color:var(--accent-text);font:inherit;font-weight:600;cursor:pointer}
  .send-btn:hover{background:var(--accent-hover)}
  .send-btn:disabled{opacity:.7;cursor:not-allowed}
  .panel-body{padding:12px}
  .context-bar{display:flex;align-items:flex-start;gap:10px;padding:12px;border-bottom:1px solid var(--border)}
  .ctx-dot{width:8px;height:8px;border-radius:50%;background:var(--border);margin-top:5px;flex-shrink:0}
  .ctx-dot.on{background:rgba(63,185,80,.9)}
  .ctx-copy{display:flex;flex-direction:column;gap:4px;min-width:0}
  .ctx-file{font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .ctx-lang{font-size:11px;color:var(--muted)}
  .sel-banner{margin:12px;border:1px solid var(--border);border-radius:var(--radius);padding:10px 12px;display:none;align-items:center;justify-content:space-between;gap:10px;background:var(--surface2)}
  .sel-banner.on{display:flex}
  .sel-text{color:var(--text);font-size:12px}
  .tool-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding:12px}
  .tool-btn{border:1px solid var(--border);border-radius:var(--radius);background:var(--surface2);color:var(--text);padding:10px 12px;text-align:left;cursor:pointer;display:flex;flex-direction:column;gap:4px}
  .tool-btn:hover{border-color:var(--accent)}
  .tool-name{font-weight:600}
  .tool-desc{font-size:11px;color:var(--muted);line-height:1.4}
  .output-header{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 12px 0}
  .output-label{font-size:11px;font-weight:600;letter-spacing:.6px;text-transform:uppercase;color:var(--muted)}
  .output-tag{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px}
  .output-area{margin:12px;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface2);padding:12px;min-height:120px;max-height:280px;overflow:auto;white-space:pre-wrap;word-break:break-word;line-height:1.6;font-family:var(--mono);font-size:12px}
  .output-area::-webkit-scrollbar{width:8px}
  .output-area::-webkit-scrollbar-thumb{background:var(--border);border-radius:999px}
  .placeholder{color:var(--muted);font-family:var(--font)}
  .output-actions{display:flex;flex-wrap:wrap;gap:8px;padding:0 12px 12px}
  .mini-btn{border:1px solid var(--border);background:var(--surface);color:var(--text);border-radius:8px;padding:6px 10px;font:inherit;font-size:12px;cursor:pointer}
  .mini-btn:hover{border-color:var(--accent)}
  .files-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px}
  .refresh-btn{border:1px solid var(--border);background:var(--surface2);color:var(--text);border-radius:8px;padding:6px 10px;font:inherit;font-size:12px;cursor:pointer}
  .refresh-btn:hover{border-color:var(--accent)}
  .file-tree{padding:0 12px 12px;display:flex;flex-direction:column;gap:4px}
  .file-item{width:100%;display:flex;align-items:center;justify-content:space-between;gap:10px;border:1px solid var(--border);border-radius:8px;background:var(--surface2);padding:8px 10px;color:var(--text);cursor:pointer;text-align:left}
  .file-item:hover{border-color:var(--accent)}
  .file-main{min-width:0;display:flex;flex-direction:column;gap:3px}
  .file-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .file-path{font-size:11px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .status-row{padding:10px 12px;border-top:1px solid var(--border);color:var(--muted);font-size:11px}
  .spin{display:inline-block;width:13px;height:13px;border:2px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin .7s linear infinite;vertical-align:middle;margin-right:8px}
  @keyframes spin{to{transform:rotate(360deg)}}
</style>
</head>
<body>
  <div class="shell">
    <div class="header">
      <div>
        <div class="title">AI Dev Assistant</div>
        <div class="subtitle">A focused assistant for code, files, and workspace context.</div>
      </div>
      <div class="header-badges">
        <span class="badge" id="fileBadge">No file open</span>
        <span class="badge status" id="statusBadge">Checking backend</span>
      </div>
    </div>

    <div class="main">
      <section class="card">
        <div class="card-head">
          <div class="card-title">Context</div>
          <button class="link-btn" onclick="clearSelection()">Clear selection</button>
        </div>
        <div class="context-grid">
          <div>
            <div class="context-label">File</div>
            <div class="context-value muted" id="ctxFile">No file open</div>
          </div>
          <div>
            <div class="context-label">Language</div>
            <div class="context-value muted" id="ctxLang">Open a file to begin</div>
          </div>
          <div>
            <div class="context-label">Selection</div>
            <div class="context-value muted" id="ctxSelection">None</div>
          </div>
        </div>
      </section>

      <section class="card">
        <div class="card-head">
          <div class="card-title">Chat</div>
        </div>
        <div class="chat-messages" id="chatMessages">
          <div class="empty" id="chatEmpty">
            <h3>Start a code conversation</h3>
            <p>Ask about the current file, the selection, or the full workspace. The assistant will use your code context automatically.</p>
            <div class="suggestions">
              <button class="chip" onclick="fillChat('Explain what this file does')">Explain this file</button>
              <button class="chip" onclick="fillChat('What issues do you see in this code?')">Review this code</button>
              <button class="chip" onclick="fillChat('How can I improve this implementation?')">Suggest improvements</button>
              <button class="chip" onclick="fillChat('Generate unit tests for this file')">Generate tests</button>
            </div>
          </div>
        </div>
        <div class="panel-body">
          <div class="composer">
            <div class="scope-row">
              <div class="scope-group">
                <button class="scope-btn active" id="scopeCurrent" onclick="setChatScope('current')">Current file</button>
                <button class="scope-btn" id="scopeAll" onclick="setChatScope('all')">Workspace</button>
                <button class="scope-btn" id="scopeSelection" onclick="setChatScope('selection')" style="display:none">Selection</button>
              </div>
            </div>
            <div class="composer-row">
              <textarea class="chat-input" id="chatInput" placeholder="Ask a question about your code" rows="1" onkeydown="handleKey(event)" oninput="autoResize(this)"></textarea>
              <button class="send-btn" id="sendBtn" onclick="sendChat()">Send</button>
            </div>
          </div>
        </div>
      </section>

      <section class="card">
        <div class="card-head">
          <div class="card-title">Quick actions</div>
          <button class="link-btn" onclick="clearOutput()">Clear output</button>
        </div>
        <div class="panel-body" style="padding-bottom:0">
          <div class="scope-row">
            <div class="scope-group">
              <button class="scope-btn active" id="toolScopeCurrent" onclick="setToolScope('current')">Current file</button>
              <button class="scope-btn" id="toolScopeAll" onclick="setToolScope('all')">Workspace</button>
            </div>
          </div>
        </div>
        <div class="tool-grid">
          <button class="tool-btn" onclick="runTool('explain')">
            <span class="tool-name">Explain code</span>
            <span class="tool-desc">Summarize the selected code or current file.</span>
          </button>
          <button class="tool-btn" onclick="runTool('review')">
            <span class="tool-name">Code review</span>
            <span class="tool-desc">Highlight bugs, risks, and improvements.</span>
          </button>
          <button class="tool-btn" onclick="runTool('tests')">
            <span class="tool-name">Generate tests</span>
            <span class="tool-desc">Create unit tests and edge cases.</span>
          </button>
          <button class="tool-btn" onclick="runTool('readme')">
            <span class="tool-name">Generate README</span>
            <span class="tool-desc">Write a clean project README.</span>
          </button>
          <button class="tool-btn" onclick="runTool('architecture')">
            <span class="tool-name">Architecture</span>
            <span class="tool-desc">Describe structure, flow, and patterns.</span>
          </button>
          <button class="tool-btn" onclick="runTool('uml')">
            <span class="tool-name">UML diagram</span>
            <span class="tool-desc">Generate a PlantUML diagram.</span>
          </button>
        </div>
        <div class="output-header">
          <div class="output-label">Result</div>
          <div class="output-tag" id="outputTag"></div>
        </div>
        <div class="output-area" id="toolOutput">
          <span class="placeholder">Run an action to view the result here.</span>
        </div>
        <div class="output-actions" id="outputActions" style="display:none">
          <button class="mini-btn" onclick="copyOutput()">Copy</button>
          <button class="mini-btn" onclick="insertOutput()">Insert into editor</button>
          <button class="mini-btn" id="saveReadmeBtn" onclick="saveReadme()" style="display:none">Save README.md</button>
        </div>
      </section>

      <section class="card">
        <div class="files-head">
          <div class="card-title">Workspace files</div>
          <button class="refresh-btn" onclick="loadFiles()">Refresh</button>
        </div>
        <div class="file-tree" id="fileTree">
          <div class="context-value muted">Loading files...</div>
        </div>
      </section>
    </div>

    <div class="status-row" id="statusText">Checking backend</div>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();

    let currentFile = { name: '', path: '', language: '', content: '' };
    let selectedCode = '';
    let selectedLines = 0;
    let workspaceFiles = [];
    let chatHistory = [];
    let chatScope = 'current';
    let toolScope = 'current';
    let outputText = '';
    let currentTool = '';
    let pendingTool = null;
    let pendingChat = null;

    window.addEventListener('message', event => {
      const message = event.data;

      if (message.command === 'activeFileChanged') {
        currentFile = { name: message.fileName, path: message.filePath, language: message.language, content: message.content };
        updateContext();
        return;
      }

      if (message.command === 'selectionChanged') {
        if (message.text && message.text.trim()) {
          selectedCode = message.text;
          selectedLines = message.lines;
          updateSelectionUI();
        }
        return;
      }

      if (message.command === 'workspaceFiles') {
        workspaceFiles = message.files;
        renderFiles();
        return;
      }

      if (message.command === 'allFilesContent') {
        handleAllFiles(message.files);
        return;
      }

      if (message.command === 'backendResponse') {
        handleBackend(message.requestId, message.data, message.error);
        return;
      }

      if (message.command === 'triggerExplainSelection') {
        if (message.text && message.text.trim()) {
          selectedCode = message.text;
          selectedLines = message.lines || 0;
          updateSelectionUI();
          setChatScope('selection');
          runTool('explain');
        }
      }
    });

    function updateContext() {
      const hasFile = !!currentFile.name;
      document.getElementById('fileBadge').textContent = hasFile ? currentFile.name : 'No file open';
      document.getElementById('ctxFile').textContent = hasFile ? currentFile.name : 'No file open';
      document.getElementById('ctxLang').textContent = hasFile ? currentFile.language : 'Open a file to begin';
      document.getElementById('ctxSelection').textContent = selectedLines ? selectedLines + ' lines selected' : 'None';
    }

    function updateSelectionUI() {
      document.getElementById('ctxSelection').textContent = selectedLines ? selectedLines + ' lines selected' : 'None';
      document.getElementById('scopeSelection').style.display = selectedLines ? 'inline-flex' : 'none';
      if (!selectedLines && chatScope === 'selection') {
        setChatScope('current');
      }
    }

    function clearSelection() {
      selectedCode = '';
      selectedLines = 0;
      updateSelectionUI();
    }

    function setChatScope(scope) {
      chatScope = scope;
      document.getElementById('scopeCurrent').classList.toggle('active', scope === 'current');
      document.getElementById('scopeAll').classList.toggle('active', scope === 'all');
      document.getElementById('scopeSelection').classList.toggle('active', scope === 'selection');
    }

    function setToolScope(scope) {
      toolScope = scope;
      document.getElementById('toolScopeCurrent').classList.toggle('active', scope === 'current');
      document.getElementById('toolScopeAll').classList.toggle('active', scope === 'all');
    }

    function buildContext(scope, useSelection) {
      if (useSelection && selectedCode) {
        return 'File: ' + currentFile.name + ' (' + currentFile.language + ')\\n\\nSelected code:\\n' + selectedCode;
      }

      if (scope === 'current') {
        if (!currentFile.content) {
          return 'No file is currently open.';
        }
        return 'File: ' + currentFile.name + ' (' + currentFile.language + ')\\n\\n' + currentFile.content;
      }

      return null;
    }

    function fillChat(text) {
      const input = document.getElementById('chatInput');
      input.value = text;
      input.focus();
      autoResize(input);
    }

    function handleKey(event) {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendChat();
      }
    }

    function autoResize(el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    }

    function sendChat() {
      const input = document.getElementById('chatInput');
      const text = input.value.trim();
      if (!text) {
        return;
      }

      addMessage('user', text);
      input.value = '';
      input.style.height = 'auto';
      document.getElementById('sendBtn').disabled = true;

      const useSelection = chatScope === 'selection';
      const context = buildContext(chatScope, useSelection);
      if (!context) {
        pendingChat = text;
        vscode.postMessage({ command: 'getAllFilesContent' });
        return;
      }

      dispatchChat(text, context);
    }

    function dispatchChat(message, context) {
      const messages = [
        { role: 'user', content: 'Here is the code context I am working with:\\n\\n' + context },
        { role: 'assistant', content: 'I have read your code. What would you like to know?' },
        ...chatHistory,
        { role: 'user', content: message }
      ];

      callBackend('/api/chat', { messages }, 'chat_' + Date.now());
    }

    function addMessage(role, text) {
      const empty = document.getElementById('chatEmpty');
      if (empty) {
        empty.remove();
      }

      const box = document.getElementById('chatMessages');
      const message = document.createElement('div');
      message.className = 'message ' + role;
      message.innerHTML = '<div class="message-role">' + (role === 'user' ? 'You' : 'Assistant') + '</div>' +
        '<div class="message-bubble">' + renderMessageHtml(text) + '</div>';
      box.appendChild(message);
      box.scrollTop = box.scrollHeight;

      chatHistory.push({ role, content: text });
    }

    function renderMessageHtml(text) {
      let html = esc(text);
      html = html.replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g, '<div class="msg-img-wrap"><img class="msg-img" src="$2" alt="$1"/></div>');
      html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a class="msg-link" href="$2">$1</a>');
      html = html.replace(/\`([^\`]+)\`/g, '<code>$1</code>');
      html = html.replace(/\n/g, '<br>');
      return html;
    }

    function runTool(tool) {
      currentTool = tool;

      const prompts = {
        uml: 'Analyze the following code and generate a PlantUML diagram. For classes use class diagram, for flows use sequence diagram. Output ONLY valid PlantUML from @startuml to @enduml with no extra text.',
        tests: 'Generate comprehensive unit tests for the following code. Use the appropriate testing framework for the language. Include: happy path, edge cases, error cases, and boundary conditions.',
        readme: 'Generate a professional README.md for the following code. Include: # Title, ## Description, ## Features, ## Installation, ## Usage with code examples. Use proper markdown.',
        architecture: 'Analyze the following code and provide: 1) High-level architecture overview 2) Main components and responsibilities 3) Data flow 4) Design patterns used 5) Strengths and improvements.',
        explain: 'Explain the following code clearly: what it does, how it works step by step, key functions/classes, and any important patterns or gotchas.',
        review: 'Do a thorough code review. Report: 1) Bugs or logic errors 2) Security vulnerabilities 3) Performance bottlenecks 4) Code quality issues 5) Concrete improvements with examples.'
      };

      const useSelection = !!(selectedCode && (tool === 'explain' || tool === 'review'));
      const context = buildContext(toolScope, useSelection);

      document.getElementById('toolOutput').innerHTML = '<span class="spin"></span>Running ' + tool + '...';
      document.getElementById('outputTag').textContent = tool;
      document.getElementById('outputTag').style.display = 'block';
      document.getElementById('outputActions').style.display = 'none';
      document.getElementById('saveReadmeBtn').style.display = 'none';

      if (!context) {
        pendingTool = tool;
        vscode.postMessage({ command: 'getAllFilesContent' });
        return;
      }

      callBackend('/api/analyze', { prompt: prompts[tool], context, type: tool }, 'tool_' + Date.now());
    }

    function handleAllFiles(files) {
      const context = buildProjectContextFromFiles(files);

      if (pendingTool) {
        const tool = pendingTool;
        pendingTool = null;
        const prompts = {
          uml: 'Generate a PlantUML architecture diagram for this entire project. Output ONLY PlantUML from @startuml to @enduml.',
          tests: 'Generate unit tests covering key functions across this project.',
          readme: 'Generate a complete professional README.md for this entire project.',
          architecture: 'Provide a complete architecture analysis of this entire project.',
          explain: 'Explain the overall structure and purpose of this project.',
          review: 'Review this entire codebase for issues and improvements.'
        };
        callBackend('/api/analyze', { prompt: prompts[tool], context, type: tool }, 'tool_' + Date.now());
      }

      if (pendingChat) {
        const message = pendingChat;
        pendingChat = null;
        dispatchChat(message, context);
      }
    }

    function callBackend(endpoint, payload, requestId) {
      vscode.postMessage({ command: 'callBackend', endpoint, payload, requestId });
    }

    function handleBackend(requestId, data, error) {
      if (requestId.startsWith('health_')) {
        const ok = !error && !!data;
        document.getElementById('statusBadge').classList.toggle('on', ok);
        document.getElementById('statusBadge').textContent = ok ? 'Backend connected' : 'Backend offline';
        document.getElementById('statusText').textContent = ok ? 'Backend connected' : 'Backend offline';
        return;
      }

      if (requestId.startsWith('chat_')) {
        document.getElementById('sendBtn').disabled = false;
        if (error || !data) {
          addMessage('assistant', 'Backend error: ' + (error || 'Unknown'));
          return;
        }
        const reply = data.reply || data.response || data.result || JSON.stringify(data);
        addMessage('assistant', reply);
        return;
      }

      if (error || !data) {
        document.getElementById('toolOutput').innerHTML = 'Backend error: ' + esc(error || 'Unknown');
        document.getElementById('outputActions').style.display = 'none';
        document.getElementById('saveReadmeBtn').style.display = 'none';
        return;
      }

      let result = data.response || data.reply || data.result || data.output || data.content || data.explanation || JSON.stringify(data, null, 2);
      if (typeof result !== 'string') {
        result = JSON.stringify(result, null, 2);
      }

      outputText = result;
      document.getElementById('toolOutput').innerHTML = renderMessageHtml(result);
      document.getElementById('outputActions').style.display = 'flex';
      document.getElementById('saveReadmeBtn').style.display = currentTool === 'readme' ? 'inline-flex' : 'none';

      if (result.trim().startsWith('@startuml')) {
        renderUML(result);
      }

      const match = result.match(/https?:\/\/[^\s)]+\/api\/diagrams\/[^\s)]+/);
      if (match && match[0]) {
        document.getElementById('umlImg').src = match[0];
      }
    }

    function copyOutput() {
      navigator.clipboard.writeText(outputText).then(() => {
        vscode.postMessage({ command: 'showInfo', text: 'Copied to clipboard.' });
      });
    }

    function insertOutput() {
      vscode.postMessage({ command: 'insertText', text: outputText });
    }

    function clearOutput() {
      outputText = '';
      document.getElementById('toolOutput').innerHTML = '<span class="placeholder">Run an action to view the result here.</span>';
      document.getElementById('outputActions').style.display = 'none';
      document.getElementById('saveReadmeBtn').style.display = 'none';
      document.getElementById('outputTag').style.display = 'none';
    }

    function saveReadme() {
      if (!outputText || !outputText.trim()) {
        vscode.postMessage({ command: 'showError', text: 'No README content to save.' });
        return;
      }

      vscode.postMessage({
        command: 'writeFile',
        relativePath: 'README.md',
        content: outputText,
        confirmReplace: true
      });
    }

    function renderUML(code) {
      try {
        const enc = plantEncode(code);
        document.getElementById('toolOutput').innerHTML = '<img id="umlImg" alt="UML diagram" style="width:100%;display:block;border-radius:8px" src="https://www.plantuml.com/plantuml/svg/' + enc + '"/>';
      } catch (_) {}
    }

    function plantEncode(s) {
      function e6(b) {
        if (b < 10) return String.fromCharCode(48 + b);
        b -= 10;
        if (b < 26) return String.fromCharCode(65 + b);
        b -= 26;
        if (b < 26) return String.fromCharCode(97 + b);
        return b === 0 ? '-' : '_';
      }
      function a3(b1, b2, b3) {
        return e6(b1 >> 2) + e6(((b1 & 3) << 4) | (b2 >> 4)) + e6(((b2 & 0xf) << 2) | (b3 >> 6)) + e6(b3 & 0x3f);
      }
      const bytes = new TextEncoder().encode(s);
      let result = '';
      for (let i = 0; i < bytes.length; i += 3) {
        result += a3(bytes[i], bytes[i + 1] || 0, bytes[i + 2] || 0);
      }
      return result;
    }

    function loadFiles() {
      document.getElementById('fileTree').innerHTML = '<div class="context-value muted">Loading files...</div>';
      vscode.postMessage({ command: 'getWorkspaceFiles' });
    }

    function renderFiles() {
      const tree = document.getElementById('fileTree');
      if (!workspaceFiles.length) {
        tree.innerHTML = '<div class="context-value muted">No files found.</div>';
        return;
      }

      tree.innerHTML = workspaceFiles.map(file => {
        const safePath = file.path.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        return '<button class="file-item" onclick="openFile(\\'' + safePath + '\\')">' +
          '<span class="file-main"><span class="file-name">' + esc(file.name) + '</span><span class="file-path">' + esc(file.relativePath) + '</span></span>' +
          '</button>';
      }).join('');
    }

    function openFile(path) {
      vscode.postMessage({ command: 'openFile', filePath: path });
    }

    function esc(text) {
      return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    function checkHealth() {
      callBackend('/health', {}, 'health_' + Date.now());
    }

    updateContext();
    vscode.postMessage({ command: 'getCurrentFile' });
    loadFiles();
    checkHealth();
    setInterval(checkHealth, 30000);
  </script>
</body>
</html>`;
}

function getNonce() {
  let text = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return text;
}
