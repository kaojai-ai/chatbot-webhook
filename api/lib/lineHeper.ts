import * as line from '@line/bot-sdk';

const extractGroupId = (source: line.EventSource): string | undefined => {
  const groupId = (source as { groupId?: unknown }).groupId;

  if (typeof groupId === 'string' && groupId.length > 0) {
    return groupId;
  }

  return undefined;
};

const extractUserId = (source: line.EventSource): string | undefined => {
  const userId = (source as { userId?: unknown }).userId;

  if (typeof userId === 'string' && userId.length > 0) {
    return userId;
  }

  return undefined;
};


const getLineUserId = (messageEvent: line.MessageEvent): string | undefined =>
    extractUserId(messageEvent.source);

export { extractGroupId, extractUserId, getLineUserId };
