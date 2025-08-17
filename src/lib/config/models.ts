export interface ModelConfig {
  name: string;
  maxTokens: number;
  costPer1kTokens: number;
  description?: string;
  provider: string;
}

export const AVAILABLE_MODELS: Record<string, ModelConfig> = {
  "openai/gpt-oss-20b:free": {
    name: "GPT-OSS-20B (Free)",
    maxTokens: 8192,
    costPer1kTokens: 0,
    description: "Free open source model, good for basic tasks",
    provider: "OpenAI",
  },
  "openai/gpt-4o-mini": {
    name: "GPT-4o Mini",
    maxTokens: 16384,
    costPer1kTokens: 0.00015,
    description: "Fast and efficient model for most tasks",
    provider: "OpenAI",
  },
  "openai/gpt-4o": {
    name: "GPT-4o",
    maxTokens: 128000,
    costPer1kTokens: 0.005,
    description: "Most capable model for complex tasks",
    provider: "OpenAI",
  },
  "anthropic/claude-3-haiku": {
    name: "Claude 3 Haiku",
    maxTokens: 200000,
    costPer1kTokens: 0.00025,
    description: "Fast and cost-effective model",
    provider: "Anthropic",
  },
  "anthropic/claude-3-sonnet": {
    name: "Claude 3 Sonnet",
    maxTokens: 200000,
    costPer1kTokens: 0.003,
    description: "Balanced performance and cost",
    provider: "Anthropic",
  },
  "google/gemini-flash-1.5": {
    name: "Gemini Flash 1.5",
    maxTokens: 1048576,
    costPer1kTokens: 0.000075,
    description: "Very fast and cost-effective",
    provider: "Google",
  },
  "meta-llama/llama-3.1-8b-instruct": {
    name: "Llama 3.1 8B Instruct",
    maxTokens: 8192,
    costPer1kTokens: 0.00005,
    description: "Open source model, very cost-effective",
    provider: "Meta",
  },
};

export const DEFAULT_MODEL = "openai/gpt-oss-20b:free";

export function getModelConfig(modelId: string): ModelConfig | undefined {
  return AVAILABLE_MODELS[modelId];
}

export function getAllModels(): ModelConfig[] {
  return Object.entries(AVAILABLE_MODELS).map(([id, config]) => ({
    id,
    ...config,
  }));
}

export function getModelsByProvider(provider: string): ModelConfig[] {
  return Object.entries(AVAILABLE_MODELS)
    .filter(([_, config]) => config.provider === provider)
    .map(([id, config]) => ({
      id,
      ...config,
    }));
}
