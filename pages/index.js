import { useEffect, useRef, useState } from 'react';
import { createTurn, finishTurn, normalizeChoice, resolveTurn, updateTurn } from '../src/lib/ui/turns.js';

const suggestions = [
  { eyebrow: 'Revenue', prompt: 'What were our top-selling products last month?', icon: '↗' },
  { eyebrow: 'Customers', prompt: 'Show me our most valuable customer segments', icon: '◌' },
  { eyebrow: 'Inventory', prompt: 'Which products are running low on stock?', icon: '▤' },
];

function getAssistant(payload) {
  const conversationMessages = payload.conversation?.messages || [];
  const assistant = payload.assistant || payload.response
    || (payload.clarification?.pending && conversationMessages.filter((message) => message.role === 'assistant').pop())
    || payload.message || null;
  return typeof assistant === 'string' ? assistant : assistant?.content || assistant?.text || assistant?.answer || '';
}

function Results({ results }) {
  if (!results) return null;
  return <section className="results-panel" aria-label="Query results">
    <div className="results-heading"><span>Query results</span><strong>{results.rowCount} {results.rowCount === 1 ? 'row' : 'rows'}</strong></div>
    {results.rowCount === 0 ? <p className="no-results">No results found.</p> : <div className="results-table-wrap">
      <table className="results-table"><thead><tr>{results.columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
        <tbody>{results.rows.map((row, rowIndex) => <tr key={rowIndex}>{results.columns.map((column, columnIndex) => {
          const value = Array.isArray(row) ? row[columnIndex] : row?.[column];
          return <td key={`${rowIndex}-${column}`}>{value !== null && typeof value === 'object' ? JSON.stringify(value) : String(value ?? '—')}</td>;
        })}</tr>)}</tbody>
      </table>
    </div>}
  </section>;
}

function SqlPreview({ preview }) {
  if (!preview) return null;
  const failed = preview.status === 'error' || preview.status === 'execution-error';
  return <section className={`sql-preview ${preview.status}`} aria-label="Development SQL preview">
    <div className="sql-preview-heading"><span>Development SQL preview</span>
      {preview.status === 'generating' && <strong>Generating…</strong>}
      {preview.status === 'error' && <strong>Unavailable</strong>}
      {['generated', 'validated', 'executed', 'execution-error'].includes(preview.status) && <span className="sql-status-track">
        <strong className="complete">Generated ✓</strong><strong className={preview.status === 'generated' ? 'current' : 'complete'}>{preview.status === 'generated' ? 'Validating…' : 'Validated ✓'}</strong>
        <strong className={preview.status === 'execution-error' ? 'failed' : preview.status === 'executed' ? 'complete' : ''}>{preview.status === 'execution-error' ? 'Execution failed' : preview.status === 'executed' ? 'Executed ✓' : 'Executing…'}</strong>
      </span>}
    </div>
    {failed ? <p className="sql-preview-error">{preview.error}</p> : <pre>{preview.sql || 'Preparing read-only SQL…'}</pre>}
    <p className="sql-preview-note">Read-only SQL · generated and executed securely on the server</p>
  </section>;
}

export default function Home() {
  const [health, setHealth] = useState('checking');
  const [conversationId, setConversationId] = useState(null);
  const [turns, setTurns] = useState([]);
  const [input, setInput] = useState('');
  const [inputLoading, setInputLoading] = useState(false);
  const inFlight = useRef(false);
  const conversationEndRef = useRef(null);

  useEffect(() => {
    let active = true;
    fetch('/api/health').then((response) => { if (!response.ok) throw new Error(); return response.json(); })
      .then((payload) => { if (active) setHealth(payload.status === 'ok' ? 'online' : 'offline'); })
      .catch(() => { if (active) setHealth('offline'); });
    return () => { active = false; };
  }, []);

  useEffect(() => { conversationEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [turns]);

  const setTurn = (id, patch) => setTurns((current) => updateTurn(current, id, typeof patch === 'function' ? patch(current.find((turn) => turn.id === id)) : patch));
  const sendMessage = async (text = input, resolvedTurnId = null) => {
    const content = text.trim();
    if (!content || inFlight.current) return;
    inFlight.current = true;
    setInput(''); setInputLoading(true);
    const pendingTurn = [...turns].reverse().find((turn) => turn.choices.length > 0);
    const inferredResolvedTurnId = pendingTurn?.choices.some((choice) => {
      const normalized = normalizeChoice(choice);
      return normalized.label.toLowerCase() === content.toLowerCase() || normalized.value.toLowerCase() === content.toLowerCase();
    })
      ? pendingTurn.id
      : null;
    const clarificationTurnId = resolvedTurnId || inferredResolvedTurnId;
    if (clarificationTurnId) setTurns((current) => resolveTurn(current, clarificationTurnId));
    const turn = createTurn(content);
    setTurns((current) => [...current, turn]);
    try {
      let id = conversationId;
      if (!id) {
        const startResponse = await fetch('/api/conversations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
        if (!startResponse.ok) throw new Error('Unable to start a conversation');
        const started = await startResponse.json();
        id = started.id || started.conversationId || started.conversation?.id;
        if (!id) throw new Error('The conversation response did not include an id');
        setConversationId(id);
      }
      const response = await fetch(`/api/conversations/${encodeURIComponent(id)}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content, message: content }) });
      if (!response.ok) throw new Error('Unable to send your question');
      const payload = await response.json();
      const assistant = getAssistant(payload);
      const clarification = payload.clarification || {};
      const choices = (Array.isArray(clarification.choices) ? clarification.choices : Array.isArray(payload.choices) ? payload.choices : []).map(normalizeChoice).filter(({ label }) => label);
      setTurn(turn.id, { assistant: assistant || clarification.question || '', clarification: assistant && clarification.question && assistant !== clarification.question ? clarification.question : '', choices });

      const intent = payload.intent;
      if (intent?.status === 'clear' && !clarification.pending) {
        setTurn(turn.id, { sqlPreview: { status: 'generating', sql: '' }, stage: 'Generating SQL' });
        let executionStarted = false;
        try {
          const sqlResponse = await fetch(`/api/conversations/${encodeURIComponent(id)}/sql`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: content, intent, resolvedContext: payload.resolvedContext }) });
          if (!sqlResponse.ok) throw new Error('Unable to generate SQL preview');
          const sqlPayload = await sqlResponse.json();
          const generatedSql = sqlPayload.sql || sqlPayload.generatedSql || sqlPayload.query || sqlPayload.result?.sql;
          if (!generatedSql) throw new Error('The SQL response did not include a query');
          setTurn(turn.id, { sqlPreview: { status: 'validated', sql: generatedSql }, stage: 'Executing query' });
          executionStarted = true;
          const executeResponse = await fetch(`/api/conversations/${encodeURIComponent(id)}/execute`, { method: 'POST' });
          const executePayload = await executeResponse.json().catch(() => ({}));
          if (!executeResponse.ok || executePayload.success === false) throw new Error(executePayload.error || 'The query could not be executed.');
          setTurn(turn.id, { results: { columns: Array.isArray(executePayload.columns) ? executePayload.columns : [], rows: Array.isArray(executePayload.rows) ? executePayload.rows : [], rowCount: Number.isFinite(executePayload.rowCount) ? executePayload.rowCount : 0 }, sqlPreview: { status: 'executed', sql: executePayload.sql || generatedSql } });
        } catch (sqlError) {
          const message = sqlError.message || 'SQL preview unavailable';
          setTurn(turn.id, (current) => ({ sqlPreview: { status: executionStarted ? 'execution-error' : 'error', sql: current.sqlPreview?.sql || '', error: message }, error: `${executionStarted ? 'Query execution failed' : 'SQL preview unavailable'}: ${message}` }));
        }
      }
    } catch (requestError) { setTurn(turn.id, { error: requestError.message || 'Something went wrong. Please try again.' }); }
    finally { setTurns((current) => finishTurn(current, turn.id)); inFlight.current = false; setInputLoading(false); }
  };

  const startNewConversation = () => { if (inFlight.current) return; setConversationId(null); setTurns([]); setInput(''); };
  const healthLabel = { checking: 'Checking connection', online: 'All systems operational', offline: 'Connection unavailable' }[health];
  return <main className="app-shell min-h-screen bg-[#fbfcfb]">
    <aside className="sidebar"><div className="brand"><div className="brand-mark" aria-hidden="true">Q</div><span>QueryPilot</span></div><div className="sidebar-content"><button className="new-query" type="button" onClick={startNewConversation}><span>+</span>New query</button><div className="sidebar-section"><p className="sidebar-label">Workspace</p><div className="workspace-card"><span className="workspace-icon">◈</span><span><strong>Commerce</strong><small>SQLite database</small></span><span className="chevron">⌄</span></div></div></div><div className="sidebar-footer"><div className="status-row"><span className={`status-dot ${health}`} /><span>{healthLabel}</span></div><p className="version">QueryPilot <span>v0.1</span></p></div></aside>
    <section className="main-panel"><header className="topbar"><div className="mobile-brand brand"><div className="brand-mark">Q</div><span>QueryPilot</span></div><div className="topbar-context"><span className="context-dot" />Commerce workspace</div><button className="avatar" type="button" disabled>JD</button></header>
      <div className="content-wrap"><div className="hero"><p className="kicker">Your data, made clear</p><h1>What would you like<br className="desktop-break" /> to know?</h1><p className="hero-copy">Ask questions in plain English and get closer to the insight behind your data.</p></div>
        <div className="query-card"><div className="query-card-top"><span className="query-icon">⌕</span><span className="query-label">{conversationId ? 'Conversation' : 'New conversation'}</span></div><textarea aria-label="Query input" className="query-input" value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendMessage(); } }} placeholder="Ask anything about your data..." rows={3} /><div className="query-card-bottom"><span className="input-hint">{inputLoading ? 'Working…' : 'Press Enter to send · Shift + Enter for a new line'}</span><button className="send-button" type="button" disabled={!input.trim() || inputLoading} onClick={() => sendMessage()}><span>{inputLoading ? 'Working' : 'Send'}</span><span>↑</span></button></div></div>
        {turns.length > 0 && <section className="conversation" aria-label="Conversation">{turns.map((turn) => <article className="turn" key={turn.id}><div className="message-row user"><div className="message-bubble"><span className="message-role">You</span><p>{turn.userMessage}</p></div></div><div className="message-row assistant"><div className="message-bubble"><span className="message-role">QueryPilot</span>{turn.assistant ? <p>{turn.assistant}</p> : turn.loading ? <p className="typing" aria-live="polite">QueryPilot is thinking…</p> : turn.error ? <p>I couldn’t complete that query.</p> : turn.results ? <p>Here are the results.</p> : null}{turn.clarification && <p className="clarification-question">{turn.clarification}</p>}{turn.choices.length > 0 && <div className="choice-list">{turn.choices.map((choice) => <button key={`${turn.id}-${choice.value}`} type="button" onClick={() => sendMessage(choice.value)} disabled={inputLoading}>{choice.label}</button>)}</div>}</div></div>{turn.error && <p className="request-error" role="alert">{turn.error}</p>}<SqlPreview preview={turn.sqlPreview} /><Results results={turn.results} /></article>)}</section>}
        <div ref={conversationEndRef} aria-hidden="true" />
        <section className="suggestions" aria-labelledby="suggestion-title"><div className="section-heading"><h2 id="suggestion-title">Try asking</h2><span>Sample prompts</span></div><div className="suggestion-grid">{suggestions.map((suggestion) => <button className="suggestion-card" type="button" key={suggestion.prompt} onClick={() => setInput(suggestion.prompt)}><div className="suggestion-icon">{suggestion.icon}</div><div><p className="suggestion-eyebrow">{suggestion.eyebrow}</p><p className="suggestion-prompt">{suggestion.prompt}</p></div><span className="suggestion-arrow">↗</span></button>)}</div></section>
        <div className={`empty-note ${turns.length ? 'has-messages' : ''}`}><span className="empty-note-icon">✦</span><span>Your conversations will appear here once you start exploring.</span></div>
      </div></section>
  </main>;
}
