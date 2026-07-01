import assert from "node:assert/strict";
import test from "node:test";
import {
  ChatError,
  createChatResponse,
  toGeminiContents,
  toPublicError,
  validateChatBody,
} from "../api/_lib/gemini.js";

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
    return {
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: "A focused answer." }] } }],
      }),
    };
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

test("returns a friendly setup error when the API key is missing", async () => {
  await assert.rejects(
    createChatResponse(
      {
        personaId: "anshuman",
        messages: [{ role: "user", text: "Hello" }],
      },
      { apiKey: "" },
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
