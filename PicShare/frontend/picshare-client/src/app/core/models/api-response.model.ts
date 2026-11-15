export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  details?: string[];
  meta?: {
    unreadCount?: number;
    pendingRequestsCount?: number;
  };
}

export interface HealthStatus {
  success: boolean;
  service: string;
  timestamp: string;
  database: {
    status: string;
    readyState: number;
  };
}
