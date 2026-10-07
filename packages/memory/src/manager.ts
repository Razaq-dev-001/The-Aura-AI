import { Memory, MemoryCategory } from '@aura/shared';
import { MemoryRepository } from '@aura/database';

export class MemoryManager {
  private memoryRepo: MemoryRepository;

  constructor(memoryRepo?: MemoryRepository) {
    this.memoryRepo = memoryRepo || new MemoryRepository();
  }

  saveMemory(params: {
    projectId?: string;
    category: MemoryCategory;
    content: string;
    tags?: string[];
    importance?: number;
  }): Memory {
    return this.memoryRepo.createMemory(params);
  }

  getRelevantMemories(prompt: string, projectId?: string, limit = 6): Memory[] {
    const memories = this.memoryRepo.listMemories({
      projectId,
      limit: 50
    });

    if (memories.length === 0) return [];

    const lowerPrompt = prompt.toLowerCase();
    const scored = memories.map((mem) => {
      let score = mem.importance; // Base importance (1-5)

      const lowerContent = mem.content.toLowerCase();
      const words = lowerPrompt.split(/\s+/).filter((w) => w.length > 3);

      for (const word of words) {
        if (lowerContent.includes(word)) {
          score += 3;
        }
      }

      for (const tag of mem.tags) {
        if (lowerPrompt.includes(tag.toLowerCase())) {
          score += 4;
        }
      }

      if (mem.category === 'USER_PREFERENCE') score += 2;
      if (mem.projectId && mem.projectId === projectId) score += 2;

      return { mem, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map((s) => s.mem);
  }

  formatMemoriesForContext(memories: Memory[]): string {
    if (memories.length === 0) return '';

    const lines = ['### Persistent Knowledge & Rules:'];
    for (const m of memories) {
      lines.push(`- [${m.category}] ${m.content}`);
    }
    return lines.join('\n');
  }

  listMemories(options?: { projectId?: string; category?: MemoryCategory; search?: string }): Memory[] {
    return this.memoryRepo.listMemories(options);
  }

  deleteMemory(id: string): boolean {
    return this.memoryRepo.deleteMemory(id);
  }

  clearMemories(projectId?: string): void {
    this.memoryRepo.clearAllMemories(projectId);
  }
}
