jest.mock('../../../shared/providers/supabase');

import { checkAvailabilityIntention } from '../availability.intent';
import { openaiClient } from '../../providers/openai';
import * as line from '@line/bot-sdk';
import logger from '../../../shared/logger';


// Mock the openaiClient and logger
jest.mock('../../providers/openai');
jest.mock('../../../shared/logger');

describe('checkAvailabilityIntention', () => {
  const mockGetChatCompletion = openaiClient.getChatCompletion as jest.Mock;
  const mockLoggerError = logger.error as jest.Mock;
  const mockLoggerInfo = logger.info as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return other intent when message is from a group', async () => {
    const mockEvent = {
      source: { type: 'group', groupId: 'test-group-id' },
      message: { type: 'text', text: 'Is there availability?' }
    } as line.MessageEvent & { message: line.TextEventMessage };

    const result = await checkAvailabilityIntention(mockEvent);

    expect(result).toEqual({ intent: 'other' });
    expect(mockGetChatCompletion).not.toHaveBeenCalled();
  });

  it('should handle OpenAI API error gracefully', async () => {
    const mockEvent = {
      source: { type: 'user', userId: 'user1' },
      message: { type: 'text', text: 'Check availability' }
    } as line.MessageEvent & { message: line.TextEventMessage };

    const error = new Error('API Error');
    mockGetChatCompletion.mockRejectedValueOnce(error);

    await expect(checkAvailabilityIntention(mockEvent)).rejects.toThrow('API Error');
    expect(mockLoggerError).toHaveBeenCalledWith(
      error,
      'Error checking availability intention with OpenAI: %s',
      'Error: API Error'
    );
  });

  it('should return other intent when function call is missing or invalid', async () => {
    const mockEvent = {
      source: { type: 'user', userId: 'user1' },
      message: { type: 'text', text: 'Random message' }
    } as line.MessageEvent & { message: line.TextEventMessage };

    // Test case 1: No function call in response
    mockGetChatCompletion.mockResolvedValueOnce({
      choices: [{
        message: {}
      }]
    });

    let result = await checkAvailabilityIntention(mockEvent);
    expect(result).toEqual({ intent: 'other' });

    // Test case 2: Function call without arguments
    mockGetChatCompletion.mockResolvedValueOnce({
      choices: [{
        message: {
          function_call: {
            name: 'check_availability'
          }
        }
      }]
    });

    result = await checkAvailabilityIntention(mockEvent);
    expect(result).toEqual({ intent: 'other' });
  });
});
