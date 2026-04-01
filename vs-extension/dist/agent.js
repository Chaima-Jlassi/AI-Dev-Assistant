"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAgent = runAgent;
const llm_1 = require("./llm");
async function runAgent(input) {
    // 1️⃣ Perception
    const context = analyzeInput(input);
    // 2️⃣ Planning (LLM as planner)
    const planPrompt = `
You are an AI agent.
Context: ${context}
Task: Decide what to do with the following input.

Input:
${input}

Actions:
- explain
- review
- summarize

Return ONLY the action name.
`;
    const decision = await (0, llm_1.callLLM)(planPrompt);
    // 3️⃣ Action execution
    const actionPrompt = buildActionPrompt(decision, input);
    const response = await (0, llm_1.callLLM)(actionPrompt);
    return {
        decision: decision.trim(),
        response
    };
}
// ---------------- helpers ----------------
function analyzeInput(input) {
    if (input.includes('for') || input.includes('while')) {
        return 'Contains loops';
    }
    return 'Simple code or text';
}
function buildActionPrompt(action, input) {
    if (action.includes('explain')) {
        return `Explain the following code:\n${input}`;
    }
    if (action.includes('review')) {
        return `Review the following code and suggest improvements:\n${input}`;
    }
    return `Summarize the following text:\n${input}`;
}
//# sourceMappingURL=agent.js.map