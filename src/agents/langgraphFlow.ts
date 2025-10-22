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
  model: "gemini-2.5-flash",
  apiKey: "AIzaSyA-wIZucQVETnsD-XZSf3j50Fs5hytnCQ0",
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
  const prompt = `You are a math assistant. Solve this mathematical problem step by step:\nQuestion: ${state.input}\n\nProvide a clear, step-by-step solution.`;
  const response = await model.invoke(prompt);
  return { output: response.content as string };
}

async function generalAgent(state: State) {
  const prompt = `You are a general assistant. Answer clearly:\nQuestion: ${state.input}`;
  const response = await model.invoke(prompt);
  return { output: response.content as string };
}

function shouldContinue(state: State) {
  return state.output ? "end" : "continue";
}

const workflow = new StateGraph(StateSchema)
  .addNode("supervisor", supervisor)
  .addNode("tech", techAgent)
  .addNode("math", mathAgent)
  .addNode("general", generalAgent)
  .addEdge(START, "supervisor")
  .addConditionalEdges(
    "supervisor",
    (state: State) => state.agent ?? "general",
    {
      tech: "tech",
      math: "math",
      general: "general",
    }
  )
  .addConditionalEdges(
    "math",
    shouldContinue,
    {
        continue: "supervisor",
        end: END,
    }
  )
  .addConditionalEdges(
    "tech",
    shouldContinue,
    {
        continue: "supervisor",
        end: END,
    }
  )
  .addConditionalEdges(
    "general",
    shouldContinue,
    {
        continue: "supervisor",
        end: END,
    }
  )

export const chatGraph = workflow.compile();

export async function runChatGraph(input: string) {
  const result = await chatGraph.invoke({ input });
  return result.output;
}
