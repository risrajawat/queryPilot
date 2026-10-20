import { getSession, updateSession } from '../../../../src/lib/conversation/session-store.js';
import { processMessage } from '../../../../src/lib/conversation/engine.js';

export default function handler(request, response) {
  if (request.method !== 'POST') { response.setHeader('Allow', 'POST'); return response.status(405).json({ error: 'Method not allowed' }); }
  const id = request.query.id;
  const message = typeof request.body?.message === 'string' ? request.body.message.trim() : '';
  if (!message) return response.status(400).json({ error: 'message is required' });
  const existing = getSession(id);
  if (!existing) return response.status(404).json({ error: 'Conversation not found' });
  const result = processMessage(existing, message);
  const conversation = updateSession(id, (session) => {
    session.messages.push({ role: 'user', content: message });
    if (result.clarification.pending) session.messages.push({ role: 'assistant', content: result.clarification.question, clarification: result.clarification });
    session.currentIntent = result.intent;
    session.clarification = result.clarification;
    session.resolvedContext = result.resolvedContext;
    return session;
  });
  return response.status(200).json({ conversation, intent: result.intent, clarification: result.clarification, clarificationQuestion: result.clarification.question, choices: result.clarification.choices, resolvedContext: result.resolvedContext });
}
