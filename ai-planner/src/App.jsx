import { useState, useRef, useEffect, useCallback } from "react";
import { marked } from "marked";
import "./App.css";

marked.setOptions({ breaks: true, gfm: true });

const SUGGESTIONS = [
  { icon: "📐", text: "Create a study guide for Calculus" },
  { icon: "📖", text: "Build a 2-week plan for AP History" },
  { icon: "💡", text: "Explain the Pythagorean theorem simply" },
  { icon: "⏱️", text: "Make a Pomodoro schedule for finals week" },
];

const SESSION_ID = crypto.randomUUID();
const API_BASE = "http://localhost:3001";

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const VOICE_SUPPORTED = !!SpeechRecognition;

function stripMarkdown(text) {
  return text
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`{1,3}(.*?)`{1,3}/gs, "$1")
    .replace(/^\s*[-*+]\s+/gm, "• ")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^>\s+/gm, "")
    .replace(/---+/g, "─────────────────────")
    .trim();
}

function buildReport(messages) {
  const date = new Date().toLocaleString();
  const lines = [
    "SPACE — CHAT REPORT",
    "Scheduling, Planning, and Course Environment",
    `Generated: ${date}`,
    "═══════════════════════════════════════════════════════",
    "",
  ];
  messages.forEach((msg) => {
    if (msg.role === "user") {
      lines.push("YOU:");
      lines.push(msg.content);
    } else if (msg.role === "assistant" && !msg.error) {
      lines.push("");
      lines.push("SPACE:");
      lines.push(stripMarkdown(msg.content));
    }
    lines.push("");
    lines.push("───────────────────────────────────────────────────");
    lines.push("");
  });
  return lines.join("\n");
}

