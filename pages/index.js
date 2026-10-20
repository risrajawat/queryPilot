import { useEffect, useRef, useState } from 'react';

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
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sqlPreview, setSqlPreview] = useState(null);
  const conversationEndRef = useRef(null);

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

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

  const healthLabel = {
    checking: 'Checking connection',
    online: 'All systems operational',
    offline: 'Connection unavailable',
  }[health];

  const sendMessage = async (text = input) => {
    const content = text.trim();
    if (!content || loading) return;

    setError('');
    setInput('');
    setMessages((current) => [...current, { role: 'user', content }]);
    setLoading(true);

    try {
      let id = conversationId;
      if (!id) {
        const startResponse = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        if (!startResponse.ok) throw new Error('Unable to start a conversation');
        const started = await startResponse.json();
        id = started.id || started.conversationId || started.conversation?.id;
        if (!id) throw new Error('The conversation response did not include an id');
        setConversationId(id);
      }

      const response = await fetch(`/api/conversations/${encodeURIComponent(id)}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, message: content }),
      });
      if (!response.ok) throw new Error('Unable to send your question');
      const payload = await response.json();
      const conversationMessages = payload.conversation?.messages || [];
      const assistant = payload.assistant || payload.response
        || (payload.clarification?.pending && conversationMessages.filter((message) => message.role === 'assistant').pop())
        || payload.message || null;
      const assistantText = typeof assistant === 'string'
        ? assistant
        : assistant?.content || assistant?.text || assistant?.answer;
      const clarification = payload.clarification || assistant?.clarification;
      const choices = clarification?.choices || payload.choices || assistant?.choices;
      const clarificationText = clarification?.question || payload.clarificationQuestion;

      if (assistantText || clarificationText) {
        setMessages((current) => [...current, {
          role: 'assistant',
          content: assistantText || clarificationText,
          clarification: assistantText && assistantText !== clarificationText ? clarificationText : '',
          choices: Array.isArray(choices) ? choices : [],
        }]);
      }

      const intent = payload.intent || assistant?.intent;
      const isClearIntent = intent?.status === 'clear' && !clarification?.pending;
      if (isClearIntent) {
        setSqlPreview({ status: 'generating', sql: '' });
        try {
          const sqlResponse = await fetch(`/api/conversations/${encodeURIComponent(id)}/sql`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: content,
              intent,
              resolvedContext: payload.resolvedContext,
            }),
          });
          if (!sqlResponse.ok) throw new Error('Unable to generate SQL preview');
          const sqlPayload = await sqlResponse.json();
          const generatedSql = sqlPayload.sql
            || sqlPayload.generatedSql
            || sqlPayload.query
            || sqlPayload.result?.sql;
          if (!generatedSql) throw new Error('The SQL response did not include a query');
          setSqlPreview({ status: 'validated', sql: generatedSql });
        } catch (sqlError) {
          const message = sqlError.message || 'SQL preview unavailable';
          setSqlPreview({ status: 'error', sql: '', error: message });
          setError(`SQL preview unavailable: ${message}`);
        }
      }
    } catch (requestError) {
      setError(requestError.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const startNewConversation = () => {
    if (loading) return;
    setConversationId(null);
    setMessages([]);
    setInput('');
    setError('');
    setSqlPreview(null);
  };

  return (
    <main className="app-shell min-h-screen bg-[#fbfcfb]">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">Q</div>
          <span>QueryPilot</span>
        </div>

        <div className="sidebar-content">
          <button className="new-query" type="button" onClick={startNewConversation}>
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
            <span className="query-label">{conversationId ? 'Conversation' : 'New conversation'}</span>
            </div>
            <textarea
              aria-label="Query input"
              className="query-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Ask anything about your data..."
              rows={3}
            />
            <div className="query-card-bottom">
              <span className="input-hint">{loading ? 'Thinking...' : 'Press Enter to send · Shift + Enter for a new line'}</span>
              <button className="send-button" type="button" disabled={!input.trim() || loading} onClick={() => sendMessage()} aria-label="Send query">
                <span>{loading ? 'Sending' : 'Send'}</span>
                <span aria-hidden="true">↑</span>
              </button>
            </div>
          </div>

          {error && <p className="request-error" role="alert">{error}</p>}

          {messages.length > 0 && (
            <section className="conversation" aria-label="Conversation">
              {messages.map((message, index) => (
                <div className={`message-row ${message.role}`} key={`${message.role}-${index}`}>
                  <div className="message-bubble">
                    <span className="message-role">{message.role === 'user' ? 'You' : 'QueryPilot'}</span>
                    <p>{message.content}</p>
                    {message.clarification && <p className="clarification-question">{message.clarification}</p>}
                    {message.choices?.length > 0 && (
                      <div className="choice-list">
                        {message.choices.map((choice) => {
                          const label = typeof choice === 'string' ? choice : choice.label || choice.text || choice.value;
                          return <button key={label} type="button" onClick={() => sendMessage(label)} disabled={loading}>{label}</button>;
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && <div className="message-row assistant"><div className="message-bubble typing" aria-live="polite">QueryPilot is thinking…</div></div>}
            </section>
          )}

          {sqlPreview && (
            <section className={`sql-preview ${sqlPreview.status}`} aria-label="Development SQL preview">
              <div className="sql-preview-heading">
                <span>Development SQL preview</span>
                {sqlPreview.status === 'validated' && <strong>Validated ✓</strong>}
                {sqlPreview.status === 'generating' && <strong>Generating…</strong>}
                {sqlPreview.status === 'error' && <strong>Unavailable</strong>}
              </div>
              {sqlPreview.status === 'error'
                ? <p className="sql-preview-error">{sqlPreview.error}</p>
                : <pre>{sqlPreview.sql || 'Preparing read-only SQL…'}</pre>}
              <p className="sql-preview-note">Preview only · SQL is not executed</p>
            </section>
          )}

          <div ref={conversationEndRef} aria-hidden="true" />

          <section className="suggestions" aria-labelledby="suggestion-title">
            <div className="section-heading">
              <h2 id="suggestion-title">Try asking</h2>
              <span>Sample prompts</span>
            </div>
            <div className="suggestion-grid">
              {suggestions.map((suggestion) => (
                <button className="suggestion-card" type="button" key={suggestion.prompt} onClick={() => setInput(suggestion.prompt)}>
                  <div className="suggestion-icon" aria-hidden="true">{suggestion.icon}</div>
                  <div>
                    <p className="suggestion-eyebrow">{suggestion.eyebrow}</p>
                    <p className="suggestion-prompt">{suggestion.prompt}</p>
                  </div>
                  <span className="suggestion-arrow" aria-hidden="true">↗</span>
                </button>
              ))}
            </div>
          </section>

          <div className={`empty-note ${messages.length ? 'has-messages' : ''}`}>
            <span className="empty-note-icon" aria-hidden="true">✦</span>
            <span>Your conversations will appear here once you start exploring.</span>
          </div>
        </div>
      </section>
    </main>
  );
}
