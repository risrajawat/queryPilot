import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import {
  createTurn,
  finishTurn,
  formatRelativeTime,
  getChoiceMetadata,
  normalizeChoice,
  resolveTurn,
  updateTurn,
} from '../src/lib/ui/turns.js';

const suggestions = [
  { eyebrow: 'Revenue', prompt: 'Show me the best customers', icon: 'trending' },
  { eyebrow: 'Orders', prompt: 'Summarize our recent orders', icon: 'orders' },
  { eyebrow: 'Inventory', prompt: 'Which products have low stock quantity?', icon: 'inventory' },
];

function getAssistant(payload) {
  const conversationMessages = payload.conversation?.messages || [];
  const assistant =
    payload.assistant ||
    payload.response ||
    (payload.clarification?.pending &&
      conversationMessages.filter((message) => message.role === 'assistant').pop()) ||
    payload.message ||
    null;
  return typeof assistant === 'string' ? assistant : assistant?.content || assistant?.text || assistant?.answer || '';
}

/* SVG Icon Components */
function IconLogo() {
  return (
    <div className="brand-mark" aria-hidden="true">
      Q
    </div>
  );
}

function IconChat() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
  );
}

function IconDatabase() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
    </svg>
  );
}

function IconWorkspace() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  );
}

function IconFileText() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
      <polyline points="10 9 9 9 8 9"></polyline>
    </svg>
  );
}

function IconChevronDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  );
}

function IconSend() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"></line>
      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
    </svg>
  );
}

function IconCopy() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  );
}

function IconTable() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="3" y1="9" x2="21" y2="9"></line>
      <line x1="3" y1="15" x2="21" y2="15"></line>
      <line x1="9" y1="3" x2="9" y2="21"></line>
      <line x1="15" y1="3" x2="15" y2="21"></line>
    </svg>
  );
}

function IconCode() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6"></polyline>
      <polyline points="8 6 2 12 8 18"></polyline>
    </svg>
  );
}

function IconLightbulb() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6"></path>
      <path d="M10 22h4"></path>
      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"></path>
    </svg>
  );
}

function IconBarChart() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"></line>
      <line x1="12" y1="20" x2="12" y2="4"></line>
      <line x1="6" y1="20" x2="6" y2="14"></line>
    </svg>
  );
}

function IconCart() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1"></circle>
      <circle cx="20" cy="21" r="1"></circle>
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
    </svg>
  );
}

function IconClock() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 6 12 12 16 14"></polyline>
    </svg>
  );
}

function IconSparkle() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path>
    </svg>
  );
}

function getIconByChoiceKey(iconKey) {
  if (iconKey === 'bar_chart') return <IconBarChart />;
  if (iconKey === 'shopping_cart') return <IconCart />;
  if (iconKey === 'clock') return <IconClock />;
  return <IconSparkle />;
}

