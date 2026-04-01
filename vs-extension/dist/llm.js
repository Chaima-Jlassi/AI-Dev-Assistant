"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.callLLM = callLLM;
async function callLLM(prompt) {
    // TEMP: mock implementation
    // Later: OpenAI / Ollama / LM Studio
    console.log("LLM PROMPT:", prompt);
    return `
[AI OUTPUT]
This code contains control structures.
The logic appears sequential.
Potential improvements: naming, comments.
`;
}
//# sourceMappingURL=llm.js.map