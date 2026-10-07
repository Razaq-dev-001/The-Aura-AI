import {
  AIProvider,
  ModelInfo,
  ProviderHealth,
  ChatCompletionRequest,
  ChatCompletionResponse,
  StreamChunk
} from '@aura/shared';
import { countTokens } from '../tokenizer.js';

/**
 * Built-in local offline fallback reasoning engine.
 * Ensures AURA can run, formulate plans, and respond intelligently
 * even without Ollama running or external API keys configured.
 */
export class MockLocalProvider implements AIProvider {
  readonly id = 'local-aura-engine';
  readonly name = 'AURA Local Offline Engine';
  readonly isLocal = true;

  async healthCheck(): Promise<ProviderHealth> {
    return {
      isAvailable: true,
      provider: this.id,
      statusMessage: 'AURA Local Offline Engine is ready (zero-dependency fallback)',
      modelsAvailable: ['aura-deep-reasoner-v1', 'aura-fast-coder-v1'],
      latencyMs: 1
    };
  }

  async listModels(): Promise<ModelInfo[]> {
    return [
      {
        id: 'aura-deep-reasoner-v1',
        name: 'AURA Local Reasoner (Offline)',
        provider: this.id,
        contextWindow: 64000,
        isLocal: true,
        supportsStreaming: true,
        supportsToolCalls: true,
        description: 'Built-in offline intelligent reasoning and plan generator'
      },
      {
        id: 'aura-fast-coder-v1',
        name: 'AURA Fast Coder (Offline)',
        provider: this.id,
        contextWindow: 64000,
        isLocal: true,
        supportsStreaming: true,
        supportsToolCalls: true,
        description: 'Built-in offline code understanding & patch generator'
      }
    ];
  }

  async generate(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const text = this.synthesizeResponse(request);
    return {
      id: `local_aura_${Date.now()}`,
      model: request.model || 'aura-deep-reasoner-v1',
      content: text,
      finishReason: 'stop',
      usage: {
        promptTokens: countTokens(JSON.stringify(request.messages)),
        completionTokens: countTokens(text),
        totalTokens: countTokens(JSON.stringify(request.messages) + text)
      }
    };
  }

  async stream(
    request: ChatCompletionRequest,
    onChunk: (chunk: StreamChunk) => void
  ): Promise<ChatCompletionResponse> {
    const text = this.synthesizeResponse(request);
    const words = text.split(/(\s+)/);

    for (const word of words) {
      if (request.abortSignal?.aborted) break;
      onChunk({ delta: word });
      // Small tick for realistic streaming feel
      await new Promise((resolve) => setTimeout(resolve, 15));
    }

    return {
      id: `local_aura_${Date.now()}`,
      model: request.model || 'aura-deep-reasoner-v1',
      content: text,
      finishReason: 'stop',
      usage: {
        promptTokens: countTokens(JSON.stringify(request.messages)),
        completionTokens: countTokens(text),
        totalTokens: countTokens(JSON.stringify(request.messages) + text)
      }
    };
  }

  countTokens(text: string): number {
    return countTokens(text);
  }

  private synthesizeResponse(request: ChatCompletionRequest): string {
    const lastMsg = [...request.messages].reverse().find((m) => m.role === 'user')?.content || '';
    const lower = lastMsg.toLowerCase();

    if (lower.includes('explain polymorphism') || lower.includes('polymorphism')) {
      return `### Polymorphism in Software Engineering

**Polymorphism** (from Greek *poly* = many, *morph* = form) is a core object-oriented concept that allows objects of different classes to be treated through a unified interface.

#### 1. Compile-Time Polymorphism (Method Overloading)
Occurs when multiple methods in the same class share the same name with different signatures (parameter types or counts).

\`\`\`typescript
class Calculator {
  add(a: number, b: number): number;
  add(a: string, b: string): string;
  add(a: any, b: any): any {
    return a + b;
  }
}
\`\`\`

#### 2. Runtime Polymorphism (Method Overriding / Subtyping)
Occurs when a subclass provides a specific implementation of a method defined in its superclass or interface:

\`\`\`typescript
interface NotificationService {
  send(message: string): Promise<void>;
}

class EmailNotification implements NotificationService {
  async send(message: string): Promise<void> {
    console.log(\`Sending Email: \${message}\`);
  }
}

class SMSNotification implements NotificationService {
  async send(message: string): Promise<void> {
    console.log(\`Sending SMS: \${message}\`);
  }
}
\`\`\`

#### Benefits:
- **Loose Coupling:** The caller depends on abstractions, not concrete implementations.
- **Extensibility:** New classes can be added without altering existing business logic (Open/Closed Principle).`;
    }

    if (lower.includes('firebase auth') || lower.includes('authentication')) {
      return `### Authentication Architecture Plan

To implement authentication in your project, we follow a secure, modular pattern:

1. **Context & Provider Setup**:
   Create a centralized auth provider (e.g. \`AuthContext.tsx\`) to manage session state and token refresh.
2. **API & Token Management**:
   Configure secure storage (HTTP-only cookies or encrypted local storage) and automatic bearer token injection for outgoing requests.
3. **Protected Routes & Guards**:
   Wrap secured views with a \`<ProtectedRoute />\` wrapper checking user authentication status and permissions.
4. **Login / Register Views**:
   Implement validated input forms with proper feedback, error handling, and loading states.`;
    }

    if (lower.includes('hello') || lower.includes('hi') || lower.includes('who are you')) {
      return `Hello! I am **AURA** (Autonomous Universal Reasoning Assistant).

I am your personal AI engine designed for:
- 🧠 **Deep Reasoning & Architecture Planning**
- 📂 **Full Project & Codebase Understanding**
- 🛠️ **Autonomous Multi-Step Coding & Refactoring**
- ⚡ **Controlled Terminal & Test Execution**
- 🔍 **Real-time Web Research**
- 💾 **Persistent Project & User Memory**

How can I assist you with your project today?`;
    }

    // Default structured answer
    return `### AURA Analysis

I have processed your request:
> "${lastMsg}"

#### Key Insights:
1. **Scope & Intent:** Analyzing the technical requirements and architecture.
2. **Actionable Steps:**
   - Review relevant code paths or configuration.
   - Formulate precise modifications or explanations.
   - Validate outcomes and verify stability.

Let me know if you would like me to inspect specific project files, write code, run commands, or execute tests.`;
  }
}
