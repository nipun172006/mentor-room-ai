import { createChatResponse, toPublicError } from "./_lib/gemini.js";

export default async function chatHandler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Please use POST for this endpoint." });
  }

  try {
    const result = await createChatResponse(request.body);
    return response.status(200).json(result);
  } catch (error) {
    const publicError = toPublicError(error);
    console.error("[chat]", error instanceof Error ? error.message : error);
    return response.status(publicError.status).json({ error: publicError.message });
  }
}
