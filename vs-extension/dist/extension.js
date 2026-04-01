"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate
});
module.exports = __toCommonJS(extension_exports);
var vscode = __toESM(require("vscode"));

// src/llm.ts
async function callLLM(prompt) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12e4);
    const response = await fetch("http://127.0.0.1:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "tinyllama",
        // Much faster for testing
        prompt,
        stream: false,
        options: {
          num_predict: 200,
          // Keep response short to save time
          temperature: 0.3
          // Lower temp is faster/more stable
        }
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!response.ok) {
      return `Ollama Error: ${response.statusText}`;
    }
    const data = await response.json();
    return data.response || "No response generated.";
  } catch (error) {
    if (error.name === "AbortError") {
      return "The AI is taking too long. Please ensure no other heavy apps are open.";
    }
    return `Connection Error: ${error.message}`;
  }
}

// src/agent.ts
async function runAgent(input) {
  const context = input.length > 100 ? "Complex block" : "Simple snippet";
  const planPrompt = `Action options: explain, review, summarize. Task: Pick one for this code: ${input}. Return only the word.`;
  const decision = await callLLM(planPrompt);
  const actionPrompt = `You are a helpful mentor. ${decision.trim()} this code for a beginner: ${input}`;
  const response = await callLLM(actionPrompt);
  return { decision: decision.trim(), response };
}

// src/extension.ts
function activate(context) {
  const disposable = vscode.commands.registerCommand("ai-agent-extension.runAgent", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage("Open a file first!");
      return;
    }
    const text = editor.document.getText(editor.selection);
    if (!text) {
      vscode.window.showWarningMessage("Please highlight some code to explain.");
      return;
    }
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: "AI Mentor is thinking...",
      cancellable: false
    }, async () => {
      const result = await runAgent(text);
      const doc = await vscode.workspace.openTextDocument({
        content: `# AI Mentor Analysis

**Decision:** ${result.decision}

---

${result.response}`,
        language: "markdown"
      });
      await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
    });
  });
  context.subscriptions.push(disposable);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate
});
//# sourceMappingURL=extension.js.map
