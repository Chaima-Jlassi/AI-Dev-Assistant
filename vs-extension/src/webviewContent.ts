import * as vscode from 'vscode';

export function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri): string {
  const nonce = getNonce();

  return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src https: http: data:;"/>
<title>AI Dev Assistant</title>
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{
    --bg:var(--vscode-sideBar-background);
    --surface:var(--vscode-editor-background);
    --surface2:var(--vscode-input-background);
    --border:var(--vscode-panel-border,rgba(127,127,127,.18));
    --text:var(--vscode-foreground);
    --muted:var(--vscode-descriptionForeground);
    --accent:var(--vscode-button-background);
    --accent-text:var(--vscode-button-foreground);
    --accent-hover:var(--vscode-button-hoverBackground);
    --radius:8px;
    --font:'Segoe UI',system-ui,-apple-system,sans-serif;
    --mono:'Cascadia Code','Fira Code',monospace;
  }
  body{height:100vh;display:flex;flex-direction:column;overflow:hidden;background:var(--bg);color:var(--text);font-family:var(--font);font-size:13px}
  .shell{display:flex;flex-direction:column;height:100%;min-height:0}

  /* Header */
  .header{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;border-bottom:1px solid var(--border);background:var(--surface);flex-shrink:0}
  .title{font-size:13px;font-weight:600}
  .header-right{display:flex;gap:6px;align-items:center}
  .badge{display:inline-flex;align-items:center;padding:2px 8px;border:1px solid var(--border);border-radius:999px;background:var(--surface2);color:var(--muted);font-size:11px;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .badge.on{border-color:rgba(63,185,80,.4);color:var(--text)}

  /* Service list */
  .service-view{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:6px}
  .service-view::-webkit-scrollbar{width:6px}
  .service-view::-webkit-scrollbar-thumb{background:var(--border);border-radius:999px}
  .section-label{font-size:11px;color:var(--muted);letter-spacing:.5px;text-transform:uppercase;padding:4px 0 6px}
  .service-item{width:100%;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);color:var(--text);padding:10px 12px;text-align:left;cursor:pointer;display:flex;flex-direction:column;gap:3px;transition:border-color .12s}
  .service-item:hover{border-color:var(--accent)}
  .service-name{font-size:13px;font-weight:500}
  .service-hint{font-size:11px;color:var(--muted);line-height:1.4}

  /* Conversation view */
  .conv-view{flex:1;min-height:0;display:flex;flex-direction:column}
  .conv-head{display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid var(--border);flex-shrink:0}
  .back-btn{border:none;background:transparent;color:var(--muted);font:inherit;font-size:12px;cursor:pointer;padding:2px 6px 2px 2px;border-radius:4px}
  .back-btn:hover{color:var(--text);background:var(--surface2)}
  .conv-title{font-size:12px;font-weight:600;color:var(--text)}
  .conv-messages{flex:1;min-height:0;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:10px}
  .conv-messages::-webkit-scrollbar{width:6px}
  .conv-messages::-webkit-scrollbar-thumb{background:var(--border);border-radius:999px}

  /* Messages */
  .msg{display:flex;flex-direction:column;gap:3px}
  .msg-role{font-size:10px;letter-spacing:.5px;text-transform:uppercase;color:var(--muted)}
  .msg-bubble{border:1px solid var(--border);border-radius:var(--radius);background:var(--surface2);padding:9px 11px;line-height:1.6;white-space:pre-wrap;word-break:break-word;font-size:12px}
  .msg.user .msg-bubble{border-color:color-mix(in srgb,var(--accent) 35%,var(--border));background:color-mix(in srgb,var(--accent) 8%,var(--surface2))}
  .msg-bubble code{padding:1px 4px;border-radius:3px;background:rgba(127,127,127,.14);font-family:var(--mono);font-size:11px}
  .msg-bubble pre{background:rgba(127,127,127,.1);border-radius:6px;padding:10px;overflow-x:auto;margin:6px 0}
  .msg-bubble pre code{background:none;padding:0;font-size:11px}

  /* Input area */
  .conv-input{flex-shrink:0;border-top:1px solid var(--border);padding:10px 12px;display:flex;flex-direction:column;gap:8px}
  .input-label{font-size:11px;color:var(--muted)}
  .ctx-pill{display:inline-flex;align-items:center;gap:6px;padding:5px 9px;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface2);font-size:11px;color:var(--muted)}
  .ctx-pill strong{color:var(--text);font-weight:500}
  .ctx-clear{background:none;border:none;color:var(--muted);cursor:pointer;font-size:11px;padding:0 2px;line-height:1}
  .ctx-clear:hover{color:var(--text)}
  .code-input{width:100%;min-height:80px;max-height:160px;resize:none;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);color:var(--text);padding:8px 10px;font-family:var(--mono);font-size:11px;line-height:1.5;outline:none}
  .code-input:focus{border-color:var(--accent)}
  .code-input::placeholder{color:var(--muted);font-family:var(--font)}
  .text-input{width:100%;height:30px;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);color:var(--text);padding:4px 9px;font:inherit;font-size:12px;outline:none}
  .text-input:focus{border-color:var(--accent)}
  .text-input::placeholder{color:var(--muted)}
  .pill-row{display:flex;gap:6px;flex-wrap:wrap}
  .pill-btn{border:1px solid var(--border);border-radius:999px;background:var(--surface);color:var(--muted);padding:4px 10px;font:inherit;font-size:11px;cursor:pointer;transition:border-color .1s,color .1s}
  .pill-btn:hover{border-color:var(--accent);color:var(--text)}
  .pill-btn.active{border-color:var(--accent);color:var(--text);background:color-mix(in srgb,var(--accent) 10%,var(--surface))}
  .action-row{display:flex;gap:8px;align-items:center;justify-content:space-between}
  .primary-btn{border:none;border-radius:var(--radius);background:var(--accent);color:var(--accent-text);font:inherit;font-size:12px;font-weight:600;padding:7px 14px;cursor:pointer}
  .primary-btn:hover{background:var(--accent-hover)}
  .primary-btn:disabled{opacity:.6;cursor:not-allowed}
  .mini-btn{border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);color:var(--text);font:inherit;font-size:11px;padding:5px 9px;cursor:pointer}
  .mini-btn:hover{border-color:var(--accent)}

  /* Spinner */
  .spinner{display:inline-block;width:14px;height:14px;border:2px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin .7s linear infinite;vertical-align:middle;margin-right:6px}
  @keyframes spin{to{transform:rotate(360deg)}}

  /* Status bar */
  .status-bar{flex-shrink:0;padding:4px 12px;font-size:10px;color:var(--muted);border-top:1px solid var(--border);background:var(--surface)}
