import * as vscode from 'vscode';
import { AiDevAssistantProvider } from './provider';

export function activate(context: vscode.ExtensionContext) {
  const provider = new AiDevAssistantProvider(context.extensionUri, context);

 
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      AiDevAssistantProvider.viewType,
      provider,
      { webviewOptions: { retainContextWhenHidden: true } }
    )
  );

 
  context.subscriptions.push(
    vscode.commands.registerCommand('aiDevAssistant.openPanel', () => {
      vscode.commands.executeCommand('aiDevAssistant.panel.focus');
    })
  );

  
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) provider.notifyEditorChange(editor);
    })
  );

  
  context.subscriptions.push(
    vscode.window.onDidChangeTextEditorSelection((event) => {
      if (event.textEditor && !event.textEditor.selection.isEmpty) {
        provider.notifySelectionChange(event.textEditor);
      }
    })
  );

  
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((doc) => {
      provider.notifyFileSaved(doc);
    })
  );
}

export function deactivate() {}