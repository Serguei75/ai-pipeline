export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  meta?: Record<string, unknown>;
}

export interface JobResult {
  job_id: string;
  status: "pending" | "processing" | "done" | "failed";
  created_at: string;
  updated_at?: string;
  result_url?: string;
  error?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}
