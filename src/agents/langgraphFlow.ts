import { StateGraph, START, END } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from "zod";

const AgentEnum = z.enum(["tech", "math", "general"]);

const StateSchema = z.object({
  input: z.string(),
  output: z.string().optional(),
  agent: z.string().optional(),
  task: z.string().optional(),
  currentSegmentIndex: z.number().optional(),
  segments: z
    .array(
      z.object({
        text: z.string(),
        agent: AgentEnum,
      })
    )
    .optional(),
  responses: z
    .array(
      z.object({
        agent: AgentEnum,
        text: z.string(),
      })
    )
    .optional(),
});

type AgentType = z.infer<typeof AgentEnum>;
type State = z.infer<typeof StateSchema>;

type Segment = {
  text: string;
  agent: AgentType;
};

const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  apiKey: process.env.GEMINI_API_KEY,
});

const TECH_KEYWORDS = [
  "code",
  "program",
  "programming",
  "debug",
  "bug",
  "error",
  "stack trace",
  "api",
  "deploy",
  "function",
  "typescript",
  "javascript",
  "class",
  "module",
  "framework",
  "library",
];

const MATH_KEYWORDS = [
  "solve",
  "calculate",
  "math",
  "equation",
  "sum",
  "difference",
  "product",
  "quotient",
  "integral",
  "derivative",
  "probability",
  "statistics",
  "algebra",
];

function escapeForRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsAny(source: string, keywords: string[]) {
  return keywords.some((keyword) => {
    const escaped = escapeForRegExp(keyword);
    const pattern = new RegExp(`\\b${escaped}\\b`, "i");
    return pattern.test(source);
  });
}

function normalizeContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((entry) => {
        if (typeof entry === "string") return entry;
        if (entry && typeof entry === "object") {
          const maybeText = (entry as { text?: unknown }).text;
          if (typeof maybeText === "string") return maybeText;
          return JSON.stringify(entry);
        }
        return String(entry);
      })
      .join("\n");
  }
  if (content && typeof content === "object") {
    const maybeText = (content as { text?: unknown }).text;
    if (typeof maybeText === "string") return maybeText;
  }
  return String(content ?? "");
}

function isMathClause(text: string) {
  const normalized = text.toLowerCase();
  const hasMathKeyword = containsAny(normalized, MATH_KEYWORDS);
  const hasMathSymbols = /\d+\s*[+\-*/^]\s*\d+/.test(normalized);
  const hasNumberWords = /(zero|one|two|three|four|five|six|seven|eight|nine|ten)\s+(plus|minus|times|divided by)/.test(
    normalized
  );
  return hasMathKeyword || hasMathSymbols || hasNumberWords;
}

function isTechClause(text: string) {
  const normalized = text.toLowerCase();
  return containsAny(normalized, TECH_KEYWORDS);
}

function classifyAgentForClause(text: string): AgentType {
  if (isTechClause(text)) return "tech";
  if (isMathClause(text)) return "math";
  return "general";
}

