import OpenAI from "openai";
import { ChatCompletionCreateParamsNonStreaming } from "openai/resources/chat/completions";
import { ResponseFormatTextJSONSchemaConfig } from "openai/resources/responses/responses";
import { ResponseCreateParamsNonStreaming } from "openai/resources/responses/responses";


export class LLMService {
  private client: OpenAI;

  constructor() {
    // OpenAI client for generating Thai jokes
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async getChatCompletion(request: ChatCompletionCreateParamsNonStreaming) {
    return await this.client.chat.completions.create(request);
  }
  async getResponse<T>(
    input: string,
    options: ResponseCreateParamsNonStreaming & { format?: ResponseFormatTextJSONSchemaConfig },
  ): Promise<{ output: T }> {
    try {
      const { format } = options;

      console.debug('OpenAI getResponse prompt', JSON.stringify(input));

      const output = await this.client.responses.create({
        model: "gpt-5-nano",
        text: {
          format: format ?? { type: 'text' },
        },
        input: [
          {
            "role": "system",
            "content": [
              {
                "type": "input_text",
                "text": "You are a helpful assistant man. Male. that join availability by resource into ONE human-readable line of each day. Respond with a short, clear, friendly message, with emoji in Thai"
              }
            ]
          },
          {
            "role": "user",
            "content": [
              {
                "type": "input_text",
                "text": input
              }
            ]
          }
        ],
        reasoning: {
          "effort": "low",
          "summary": "auto"
        },
        tools: [],
        store: true
      });

      if (output.error) {
        throw output.error;
      }

      return {
        output: JSON.parse(output.output_text) as T
      }

    } catch (error) {
      console.error('OpenAI getResponse error', error);
      throw error;
    }
  }
}

const openaiClient = new LLMService();

export { openaiClient }