function downloadReport(messages) {
  const text = buildReport(messages);
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `space-session-${new Date().toISOString().slice(0, 10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function App() {
  const [input, setInput] = useState("");
  const [aboutOpen, setAboutOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [micError, setMicError] = useState("");
  const recognitionRef = useRef(null);
  const textareaRef = useRef(null);
  const chatEndRef = useRef(null);
  const chatRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startRecognition = useCallback(() => {
    if (!VOICE_SUPPORTED) {
      setMicError("Voice input is not supported in this browser. Try Chrome or Edge.");
      return;
    }
    setMicError("");
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => setMicActive(true);
    recognition.onresult = (e) => {
      let finalTranscript = "";
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalTranscript += t;
        else interim += t;
      }
      setInput(finalTranscript || interim);
    };
    recognition.onerror = (e) => {
      setMicActive(false);
      if (e.error === "not-allowed") {
        setMicError("Microphone permission denied. Please allow access in your browser settings.");
      } else if (e.error === "no-speech") {
        setMicError("No speech detected. Try again.");
      } else {
        setMicError(`Voice error: ${e.error}`);
      }
    };
    recognition.onend = () => {
      setMicActive(false);
      textareaRef.current?.focus();
    };
    recognition.start();
  }, []);

  const stopRecognition = useCallback(() => {
    recognitionRef.current?.stop();
    setMicActive(false);
  }, []);

  const toggleMic = () => {
    if (micActive) stopRecognition();
    else startRecognition();
  };

  const handleSuggestion = (text) => {
    setInput(text);
    textareaRef.current?.focus();
  };

  const sendMessage = async (text) => {
    if (!text.trim() || isStreaming) return;
    if (micActive) stopRecognition();

    setMessages((prev) => [...prev,
      { role: "user", content: text },
      { role: "assistant", content: "", streaming: true },
    ]);
    setInput("");
    setIsStreaming(true);

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, sessionId: SESSION_ID }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const payload = JSON.parse(line.slice(6));
            if (payload.error) throw new Error(payload.error);
            if (payload.done) break;
            if (payload.delta) {
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                return [...prev.slice(0, -1), { ...last, content: last.content + payload.delta }];
              });
            }
          } catch { /* skip malformed lines */ }
        }
      }
    } catch (err) {
      setMessages((prev) => [...prev.slice(0, -1), {
        role: "assistant",
        content: `⚠️ Something went wrong: ${err.message}. Make sure the backend server is running.`,
        error: true,
      }]);
    } finally {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        return [...prev.slice(0, -1), { ...last, streaming: false }];
      });
      setIsStreaming(false);
    }
  };

  const handleSubmit = (e) => { e.preventDefault(); sendMessage(input); };
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const clearChat = async () => {
    setMessages([]);
    setMicError("");
    await fetch(`${API_BASE}/api/session/${SESSION_ID}`, { method: "DELETE" }).catch(() => {});
  };

  const hasMessages = messages.length > 0;
  const canDownload = hasMessages && messages.some((m) => m.role === "assistant" && !m.streaming && !m.error);
  const micTitle = !VOICE_SUPPORTED
    ? "Voice input not supported in this browser"
    : micActive ? "Click to stop recording" : "Click to start voice input";

  return (
    <div className="app">
      <div className="bg-orb orb-1" />
      <div className="bg-orb orb-2" />
      <div className="bg-orb orb-3" />

      {/* HEADER */}
      <header className="header">
        <div className="logo">
          <div className="logo-icon">
            <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="18" cy="18" r="17" stroke="url(#lg)" strokeWidth="2" />
              <path d="M11 13h14M11 18h9M11 23h12" stroke="url(#lg2)" strokeWidth="2.2" strokeLinecap="round" />
              <circle cx="26" cy="23" r="3.5" fill="url(#lg3)" />
              <defs>
                <linearGradient id="lg" x1="1" y1="1" x2="35" y2="35" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#7EB8F7" /><stop offset="1" stopColor="#A78BFA" />
                </linearGradient>
                <linearGradient id="lg2" x1="11" y1="13" x2="25" y2="23" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#7EB8F7" /><stop offset="1" stopColor="#A78BFA" />
                </linearGradient>
                <linearGradient id="lg3" x1="22.5" y1="19.5" x2="29.5" y2="26.5" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#7EB8F7" /><stop offset="1" stopColor="#A78BFA" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span className="logo-ai">SPACE</span>
        </div>
        <nav className="nav">
          {canDownload && (
            <button className="nav-link nav-download" onClick={() => downloadReport(messages)} title="Download chat as .txt">
              ⬇ Download Report
            </button>
          )}
          {hasMessages && (
            <button className="nav-link nav-clear" onClick={clearChat} title="Start a new conversation">
              New Chat
            </button>
          )}
          <button className="nav-link" onClick={() => setAboutOpen(true)}>About</button>
        </nav>
      </header>

      {/* MAIN */}
      <main className={"main" + (hasMessages ? " main--chat" : "")}>

        {!hasMessages && (
          <div className="hero">
            <p className="hero-eyebrow">Your AI-powered learning companion</p>
            <h1 className="hero-title">
              Scheduling, Planning, and Course Environment or<br />
              <span className="gradient-text">SPACE.</span>
            </h1>
            <p className="hero-sub">
              Ask anything — study guides, schedules, concept breakdowns.<br />
              Your AI planner adapts to the way <em>you</em> learn.
            </p>
          </div>
        )}

        {/* CHAT THREAD */}
        {hasMessages && (
          <div className="chat" ref={chatRef}>
            {messages.map((msg, i) => (
              <div key={i} className={"message message--" + msg.role + (msg.error ? " message--error" : "")}>
                {msg.role === "assistant" && (
                  <div className="message-avatar">
                    <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" width="22" height="22">
                      <circle cx="18" cy="18" r="17" stroke="url(#alg)" strokeWidth="2" />
                      <path d="M11 13h14M11 18h9M11 23h12" stroke="url(#alg2)" strokeWidth="2.2" strokeLinecap="round" />
                      <circle cx="26" cy="23" r="3.5" fill="url(#alg3)" />
                      <defs>
                        <linearGradient id="alg" x1="1" y1="1" x2="35" y2="35" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#7EB8F7" /><stop offset="1" stopColor="#A78BFA" />
                        </linearGradient>
                        <linearGradient id="alg2" x1="11" y1="13" x2="25" y2="23" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#7EB8F7" /><stop offset="1" stopColor="#A78BFA" />
                        </linearGradient>
                        <linearGradient id="alg3" x1="22.5" y1="19.5" x2="29.5" y2="26.5" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#7EB8F7" /><stop offset="1" stopColor="#A78BFA" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                )}
                <div className="message-bubble">
                  {msg.role === "assistant" ? (
                    <div
                      className={"message-md" + (msg.streaming ? " message-md--streaming" : "")}
                      dangerouslySetInnerHTML={{ __html: marked.parse(msg.content || "▋") }}
                    />
                  ) : (
                    <p>{msg.content}</p>
                  )}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        )}

        {/* INPUT SECTION */}
        <div className={"input-section" + (hasMessages ? " input-section--chat" : "")}>

          {micError && (
            <div className="mic-error-banner">
              ⚠️ {micError}
              <button className="mic-error-close" onClick={() => setMicError("")}>✕</button>
            </div>
          )}

          <form className="input-wrapper" onSubmit={handleSubmit}>
            <div className="input-box">
              <textarea
                ref={textareaRef}
                className="input-field"
                placeholder={
                  micActive ? "Listening… speak now"
                  : isStreaming ? "Waiting for response…"
                  : "What would you like to study today?"
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                disabled={isStreaming}
              />
              <div className="input-actions">
                <button
                  type="button"
                  className={"mic-btn" + (micActive ? " mic-active" : "") + (!VOICE_SUPPORTED ? " mic-unsupported" : "")}
                  onClick={toggleMic}
                  title={micTitle}
                  disabled={isStreaming}
                >
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="18" height="18">
                    <rect x="9" y="2" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="2"/>
                    <path d="M5 10a7 7 0 0 0 14 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="9" y1="21" x2="15" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  {micActive && <span className="mic-pulse" />}
                </button>
                <button
                  type="submit"
                  className={"send-btn" + (isStreaming ? " send-btn--loading" : "")}
                  disabled={!input.trim() || isStreaming}
                  title="Send"
                >
                  {isStreaming ? (
                    <span className="spinner" />
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="18" height="18">
                      <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <p className="input-hint">
              Press <kbd>Enter</kbd> to send · <kbd>Shift+Enter</kbd> for new line
              {VOICE_SUPPORTED && !micActive && <> · <kbd>🎤</kbd> for voice</>}
              {micActive && <> · <span className="hint-listening">🔴 Listening — click mic to stop</span></>}
            </p>
          </form>

          {!hasMessages && (
            <div className="suggestions">
              <p className="suggestions-label">Try asking…</p>
              <div className="chips">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    className="chip"
                    onClick={() => handleSuggestion(s.text)}
                    style={{ animationDelay: i * 0.07 + "s" }}
                  >
                    <span className="chip-icon">{s.icon}</span>
                    {s.text}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ABOUT MODAL */}
      {aboutOpen && (
        <div className="modal-overlay" onClick={() => setAboutOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setAboutOpen(false)}>✕</button>
            <div className="modal-logo">
              <div className="logo-icon logo-icon--lg">
                <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="18" cy="18" r="17" stroke="url(#mlg)" strokeWidth="2" />
                  <path d="M11 13h14M11 18h9M11 23h12" stroke="url(#mlg2)" strokeWidth="2.2" strokeLinecap="round" />
                  <circle cx="26" cy="23" r="3.5" fill="url(#mlg3)" />
                  <defs>
                    <linearGradient id="mlg" x1="1" y1="1" x2="35" y2="35" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#7EB8F7" /><stop offset="1" stopColor="#A78BFA" />
                    </linearGradient>
                    <linearGradient id="mlg2" x1="11" y1="13" x2="25" y2="23" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#7EB8F7" /><stop offset="1" stopColor="#A78BFA" />
                    </linearGradient>
                    <linearGradient id="mlg3" x1="22.5" y1="19.5" x2="29.5" y2="26.5" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#7EB8F7" /><stop offset="1" stopColor="#A78BFA" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
            <h2 className="modal-title">About <span className="gradient-text">SPACE</span></h2>
            <p className="modal-body">
              SPACE — Scheduling, Planning, and Course Environment — is a generative AI powered tool that helps you create a plan for the course or topic of your choice.
            </p>
            <div className="modal-features">
              <div className="feature">
                <span className="feature-icon">🗓️</span>
                <div>
                  <strong>Smart Scheduling</strong>
                  <p>Generate personalized study plans that fit your timeline and learning pace.</p>
                </div>
              </div>
              <div className="feature">
                <span className="feature-icon">🧠</span>
                <div>
                  <strong>Concept Mastery</strong>
                  <p>Break down complex topics into digestible explanations at any level.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
