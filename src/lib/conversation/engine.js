import { analyzeIntent } from './intent-analysis.js';
import { clarificationFor, resolveClarification } from './clarification-engine.js';

export function processMessage(session, message) {
  const text = String(message || '').trim();
  let intent = resolveClarification(text, session.clarification) || analyzeIntent(text, {
    currentIntent: session.currentIntent,
    resolvedContext: session.resolvedContext,
    previousMessages: session.messages,
    schema: session.schema,
  });
  const clarification = clarificationFor(intent) || { pending: false, question: null, choices: [] };
  intent = { ...intent, status: clarification.pending ? 'ambiguous' : 'clear', ambiguities: clarification.pending ? ['ranking_metric'] : [], clarificationQuestion: clarification.pending ? clarification.question : null };
  const resolvedContext = { ...session.resolvedContext, ...(intent.subject ? { subject: intent.subject } : {}), ...(intent.metric ? { metric: intent.metric } : {}) };
  return { intent, clarification, resolvedContext };
}