/* Results Component */
function ResultsCard({ results }) {
  if (!results) return null;
  return (
    <section className="result-card-container" aria-label="Query results">
      <div className="result-card-header">
        <div className="result-card-title-wrap">
          <IconTable />
          <span>Query Results</span>
        </div>
        <span className="result-row-count-badge">
          {results.rowCount} {results.rowCount === 1 ? 'row' : 'rows'}
        </span>
      </div>
      {results.rowCount === 0 ? (
        <p className="no-results" style={{ padding: '24px 20px', margin: 0, color: 'var(--ink-muted)' }}>
          No results found.
        </p>
      ) : (
        <div className="result-table-scroll">
          <table className="result-data-table">
            <thead>
              <tr>
                {results.columns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {results.columns.map((column, columnIndex) => {
                    const value = Array.isArray(row) ? row[columnIndex] : row?.[column];
                    return (
                      <td key={`${rowIndex}-${column}`}>
                        {value !== null && typeof value === 'object'
                          ? JSON.stringify(value)
                          : String(value ?? '—')}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* SQL Preview Component */
function SqlCard({ preview, explanationStatus }) {
  const [copied, setCopied] = useState(false);
  if (!preview) return null;

  const failed = preview.status === 'error' || preview.status === 'execution-error';
  const handleCopy = () => {
    if (preview.sql) {
      navigator.clipboard.writeText(preview.sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <section className="sql-query-card" aria-label="Development SQL preview">
      <div className="sql-query-header">
        <div className="sql-title-wrap">
          <IconCode />
          <span>SQL Query</span>
          <span className="sql-readonly-tag">(Read-only)</span>
        </div>

        <div className="sql-status-pills">
          {preview.status === 'generating' && <span className="status-pill current">Generating…</span>}
          {preview.status === 'error' && <span className="status-pill error">Unavailable</span>}

          {['generated', 'validated', 'executed', 'execution-error'].includes(preview.status) && (
            <>
              <span className="status-pill success">Generated ✓</span>
              <span className={`status-pill ${preview.status === 'generated' ? 'current' : 'success'}`}>
                {preview.status === 'generated' ? 'Validating…' : 'Validated ✓'}
              </span>
              <span
                className={`status-pill ${
                  preview.status === 'execution-error'
                    ? 'error'
                    : preview.status === 'executed'
                    ? 'success'
                    : 'current'
                }`}
              >
                {preview.status === 'execution-error'
                  ? 'Execution failed'
                  : preview.status === 'executed'
                  ? 'Executed ✓'
                  : 'Executing…'}
              </span>
              {preview.status === 'executed' && (
                <span
                  className={`status-pill ${
                    explanationStatus === 'complete'
                      ? 'success'
                      : explanationStatus === 'error'
                      ? 'error'
                      : 'current'
                  }`}
                >
                  {explanationStatus === 'complete'
                    ? 'Explained ✓'
                    : explanationStatus === 'error'
                    ? 'Explanation unavailable'
                    : 'Explaining…'}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      <div className="sql-code-container">
        {failed ? (
          <p className="sql-preview-error" style={{ color: 'var(--red-error)', margin: 0, fontSize: '13px' }}>
            {preview.error}
          </p>
        ) : (
          <>
            <pre className="sql-code-block">{preview.sql || 'Preparing read-only SQL…'}</pre>
            {preview.sql && (
              <button
                type="button"
                className="copy-sql-btn"
                onClick={handleCopy}
                title="Copy SQL to clipboard"
              >
                {copied ? <IconCheck /> : <IconCopy />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            )}
          </>
        )}
      </div>
    </section>
  );
}

export default function Home() {
  const [health, setHealth] = useState({ status: 'checking', provider: 'sqlite' });
  const [conversationId, setConversationId] = useState(null);
  const [turns, setTurns] = useState([]);
  const [input, setInput] = useState('');
  const [inputLoading, setInputLoading] = useState(false);
  const [view, setView] = useState('chat');
  const [recentConversations, setRecentConversations] = useState([]);
  const [recentCollapsed, setRecentCollapsed] = useState(false);
  const [explorer, setExplorer] = useState({ loading: false, error: '', tables: [], selected: null });
  const inFlight = useRef(false);
  const chatScrollAreaRef = useRef(null);
  const textareaRef = useRef(null);

  // Load health and initial recent conversations
  useEffect(() => {
    let active = true;
    fetch('/api/health')
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((payload) => {
        if (active) {
          setHealth({
            status: payload.status === 'ok' ? 'online' : 'offline',
            provider: payload.provider || 'sqlite',
          });
        }
      })
      .catch(() => {
        if (active) setHealth({ status: 'offline', provider: 'sqlite' });
      });

    // Load recent conversations from localStorage
    try {
      const stored = localStorage.getItem('querypilot_recent_queries');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setRecentConversations(parsed);
      }
    } catch (_e) {}

    return () => {
      active = false;
    };
  }, []);

  // Save conversation state to recent list
  const persistConversation = (id, newTurns, firstUserMessage) => {
    if (!id || !newTurns.length) return;
    setRecentConversations((prev) => {
      const existingIdx = prev.findIndex((c) => c.id === id);
      const title =
        firstUserMessage && firstUserMessage.length > 36
          ? firstUserMessage.slice(0, 34) + '…'
          : firstUserMessage || 'Query conversation';

      const entry = {
        id,
        title: existingIdx >= 0 ? prev[existingIdx].title : title,
        updatedAt: Date.now(),
        turns: newTurns,
      };

      const updated = existingIdx >= 0
        ? [entry, ...prev.filter((c) => c.id !== id)]
        : [entry, ...prev.slice(0, 19)];

      try {
        localStorage.setItem('querypilot_recent_queries', JSON.stringify(updated));
      } catch (_e) {}
      return updated;
    });
  };

  // Scroll to bottom when turns update
  useEffect(() => {
    const area = chatScrollAreaRef.current;
    if (area) {
      setTimeout(() => {
        area.scrollTo({ top: area.scrollHeight, behavior: 'smooth' });
      }, 50);
    }
  }, [turns]);

  // Auto-resize textarea
  const handleTextareaInput = (e) => {
    setInput(e.target.value);
    const target = e.target;
    target.style.height = 'auto';
    target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
  };

  const setTurn = (id, patch) =>
    setTurns((current) =>
      updateTurn(current, id, typeof patch === 'function' ? patch(current.find((t) => t.id === id)) : patch)
    );

  const sendMessage = async (text = input, resolvedTurnId = null) => {
    const content = text.trim();
    if (!content || inFlight.current) return;
    inFlight.current = true;
    setInput('');
    setInputLoading(true);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    const pendingTurn = [...turns].reverse().find((turn) => turn.choices.length > 0);
    const inferredResolvedTurnId = pendingTurn?.choices.some((choice) => {
      const normalized = normalizeChoice(choice);
      return (
        normalized.label.toLowerCase() === content.toLowerCase() ||
        normalized.value.toLowerCase() === content.toLowerCase()
      );
    })
      ? pendingTurn.id
      : null;

    const clarificationTurnId = resolvedTurnId || inferredResolvedTurnId;
    if (clarificationTurnId) {
      setTurns((current) => resolveTurn(current, clarificationTurnId));
    }

    const turn = createTurn(content);
    const nextTurns = [...turns, turn];
    setTurns(nextTurns);

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
      const assistant = getAssistant(payload);
      const clarification = payload.clarification || {};
      const choices = (
        Array.isArray(clarification.choices)
          ? clarification.choices
          : Array.isArray(payload.choices)
          ? payload.choices
          : []
      )
        .map(normalizeChoice)
        .filter(({ label }) => label);

      setTurn(turn.id, {
        assistant: assistant || clarification.question || '',
        clarification:
          assistant && clarification.question && assistant !== clarification.question
            ? clarification.question
            : '',
        choices,
      });

      const intent = payload.intent;
      if (intent?.status === 'clear' && !clarification.pending) {
        setTurn(turn.id, { sqlPreview: { status: 'generating', sql: '' }, stage: 'Generating SQL' });
        let executionStarted = false;
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
          const generatedSql =
            sqlPayload.sql || sqlPayload.generatedSql || sqlPayload.query || sqlPayload.result?.sql;
          if (!generatedSql) throw new Error('The SQL response did not include a query');

          setTurn(turn.id, { sqlPreview: { status: 'validated', sql: generatedSql }, stage: 'Executing query' });
          executionStarted = true;

          const executeResponse = await fetch(`/api/conversations/${encodeURIComponent(id)}/execute`, {
            method: 'POST',
          });
          const executePayload = await executeResponse.json().catch(() => ({}));
          if (!executeResponse.ok || executePayload.success === false) {
            throw new Error(executePayload.error || 'The query could not be executed.');
          }

          const verifiedResults = {
            columns: Array.isArray(executePayload.columns) ? executePayload.columns : [],
            rows: Array.isArray(executePayload.rows) ? executePayload.rows : [],
            rowCount: Number.isFinite(executePayload.rowCount) ? executePayload.rowCount : 0,
          };

          setTurn(turn.id, {
            results: verifiedResults,
            explanationStatus: 'generating',
            sqlPreview: { status: 'executed', sql: executePayload.sql || generatedSql },
          });

          const explanationResponse = await fetch(
            `/api/conversations/${encodeURIComponent(id)}/explain`,
            { method: 'POST' }
          );
          const explanationPayload = await explanationResponse.json().catch(() => ({}));
          if (!explanationResponse.ok || explanationPayload.success === false) {
            setTurn(turn.id, {
              explanationStatus: 'error',
              explanationError:
                'The query executed successfully, but an explanation could not be generated.',
            });
          } else {
            setTurn(turn.id, {
              explanation: explanationPayload.explanation || '',
              explanationStatus: 'complete',
            });
          }
        } catch (sqlError) {
          const message = sqlError.message || 'SQL preview unavailable';
          setTurn(turn.id, (current) => ({
            sqlPreview: {
              status: executionStarted ? 'execution-error' : 'error',
              sql: current.sqlPreview?.sql || '',
              error: message,
            },
            error: `${executionStarted ? 'Query execution failed' : 'SQL preview unavailable'}: ${message}`,
          }));
        }
      }

      // Persist conversation
      const firstMessage = nextTurns[0]?.userMessage || content;
      persistConversation(id, nextTurns, firstMessage);
    } catch (requestError) {
      setTurn(turn.id, {
        error: requestError.message || 'Something went wrong. Please try again.',
      });
    } finally {
      setTurns((current) => finishTurn(current, turn.id));
      inFlight.current = false;
      setInputLoading(false);
    }
  };

  const startNewConversation = () => {
    if (inFlight.current) return;
    setConversationId(null);
    setTurns([]);
    setInput('');
    setView('chat');
  };

  const loadConversation = (item) => {
    if (inFlight.current) return;
    setConversationId(item.id);
    setTurns(item.turns || []);
    setInput('');
    setView('chat');
  };

  const openExplorer = async (table = null) => {
    setView('explorer');
    setExplorer((current) => ({ ...current, loading: true, error: '' }));
    try {
      const response = await fetch(`/api/explorer${table ? `?table=${encodeURIComponent(table)}` : ''}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Unable to load database explorer');
      setExplorer({
        loading: false,
        error: '',
        tables: payload.tables || [],
        selected: payload.table ? payload : null,
      });
    } catch (error) {
      setExplorer((current) => ({ ...current, loading: false, error: error.message }));
    }
  };

  const returnToChat = () => setView('chat');

  const healthLabel = {
    checking: 'Checking connection',
    online: 'All systems operational',
    offline: 'Connection unavailable',
  }[health.status];

  const dbDisplayLabel = health.provider === 'turso' ? 'Turso database' : 'SQLite database';
  const dbBadgeLabel = health.provider === 'turso' ? 'Production DB' : 'SQLite';

  return (
    <>
      <Head>
        <title>QueryPilot — Agentic Text-to-SQL Assistant</title>
        <meta
          name="description"
          content="QueryPilot is an AI SQL agent that knows when it doesn't understand your question. Safe, read-only database query execution."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="app-shell">
        {/* Left Sidebar */}
        <aside className="sidebar">
          <div className="brand">
            <IconLogo />
            <div className="brand-info">
              <span className="brand-title">QueryPilot</span>
              <span className="brand-subtitle">AI for your data</span>
            </div>
          </div>

          <button className="new-query-btn" type="button" onClick={startNewConversation}>
            <IconPlus />
            <span>New query</span>
          </button>

          <nav className="sidebar-nav" aria-label="Main navigation">
            <button
              className={`nav-link ${view === 'chat' ? 'active' : ''}`}
              type="button"
              onClick={returnToChat}
            >
              <IconChat />
              <span>Chat</span>
            </button>
            <button
              className={`nav-link ${view === 'explorer' ? 'active' : ''}`}
              type="button"
              onClick={() => openExplorer()}
            >
              <IconDatabase />
              <span>Database Explorer</span>
            </button>
            <button className="nav-link" type="button" disabled style={{ opacity: 0.6 }}>
              <IconWorkspace />
              <span>Workspace</span>
            </button>
          </nav>

          {/* Recent Queries Section */}
          <div className="sidebar-section">
            <button
              className="sidebar-section-header"
              type="button"
              onClick={() => setRecentCollapsed(!recentCollapsed)}
            >
              <span className="sidebar-label">Recent Queries</span>
              <span className={`sidebar-chevron ${recentCollapsed ? 'collapsed' : ''}`}>
                <IconChevronDown />
              </span>
            </button>

            {!recentCollapsed && (
              <div className="recent-queries-list">
                {recentConversations.length === 0 ? (
                  <p className="no-recent-queries">No recent queries yet</p>
                ) : (
                  recentConversations.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`recent-query-item ${conversationId === item.id ? 'active' : ''}`}
                      onClick={() => loadConversation(item)}
                    >
                      <span className="recent-query-icon">
                        <IconFileText />
                      </span>
                      <div className="recent-query-details">
                        <span className="recent-query-title">{item.title}</span>
                        <span className="recent-query-time">{formatRelativeTime(item.updatedAt)}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Sidebar Footer with Database Status */}
          <div className="sidebar-footer">
            <div className="workspace-card">
              <div className="workspace-icon-wrap">
                <IconDatabase />
              </div>
              <div className="workspace-card-info">
                <span className="workspace-name">Commerce</span>
                <span className="workspace-meta">{dbDisplayLabel}</span>
                <span className="workspace-meta" style={{ fontSize: '10.5px', color: 'var(--ink-muted)' }}>
                  6 tables · 1.6K rows
                </span>
              </div>
            </div>

            <div className="status-row">
              <span className={`status-dot ${health.status}`} />
              <span>{healthLabel}</span>
            </div>
          </div>
        </aside>

        {/* Main Application Panel */}
        <section className="main-panel">
          {/* Topbar Header */}
          <header className="topbar">
            <div className="topbar-left">
              <div className="topbar-workspace-indicator">
                <span className="indicator-dot" />
                <span className="workspace-title">Commerce workspace</span>
              </div>
              <span className="workspace-tagline">· Ask questions about your business data</span>
            </div>

            <div className="topbar-right">
              <div className="db-pill">
                <IconDatabase />
                <span>{dbBadgeLabel}</span>
              </div>
              <div className="avatar-badge" title="User avatar">
                JD
              </div>
            </div>
          </header>

          {/* Main Content Area */}
          <div className="content-area">
            {view === 'explorer' ? (
              /* Database Explorer View */
              <div className="explorer-container">
                <div className="explorer-top-bar">
                  <div className="explorer-title-area">
                    <p className="hero-kicker">Workspace</p>
                    <h1>Database Explorer</h1>
                    <p>Browse safe, read-only previews of your commerce data.</p>
                  </div>
                  <button className="return-chat-btn" type="button" onClick={returnToChat}>
                    ← Return to chat
                  </button>
                </div>

                {explorer.error && (
                  <p className="request-error" role="alert" style={{ color: 'var(--red-error)' }}>
                    {explorer.error}
                  </p>
                )}

                {explorer.loading && !explorer.selected ? (
                  <div className="loading-indicator">
                    <div className="spinner" />
                    <span>Loading database tables…</span>
                  </div>
                ) : (
                  <div className="explorer-grid">
                    <nav className="explorer-tables-sidebar" aria-label="Database tables">
                      <div className="explorer-tables-header">Tables</div>
                      {explorer.tables.map((table) => (
                        <button
                          type="button"
                          className={`table-select-btn ${
                            explorer.selected?.table?.name === table.name ? 'active' : ''
                          }`}
                          key={table.name}
                          onClick={() => openExplorer(table.name)}
                        >
                          <span>{table.name}</span>
                          <span className="table-count-badge">{table.rowCount} rows</span>
                        </button>
                      ))}
                    </nav>

                    <div className="explorer-table-view">
                      {explorer.selected ? (
                        <>
                          <div className="explorer-table-header">
                            <span className="explorer-table-title">
                              {explorer.selected.table.name}
                            </span>
                            <span className="explorer-table-meta">
                              {explorer.selected.rowCount} total rows · showing up to{' '}
                              {explorer.selected.limit}
                            </span>
                          </div>
                          <div className="result-table-scroll">
                            <table className="result-data-table">
                              <thead>
                                <tr>
                                  {explorer.selected.columns.map((col) => (
                                    <th key={col}>{col}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {explorer.selected.rows.map((row, idx) => (
                                  <tr key={idx}>
                                    {explorer.selected.columns.map((col) => (
                                      <td key={col}>
                                        {row[col] !== null && typeof row[col] === 'object'
                                          ? JSON.stringify(row[col])
                                          : String(row[col] ?? '—')}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </>
                      ) : (
                        <div className="explorer-empty-placeholder">
                          Select a table to inspect its schema and rows.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Chat Conversation View */
              <>
                <div className="chat-scroll-area" ref={chatScrollAreaRef}>
                  <div className="chat-container">
                    {turns.length === 0 ? (
                      /* Empty State */
                      <div className="chat-hero">
                        <p className="hero-kicker">Your data, made clear</p>
                        <h1 className="hero-title">
                          What would you like
                          <br />
                          to know?
                        </h1>
                        <p className="hero-description">
                          Ask questions in plain English and get closer to the insight behind your
                          data. QueryPilot knows when questions are ambiguous and clarifies with you.
                        </p>

                        <section className="suggestions-section" aria-label="Suggested questions">
                          <div className="suggestions-heading">Try asking</div>
                          <div className="suggestions-grid">
                            {suggestions.map((item) => (
                              <button
                                key={item.prompt}
                                type="button"
                                className="suggestion-card"
                                onClick={() => sendMessage(item.prompt)}
                              >
                                <div className="suggestion-card-header">
                                  <span className="suggestion-eyebrow">{item.eyebrow}</span>
                                  <div className="suggestion-icon-wrap">
                                    <IconSparkle />
                                  </div>
                                </div>
                                <p className="suggestion-prompt">{item.prompt}</p>
                              </button>
                            ))}
                          </div>
                        </section>
                      </div>
                    ) : (
                      /* Chronological Message Flow */
                      <div className="conversation-turns">
                        {turns.map((turn) => (
                          <article className="turn-group" key={turn.id}>
                            {/* User Message */}
                            <div className="user-message-row">
                              <div className="user-bubble-container">
                                <div className="user-bubble">
                                  {turn.userMessage}
                                </div>
                                <span className="message-timestamp">
                                  {turn.timestamp}
                                </span>
                              </div>
                              <div className="avatar-badge" title="You">
                                JD
                              </div>
                            </div>

                            {/* QueryPilot Assistant Response */}
                            <div className="assistant-message-row">
                              <div className="assistant-avatar" title="QueryPilot">
                                Q
                              </div>
                              <div className="assistant-content">
                                <div className="assistant-header">
                                  <span className="assistant-name">QueryPilot</span>
                                  <span className="message-timestamp">{turn.timestamp}</span>
                                </div>

                                <div className="assistant-body">
                                  {turn.assistant ? (
                                    <p>{turn.assistant}</p>
                                  ) : turn.loading ? (
                                    <div className="loading-indicator">
                                      <div className="spinner" />
                                      <span>
                                        {turn.stage || 'QueryPilot is thinking…'}
                                      </span>
                                    </div>
                                  ) : turn.error ? (
                                    <p style={{ color: 'var(--red-error)' }}>
                                      {turn.error}
                                    </p>
                                  ) : null}
                                </div>

                                {/* Clarification Section */}
                                {turn.choices.length > 0 && (
                                  <div className="clarification-wrapper">
                                    <p className="clarification-subtext">
                                      There are a few different ways to look at this. Please choose one:
                                    </p>
                                    <div className="clarification-cards-grid">
                                      {turn.choices.map((choice) => {
                                        const meta = getChoiceMetadata(choice);
                                        return (
                                          <button
                                            key={`${turn.id}-${choice.value}`}
                                            type="button"
                                            className="clarification-card"
                                            onClick={() => sendMessage(choice.value, turn.id)}
                                            disabled={inputLoading}
                                          >
                                            <div className="clarification-card-icon">
                                              {getIconByChoiceKey(meta.icon)}
                                            </div>
                                            <span className="clarification-card-title">
                                              {meta.title}
                                            </span>
                                            <span className="clarification-card-desc">
                                              {meta.description}
                                            </span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Results Table */}
                                <ResultsCard results={turn.results} />

                                {/* SQL Preview Card */}
                                <SqlCard
                                  preview={turn.sqlPreview}
                                  explanationStatus={turn.explanationStatus}
                                />

                                {/* Explanation Card */}
                                {turn.explanation && (
                                  <div className="explanation-card">
                                    <div className="explanation-icon-wrap">
                                      <IconLightbulb />
                                    </div>
                                    <div className="explanation-content">
                                      <span className="explanation-title">Explanation</span>
                                      <p className="explanation-text">{turn.explanation}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Sticky Bottom Chat Composer */}
                <div className="composer-sticky-wrapper">
                  <div className="composer-card">
                    <div className="composer-top">
                      <div className="composer-icon">
                        <IconSparkle />
                      </div>
                      <textarea
                        ref={textareaRef}
                        aria-label="Ask a question about your data"
                        className="composer-textarea"
                        value={input}
                        onChange={handleTextareaInput}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                        placeholder="Ask anything about your data..."
                        rows={1}
                        disabled={inputLoading}
                      />
                      <button
                        className="send-action-btn"
                        type="button"
                        disabled={!input.trim() || inputLoading}
                        onClick={() => sendMessage()}
                        aria-label="Send query"
                      >
                        <IconSend />
                      </button>
                    </div>

                    <div className="composer-actions">
                      <span className="composer-hint">
                        {inputLoading
                          ? 'Processing query…'
                          : 'Press Enter to send · Shift + Enter for new line'}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
