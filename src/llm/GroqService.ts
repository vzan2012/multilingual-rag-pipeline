import type { ChatMessage, GroqChatResponse, GroqOptions } from "../types/Groq";

/**
 * GroqService is a client for GroqCloud's OpenAI-compatible chat completion API.
 * Get a free API key at https://console.groq.com — check
 * https://console.groq.com/docs/models for the current model list, it changes over time.
 *
 * @export
 * @class GroqService
 * @typedef {GroqService}
 */
export class GroqService {
  private apiKey: string;
  private model: string;
  private readonly baseUrl = "https://api.groq.com/openai/v1/chat/completions";

  constructor(options: GroqOptions = {}) {
    this.apiKey = options.apiKey || process.env.GROQ_API_KEY || "";
    this.model =
      options.model || process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

    if (!this.apiKey)
      throw new Error(
        "GroqService requires a Groq API key (set GROQ_API_KEY or pass apiKey) - get one free at console.groq.com",
      );
  }

  chat = async (
    messages: ChatMessage[],
    options: { temperature?: number; maxTokens?: number } = {},
  ): Promise<string> => {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: options.temperature ?? 0.3,
        max_tokens: options.maxTokens ?? 1024,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Groq API error (${response.status}): ${errorBody}`);
    }

    const data = (await response.json()) as GroqChatResponse;
    const answer = data.choices?.[0]?.message?.content;

    if (!answer) throw new Error("Groq API returned no answer content");

    return answer;
  };

  /**
   * Builds a context-grounded prompt from retrieved chunks and asks Groq to answer the query.
   *
   * @async
   * @param {string} query
   * @param {string[]} contextChunks
   * @returns {Promise<string>}
   */
  generateAnswer = async (
    query: string,
    contextChunks: string[],
  ): Promise<string> => {
    const context = contextChunks
      .map((chunk, i) => `[${i + 1}] ${chunk}`)
      .join("\n\n");

    const messages: ChatMessage[] = [
      {
        role: "system",
        content:
          "You are a helpful assistant answering questions using only the provided context. " +
          "Cite sources using their [number]. If the context doesn't contain the answer, say so plainly.",
      },
      {
        role: "user",
        content: `Context:\n${context}\n\nQuestion: ${query}`,
      },
    ];

    return this.chat(messages);
  };
}