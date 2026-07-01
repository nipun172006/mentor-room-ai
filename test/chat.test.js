import assert from "node:assert/strict";
import test from "node:test";
import {
  ChatError,
  createChatResponse,
  toGeminiContents,
  toPublicError,
  validateChatBody,
} from "../api/_lib/gemini.js";

function apiResponse(status, payload) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  };
}

const silentLogger = { warn() {} };

test("validates and trims a normal chat request", () => {
  const result = validateChatBody({
    personaId: "kshitij",
    messages: [{ role: "user", text: "  Explain recursion  " }],
  });

  assert.deepEqual(result, {
    personaId: "kshitij",
    messages: [{ role: "user", text: "Explain recursion" }],
  });
});

test("rejects an unknown persona", () => {
  assert.throws(
    () =>
      validateChatBody({
        personaId: "unknown",
        messages: [{ role: "user", text: "Hello" }],
      }),
    /choose one of the available mentors/i,
  );
});

test("requires the latest message to be from the user", () => {
  assert.throws(
    () =>
      validateChatBody({
        personaId: "anshuman",
        messages: [{ role: "model", text: "Hello" }],
      }),
    /latest message must come from you/i,
  );
});

test("maps application messages to Gemini chat contents", () => {
  assert.deepEqual(
    toGeminiContents([
      { role: "user", text: "Question" },
      { role: "model", text: "Answer" },
    ]),
    [
      { role: "user", parts: [{ text: "Question" }] },
      { role: "model", parts: [{ text: "Answer" }] },
    ],
  );
});

test("sends the chosen persona as a system instruction", async () => {
  let capturedRequest;
  const fetchImplementation = async (url, request) => {
    capturedRequest = { url, request };
    return apiResponse(200, {
      candidates: [{ content: { parts: [{ text: "A focused answer." }] } }],
    });
  };

  const result = await createChatResponse(
    {
      personaId: "abhimanyu",
      messages: [{ role: "user", text: "Help me stay consistent." }],
    },
    {
      apiKey: "test-key",
      model: "test-model",
      fetchImplementation,
      logger: silentLogger,
    },
  );

  const requestBody = JSON.parse(capturedRequest.request.body);
  assert.equal(result.text, "A focused answer.");
  assert.match(capturedRequest.url, /test-model/);
  assert.match(
    requestBody.system_instruction.parts[0].text,
    /Respect, Integrity, Curiosity, and Excellence/,
  );
  assert.equal(requestBody.generationConfig.thinkingConfig.thinkingBudget, 256);
  assert.equal(requestBody.generationConfig.maxOutputTokens, 1_024);
  assert.equal(capturedRequest.request.headers["x-goog-api-key"], "test-key");
});

test("retries a temporarily unavailable model", async () => {
  let callCount = 0;
  const fetchImplementation = async () => {
    callCount += 1;
    return callCount === 1
      ? apiResponse(503, { error: { message: "High demand" } })
      : apiResponse(200, {
          candidates: [{ content: { parts: [{ text: "Recovered response." }] } }],
        });
  };

  const result = await createChatResponse(
    {
      personaId: "anshuman",
      messages: [{ role: "user", text: "Help me plan." }],
    },
    {
      apiKey: "test-key",
      model: "primary-model",
      fallbackModel: "fallback-model",
      fetchImplementation,
      sleepImplementation: async () => {},
      logger: silentLogger,
    },
  );

  assert.equal(result.text, "Recovered response.");
  assert.equal(callCount, 2);
});

test("uses Flash-Lite when the primary model stays unavailable", async () => {
  const requestedModels = [];
  let fallbackRequest;
  const fetchImplementation = async (url, request) => {
    requestedModels.push(url);

    if (url.includes("fallback-model")) {
      fallbackRequest = request;
      return apiResponse(200, {
        candidates: [{ content: { parts: [{ text: "Fallback response." }] } }],
      });
    }

    return apiResponse(503, { error: { message: "Provider detail" } });
  };

  const result = await createChatResponse(
    {
      personaId: "kshitij",
      messages: [{ role: "user", text: "Explain a queue." }],
    },
    {
      apiKey: "test-key",
      model: "primary-model",
      fallbackModel: "fallback-model-flash-lite",
      fetchImplementation,
      sleepImplementation: async () => {},
      logger: silentLogger,
    },
  );

  const fallbackBody = JSON.parse(fallbackRequest.body);
  assert.equal(result.text, "Fallback response.");
  assert.equal(requestedModels.length, 3);
  assert.match(requestedModels[2], /fallback-model-flash-lite/);
  assert.equal(fallbackBody.generationConfig.thinkingConfig.thinkingBudget, 0);
});

test("hides provider details when every model is unavailable", async () => {
  const request = createChatResponse(
    {
      personaId: "abhimanyu",
      messages: [{ role: "user", text: "How do I find a mentor?" }],
    },
    {
      apiKey: "test-key",
      model: "primary-model",
      fallbackModel: "fallback-model",
      fetchImplementation: async () =>
        apiResponse(503, { error: { message: "Internal provider detail" } }),
      sleepImplementation: async () => {},
      logger: silentLogger,
    },
  );

  await assert.rejects(request, (error) => {
    assert.equal(error.status, 503);
    assert.match(error.message, /busy right now/i);
    assert.doesNotMatch(error.message, /internal provider detail/i);
    return true;
  });
});

test("returns a friendly setup error when the API key is missing", async () => {
  await assert.rejects(
    createChatResponse(
      {
        personaId: "anshuman",
        messages: [{ role: "user", text: "Hello" }],
      },
      { apiKey: "", logger: silentLogger },
    ),
    /not connected yet/i,
  );
});

test("does not expose unexpected internal errors", () => {
  assert.deepEqual(toPublicError(new Error("secret internal detail")), {
    status: 500,
    message: "Something unexpected happened. Please wait a moment and try again.",
  });

  assert.deepEqual(toPublicError(new ChatError("Safe message", 422)), {
    status: 422,
    message: "Safe message",
  });
});
