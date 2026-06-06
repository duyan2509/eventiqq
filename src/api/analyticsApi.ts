import { http } from './httpClient'

export interface AdminOverview {
  totalRevenue: number
  totalPlatformFee: number
  totalOrders: number
  totalOrgs: number
}

export interface MonthlyRevenue {
  month: string
  revenue: number
  platformFee: number
}

export interface TopOrg {
  orgId: string
  eventName: string
  revenue: number
  platformFee: number
  orders: number
}

export interface OrgAnalyticsOverview {
  totalRevenue: number
  totalPlatformFee: number
  netRevenue: number
  totalOrders: number
  byEvent: OrgEventRevenue[]
}

export interface OrgEventRevenue {
  eventName: string
  sessionName: string
  tickets: number
  revenue: number
  platformFee: number
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const res = await http.get<AdminOverview>('/analytics/admin/overview')
  return res.data
}

export async function getMonthlyRevenue(months = 12): Promise<MonthlyRevenue[]> {
  const res = await http.get<MonthlyRevenue[]>('/analytics/admin/revenue-by-month', { params: { months } })
  return res.data
}

export async function getTopOrgs(top = 10): Promise<TopOrg[]> {
  const res = await http.get<TopOrg[]>('/analytics/admin/top-orgs', { params: { top } })
  return res.data
}

export async function getOrgAnalytics(orgId: string): Promise<OrgAnalyticsOverview> {
  const res = await http.get<OrgAnalyticsOverview>(`/analytics/org/${orgId}`)
  return res.data
}

export interface ChartConfig {
  type: 'kpi' | 'line' | 'pie' | 'bar' | 'scatter' | 'table'
  x?: string
  y?: string[]
  label?: string
  value?: string
}

export interface Text2SqlResponse {
  question: string
  title: string
  sql: string
  rows: Record<string, unknown>[]
  columns: string[]
  chartType: string
  chartConfig: ChartConfig
  relevantTables: string[]
  method: string
  retries: number
  error: string | null
  answer?: string | null   // natural-language answer (chat endpoint only)
}

export async function askAnalytics(question: string): Promise<Text2SqlResponse> {
  const res = await http.post<Text2SqlResponse>('/analytics/query', { question })
  return res.data
}

// Chat variant: same Text2SQL pipeline + a natural-language `answer`.
export async function askAnalyticsChat(question: string): Promise<Text2SqlResponse> {
  const res = await http.post<Text2SqlResponse>('/analytics/chat', { question })
  return res.data
}
