import * as line from '@line/bot-sdk';

export const isGettingStartedIntent = (event: line.MessageEvent): boolean => {
  if (event.message.type !== 'text') {
    return false;
  }

  const normalizedText = event.message.text.trim().toLowerCase();
  const isMentioningSelf = event.message.mention?.mentionees?.some((mention) => mention.type === 'user' && mention.userId === process.env.KAOJAI_SELF_LINE_USER_ID) ?? false;

  return isMentioningSelf || normalizedText === 'kj';
};
