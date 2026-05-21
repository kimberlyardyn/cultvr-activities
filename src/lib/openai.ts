import OpenAI from "openai";

import { env } from "@/lib/env";

export function getOpenAI() {
  if (!env.openaiApiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  return new OpenAI({
    apiKey: env.openaiApiKey,
  });
}
