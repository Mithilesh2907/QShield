const API_BASE = 'http://localhost:8000';

export async function sendAssistantQuery(query) {
  const response = await fetch(`${API_BASE}/ai-chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data.response || data.detail || 'AI chat failed';
    throw new Error(message);
  }

  return {
    response: data.response || '',
    provider: data.provider || 'ollama',
    model: data.model || null,
  };
}
