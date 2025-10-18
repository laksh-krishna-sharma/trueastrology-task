export type ChatMessage = {
  role: "user" | "assistant" | "supervisor";
  text: string;
};
