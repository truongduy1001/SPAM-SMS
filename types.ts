
export interface ServiceDefinition {
  id: string;
  name: string;
  category: 'Retail' | 'Telco' | 'Media' | 'Finance' | 'Social';
  status: 'Idle' | 'Pending' | 'Success' | 'Error';
}

export interface LogEntry {
  id: string;
  timestamp: string;
  service: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

export interface SpamStats {
  totalSent: number;
  successCount: number;
  failureCount: number;
  currentCycle: number;
  totalCycles: number;
}

export interface ProxyConfig {
  host: string;
  port: string;
  user: string;
  pass: string;
  enabled: boolean;
}
