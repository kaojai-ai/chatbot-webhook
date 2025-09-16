import logger from '../../shared/logger';
import { openaiClient } from '../providers/openai';

export interface IntentionResult {
  intent: 'availability' | 'operating_hour' | 'book' | 'joke' | 'other';
  details?: {
    date?: number;
    month?: number;
    year?: number;
  };
}

export async function checkAvailabilityIntention(message: string): Promise<IntentionResult> {
  try {
    const response = await openaiClient.chat.completions.create({
      model: 'gpt-5-mini', // or 'gpt-3.5-turbo' for cost efficiency
      messages: [
        {
          role: 'system',
          content: 'You are an AI assistant that helps identify if a user is asking about room availability and extracts relevant details.'
        },
        {
          role: 'user',
          content: message
        }
      ],
      functions: [
        {
          name: 'check_availability',
          description: 'Checks if the user is asking about user intention and extracts availability information from user text.',
          parameters: {
            type: 'object',
            properties: {
              user_text: {
                type: "string",
                description: "Text provided by the user regarding availability."
              },
              intent: {
                type: 'string',
                description: 'User intent, either "availability", "operating_hour", "book", "joke" or "other"',
                enum: [
                  'availability',
                  'operating_hour',
                  'book',
                  'joke',
                  'other'
                ]
              },
              date: {
                type: "integer",
                description: "Day of the month as extracted from user text",
                nullable: true
              },
              month: {
                type: 'integer',
                description: 'The month mentioned for the booking as a number from 1 (January) to 12 (December)',
                nullable: true
              },
              year: {
                type: 'integer',
                description: 'The year mentioned for the booking as a number',
                nullable: true
              },
            },
            required: ['intent']
          }
        }
      ],
      function_call: { name: 'check_availability' },
    });

    const functionCall = response.choices[0]?.message?.function_call;
    if (!functionCall || functionCall.name !== 'check_availability' || !functionCall.arguments) {
      return { intent: "other" };
    }

    const args = JSON.parse(functionCall.arguments);

    logger.info({ ...args }, 'Intention result from OpenAI: %s', args.intent);
    return {
      intent: args.intent,
      ...(Object.keys(args).length > 0 && { details: { ...args } })
    };
  } catch (error) {
    logger.error(error, 'Error checking availability intention with OpenAI: %s', String(error));
    throw error
  }
}
