interface IntentionResult {
  hasAvailabilityIntent: boolean;
  details?: {
    location?: string;
    date?: string;
    duration?: string;
  };
}

export async function checkAvailabilityIntention(message: string): Promise<IntentionResult> {
  // Simple keyword matching for now
  // In a real application, you would use OpenAI API here for better intent detection
  const availabilityKeywords = [
    'available', 'availability', 'book', 'booking',
    'reserve', 'reservation', 'open', 'vacancy',
    'slot', 'schedule', 'when can', 'can i book',
    'is there availability', 'check availability'
  ];

  const lowerMessage = message.toLowerCase();
  const hasIntent = availabilityKeywords.some(keyword => 
    lowerMessage.includes(keyword)
  );

  // Simple extraction of details (can be enhanced with more sophisticated NLP)
  const details: IntentionResult['details'] = {};
  
  // Simple date extraction (basic example)
  const dateMatch = message.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})|(today|tomorrow|next week|next month)/i);
  if (dateMatch) {
    details.date = dateMatch[0];
  }

  // Simple location extraction (basic example)
  const locationMatch = message.match(/in\s+(\w+)/i);
  if (locationMatch) {
    details.location = locationMatch[1];
  }

  return {
    hasAvailabilityIntent: hasIntent,
    ...(Object.keys(details).length > 0 && { details })
  };
}
