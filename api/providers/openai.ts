import OpenAI from "openai";

// OpenAI client for generating Thai jokes
const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export {
    openaiClient
}