</style>
</head>
<body>
<div class="shell">

  <!-- Header -->
  <div class="header">
    <span class="title">AI Dev Assistant</span>
    <div class="header-right">
      <span class="badge" id="fileBadge">No file open</span>
      <span class="badge" id="statusBadge">Checking</span>
    </div>
  </div>

  <!-- Service selection view -->
  <div class="service-view" id="viewService">
    <div class="section-label">Select a service</div>
    <button class="service-item" onclick="selectService('explain')">
      <span class="service-name">Explain Code</span>
      <span class="service-hint">Get a clear explanation of selected or pasted code.</span>
    </button>
    <button class="service-item" onclick="selectService('readme')">
      <span class="service-name">Generate README</span>
      <span class="service-hint">Scan workspace files and generate a project README.</span>
    </button>
    <button class="service-item" onclick="selectService('uml')">
      <span class="service-name">Generate UML Diagram</span>
      <span class="service-hint">Describe a system and produce a PlantUML diagram.</span>
    </button>
    <button class="service-item" onclick="selectService('tests')">
      <span class="service-name">Generate Unit Tests</span>
      <span class="service-hint">Create unit tests for selected or pasted code.</span>
    </button>
  </div>

  <!-- Per-service conversation view (hidden initially) -->
  <div class="conv-view" id="viewConversation" style="display:none">
    <div class="conv-head">
      <button class="back-btn" id="backBtn" onclick="goBack()">&#8592; Back</button>
      <span class="conv-title" id="convTitle"></span>
    </div>
    <div class="conv-messages" id="convMessages"></div>
    <div class="conv-input" id="convInput"></div>
  </div>

  <div class="status-bar" id="statusBar">Connecting to backend...</div>
</div>

