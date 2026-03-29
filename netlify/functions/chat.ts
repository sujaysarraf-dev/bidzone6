import { Handler } from "@netlify/functions";
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const aiModel = genAI.getGenerativeModel({ model: "gemma-3-27b-it" });
const fallbackModel = genAI.getGenerativeModel({ model: "gemma-3-12b-it" });

export const handler: Handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { message, context } = JSON.parse(event.body || "{}");

    if (!message) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: "Message is required" }) 
      };
    }

    if (!GEMINI_API_KEY) {
      return {
        statusCode: 200,
        body: JSON.stringify({ reply: "I'm sorry, the AI service is not configured (API key missing)." })
      };
    }

    const systemPrompt = `You are the Bidzone Assistant. You help users navigate an intelligent financial asset auction platform in Nepal. Be professional, helpful, and concise. ${context ? `Context: ${context}` : ""}`;
    
    let text = "";
    try {
      const result = await aiModel.generateContent([
        { text: systemPrompt },
        { text: message }
      ]);
      const response = await result.response;
      text = response.text();
    } catch (innerError: any) {
      console.warn("Primary AI Model Failed, trying fallback...", innerError.message);
      // Fallback to smaller Gemma model if primary fails (rate limited)
      const result = await fallbackModel.generateContent([
        { text: systemPrompt },
        { text: message }
      ]);
      const response = await result.response;
      text = response.text();
    }
    
    if (!text) {
      return {
        statusCode: 200,
        body: JSON.stringify({ reply: "I'm sorry, I couldn't generate a response. Please try again in a few moments." })
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply: text })
    };
  } catch (error: any) {
    console.error("AI API Error:", error);
    return {
      statusCode: 200,
      body: JSON.stringify({ reply: "I'm sorry, the AI service hit an error. Please try again shortly." })
    };
  }
};
