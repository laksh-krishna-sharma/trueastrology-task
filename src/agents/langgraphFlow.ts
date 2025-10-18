import { StateGraph, START, END } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from "zod";

const StateSchema = z.object({
  input: z.string(),
  output: z.string().optional(),
  agent: z.string().optional(),
});

type State = z.infer<typeof StateSchema>;

const model = new ChatGoogleGenerativeAI({
  model: "gemini-1.5-flash",
  apiKey: process.env.GOOGLE_API_KEY,
});

function supervisor(state: State) {
  const input = state.input;
  if (/code|programming|api|bug|error/i.test(input)) return { agent: "tech" };
  if (/[\d+\-*/=]/.test(input)) return { agent: "math" };
  return { agent: "general" };
}

async function techAgent(state: State) {
  const prompt = `You are a programming assistant. Answer clearly:\nQuestion: ${state.input}`;
  const response = await model.invoke(prompt);
  return { output: response.content as string };
}

async function mathAgent(state: State) {
  try {
    const sanitized = state.input.replace(/[^-()\d/*+.]/g, "");
    const result = eval(sanitized);
    if (!isNaN(result)) return { output: `Answer: ${result}` };
  } catch {}
  const prompt = `You are a math assistant. Solve:\nQuestion: ${state.input}`;
  const response = await model.invoke(prompt);
  return { output: response.content as string };
}

async function generalAgent(state: State) {
  const prompt = `You are a general assistant. Answer clearly:\nQuestion: ${state.input}`;
  const response = await model.invoke(prompt);
  return { output: response.content as string };
}

const workflow = new StateGraph(StateSchema)
  .addNode("supervisor", supervisor)
  .addNode("tech", techAgent)
  .addNode("math", mathAgent)
  .addNode("general", generalAgent)
  .addEdge(START, "supervisor")
  .addConditionalEdges("supervisor", (state: State) => state.agent!, {
    tech: "tech",
    math: "math",
    general: "general",
  })
  .addEdge("tech", END)
  .addEdge("math", END)
  .addEdge("general", END);

export const chatGraph = workflow.compile();

export async function runChatGraph(input: string) {
  const result = await chatGraph.invoke({ input });
  return result.output;
}
