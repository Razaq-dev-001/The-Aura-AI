import { Message } from '@aura/shared';
import { ConversationRepository } from '@aura/database';

export class ConversationSummarizer {
  private convRepo: ConversationRepository;

  constructor(convRepo?: ConversationRepository) {
    this.convRepo = convRepo || new ConversationRepository();
  }

  summarizeConversation(conversationId: string, messages: Message[]): string {
    if (messages.length === 0) return '';

    const userMessages = messages.filter((m) => m.role === 'user');
    const topics: string[] = [];

    for (const msg of userMessages) {
      const firstSentence = msg.content.split(/[.\n]/)[0].trim();
      if (firstSentence && !topics.includes(firstSentence)) {
        topics.push(firstSentence.substring(0, 80));
      }
    }

    const summary = `Discussed: ${topics.slice(-3).join('; ')}`;
    this.convRepo.updateConversation(conversationId, { summary });
    return summary;
  }
}
