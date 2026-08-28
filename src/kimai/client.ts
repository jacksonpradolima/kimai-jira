import {
  CreateTimesheetInput,
  KimaiActivity,
  KimaiProject,
  KimaiTimesheet,
  KimaiUser,
  StartTimerInput,
  UpdateTimesheetInput,
} from '../shared/types';
import { KimaiApiError } from '../shared/errors';

export interface KimaiClient {
  getCurrentUser(): Promise<KimaiUser>;
  getTimesheet(id: number): Promise<KimaiTimesheet>;
  createTimesheet(input: CreateTimesheetInput): Promise<KimaiTimesheet>;
  updateTimesheet(id: number, input: UpdateTimesheetInput): Promise<KimaiTimesheet>;
  deleteTimesheet(id: number): Promise<void>;
  startTimer(input: StartTimerInput): Promise<KimaiTimesheet>;
  stopTimer(id: number): Promise<KimaiTimesheet>;
  getProjects(): Promise<KimaiProject[]>;
  getActivities(projectId?: number): Promise<KimaiActivity[]>;
}

export interface KimaiClientOptions {
  baseUrl: string;
  apiToken: string;
  fetchFn?: typeof fetch;
}

/**
 * Thin HTTP client wrapping the Kimai REST API.
 *
 * All Kimai communication in the application must go through this module;
 * no other file should issue direct HTTP requests to Kimai.
 */
export class HttpKimaiClient implements KimaiClient {
  private readonly baseUrl: string;

  private readonly apiToken: string;

  private readonly fetchFn: typeof fetch;

  constructor(options: KimaiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.apiToken = options.apiToken;
    this.fetchFn = options.fetchFn ?? fetch;
  }

  private authHeader(): string {
    const scheme = 'Bearer';
    return [scheme, this.apiToken].join(' ');
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await this.fetchFn(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.authHeader(),
        ...init.headers,
      },
    });

    if (!response.ok) {
      throw new KimaiApiError(`Kimai API request to ${path} failed`, response.status);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  getCurrentUser(): Promise<KimaiUser> {
    return this.request<KimaiUser>('/api/users/me');
  }

  getTimesheet(id: number): Promise<KimaiTimesheet> {
    return this.request<KimaiTimesheet>(`/api/timesheets/${id}`);
  }

  createTimesheet(input: CreateTimesheetInput): Promise<KimaiTimesheet> {
    return this.request<KimaiTimesheet>('/api/timesheets', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  updateTimesheet(id: number, input: UpdateTimesheetInput): Promise<KimaiTimesheet> {
    return this.request<KimaiTimesheet>(`/api/timesheets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  deleteTimesheet(id: number): Promise<void> {
    return this.request<void>(`/api/timesheets/${id}`, { method: 'DELETE' });
  }

  startTimer(input: StartTimerInput): Promise<KimaiTimesheet> {
    return this.request<KimaiTimesheet>('/api/timesheets', {
      method: 'POST',
      body: JSON.stringify({ ...input, begin: new Date().toISOString() }),
    });
  }

  stopTimer(id: number): Promise<KimaiTimesheet> {
    return this.request<KimaiTimesheet>(`/api/timesheets/${id}/stop`, {
      method: 'PATCH',
    });
  }

  getProjects(): Promise<KimaiProject[]> {
    return this.request<KimaiProject[]>('/api/projects');
  }

  getActivities(projectId?: number): Promise<KimaiActivity[]> {
    const query = projectId ? `?project=${projectId}` : '';
    return this.request<KimaiActivity[]>(`/api/activities${query}`);
  }
}
