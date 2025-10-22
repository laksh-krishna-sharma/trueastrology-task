import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

import { StateGraph, createReactAgent, createSupervisor } from "@langchain/langgraph";

// Initialize Gemini model
const geminiModel = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  apiKey: process.env.GEMINI_API_KEY,
});

// --- Agents ---

const techAgent = createReactAgent({
  model: geminiModel,
  name: "tech_agent",
  prompt: `
You are a programming assistant.
Only handle questions about coding, APIs, or debugging.
When done, reply DIRECTLY to the supervisor.
Do NOT include explanations like "I am done".
Your message should contain only the final answer or clarification.
`,
});

const mathAgent = createReactAgent({
  model: geminiModel,
  name: "math_agent",
  prompt: `
You are a math assistant.
Solve mathematical problems step by step.
When done, reply DIRECTLY to the supervisor with ONLY the result.
Do not explain that you're done.
`,
});

const generalAgent = createReactAgent({
  model: geminiModel,
  name: "general_agent",
  prompt: `
You are a general knowledge assistant.
Answer any non-math, non-technical questions clearly and briefly.
When done, reply DIRECTLY to the supervisor.
`,
});

// --- Supervisor ---

const supervisor = createSupervisor({
  model: geminiModel,
  agents: [techAgent, mathAgent, generalAgent],
  prompt: `
You are a supervisor managing three agents:
- tech_agent (for programming, APIs, debugging)
- math_agent (for math or calculations)
- general_agent (for all other questions)

INSTRUCTIONS:
1. Choose ONE agent at a time.
2. Send the task to the right agent.
3. After receiving the response, decide if the conversation is complete.
4. If complete, reply with "FINAL:" followed by your conclusion.
5. If not complete, hand off to another agent.

Never loop endlessly. If unsure, just finalize.
`,
  addHandoffBackMessages: true,
  outputMode: "full_history", // optional
}).compile();

// --- Run ---
export async function runChatGraph(input: string) {
  const result = await supervisor.invoke({ input });
  const messages = result.messages ?? [];
  const final = messages.find(m => typeof m.content === "string" && m.content.startsWith("FINAL:"));
  return final ? final.content.replace("FINAL:", "").trim() : messages[messages.length - 1].content;
}
