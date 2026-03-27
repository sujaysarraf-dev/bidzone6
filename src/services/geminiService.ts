/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuctionListing } from "../types";

/**
 * Gemini AI Service - Routes through Express server (/api/chat)
 * This avoids all browser-side SDK issues completely.
 */
export const geminiService = {
  async getRecommendations(userInterests: string[], availableAuctions: AuctionListing[]) {
    try {
      const prompt = `Recommend 3 auction IDs for interests: ${userInterests.join(", ")} from: ${JSON.stringify(availableAuctions.map(a => ({ id: a.id, title: a.title, type: a.assetType })))}. Return ONLY a JSON array of strings, nothing else.`;

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt })
      });

      const data = await response.json();
      const cleanText = (data.reply || "").replace(/```json|```/g, "").trim();
      return JSON.parse(cleanText) as string[];
    } catch (error) {
      console.error("AI Recommendation Error:", error);
      return availableAuctions.slice(0, 3).map(a => a.id);
    }
  },

  async chat(message: string, context?: string) {
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, context })
      });

      const data = await response.json();
      return data.reply || "I'm sorry, I couldn't generate a response. Please try again.";
    } catch (error: any) {
      console.error("AI Chat Error:", error);
      return "I'm sorry, I'm having trouble connecting to the AI service. Please check your internet connection.";
    }
  }
};
