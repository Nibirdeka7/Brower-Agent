import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatGroq } from "@langchain/groq";
import dotenv from "dotenv";

dotenv.config();

type LLMType = "gemini" | "groq";

export class LLM {
  private static instances: Partial<Record<LLMType, any>> = {};

  private constructor() {}

  public static getInstance(type: LLMType = "gemini") {
    if (!LLM.instances[type]) {
      switch (type) {
        case "gemini":
          if (!process.env.GOOGLE_API_KEY) {
            throw new Error("GOOGLE_API_KEY is not set");
          }

          LLM.instances[type] = new ChatGoogleGenerativeAI({
            model: "gemini-2.5-flash",
            temperature: 0.7,
            apiKey: process.env.GOOGLE_API_KEY,
          });
          break;

        case "groq":
          if (!process.env.GROQ_API_KEY) {
            throw new Error("GROQ_API_KEY is not set");
          }

          LLM.instances[type] = new ChatGroq({
            model: "llama-3.3-70b-versatile",
            temperature: 0.7,
            apiKey: process.env.GROQ_API_KEY,
          });
          break;
      }
    }

    return LLM.instances[type];
  }
}

export const geminiModel = LLM.getInstance("gemini");