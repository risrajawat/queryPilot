import { useEffect, useState } from 'react';

const suggestions = [
  {
    eyebrow: 'Revenue',
    prompt: 'What were our top-selling products last month?',
    icon: '↗',
  },
  {
    eyebrow: 'Customers',
    prompt: 'Show me our most valuable customer segments',
    icon: '◌',
  },
  {
    eyebrow: 'Inventory',
    prompt: 'Which products are running low on stock?',
    icon: '▤',
  },
];

export default function Home() {
  const [health, setHealth] = useState('checking');

  useEffect(() => {
    let active = true;

    fetch('/api/health')
      .then((response) => {
        if (!response.ok) throw new Error('Health check failed');
        return response.json();
      })
      .then((payload) => {
        if (active) setHealth(payload.status === 'ok' ? 'online' : 'offline');
      })
      .catch(() => {
        if (active) setHealth('offline');
      });

    return () => {
      active = false;
    };
  }, []);

  const healthLabel = {
    checking: 'Checking connection',
    online: 'All systems operational',
    offline: 'Connection unavailable',
  }[health];

  return (
    <main className="app-shell min-h-screen bg-[#fbfcfb]">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">Q</div>
          <span>QueryPilot</span>
        </div>

        <div className="sidebar-content">
          <button className="new-query" type="button" disabled>
            <span aria-hidden="true">+</span>
            New query
          </button>

          <div className="sidebar-section">
            <p className="sidebar-label">Workspace</p>
            <div className="workspace-card">
              <span className="workspace-icon" aria-hidden="true">◈</span>
              <span>
                <strong>Commerce</strong>
                <small>SQLite database</small>
              </span>
              <span className="chevron" aria-hidden="true">⌄</span>
            </div>
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="status-row">
            <span className={`status-dot ${health}`} aria-hidden="true" />
            <span>{healthLabel}</span>
          </div>
          <p className="version">QueryPilot <span>v0.1</span></p>
        </div>
      </aside>

      <section className="main-panel">
        <header className="topbar">
          <div className="mobile-brand brand">
            <div className="brand-mark" aria-hidden="true">Q</div>
            <span>QueryPilot</span>
          </div>
          <div className="topbar-context">
            <span className="context-dot" aria-hidden="true" />
            <span>Commerce workspace</span>
          </div>
          <button className="avatar" type="button" aria-label="Account menu" disabled>JD</button>
        </header>

        <div className="content-wrap">
          <div className="hero">
            <p className="kicker">Your data, made clear</p>
            <h1>What would you like<br className="desktop-break" /> to know?</h1>
            <p className="hero-copy">Ask questions in plain English and get closer to the insight behind your data.</p>
          </div>

          <div className="query-card">
            <div className="query-card-top">
              <span className="query-icon" aria-hidden="true">⌕</span>
              <span className="query-label">New conversation</span>
              <span className="coming-soon">Coming soon</span>
            </div>
            <textarea
              aria-label="Query input"
              className="query-input"
              disabled
              placeholder="Ask anything about your data..."
              rows={3}
            />
            <div className="query-card-bottom">
              <span className="input-hint">Natural language queries will be available here.</span>
              <button className="send-button" type="button" disabled aria-label="Send query">
                <span>Send</span>
                <span aria-hidden="true">↑</span>
              </button>
            </div>
          </div>

          <section className="suggestions" aria-labelledby="suggestion-title">
            <div className="section-heading">
              <h2 id="suggestion-title">Try asking</h2>
              <span>Sample prompts</span>
            </div>
            <div className="suggestion-grid">
              {suggestions.map((suggestion) => (
                <div className="suggestion-card" key={suggestion.prompt}>
                  <div className="suggestion-icon" aria-hidden="true">{suggestion.icon}</div>
                  <div>
                    <p className="suggestion-eyebrow">{suggestion.eyebrow}</p>
                    <p className="suggestion-prompt">{suggestion.prompt}</p>
                  </div>
                  <span className="suggestion-arrow" aria-hidden="true">↗</span>
                </div>
              ))}
            </div>
          </section>

          <div className="empty-note">
            <span className="empty-note-icon" aria-hidden="true">✦</span>
            <span>Your conversations will appear here once you start exploring.</span>
          </div>
        </div>
      </section>
    </main>
  );
}
