import { getPersonaPrompt, isPersonaId } from "./personas.js";

const MAX_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 2_000;

export class ChatError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "ChatError";
    this.status = status;
  }
}

export function validateChatBody(body) {
  if (!body || typeof body !== "object") {
    throw new ChatError("That request was empty. Please type a message and try again.");
  }

  const { personaId, messages } = body;

  if (!isPersonaId(personaId)) {
    throw new ChatError("Please choose one of the available mentors.");
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    throw new ChatError("Please type a message before sending.");
  }

  if (messages.length > MAX_MESSAGES) {
    throw new ChatError("This conversation is a little too long. Start a new chat to continue.");
  }

  const cleanMessages = messages.map((message) => {
    const role = message?.role;
    const text = typeof message?.text === "string" ? message.text.trim() : "";

    if (!["user", "model"].includes(role) || !text) {
      throw new ChatError("One of the chat messages is not valid.");
    }

    if (text.length > MAX_MESSAGE_LENGTH) {
      throw new ChatError("Please keep each message under 2,000 characters.");
    }

    return { role, text };
  });

  if (cleanMessages.at(-1).role !== "user") {
    throw new ChatError("The latest message must come from you.");
  }

  return { personaId, messages: cleanMessages };
}

export function toGeminiContents(messages) {
  return messages.map(({ role, text }) => ({
    role,
    parts: [{ text }],
  }));
}

export async function createChatResponse(body, options = {}) {
  const { personaId, messages } = validateChatBody(body);
  const apiKey = options.apiKey ?? process.env.GEMINI_API_KEY;
  const model = options.model ?? process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  const fetchImplementation = options.fetchImplementation ?? fetch;

  if (!apiKey) {
    throw new ChatError(
      "The chatbot is not connected yet. Add GEMINI_API_KEY to the environment and restart the server.",
      503,
    );
  }

  const apiResponse = await fetchImplementation(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: getPersonaPrompt(personaId) }],
        },
        contents: toGeminiContents(messages),
        generationConfig: {
          temperature: 0.75,
          topP: 0.9,
          maxOutputTokens: 1_024,
          thinkingConfig: {
            thinkingBudget: 256,
          },
        },
      }),
    },
  );

  const payload = await apiResponse.json().catch(() => ({}));

  if (!apiResponse.ok) {
    const upstreamMessage = payload?.error?.message || "Gemini did not accept the request.";
    throw new ChatError(`The AI service is unavailable right now. ${upstreamMessage}`, 502);
  }

  const text = payload?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text)
    .filter(Boolean)
    .join("\n")
    .trim();

  if (!text) {
    throw new ChatError(
      "I could not generate a response to that. Please rephrase it and try once more.",
      502,
    );
  }

  return { text };
}

export function toPublicError(error) {
  if (error instanceof ChatError) {
    return { status: error.status, message: error.message };
  }

  return {
    status: 500,
    message: "Something unexpected happened. Please wait a moment and try again.",
  };
}
