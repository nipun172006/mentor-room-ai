# Mentor Room

A responsive persona-based AI chatbot inspired by three Scaler educators: Anshuman Singh, Abhimanyu Saxena, and Kshitij Mishra. Each mentor has a distinct, research-backed system prompt, matching quick-start questions, and a fresh conversation state.

> This is an educational AI simulation. The responses are not statements from, or endorsements by, the real people.

![Mentor Room desktop interface](docs/mentor-room-desktop.png)

## Features

- Three clearly visible personas with distinct teaching styles
- Persona switcher that resets the conversation
- Persona-specific suggestion chips
- Multi-turn Gemini conversations with the correct system prompt
- Animated typing state and friendly API error messages
- Responsive desktop and mobile layouts
- API key kept only on the server
- Input validation and basic automated API tests

## Run locally

You need Node.js 20+ and a Gemini API key.

```bash
git clone <your-repository-url>
cd personaGenAi1
npm install
cp .env.example .env
```

Add your key to `.env`:

```env
GEMINI_API_KEY=your_actual_key
```

Then start both the UI and API:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Check the project

```bash
npm run check
```

This runs the Node test suite and creates a production build.

## Deploy on Vercel

1. Push the repository to GitHub.
2. Import the repository in Vercel.
3. Add `GEMINI_API_KEY` in **Project Settings → Environment Variables**.
4. Deploy. Vercel will use the included `vercel.json` and the serverless `api/chat.js` route.
5. Put the final production URL here: **Deployment URL: _add after deployment_**

Never prefix the key with `VITE_`; that would expose it to the browser bundle.

## Project structure

```text
api/
  _lib/gemini.js       # Validation and Gemini API call
  _lib/personas.js     # Server-side system prompts
  chat.js              # Serverless API handler
src/
  data/personas.js     # Public UI copy and suggestions
  App.jsx              # Chat interface and state
  styles.css           # Responsive visual design
test/chat.test.js      # API unit tests
prompts.md             # Prompt decisions and research notes
reflection.md          # Assignment reflection
server.js              # Local Express server
```

## Prompt and research notes

The complete annotated prompts are in [prompts.md](prompts.md). The prompt design uses public professional material and avoids claiming that the chatbot is the real person. Public sources consulted include Scaler’s instructor profiles and public posts/interviews from [Anshuman Singh](https://www.linkedin.com/in/anshumansingh26), [Abhimanyu Saxena](https://www.linkedin.com/in/abhimanyusaxena), and [Kshitij Mishra](https://in.linkedin.com/in/kshitij-mishra-a5779334).

The backend uses Google’s stable `gemini-2.5-flash` model by default. It can be changed with `GEMINI_MODEL`.
