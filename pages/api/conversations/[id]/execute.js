import { getSession } from '../../../../src/lib/conversation/session-store.js';
import { generateSql } from '../../../../src/lib/sql/generator.js';
import { validateSql } from '../../../../src/lib/sql/validator.js';
import { executeSql } from '../../../../src/lib/sql/executor.js';

export default function handler(request, response) {
  if (request.method !== 'POST') { response.setHeader('Allow', 'POST'); return response.status(405).json({ error: 'Method not allowed' }); }

  const session = getSession(request.query.id);
  if (!session) return response.status(404).json({ error: 'Conversation not found' });
  if (session.clarification?.pending) return response.status(409).json({ error: 'Clarification is pending', clarification: session.clarification });
  if (!session.schema || !session.currentIntent || session.currentIntent.ambiguous || session.currentIntent.status === 'ambiguous') {
    return response.status(409).json({ error: 'Conversation intent is unresolved' });
  }

  const generated = generateSql(session.currentIntent, session.schema, { ...session.resolvedContext, messages: session.messages });
  if (!generated.success) return response.status(422).json(generated);
  const validation = validateSql(generated.sql, session.schema);
  if (!validation.valid) return response.status(422).json({ success: false, reason: 'sql_validation_failed', validation, generated });

  const result = executeSql(generated.sql, generated.parameters, session.schema);
  if (!result.success) return response.status(422).json({ ...result, generated, validation });
  return response.status(200).json({ ...result, intent: session.currentIntent, sql: generated.sql, parameters: generated.parameters, explanation: generated.explanation, validation });
}
