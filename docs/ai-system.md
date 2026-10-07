# AURA AI Provider System

AURA is decoupled from any single AI vendor through the pluggable `AIProvider` interface and intelligent model-to-provider auto-routing.

---

## 1. Supported Providers

### 1. OpenAI ChatGPT (`OpenAIProvider` — Full Support)
- **Flagship Models**:
  - `gpt-4o` (GPT-4o Omni — Industry Flagship Intelligence & Vision)
  - `gpt-4o-mini` (GPT-4o Mini — Ultra-Fast & Cost-Efficient)
  - `o3-mini` (o3-mini — Advanced STEM & Coding Deliberative Reasoning)
  - `o1` (o1 — Full Deliberative Reasoning & Planning)
  - `gpt-4.5-preview` (Next-gen frontier reasoning)
  - `chatgpt-4o-latest` (Continuously updated web version)
- **Endpoint Support**:
  - Official OpenAI (`https://api.openai.com/v1`)
  - OpenRouter (`https://openrouter.ai/api/v1`)
  - Custom / Local OpenAI-compatible endpoints (LocalAI, vLLM, LM Studio)
- **Features**: Live key testing, auto-routing on model selection, streaming token & reasoning deltas, structured tool calls.

### 2. Ollama (`OllamaProvider` — Local Free-First)
- **Host**: `http://localhost:11434`
- **Cost**: ₹0 / month
- **Privacy**: 100% local, no telemetry or data transmitted outside your Mac.
- **Recommended Models**:
  - `qwen2.5-coder:latest` (Outstanding coding, refactoring, and tool calling)
  - `llama3.2:latest` (Fast general reasoning)
  - `deepseek-coder:latest` (Code synthesis)

### 3. Google Gemini (`GeminiProvider`)
- **Cost**: Generous Free Tier available at [Google AI Studio](https://aistudio.google.com)
- **Supported Models**: `gemini-2.0-flash`, `gemini-1.5-pro`, `gemini-1.5-flash`
- **Capabilities**: 1M+ context window, ultra-fast streaming, multimodal understanding.

### 4. Anthropic Claude (`AnthropicProvider`)
- **Supported Models**: `claude-3-5-sonnet-20241022`, `claude-3-5-haiku-20241022`
- **Capabilities**: High-fidelity architectural reasoning, tool usage.

### 5. Built-in Offline Engine (`MockLocalProvider`)
- **Cost**: ₹0 / month, zero-dependency.
- **Purpose**: Ensures AURA remains fully interactive and responsive even before starting Ollama or setting API keys.

---

## 2. Dynamic Settings & Auto-Routing

1. **Auto-Routing**: When you pick any model in the UI (e.g. `gpt-4o` or `o3-mini`), `ProviderRegistry.getProviderForModel()` routes the request to the correct provider without needing manual config switching.
2. **Instant Sync**: API keys saved in Settings or the Quick Connect modal are immediately synchronized to the runtime AI providers in memory.
3. **Graceful Fallback**: If an external provider is unreachable or key is missing, AURA informs the user with actionable instructions and falls back safely to prevent crashes.

---

## 3. Dynamic Context Assembly

When formulating requests, AURA dynamically builds context in strict priority order:

1. **System Directives & Behavioral Guardrails** (Honesty, Safety, No fake tool execution)
2. **Execution Mode Policy** (`ASK`, `ASSIST`, `AUTONOMOUS`)
3. **Active Project Metadata** (Framework, dependencies, entry points, language)
4. **Relevant Persistent Memories** (Scored by keyword, tag, and importance)
5. **Recent Conversation Messages** (With rolling summarization for long threads)
6. **Active Tool Outputs & Diffs**
