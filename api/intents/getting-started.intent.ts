import * as line from '@line/bot-sdk';

export const isGettingStartedIntent = (event: line.MessageEvent): boolean => {
  if (event.message.type !== 'text') {
    return false;
  }

  const normalizedText = event.message.text.trim().toLowerCase();

  const normalizedMentionees = event.message.mention?.mentionees?.map((m) => ({
    ...m,
    isSelf: Boolean((m as any).isSelf), // default false if not there
  })) ?? []

  const isMentioningSelf = normalizedMentionees.some((mention) => mention.type === 'user' && mention.isSelf) ?? false;

  const triggers = ['kj', 'menu'];

  return isMentioningSelf || triggers.includes(normalizedText);
};
