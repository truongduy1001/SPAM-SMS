
import { GoogleGenAI } from "@google/genai";
import { LogEntry } from "../types";

export const generateSessionSummary = async (logs: LogEntry[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-3-flash-preview';

  const logSnippet = logs.slice(-20).map(l => `[${l.type}] ${l.service}: ${l.message}`).join('\n');
  
  const prompt = `
    Based on these OTP testing logs, provide a concise, professional "Cyber Security Operations Report" summary (max 3 sentences). 
    Use a technical but helpful tone. Explain if the delivery was successful or if many rate limits were hit.
    
    LOGS:
    ${logSnippet}
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini failed:", error);
    return "Operations completed. Services monitored for stability.";
  }
};
