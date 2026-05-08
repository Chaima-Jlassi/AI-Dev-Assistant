import * as vscode from 'vscode';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { getWebviewContent } from './webviewContent';

export class AiDevAssistantProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'aiDevAssistant.panel';
  private _view?: vscode.WebviewView;
  private _log = vscode.window.createOutputChannel('AI Dev Assistant');

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _context: vscode.ExtensionContext
  ) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };
    (webviewView as any).retainContextWhenHidden = true;

    webviewView.webview.html = getWebviewContent(webviewView.webview, this._extensionUri);

    
    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case 'getWorkspaceFiles':
          await this._sendWorkspaceFiles();
          break;
        case 'getCurrentFile':
          await this._sendCurrentFile();
          break;
        case 'getAllFilesContent':
          await this._sendAllFilesContent();
          break;
        case 'openFile':
          await this._openFile(message.filePath);
          break;
        case 'insertText':
          await this._insertTextToEditor(message.text);
          break;
        case 'writeFile':
          await this._writeFile(
            message.relativePath,
            message.content,
            !!message.confirmReplace
          );
          break;
        case 'callBackend':
          await this._callBackend(message.endpoint, message.payload, message.requestId);
          break;
        case 'showInfo':
          vscode.window.showInformationMessage(message.text);
          break;
        case 'showError':
          vscode.window.showErrorMessage(message.text);
          break;
      }
    });

    // Send initial state
    this._sendCurrentFile();
  }

  // ── Notify: active editor changed ─────────────────
  public notifyEditorChange(editor: vscode.TextEditor) {
    if (!this._view) return;
    this._view.webview.postMessage({
      command: 'activeFileChanged',
      fileName: path.basename(editor.document.fileName),
      filePath: editor.document.fileName,
      language: editor.document.languageId,
      content: editor.document.getText()
    });
  }

  // ── Notify: selection changed ──────────────────────
  public notifySelectionChange(editor: vscode.TextEditor) {
    if (!this._view) return;
    const selection = editor.selection;
    if (selection.isEmpty) return;
    const text = editor.document.getText(selection);
    if (!text.trim()) return;
    const lines = selection.end.line - selection.start.line + 1;
    this._view.webview.postMessage({
      command: 'selectionChanged',
      text,
      lines,
      fileName: path.basename(editor.document.fileName)
    });
  }

  // ── Notify: file saved ─────────────────────────────
  public notifyFileSaved(doc: vscode.TextDocument) {
    if (!this._view) return;
    this._view.webview.postMessage({
      command: 'fileSaved',
      fileName: path.basename(doc.fileName),
      filePath: doc.fileName
    });
  }

  // ── Trigger explain from command palette / shortcut ──────────────
  public async triggerExplainSelection() {
    const editor = vscode.window.activeTextEditor;
    if (!editor || !this._view) {
      vscode.window.showWarningMessage('Open a file and select code first.');
      return;
    }

    const selection = editor.selection;
    if (selection.isEmpty) {
      vscode.window.showWarningMessage('Select code first, then run Explain Selected Code.');
      return;
    }

    const text = editor.document.getText(selection);
    if (!text.trim()) {
      vscode.window.showWarningMessage('Selected code is empty.');
      return;
    }

    const lines = selection.end.line - selection.start.line + 1;
    this._view.webview.postMessage({
      command: 'triggerExplainSelection',
      text,
      lines,
      fileName: path.basename(editor.document.fileName)
    });
  }

  // ── Send current file ──────────────────────────────
  private async _sendCurrentFile() {
    const editor = vscode.window.activeTextEditor;
    if (!editor || !this._view) return;
    this._view.webview.postMessage({
      command: 'activeFileChanged',
      fileName: path.basename(editor.document.fileName),
      filePath: editor.document.fileName,
      language: editor.document.languageId,
      content: editor.document.getText()
    });
  }

  // ── Send workspace file list ───────────────────────
  private async _sendWorkspaceFiles() {
    if (!this._view) return;
    const files = await vscode.workspace.findFiles(
      '**/*.{ts,tsx,js,jsx,py,java,cs,cpp,c,go,rs,vue,html,css,json,md}',
      '**/node_modules/**,**/.git/**,**/out/**,**/dist/**,**/__pycache__/**,**/.venv/**'
    );
    const fileList = files.map(f => ({
      path: f.fsPath,
      name: path.basename(f.fsPath),
      relativePath: vscode.workspace.asRelativePath(f)
    }));
    this._view.webview.postMessage({ command: 'workspaceFiles', files: fileList });
  }

  // ── Send ALL files content (full project context) ──
  private async _sendAllFilesContent() {
    if (!this._view) return;
    const files = await vscode.workspace.findFiles(
      '**/*.{ts,tsx,js,jsx,py,java,cs,cpp,c,go,rs,vue,html,css}',
      '**/node_modules/**,**/.git/**,**/out/**,**/dist/**,**/__pycache__/**,**/.venv/**'
    );
    const allContent: { path: string; relativePath: string; content: string }[] = [];
    for (const file of files.slice(0, 60)) {
      try {
        const content = fs.readFileSync(file.fsPath, 'utf-8');
        allContent.push({
          path: file.fsPath,
          relativePath: vscode.workspace.asRelativePath(file),
          content
        });
      } catch (_) { /* skip */ }
    }
    this._view.webview.postMessage({ command: 'allFilesContent', files: allContent });
  }

  // ── Open file in editor ────────────────────────────
  private async _openFile(filePath: string) {
    try {
      const doc = await vscode.workspace.openTextDocument(filePath);
      await vscode.window.showTextDocument(doc);
    } catch (_) {
      vscode.window.showErrorMessage('Could not open file: ' + filePath);
    }
  }

  // ── Insert text into active editor ────────────────
  private async _insertTextToEditor(text: string) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage('No active editor to insert into.');
      return;
    }
    await editor.edit(editBuilder => {
      const pos = editor.selection.active;
      editBuilder.insert(pos, '\n' + text + '\n');
    });
    vscode.window.showInformationMessage('Inserted into editor.');
  }

  // ── Write file in workspace (README flow) ────────────────────────
  private async _writeFile(relativePath: string, content: string, confirmReplace: boolean) {
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) {
      vscode.window.showErrorMessage('No workspace folder is open.');
      return;
    }

    const targetUri = vscode.Uri.joinPath(folder.uri, relativePath || 'README.md');
    const exists = fs.existsSync(targetUri.fsPath);

    if (exists && confirmReplace) {
      const decision = await vscode.window.showWarningMessage(
        `${relativePath} already exists. Replace it?`,
        { modal: true },
        'Replace'
      );
      if (decision !== 'Replace') {
        vscode.window.showInformationMessage('README replace canceled.');
        return;
      }
    }

    try {
      const data = Buffer.from(content, 'utf-8');
      await vscode.workspace.fs.writeFile(targetUri, data);
      const doc = await vscode.workspace.openTextDocument(targetUri);
      await vscode.window.showTextDocument(doc, { preview: false });
      vscode.window.showInformationMessage(`${relativePath} updated successfully.`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown write error';
      vscode.window.showErrorMessage(`Failed to write ${relativePath}: ${msg}`);
    }
  }

  // ── Proxy backend call (avoids CORS) ──────────────
  private async _callBackend(endpoint: string, payload: unknown, requestId: string) {
    if (!this._view) { this._log.appendLine(`[callBackend] no view, skipping ${endpoint}`); return; }
    const config = vscode.workspace.getConfiguration('aiDevAssistant');
    const backendUrl = config.get<string>('backendUrl') || 'http://localhost:18000';
    this._log.appendLine(`[callBackend] ${endpoint} → ${backendUrl}`);

    try {
      const http = await import('node:http');
      const https = await import('node:https');
      const url = new URL(endpoint, backendUrl);
      const body = JSON.stringify(payload);

      const method = endpoint === '/health' ? 'GET' : 'POST';
      const options = {
        method,
        headers: { 'Content-Type': 'application/json' } as Record<string, string | number>
      };
      if (method === 'POST') {
        options.headers['Content-Length'] = Buffer.byteLength(body);
      }

      const lib = url.protocol === 'https:' ? https : http;

      const result = await new Promise<string>((resolve, reject) => {
        const req = (lib as typeof http).request(url, options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve(data));
        });
        req.setTimeout(10000, () => { req.destroy(new Error('Request timeout')); });
        req.on('error', reject);
        if (method === 'POST') req.write(body);
        req.end();
      });

      this._log.appendLine(`[callBackend] response: ${result.slice(0, 200)}`);
      const parsed = JSON.parse(result);
      if (this._view) {
        this._view.webview.postMessage({ command: 'backendResponse', requestId, data: parsed, error: null });
        this._log.appendLine(`[callBackend] postMessage sent for ${requestId}`);
      } else {
        this._log.appendLine(`[callBackend] view gone before postMessage`);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Backend unreachable';
      this._log.appendLine(`[callBackend] ERROR: ${msg}`);
      if (this._view) {
        this._view.webview.postMessage({ command: 'backendResponse', requestId, data: null, error: msg });
      }
    }
  }
}
