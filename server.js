import "dotenv/config";
import compression from "compression";
import cors from "cors";
import express from "express";
import { fileURLToPath } from "node:url";
import path from "node:path";
import chatHandler from "./api/chat.js";

const app = express();
const port = Number(process.env.PORT) || 3001;
const rootDirectory = path.dirname(fileURLToPath(import.meta.url));
const distDirectory = path.join(rootDirectory, "dist");

app.disable("x-powered-by");
app.use(compression());
app.use(cors({ origin: true }));
app.use(express.json({ limit: "32kb" }));

app.get("/api/health", (_request, response) => {
  response.json({ ok: true });
});

app.post("/api/chat", chatHandler);
app.use(express.static(distDirectory));
app.get("*splat", (_request, response) => {
  response.sendFile(path.join(distDirectory, "index.html"));
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Mentor Room API listening on http://localhost:${port}`);
});
