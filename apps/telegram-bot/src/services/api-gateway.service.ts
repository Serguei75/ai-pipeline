import { config } from '../config.js';

type RequestOptions = Omit<RequestInit, 'headers'> & { headers?: Record<string, string> };

export class ApiGatewayService {
  private readonly base = config.API_GATEWAY_URL;

  private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const response = await fetch(`${this.base}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Gateway ${response.status} ${path}: ${text}`);
    }

    return response.json() as Promise<T>;
  }

  // ---- Topics ----
  getTopics(params: { status?: string; perPage?: number } = {}): Promise<any[]> {
    const q = new URLSearchParams();
    if (params.status) q.set('status', params.status);
    if (params.perPage) q.set('perPage', String(params.perPage));
    return this.request<{ data: any[] }>(`/topics?${q}`).then((r) => r.data ?? []);
  }

  getTopic(id: string): Promise<any> {
    return this.request(`/topics/${id}`);
  }

  async approveTopic(id: string): Promise<void> {
    await this.request(`/topics/${id}/approve`, { method: 'POST' });
  }

  async rejectTopic(id: string): Promise<void> {
    await this.request(`/topics/${id}/reject`, { method: 'POST' });
  }

  // ---- Scripts ----
  getScripts(params: { status?: string; perPage?: number } = {}): Promise<any[]> {
    const q = new URLSearchParams();
    if (params.status) q.set('status', params.status);
    if (params.perPage) q.set('perPage', String(params.perPage));
    return this.request<{ data: any[] }>(`/scripts?${q}`).then((r) => r.data ?? []);
  }

  getScript(id: string): Promise<any> {
    return this.request(`/scripts/${id}`);
  }

  async approveScript(id: string): Promise<void> {
    await this.request(`/scripts/${id}/approve`, { method: 'POST' });
  }

  async rejectScript(id: string): Promise<void> {
    await this.request(`/scripts/${id}/reject`, { method: 'POST' });
  }

  // ---- Analytics ----
  getDashboard(): Promise<any> {
    return this.request('/analytics/channels/dashboard');
  }

  // ---- Health ----
  getHealth(): Promise<any> {
    return this.request('/health/all');
  }
}
