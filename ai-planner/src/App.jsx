import { useState, useRef } from "react";
import "./App.css";

const SUGGESTIONS = [
  { icon: "📐", text: "Create a study guide for Calculus" },
  { icon: "📖", text: "Build a 2-week plan for AP History" },
  { icon: "💡", text: "Explain the Pythagorean theorem simply" },
  { icon: "⏱️", text: "Make a Pomodoro schedule for finals week" },
];

export default function App() {
  const [input, setInput] = useState("");
  const [aboutOpen, setAboutOpen] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const textareaRef = useRef(null);

  const handleSuggestion = (text) => {
    setInput(text);
    textareaRef.current?.focus();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    console.log("Prompt submitted:", input);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const toggleMic = () => setMicActive((v) => !v);

  return (
    <div className="app">
      <div className="bg-orb orb-1" />
      <div className="bg-orb orb-2" />
      <div className="bg-orb orb-3" />

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
          <span className="logo-text">AI Study <span className="logo-ai">Planner</span></span>
        </div>
        <nav className="nav">
          <button className="nav-link" onClick={() => setAboutOpen(true)}>About</button>
        </nav>
      </header>

      <main className="main">
        <div className="hero">
          <p className="hero-eyebrow">Your AI-powered learning companion</p>
          <h1 className="hero-title">
            Title or<br />
            <span className="gradient-text">Slogan.</span>
          </h1>
          <p className="hero-sub">
            Ask anything — study guides, schedules, concept breakdowns.<br />
            Your AI planner adapts to the way <em>you</em> learn.
          </p>
        </div>

        <form className="input-wrapper" onSubmit={handleSubmit}>
          <div className="input-box">
            <textarea
              ref={textareaRef}
              className="input-field"
              placeholder="What would you like to study today?"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
            />
            <div className="input-actions">
              <button
                type="button"
                className={"mic-btn" + (micActive ? " mic-active" : "")}
                onClick={toggleMic}
                title="Voice input (coming soon)"
              >
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="18" height="18">
                  <rect x="9" y="2" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="2"/>
                  <path d="M5 10a7 7 0 0 0 14 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="9" y1="21" x2="15" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                {micActive && <span className="mic-pulse" />}
              </button>
              <button type="submit" className="send-btn" disabled={!input.trim()} title="Send">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="18" height="18">
                  <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
          <p className="input-hint">Press <kbd>Enter</kbd> to send · <kbd>Shift+Enter</kbd> for new line</p>
        </form>

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
      </main>

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
            <h2 className="modal-title">About <span className="gradient-text">AI Study Planner</span></h2>
            <p className="modal-body">
              Sample text.
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
