import { callLLM } from './llm';

export type AgentResult = { decision: string; response: string; };

export async function runAgent(input: string): Promise<AgentResult> {
  // 1. Perception
  const context = input.length > 100 ? "Complex block" : "Simple snippet";

  // 2. Planning
  const planPrompt = `Action options: explain, review, summarize. Task: Pick one for this code: ${input}. Return only the word.`;
  const decision = await callLLM(planPrompt);

  // 3. Execution
  const actionPrompt = `You are a helpful mentor. ${decision.trim()} this code for a beginner: ${input}`;
  const response = await callLLM(actionPrompt);

  return { decision: decision.trim(), response };
}