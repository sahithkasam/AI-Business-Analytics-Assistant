// ─── Auth ────────────────────────────────────────────────────────────────────

export type UserRole = "admin" | "analyst" | "viewer";

export interface User {
  id: string;
  email: string;
  username: string;
  full_name: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  username: string;
  password: string;
  full_name?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

// ─── Analytics Query ─────────────────────────────────────────────────────────

export type ChartType = "line" | "bar" | "pie" | "area" | "scatter" | "table";
export type QueryStatus = "pending" | "running" | "success" | "failed" | "retried";

export interface ColumnMeta {
  name: string;
  type: string;
}

export interface QueryResult {
  id?: string;
  natural_query: string;
  generated_sql: string | null;
  corrected_sql: string | null;
  sql_explanation: string | null;
  columns: ColumnMeta[];
  data: Record<string, unknown>[];
  row_count: number;
  chart_type: ChartType;
  insights: string | null;
  execution_time_ms: number;
  retry_count: number;
  status: QueryStatus;
  error: string | null;
  created_at?: string;
}

export interface StreamEvent {
  type: "status" | "result" | "error";
  message?: string;
  data?: QueryResult;
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export interface KPICard {
  label: string;
  value: number | string;
  change_pct?: number | null;
  trend?: "up" | "down" | "neutral";
  prefix?: string | null;
  suffix?: string | null;
}

export interface DashboardKPIs {
  total_revenue: KPICard;
  total_orders: KPICard;
  active_customers: KPICard;
  avg_order_value: KPICard;
  revenue_growth: KPICard;
  top_category: KPICard;
}

export interface RevenueTrendPoint {
  month: string;
  orders: number;
  revenue: number;
}

export interface CategoryBreakdown {
  category: string;
  orders: number;
  units_sold: number;
  revenue: number;
}

export interface TopCustomer {
  id: number;
  name: string;
  email: string;
  company: string | null;
  country: string;
  lifetime_value: number;
  order_count: number;
}

// ─── History ─────────────────────────────────────────────────────────────────

export interface QueryHistoryItem {
  id: string;
  natural_language_query: string;
  generated_sql: string | null;
  sql_explanation: string | null;
  execution_time_ms: number | null;
  row_count: number | null;
  status: QueryStatus;
  chart_type: ChartType | null;
  insights: string | null;
  is_favorite: boolean;
  created_at: string;
}

export interface QueryHistoryList {
  items: QueryHistoryItem[];
  total: number;
  page: number;
  page_size: number;
}

// ─── UI State ─────────────────────────────────────────────────────────────────

export type Theme = "light" | "dark";

export interface UIStore {
  theme: Theme;
  sidebarOpen: boolean;
  toggleTheme: () => void;
  toggleSidebar: () => void;
}
