import axios from 'axios';

const api = axios.create({
  baseURL: process.env.API_GATEWAY_URL || 'http://localhost:3100',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Topics ───────────────────────────────────────────────────────────────────
export async function getPendingTopics() {
  const { data } = await api.get('/topics?status=PENDING&limit=10');
  return Array.isArray(data) ? data : (data.data ?? data.topics ?? []);
}

export async function approveTopic(id: string) {
  const { data } = await api.post(`/topics/${id}/approve`);
  return data;
}

export async function rejectTopic(id: string, reason?: string) {
  const { data } = await api.post(`/topics/${id}/reject`, { reason });
  return data;
}

// ─── Scripts ──────────────────────────────────────────────────────────────────
export async function getPendingScripts() {
  const { data } = await api.get('/scripts?status=PENDING&limit=10');
  return Array.isArray(data) ? data : (data.data ?? data.scripts ?? []);
}

export async function approveScript(id: string) {
  const { data } = await api.post(`/scripts/${id}/approve`);
  return data;
}

export async function rejectScript(id: string, reason?: string) {
  const { data } = await api.post(`/scripts/${id}/reject`, { reason });
  return data;
}

// ─── Community comments ───────────────────────────────────────────────────────
export async function getPendingCommentDrafts() {
  const { data } = await api.get('/community/drafts?status=PENDING&limit=5');
  return Array.isArray(data) ? data : (data.data ?? data.drafts ?? []);
}

export async function approveCommentDraft(id: string) {
  const { data } = await api.post(`/community/drafts/${id}/approve`);
  return data;
}

// ─── Health & Stats ───────────────────────────────────────────────────────────
export async function getHealthAll() {
  const { data } = await api.get('/health/all');
  return data;
}

export async function getAnalyticsStats() {
  const { data } = await api.get('/analytics/stats');
  return data;
}

export async function getHookTesterStats() {
  const { data } = await api.get('/hook-tester/tests?limit=3');
  return Array.isArray(data) ? data : (data.data ?? []);
}
