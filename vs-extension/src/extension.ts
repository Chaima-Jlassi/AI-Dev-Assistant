import * as vscode from 'vscode';
import { runAgent } from './agent';

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('ai-agent-extension.runAgent', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('Open a file first!');
      return;
    }

    const text = editor.document.getText(editor.selection);
    if (!text) {
      vscode.window.showWarningMessage('Please highlight some code to explain.');
      return;
    }

    // Show a loading progress bar
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: "AI Mentor is thinking...",
      cancellable: false
    }, async () => {
      const result = await runAgent(text);

      // Create and show a beautiful Markdown document
      const doc = await vscode.workspace.openTextDocument({
        content: `# AI Mentor Analysis\n\n**Decision:** ${result.decision}\n\n---\n\n${result.response}`,
        language: 'markdown'
      });
      await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
    });
  });

  context.subscriptions.push(disposable);
}