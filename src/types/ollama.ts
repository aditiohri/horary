export interface OllamaSettings {
  baseUrl: string;
  model: string;
  timeout: number;
}

export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
}

export type ConnectionStatus = 'idle' | 'testing' | 'success' | 'error';

export interface ConnectionTestResult {
  status: ConnectionStatus;
  message?: string;
  error?: string;
}
