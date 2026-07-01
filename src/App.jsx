import { useEffect, useRef, useState } from "react";
import { getPersona, personas } from "./data/personas.js";

const MAX_INPUT_LENGTH = 2_000;

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.8c.5 5.7 3.3 8.5 9 9-5.7.5-8.5 3.3-9 9-.5-5.7-3.3-8.5-9-9 5.7-.5 8.5-3.3 9-9Z" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 7v5h-5M4.7 17a8 8 0 0 0 13.8-1M3.5 8A8 8 0 0 1 17.3 7" />
    </svg>
  );
}

function PersonaAvatar({ persona, small = false }) {
  return (
    <span
      className={`avatar ${small ? "avatar--small" : ""}`}
      style={{
        "--persona-accent": persona.accent,
        "--persona-soft": persona.softAccent,
      }}
      aria-hidden="true"
    >
      {persona.initials}
      <span className="avatar__dot" />
    </span>
  );
}

function Sidebar({ activePersonaId, onSelect }) {
  return (
    <aside className="sidebar" aria-label="Choose a mentor">
      <div className="brand">
        <span className="brand__mark">
          <SparkIcon />
        </span>
        <span>
          <strong>Mentor</strong>
          <em>Room</em>
        </span>
      </div>

      <div className="sidebar__intro">
        <p className="eyebrow">Choose your guide</p>
        <h1>Three mentors.<br />Three ways to grow.</h1>
        <p>Switching mentors starts a fresh conversation.</p>
      </div>

      <div className="persona-list" role="list">
        {personas.map((persona) => {
          const active = persona.id === activePersonaId;
          return (
            <button
              className={`persona-card ${active ? "persona-card--active" : ""}`}
              key={persona.id}
              type="button"
              onClick={() => onSelect(persona.id)}
              aria-pressed={active}
              style={{
                "--persona-accent": persona.accent,
                "--persona-soft": persona.softAccent,
              }}
            >
              <PersonaAvatar persona={persona} small />
              <span className="persona-card__copy">
                <strong>{persona.name}</strong>
                <small>{persona.role}</small>
              </span>
              <span className="persona-card__arrow">↗</span>
            </button>
          );
        })}
      </div>

      <p className="sidebar__note">
        <span>AI</span> Student-built personas based on public material.
      </p>
    </aside>
  );
}

function MobilePersonaTabs({ activePersonaId, onSelect }) {
  return (
    <div className="mobile-tabs" role="tablist" aria-label="Choose a mentor">
      {personas.map((persona) => (
        <button
          key={persona.id}
          type="button"
          role="tab"
          aria-selected={persona.id === activePersonaId}
          className={persona.id === activePersonaId ? "mobile-tab--active" : ""}
          onClick={() => onSelect(persona.id)}
          style={{ "--persona-accent": persona.accent }}
        >
          {persona.shortName}
        </button>
      ))}
    </div>
  );
}