<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();

  // ── State ─────────────────────────────────────────────────────────────────
  let currentService = '';
  let currentFile = { name: '', path: '', language: '', content: '' };
  let selectedCode = '';
  let selectedLines = 0;
  let explainDetailLevel = 'standard';
  let umlDiagramType = 'auto';
  let pendingReadme = false;
  let lastResult = '';

  // ── Navigation ────────────────────────────────────────────────────────────
  function selectService(service) {
    currentService = service;
    document.getElementById('viewService').style.display = 'none';
    const convView = document.getElementById('viewConversation');
    convView.style.display = 'flex';

    const titles = { explain: 'Explain Code', readme: 'Generate README', uml: 'Generate UML Diagram', tests: 'Generate Unit Tests' };
    document.getElementById('convTitle').textContent = titles[service] || service;
    document.getElementById('convMessages').innerHTML = '';
    lastResult = '';
    initServiceInput(service);
  }

  function goBack() {
    currentService = '';
    pendingReadme = false;
    document.getElementById('viewConversation').style.display = 'none';
    document.getElementById('viewService').style.display = 'flex';
  }

  // ── Input panels ──────────────────────────────────────────────────────────
  function initServiceInput(service) {
    const el = document.getElementById('convInput');

    if (service === 'explain') {
      const hasSelection = selectedCode.length > 0;
      el.innerHTML =
        (hasSelection
          ? '<div class="ctx-pill"><strong>' + esc(selectedLines) + ' lines selected</strong> from ' + esc(currentFile.name || 'file') + '<button class="ctx-clear" onclick="clearSelection()" title="Clear">x</button></div>'
          : '') +
        '<textarea id="codeInputEl" class="code-input" placeholder="Paste code to explain..." rows="5">' +
        (hasSelection ? esc(selectedCode) : '') +
        '</textarea>' +
        '<div class="input-label">Detail level</div>' +
        '<div class="pill-row">' +
        '<button class="pill-btn' + (explainDetailLevel === 'brief' ? ' active' : '') + '" id="detailBrief" onclick="setDetailLevel(\'brief\')">Brief</button>' +
        '<button class="pill-btn' + (explainDetailLevel === 'standard' ? ' active' : '') + '" id="detailStandard" onclick="setDetailLevel(\'standard\')">Standard</button>' +
        '<button class="pill-btn' + (explainDetailLevel === 'detailed' ? ' active' : '') + '" id="detailDetailed" onclick="setDetailLevel(\'detailed\')">Detailed</button>' +
        '</div>' +
        '<div class="action-row"><button class="primary-btn" id="runBtn" onclick="runExplain()">Explain</button></div>';
    }

    if (service === 'readme') {
      const projectName = currentFile.path ? currentFile.path.split(/[/\\]/).slice(-3, -1).join('/') : 'workspace';
      el.innerHTML =
        '<div class="ctx-pill">Project: <strong>' + esc(projectName) + '</strong></div>' +
        '<div class="input-label">This will scan all workspace files and generate a README using Gemini.</div>' +
        '<div class="action-row"><button class="primary-btn" id="runBtn" onclick="runReadme()">Scan and Generate</button></div>';
    }

    if (service === 'uml') {
      el.innerHTML =
        '<textarea id="umlDescInput" class="code-input" placeholder="Describe the system, components, and interactions..." rows="4"></textarea>' +
        '<div class="input-label">Diagram type</div>' +
        '<div class="pill-row">' +
        '<button class="pill-btn' + (umlDiagramType === 'auto' ? ' active' : '') + '" onclick="setUmlType(\'auto\')">Auto</button>' +
        '<button class="pill-btn' + (umlDiagramType === 'class' ? ' active' : '') + '" onclick="setUmlType(\'class\')">Class</button>' +
        '<button class="pill-btn' + (umlDiagramType === 'sequence' ? ' active' : '') + '" onclick="setUmlType(\'sequence\')">Sequence</button>' +
        '<button class="pill-btn' + (umlDiagramType === 'activity' ? ' active' : '') + '" onclick="setUmlType(\'activity\')">Activity</button>' +
        '</div>' +
        '<div class="action-row"><button class="primary-btn" id="runBtn" onclick="runUml()">Generate</button></div>';
    }

    if (service === 'tests') {
      const hasSelection = selectedCode.length > 0;
      el.innerHTML =
        (hasSelection
          ? '<div class="ctx-pill"><strong>' + esc(selectedLines) + ' lines selected</strong> from ' + esc(currentFile.name || 'file') + '<button class="ctx-clear" onclick="clearSelection()" title="Clear">x</button></div>'
          : '') +
        '<textarea id="codeInputEl" class="code-input" placeholder="Paste code to generate tests for..." rows="5">' +
        (hasSelection ? esc(selectedCode) : '') +
        '</textarea>' +
        '<input id="langInputEl" type="text" class="text-input" placeholder="Language (optional, auto-detected)" />' +
        '<div class="action-row"><button class="primary-btn" id="runBtn" onclick="runTests()">Generate Tests</button></div>';
    }
  }

  // ── Detail / type selectors ───────────────────────────────────────────────
  function setDetailLevel(level) {
    explainDetailLevel = level;
    ['brief', 'standard', 'detailed'].forEach(l => {
      const btn = document.getElementById('detail' + l.charAt(0).toUpperCase() + l.slice(1));
      if (btn) btn.classList.toggle('active', l === level);
    });
  }

  function setUmlType(type) {
    umlDiagramType = type;
    document.querySelectorAll('#convInput .pill-btn').forEach(function(btn) {
      const label = btn.textContent.trim().toLowerCase();
      btn.classList.toggle('active', label === type || (type === 'auto' && label === 'auto'));
    });
  }

  function clearSelection() {
    selectedCode = '';
    selectedLines = 0;
    if (currentService === 'explain' || currentService === 'tests') {
      initServiceInput(currentService);
    }
  }

  // ── Run actions ───────────────────────────────────────────────────────────
  function runExplain() {
    const codeEl = document.getElementById('codeInputEl');
    const code = codeEl ? codeEl.value.trim() : selectedCode;
    if (!code) { appendMsg('assistant', 'Please paste or select some code first.'); return; }
    setRunning(true);
    appendMsg('user', 'Explain this code (' + explainDetailLevel + ')');
    callBackend('/api/analyze', {
      type: 'explain',
      prompt: 'Explain this code.',
      context: code,
      language: currentFile.language || '',
      detail_level: explainDetailLevel,
    }, 'explain_' + Date.now());
  }

  function runReadme() {
    setRunning(true);
    pendingReadme = true;
    appendMsg('user', 'Generate README for this project');
    appendMsg('assistant', '<span class="spinner"></span>Scanning workspace files...');
    vscode.postMessage({ command: 'getAllFilesContent' });
  }

  function runUml() {
    const descEl = document.getElementById('umlDescInput');
    const desc = descEl ? descEl.value.trim() : '';
    if (!desc) { appendMsg('assistant', 'Please describe the system first.'); return; }
    setRunning(true);
    appendMsg('user', 'Generate ' + umlDiagramType + ' diagram');
    callBackend('/api/analyze', {
      type: 'uml',
      prompt: desc,
      context: '',
      intake: {
        diagramTypes: [umlDiagramType === 'auto' ? 'sequence' : umlDiagramType],
        systemDescription: desc,
        actorsServices: desc,
        extraInfo: '',
      },
    }, 'uml_' + Date.now());
  }

  function runTests() {
    const codeEl = document.getElementById('codeInputEl');
    const langEl = document.getElementById('langInputEl');
    const code = codeEl ? codeEl.value.trim() : selectedCode;
    const lang = langEl ? langEl.value.trim() : '';
    if (!code) { appendMsg('assistant', 'Please paste or select some code first.'); return; }
    setRunning(true);
    appendMsg('user', 'Generate unit tests' + (lang ? ' (' + lang + ')' : ''));
    callBackend('/api/analyze', {
      type: 'tests',
      prompt: 'Generate unit tests.',
      context: code,
      code: code,
      language: lang || currentFile.language || '',
    }, 'tests_' + Date.now());
  }

  function setRunning(on) {
    const btn = document.getElementById('runBtn');
    if (btn) btn.disabled = on;
  }

  // ── Message helpers ───────────────────────────────────────────────────────
  function appendMsg(role, html) {
    const container = document.getElementById('convMessages');
    const div = document.createElement('div');
    div.className = 'msg ' + role;
    div.innerHTML =
      '<div class="msg-role">' + (role === 'user' ? 'You' : 'Assistant') + '</div>' +
      '<div class="msg-bubble">' + (role === 'assistant' ? renderMessageHtml(html) : esc(html)) + '</div>';
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  function appendResult(text, showSave) {
    lastResult = text;
    const container = document.getElementById('convMessages');

    // Remove last scanning message if present
    const msgs = container.querySelectorAll('.msg.assistant');
    if (msgs.length) {
      const last = msgs[msgs.length - 1];
      if (last.querySelector('.spinner')) last.remove();
    }

    const div = document.createElement('div');
    div.className = 'msg assistant';
    div.innerHTML =
      '<div class="msg-role">Assistant</div>' +
      '<div class="msg-bubble">' + renderMessageHtml(text) + '</div>';
    container.appendChild(div);

    if (showSave || text.toLowerCase().includes('readme')) {
      const actions = document.createElement('div');
      actions.style.cssText = 'display:flex;gap:8px;padding:0 0 4px';
      actions.innerHTML =
        '<button class="mini-btn" onclick="copyResult()">Copy</button>' +
        (showSave ? '<button class="mini-btn" onclick="saveReadme()">Save README.md</button>' : '');
      container.appendChild(actions);
    } else if (text.trim().startsWith('@startuml') || text.includes('@startuml')) {
      renderUMLInline(text, container);
    } else {
      const actions = document.createElement('div');
      actions.style.cssText = 'display:flex;gap:8px;padding:0 0 4px';
      actions.innerHTML = '<button class="mini-btn" onclick="copyResult()">Copy</button>';
      container.appendChild(actions);
    }

    container.scrollTop = container.scrollHeight;
    setRunning(false);
  }

  function copyResult() {
    navigator.clipboard.writeText(lastResult).then(() => {
      vscode.postMessage({ command: 'showInfo', text: 'Copied to clipboard.' });
    });
  }

  function saveReadme() {
    if (!lastResult.trim()) { vscode.postMessage({ command: 'showError', text: 'No README content to save.' }); return; }
    vscode.postMessage({ command: 'writeFile', relativePath: 'README.md', content: lastResult, confirmReplace: true });
  }

  // ── Backend ───────────────────────────────────────────────────────────────
  function callBackend(endpoint, payload, requestId) {
    vscode.postMessage({ command: 'callBackend', endpoint, payload, requestId });
  }

  function handleBackend(requestId, data, error) {
    if (requestId.startsWith('health_')) {
      _onHealthResolved();
      const ok = !error && !!data;
      const badge = document.getElementById('statusBadge');
      badge.textContent = ok ? 'Connected' : 'Offline';
      badge.classList.toggle('on', ok);
      document.getElementById('statusBar').textContent = ok ? 'Backend connected' : 'Backend offline — ensure API is running on port 18000';
      return;
    }

    if (error || !data) {
      setRunning(false);
      appendMsg('assistant', 'Error: ' + (error || 'No response from backend.'));
      return;
    }

    const text = data.result || data.reply || data.response || data.explanation || data.content || JSON.stringify(data, null, 2);
    const isReadme = requestId.startsWith('readme_');
    const isUml = requestId.startsWith('uml_');

    if (isUml) {
      const umlMatch = String(text).match(/@startuml[\s\S]*?@enduml/);
      if (umlMatch) {
        appendResultWithUml(umlMatch[0]);
        return;
      }
      const imgMatch = String(text).match(/https?:\/\/[^\s)]+\/api\/diagrams\/[^\s)]+/);
      if (imgMatch) {
        appendResultWithImg(imgMatch[0], text);
        return;
      }
    }

    appendResult(typeof text === 'string' ? text : JSON.stringify(text, null, 2), isReadme);
  }

  function appendResultWithUml(umlCode) {
    lastResult = umlCode;
    const container = document.getElementById('convMessages');
    const enc = plantEncode(umlCode);
    const div = document.createElement('div');
    div.className = 'msg assistant';
    div.innerHTML =
      '<div class="msg-role">Assistant</div>' +
      '<div class="msg-bubble"><img alt="UML diagram" style="width:100%;display:block;border-radius:6px" src="https://www.plantuml.com/plantuml/svg/' + enc + '"/></div>';
    container.appendChild(div);
    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:8px;padding:0 0 4px';
    actions.innerHTML = '<button class="mini-btn" onclick="copyResult()">Copy PlantUML</button>';
    container.appendChild(actions);
    container.scrollTop = container.scrollHeight;
    setRunning(false);
  }

  function appendResultWithImg(imgUrl, fullText) {
    lastResult = fullText;
    const container = document.getElementById('convMessages');
    const div = document.createElement('div');
    div.className = 'msg assistant';
    div.innerHTML =
      '<div class="msg-role">Assistant</div>' +
      '<div class="msg-bubble"><img alt="UML diagram" style="width:100%;display:block;border-radius:6px" src="' + esc(imgUrl) + '"/></div>';
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    setRunning(false);
  }

  function renderUMLInline(code, container) {
    try {
      const enc = plantEncode(code);
      const div = document.createElement('div');
      div.innerHTML = '<img alt="UML diagram" style="width:100%;display:block;border-radius:6px" src="https://www.plantuml.com/plantuml/svg/' + enc + '"/>';
      container.appendChild(div);
    } catch(_) {}
  }

  // ── Markdown renderer ─────────────────────────────────────────────────────
  function renderMessageHtml(text) {
    if (!text) return '';
    let html = String(text);
    // fenced code blocks
    html = html.replace(/\`\`\`(\w*)\n?([\s\S]*?)\`\`\`/g, (_, lang, code) =>
      '<pre><code>' + esc(code.trim()) + '</code></pre>'
    );
    // inline code
    html = html.replace(/\`([^\`\n]+)\`/g, (_, c) => '<code>' + esc(c) + '</code>');
    // bold
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // headers
    html = html.replace(/^### (.+)$/gm, '<strong style="font-size:12px;display:block;margin-top:8px">$1</strong>');
    html = html.replace(/^## (.+)$/gm, '<strong style="font-size:13px;display:block;margin-top:10px">$1</strong>');
    html = html.replace(/^# (.+)$/gm, '<strong style="font-size:14px;display:block;margin-top:12px">$1</strong>');
    // bullet lists
    html = html.replace(/^[-*] (.+)$/gm, '<div style="padding-left:14px;margin:2px 0">&#8226; $1</div>');
    // line breaks
    html = html.replace(/\n/g, '<br/>');
    return html;
  }

  // ── PlantUML encoder ──────────────────────────────────────────────────────
  function plantEncode(s) {
    function e6(b) {
      if (b < 10) return String.fromCharCode(48 + b);
      b -= 10; if (b < 26) return String.fromCharCode(65 + b);
      b -= 26; if (b < 26) return String.fromCharCode(97 + b);
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

  // ── Escape helper ─────────────────────────────────────────────────────────
  function esc(text) {
    return String(text).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── VSCode message handler ────────────────────────────────────────────────
  window.addEventListener('message', event => {
    const msg = event.data;
    switch (msg.command) {
      case 'activeFileChanged':
        currentFile = { name: msg.fileName || '', path: msg.filePath || '', language: msg.language || '', content: msg.content || '' };
        document.getElementById('fileBadge').textContent = msg.fileName || 'No file open';
        break;

      case 'selectionChanged':
        selectedCode = msg.text || '';
        selectedLines = msg.lines || 0;
        if ((currentService === 'explain' || currentService === 'tests') && selectedCode) {
          initServiceInput(currentService);
        }
        break;

      case 'allFilesContent':
        if (pendingReadme) {
          pendingReadme = false;
          const files = msg.files || [];
          const folderContent = files.map(f => '// FILE: ' + (f.relativePath || f.name || '') + '\n' + (f.content || '')).join('\n\n');
          const projectName = currentFile.path ? currentFile.path.split(/[/\\]/).slice(-3, -1).join('/') : 'project';
          callBackend('/api/analyze', {
            type: 'readme',
            prompt: 'Generate a README for this project.',
            folder_content: folderContent,
            project_name: projectName,
            language: 'auto',
          }, 'readme_' + Date.now());
        }
        break;

      case 'backendResponse':
        handleBackend(msg.requestId, msg.data, msg.error);
        break;

      case 'triggerExplainSelection':
        selectedCode = msg.text || '';
        selectedLines = msg.lines || 0;
        selectService('explain');
        break;
    }
  });

  // ── Health check ──────────────────────────────────────────────────────────
  function checkHealth() {
    callBackend('/health', {}, 'health_' + Date.now());
  }

  vscode.postMessage({ command: 'getCurrentFile' });
  // Retry health check until we get a response (panel may not be visible on first fire)
  var _healthTimer = setInterval(function() { checkHealth(); }, 3000);
  function _onHealthResolved() { clearInterval(_healthTimer); }
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
