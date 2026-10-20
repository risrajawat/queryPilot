/** Provider contract: complete({ messages, schema }) returns a Promise<string>. */
export class DeterministicProvider {
  async complete() {
    return '';
  }
}

// Reserved adapter boundary. No credentials, network calls, or API behavior are invented here.
export class Gpt6AstraProvider {
  constructor({ apiKey = process.env.GPT6_ASTRA_API_KEY } = {}) {
    this.apiKeyConfigured = Boolean(apiKey);
  }

  async complete() {
    throw new Error('GPT-6 Astra provider adapter is not configured');
  }
}

export function getProvider() {
  return new DeterministicProvider();
}
