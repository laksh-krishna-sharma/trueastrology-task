import { GoogleGenAI } from "@google/genai";

export const ai = new GoogleGenAI({});

export async function askGemini(prompt: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    // response.text contains the generated text
    return response.text || "";
  } catch (err) {
    console.error("Gemini error:", err);
    return "Sorry, I couldn't generate a response.";
  }
}