function splitClauses(input: string): string[] {
  const sentences = input
    .split(/(?<=[?.!])/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  const clauses: string[] = [];

  for (const sentence of sentences) {
    const strippedSentence = sentence.replace(/[?.!]/g, "").trim();
    if (!strippedSentence) continue;

    const primaryParts = strippedSentence
      .split(/\b(?:and|then)\b/gi)
      .map((part) => part.replace(/^[,\s]+/, "").trim())
      .filter(Boolean);

    const candidateParts = primaryParts.length ? primaryParts : [strippedSentence];

    const refinedParts = candidateParts
      .flatMap((part) =>
        part
          .split(
            /,(?=\s*(?:what|who|when|where|why|how|can|could|would|should|name|list|calculate|solve|explain|provide|give))/i
          )
          .map((chunk) => chunk.replace(/^[,\s]+/, "").trim())
          .filter(Boolean)
      )
      .filter(Boolean);

    clauses.push(...(refinedParts.length ? refinedParts : candidateParts));
  }

  if (!clauses.length && input.trim()) {
    clauses.push(input.trim());
  }

  return clauses;
}

function buildSegments(input: string): Segment[] {
  const clauses = splitClauses(input);
  return clauses.map((clause) => ({
    text: clause,
    agent: classifyAgentForClause(clause),
  }));
}

function supervisor(state: State) {
  const input = state.input;
  const existingSegments = state.segments;
  const segments = existingSegments ?? buildSegments(input);
  const responses = state.responses ?? [];

  if (!existingSegments) {
    console.log(`(Supervisor) Segmented input into ${segments.length} task(s).`);
    segments.forEach((segment, idx) => {
      console.log(
        `(Supervisor) Segment ${idx + 1}/${segments.length}: [${segment.agent}] ${segment.text}`
      );
    });
  }

  const nextIndex = responses.length;

  if (nextIndex >= segments.length) {
    const finalOutput =
      responses.length > 0
        ? responses
            .map((entry) => `[${entry.agent.toUpperCase()}]\n${entry.text}`)
            .join("\n\n")
        : state.output ?? "";
    console.log("[Supervisor] All segments handled. Finalizing conversation.");
    return {
      segments,
      responses,
      output: finalOutput,
      agent: "end",
      task: undefined,
      currentSegmentIndex: nextIndex,
    };
  }

  const nextSegment = segments[nextIndex]!;
  console.log(
    `[Supervisor] Routing to agent: ${nextSegment.agent} (segment ${nextIndex + 1}/${segments.length})`
  );
  console.log(`[Supervisor] Segment text: ${nextSegment.text}`);

  return {
    segments,
    responses,
    agent: nextSegment.agent,
    task: nextSegment.text,
    currentSegmentIndex: nextIndex,
  };
}

async function techAgent(state: State) {
  const question = state.task ?? state.input;
  console.log("[TechAgent] Handling input:", question);
  const prompt = `You are a programming assistant. Answer clearly:\nQuestion: ${question}`;
  const response = await model.invoke(prompt);
  console.log("[TechAgent] Completed response");
  const responseText = normalizeContent(response.content);
  const responses = [...(state.responses ?? []), { agent: "tech", text: responseText }];
  return { responses };
}

async function mathAgent(state: State) {
  const question = state.task ?? state.input;
  console.log("[MathAgent] Handling input:", question);
  const prompt = `You are a math assistant. Solve this mathematical problem step by step:\nQuestion: ${question}\n\nProvide a clear, step-by-step solution.`;
  const response = await model.invoke(prompt);
  console.log("[MathAgent] Completed response");
  const responseText = normalizeContent(response.content);
  const responses = [...(state.responses ?? []), { agent: "math", text: responseText }];
  return { responses };
}

async function generalAgent(state: State) {
  const question = state.task ?? state.input;
  console.log("[GeneralAgent] Handling input:", question);
  const prompt = `You are a general assistant. Answer clearly:\nQuestion: ${question}`;
  const response = await model.invoke(prompt);
  console.log("[GeneralAgent] Completed response");
  const responseText = normalizeContent(response.content);
  const responses = [
    ...(state.responses ?? []),
    { agent: "general", text: responseText },
  ];
  return { responses };
}

function shouldContinue(state: State) {
  const decision = state.output ? "end" : "continue";
  const totalSegments = state.segments?.length;
  const processedSegments = state.responses?.length ?? 0;
  console.log(
    `[Flow] shouldContinue decision: ${decision} (processed ${processedSegments}/${typeof totalSegments === "number" ? totalSegments : "?"})`
  );
  return decision;
}

const workflow = new StateGraph(StateSchema)
  .addNode("supervisor", supervisor)
  .addNode("tech", techAgent)
  .addNode("math", mathAgent)
  .addNode("general", generalAgent)
  .addEdge(START, "supervisor")
  .addConditionalEdges(
    "supervisor",
    (state: State) => {
      if (state.agent === "end") return "end";
      if (state.agent) return state.agent;
      return "general";
    },
    {
      tech: "tech",
      math: "math",
      general: "general",
      end: END,
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
  console.log("[Run] Starting chatGraph with input:", input);
  const result = await chatGraph.invoke({ input });
  console.log("[Run] Final output:", result.output);
  return result.output;
}