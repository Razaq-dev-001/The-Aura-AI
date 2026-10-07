import {
  Conversation,
  Message,
  Project,
  ProjectFile,
  Task,
  TaskStep,
  Memory,
  FileDiff,
  UserSettings,
  ModelInfo,
  ProviderHealth,
  AgentMode,
  SSEEvent
} from '@aura/shared';

const API_BASE = '/api';

export const api = {
  // Conversations
  async getConversations(projectId?: string, search?: string): Promise<Conversation[]> {
    const params = new URLSearchParams();
    if (projectId) params.set('projectId', projectId);
    if (search) params.set('search', search);
    const res = await fetch(`${API_BASE}/conversations?${params.toString()}`);
    const data = await res.json();
    return data.conversations || [];
  },

  async createConversation(params: { title?: string; projectId?: string; mode?: AgentMode }): Promise<Conversation> {
    const res = await fetch(`${API_BASE}/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    const data = await res.json();
    return data.conversation;
  },

  async getConversation(id: string): Promise<{ conversation: Conversation; messages: Message[] }> {
    const res = await fetch(`${API_BASE}/conversations/${id}`);
    return await res.json();
  },

  async updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation> {
    const res = await fetch(`${API_BASE}/conversations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    const data = await res.json();
    return data.conversation;
  },

  async deleteConversation(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/conversations/${id}`, { method: 'DELETE' });
    const data = await res.json();
    return data.success;
  },

  // Projects
  async getProjects(): Promise<Project[]> {
    const res = await fetch(`${API_BASE}/projects`);
    const data = await res.json();
    return data.projects || [];
  },

  async openProject(projectPath: string, name?: string): Promise<{ project: Project; summary: any }> {
    const res = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: projectPath, name })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to open project');
    }
    return await res.json();
  },

  async getProjectFiles(projectId: string): Promise<ProjectFile[]> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/files`);
    const data = await res.json();
    return data.files || [];
  },

  async getFileContent(projectId: string, filePath: string): Promise<string> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/file-content?filePath=${encodeURIComponent(filePath)}`);
    const data = await res.json();
    return data.content || '';
  },

  // Tasks & Steps
  async getTasks(conversationId?: string): Promise<Task[]> {
    const url = conversationId ? `${API_BASE}/tasks?conversationId=${conversationId}` : `${API_BASE}/tasks`;
    const res = await fetch(url);
    const data = await res.json();
    return data.tasks || [];
  },

  async getTask(id: string): Promise<{ task: Task; steps: TaskStep[] }> {
    const res = await fetch(`${API_BASE}/tasks/${id}`);
    return await res.json();
  },

  async cancelTask(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/tasks/${id}/cancel`, { method: 'POST' });
    const data = await res.json();
    return data.success;
  },

  // Diffs
  async getDiffs(params?: { taskId?: string; projectId?: string }): Promise<FileDiff[]> {
    const searchParams = new URLSearchParams();
    if (params?.taskId) searchParams.set('taskId', params.taskId);
    if (params?.projectId) searchParams.set('projectId', params.projectId);
    const res = await fetch(`${API_BASE}/diffs?${searchParams.toString()}`);
    const data = await res.json();
    return data.diffs || [];
  },

  async applyDiff(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/diffs/${id}/apply`, { method: 'POST' });
    const data = await res.json();
    return data.success;
  },

  async revertDiff(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/diffs/${id}/revert`, { method: 'POST' });
    const data = await res.json();
    return data.success;
  },

  // Memory
  async getMemories(projectId?: string, search?: string): Promise<Memory[]> {
    const params = new URLSearchParams();
    if (projectId) params.set('projectId', projectId);
    if (search) params.set('search', search);
    const res = await fetch(`${API_BASE}/memory?${params.toString()}`);
    const data = await res.json();
    return data.memories || [];
  },

  async saveMemory(params: Partial<Memory>): Promise<Memory> {
    const res = await fetch(`${API_BASE}/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    const data = await res.json();
    return data.memory;
  },

  async deleteMemory(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/memory/${id}`, { method: 'DELETE' });
    const data = await res.json();
    return data.success;
  },

  // Providers & Settings
  async getProviders(): Promise<{ health: ProviderHealth[]; models: ModelInfo[] }> {
    const res = await fetch(`${API_BASE}/providers`);
    return await res.json();
  },

  async connectOmniRoute(params: {
    apiKey: string;
    defaultModel?: string;
  }): Promise<{ success: boolean; health: ProviderHealth; settings: UserSettings; error?: string }> {
    const res = await fetch(`${API_BASE}/providers/connect-omniroute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to connect OmniRoute');
    }
    return data;
  },

  async connectChatGPT(params: {
    apiKey: string;
    baseUrl?: string;
    defaultModel?: string;
  }): Promise<{ success: boolean; health: ProviderHealth; settings: UserSettings; error?: string }> {
    const res = await fetch(`${API_BASE}/providers/connect-chatgpt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to connect ChatGPT');
    }
    return data;
  },

  async getSettings(): Promise<UserSettings> {
    const res = await fetch(`${API_BASE}/settings`);
    const data = await res.json();
    return data.settings;
  },

  async updateSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    const data = await res.json();
    return data.settings;
  },

  async getDiagnostics(): Promise<any> {
    const res = await fetch(`${API_BASE}/diagnostics`);
    return await res.json();
  },

  // SSE Stream Listener
  async streamChat(
    payload: {
      conversationId?: string;
      message: string;
      projectId?: string;
      mode?: AgentMode;
      model?: string;
      providerId?: string;
    },
    onEvent: (event: SSEEvent) => void,
    abortSignal?: AbortSignal
  ): Promise<void> {
    const response = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: abortSignal
    });

    if (!response.ok || !response.body) {
      throw new Error(`Chat request failed with HTTP ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const block of lines) {
        if (!block.trim()) continue;

        let eventType = 'message';
        let eventDataStr = '';

        const eventLines = block.split('\n');
        for (const line of eventLines) {
          if (line.startsWith('event: ')) {
            eventType = line.replace('event: ', '').trim();
          } else if (line.startsWith('data: ')) {
            eventDataStr = line.replace('data: ', '').trim();
          }
        }

        if (eventDataStr) {
          try {
            const data = JSON.parse(eventDataStr);
            onEvent({
              event: eventType as any,
              data,
              timestamp: Date.now()
            });
          } catch {
            // Ignore parse errors on SSE frame
          }
        }
      }
    }
  }
};