function Message({ message, persona }) {
  const isUser = message.role === "user";
  return (
    <article className={`message ${isUser ? "message--user" : "message--mentor"}`}>
      {!isUser && <PersonaAvatar persona={persona} small />}
      <div className="message__content">
        <span className="message__author">{isUser ? "You" : persona.shortName}</span>
        <div className="message__bubble">
          {message.text.split("\n").map((line, index) => (
            <span key={`${line}-${index}`}>
              {line || "\u00A0"}
              {index < message.text.split("\n").length - 1 && <br />}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}

function TypingIndicator({ persona }) {
  return (
    <article className="message message--mentor" aria-live="polite" aria-label={`${persona.name} is typing`}>
      <PersonaAvatar persona={persona} small />
      <div className="message__content">
        <span className="message__author">{persona.shortName}</span>
        <div className="typing">
          <i />
          <i />
          <i />
        </div>
      </div>
    </article>
  );
}

function Welcome({ persona, onSuggestion }) {
  return (
    <div className="welcome">
      <div
        className="welcome__visual"
        style={{
          "--persona-accent": persona.accent,
          "--persona-soft": persona.softAccent,
        }}
      >
        <span className="welcome__orbit welcome__orbit--one" />
        <span className="welcome__orbit welcome__orbit--two" />
        <PersonaAvatar persona={persona} />
      </div>
      <p className="eyebrow">A fresh conversation with</p>
      <h2>{persona.name}</h2>
      <p className="welcome__intro">{persona.intro}</p>
      <div className="suggestions" aria-label="Suggested questions">
        {persona.suggestions.map((suggestion) => (
          <button type="button" key={suggestion} onClick={() => onSuggestion(suggestion)}>
            <span>{suggestion}</span>
            <ArrowIcon />
          </button>
        ))}
      </div>
    </div>
  );
}

function ChatInput({ value, onChange, onSubmit, disabled, persona }) {
  const textareaRef = useRef(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 132)}px`;
  }, [value]);

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSubmit();
    }
  }

  return (
    <div className="composer-wrap">
      <div className="composer">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={MAX_INPUT_LENGTH}
          rows="1"
          disabled={disabled}
          aria-label={`Message ${persona.name}`}
          placeholder={`Ask ${persona.shortName} anything…`}
        />
        <button
          type="button"
          className="send-button"
          onClick={onSubmit}
          disabled={disabled || !value.trim()}
          aria-label="Send message"
          style={{ "--persona-accent": persona.accent }}
        >
          <ArrowIcon />
        </button>
      </div>
      <span className="composer__hint">
        Enter to send · Shift + Enter for a new line
      </span>
    </div>
  );
}

export default function App() {
  const [activePersonaId, setActivePersonaId] = useState(personas[0].id);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef(null);
  const requestControllerRef = useRef(null);
  const activePersona = getPersona(activePersonaId);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  function resetConversation(personaId = activePersonaId) {
    requestControllerRef.current?.abort();
    requestControllerRef.current = null;
    setActivePersonaId(personaId);
    setMessages([]);
    setInput("");
    setError("");
    setIsLoading(false);
  }

  function selectPersona(personaId) {
    if (personaId !== activePersonaId) {
      resetConversation(personaId);
    }
  }

  async function requestReply(conversationMessages) {
    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          personaId: activePersonaId,
          messages: conversationMessages,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "The mentor could not respond right now.");
      }

      setMessages((current) => [...current, { role: "model", text: payload.text }]);
    } catch (requestError) {
      if (requestError instanceof DOMException && requestError.name === "AbortError") {
        return;
      }
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The mentor could not respond. Please try again.",
      );
    } finally {
      if (requestControllerRef.current === controller) {
        requestControllerRef.current = null;
        setIsLoading(false);
      }
    }
  }

  function sendMessage(textOverride) {
    const text = (textOverride ?? input).trim();
    if (!text || isLoading) return;

    const nextMessages = [...messages, { role: "user", text }];
    setMessages(nextMessages);
    setInput("");
    requestReply(nextMessages);
  }

  function retryLastMessage() {
    if (!isLoading && messages.at(-1)?.role === "user") {
      requestReply(messages);
    }
  }

  const hasConversation = messages.length > 0;

  return (
    <main className="app-shell">
      <Sidebar activePersonaId={activePersonaId} onSelect={selectPersona} />

      <section className="chat-panel">
        <header className="chat-header">
          <div className="mobile-brand">
            <span className="brand__mark"><SparkIcon /></span>
            <strong>Mentor Room</strong>
          </div>
          <div className="chat-header__identity">
            <PersonaAvatar persona={activePersona} small />
            <div>
              <strong>{activePersona.name}</strong>
              <span><i /> {activePersona.status}</span>
            </div>
          </div>
          <button
            type="button"
            className="reset-button"
            onClick={() => resetConversation()}
            disabled={!hasConversation && !error}
            aria-label="New conversation"
          >
            <RefreshIcon />
            <span>New conversation</span>
          </button>
        </header>

        <MobilePersonaTabs activePersonaId={activePersonaId} onSelect={selectPersona} />

        <div className={`chat-body ${!hasConversation ? "chat-body--welcome" : ""}`}>
          {!hasConversation ? (
            <Welcome persona={activePersona} onSuggestion={sendMessage} />
          ) : (
            <div className="message-list">
              <div className="conversation-start">
                <span>{activePersona.greeting}</span>
              </div>
              {messages.map((message, index) => (
                <Message
                  key={`${message.role}-${index}-${message.text.slice(0, 16)}`}
                  message={message}
                  persona={activePersona}
                />
              ))}
              {isLoading && <TypingIndicator persona={activePersona} />}
              {error && (
                <div className="error-message" role="alert">
                  <strong>Couldn’t get a response.</strong>
                  <span>{error}</span>
                  <button type="button" onClick={retryLastMessage}>
                    Try again
                  </button>
                </div>
              )}
              <div ref={endRef} />
            </div>
          )}
        </div>

        <ChatInput
          value={input}
          onChange={setInput}
          onSubmit={() => sendMessage()}
          disabled={isLoading}
          persona={activePersona}
        />
      </section>
    </main>
  );
}
