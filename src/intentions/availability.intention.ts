import OpenAI from 'openai';

interface IntentionResult {
  hasAvailabilityIntent: boolean;
  details?: {
    month?: string;
  };
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function checkAvailabilityIntention(message: string): Promise<IntentionResult> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4', // or 'gpt-3.5-turbo' for cost efficiency
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
          description: 'Check if the user is asking about availability and extract details',
          parameters: {
            type: 'object',
            properties: {
              has_availability_intent: {
                type: 'boolean',
                description: 'Whether the user is asking about availability'
              },
              month: {
                type: 'integer',
                description: 'The month mentioned for the booking as a number from 1 (January) to 12 (December)',
                nullable: true
              },
            },
            required: ['has_availability_intent']
          }
        }
      ],
      function_call: { name: 'check_availability' },
      temperature: 0.1
    });

    const functionCall = response.choices[0]?.message?.function_call;
    if (!functionCall || functionCall.name !== 'check_availability' || !functionCall.arguments) {
      return { hasAvailabilityIntent: false };
    }

    const args = JSON.parse(functionCall.arguments);
    const details: IntentionResult['details'] = {};

    if (args.month) details.month = args.month;

    return {
      hasAvailabilityIntent: args.has_availability_intent,
      ...(Object.keys(details).length > 0 && { details })
    };
  } catch (error) {
    console.error('Error checking availability intention with OpenAI:', error);
    // Fallback to simple keyword matching if API call fails
    const lowerMessage = message.toLowerCase();
    const hasIntent = [
      'available', 'availability', 'book', 'booking',
      'reserve', 'reservation', 'vacancy', 'check availability'
    ].some(keyword => lowerMessage.includes(keyword));

    return { hasAvailabilityIntent: hasIntent };
  }
}
