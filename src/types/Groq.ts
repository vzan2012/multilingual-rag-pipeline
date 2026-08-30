export interface GroqOptions {
  apiKey?: string;
  model?: string;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GroqChatResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
  }>;
}