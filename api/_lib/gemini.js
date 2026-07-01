import { getPersonaPrompt, isPersonaId } from "./personas.js";

const MAX_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 2_000;
const MAX_ATTEMPTS_PER_MODEL = 2;
const RETRY_DELAY_MS = 900;
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const DEFAULT_MODEL = "gemini-2.5-flash";
const DEFAULT_FALLBACK_MODEL = "gemini-2.5-flash-lite";
const DEFAULT_BACKUP_MODEL = "gemini-3.1-flash-lite";
const LOCAL_REPLIES = {
  anshuman:
    "You’re welcome. The best way to make it stick is to explain the idea once in your own words. What would you like to work through next?",
  abhimanyu:
    "You’re welcome! I’m glad it helped. Try using the idea once today, and tell me what you’d like to work on next.",
  kshitij:
    "You’re welcome! You understood the idea—that’s the important part. Try one example on your own, then tell me which concept we should break down next.",
};

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

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function getGenerationConfig(model) {
  const config = {
    temperature: 0.75,
    topP: 0.9,
    maxOutputTokens: 1_024,
  };

  // Gemini 3 uses thinking levels instead of the Gemini 2.5 thinking budget.
  if (!model.startsWith("gemini-3")) {
    config.thinkingConfig = {
      thinkingBudget: model.includes("flash-lite") ? 0 : 256,
    };
  }

  return config;
}

function getLocalReply(personaId, messages) {
  const latestMessage = messages.at(-1).text;
  const isShortThankYou =
    latestMessage.length <= 160 &&
    /^(thank\s*you|thankyou|thanks|thx|ty)\b/i.test(latestMessage) &&
    !/[?]/.test(latestMessage) &&
    !/\b(can|could|would|why|what|how|when|where|explain|help)\b/i.test(
      latestMessage,
    );

  return isShortThankYou ? LOCAL_REPLIES[personaId] : null;
}

function getProviderError(status) {
  if (status === 429) {
    return new ChatError(
      "The chatbot is receiving too many requests right now. Please wait a moment and try again.",
      429,
    );
  }

  if ([401, 403].includes(status)) {
    return new ChatError(
      "The chatbot is not configured correctly yet. Please contact the project owner.",
      503,
    );
  }

  if (RETRYABLE_STATUS_CODES.has(status)) {
    return new ChatError(
      "The AI service is busy right now. Please try again in a few seconds.",
      503,
    );
  }

  return new ChatError(
    "The AI service could not process that request. Please start a new conversation and try again.",
    502,
  );
}

export async function createChatResponse(body, options = {}) {
  const { personaId, messages } = validateChatBody(body);
  const localReply = getLocalReply(personaId, messages);

  if (localReply) {
    return { text: localReply };
  }

  const apiKey = options.apiKey ?? process.env.GEMINI_API_KEY;
  const model = options.model ?? process.env.GEMINI_MODEL ?? DEFAULT_MODEL;
  const fallbackModel =
    options.fallbackModel ??
    process.env.GEMINI_FALLBACK_MODEL ??
    DEFAULT_FALLBACK_MODEL;
  const backupModel =
    options.backupModel ??
    process.env.GEMINI_BACKUP_MODEL ??
    DEFAULT_BACKUP_MODEL;
  const fetchImplementation = options.fetchImplementation ?? fetch;
  const sleepImplementation = options.sleepImplementation ?? wait;
  const logger = options.logger ?? console;

  if (!apiKey) {
    throw new ChatError(
      "The chatbot is not connected yet. Add GEMINI_API_KEY to the environment and restart the server.",
      503,
    );
  }

  const models = [...new Set([model, fallbackModel, backupModel].filter(Boolean))];

  let lastStatus = 502;

  for (const currentModel of models) {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_MODEL; attempt += 1) {
      let apiResponse;

      try {
        apiResponse = await fetchImplementation(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(currentModel)}:generateContent`,
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
              generationConfig: getGenerationConfig(currentModel),
            }),
          },
        );
      } catch {
        lastStatus = 502;
        logger.warn?.(`[gemini] ${currentModel} could not be reached (attempt ${attempt})`);

        if (attempt < MAX_ATTEMPTS_PER_MODEL) {
          await sleepImplementation(RETRY_DELAY_MS * attempt);
          continue;
        }

        break;
      }

      const payload = await apiResponse.json().catch(() => ({}));

      if (apiResponse.ok) {
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

      lastStatus = apiResponse.status;
      logger.warn?.(
        `[gemini] ${currentModel} returned ${apiResponse.status} (attempt ${attempt})`,
      );

      if (!RETRYABLE_STATUS_CODES.has(apiResponse.status)) {
        throw getProviderError(apiResponse.status);
      }

      if (attempt < MAX_ATTEMPTS_PER_MODEL) {
        await sleepImplementation(RETRY_DELAY_MS * attempt);
      }
    }
  }

  throw getProviderError(lastStatus);
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
