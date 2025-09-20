import * as line from '@line/bot-sdk';

export interface GettingStartedIntent {
  intent: 'menu' | 'checkslip';
}

export const isGettingStartedIntent = (event: line.MessageEvent): GettingStartedIntent | null => {
  if (event.message.type !== 'text') {
    return null;
  }

  const normalizedText = event.message.text.trim().toLowerCase();

  const normalizedMentionees = event.message.mention?.mentionees?.map((m) => ({
    ...m,
    isSelf: Boolean((m as any).isSelf),
  })) ?? []

  const isMentioningSelf = normalizedMentionees.some((mention) => mention.type === 'user' && mention.isSelf) ?? false;

  const triggers = ['kj', 'menu'];

  if (isMentioningSelf || triggers.includes(normalizedText)) {
    return { intent: 'menu' };
  } else if (normalizedText.toLowerCase() === 'checkslip') {
    return { intent: 'checkslip' };
  }

  return null;
};
