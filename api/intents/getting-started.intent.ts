import * as line from '@line/bot-sdk';

export const isGettingStartedIntent = (event: line.MessageEvent): boolean => {
  if (event.message.type !== 'text') {
    return false;
  }

  const normalizedText = event.message.text.trim().toLowerCase();
  const isMentioningSelf = event.message.mention?.mentionees?.some((mention) => mention.isSelf) ?? false;

  return isMentioningSelf || normalizedText === 'kj';
};
