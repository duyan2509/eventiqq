import type { OrderResponse, PaymentConnectResponse, PaymentStatusResponse, PlatformConfigResponse, UpdatePlatformConfigRequest } from '../types/index'
import { http } from './httpClient'

export async function connectStripeAccount(orgId: string): Promise<PaymentConnectResponse> {
  const res = await http.post<PaymentConnectResponse>(`/organizations/${orgId}/payment/connect`)
  return res.data
}

export async function getPaymentStatus(orgId: string): Promise<PaymentStatusResponse> {
  const res = await http.get<PaymentStatusResponse>(`/organizations/${orgId}/payment`)
  return res.data
}

export async function handleOnboardingCallback(orgId: string): Promise<PaymentStatusResponse> {
  const res = await http.get<PaymentStatusResponse>(`/organizations/${orgId}/payment/callback`)
  return res.data
}

export async function disconnectStripeAccount(orgId: string): Promise<void> {
  await http.post(`/organizations/${orgId}/payment/disconnect`)
}

export async function getPlatformConfig(): Promise<PlatformConfigResponse> {
  const res = await http.get<PlatformConfigResponse>('/admin/platform-config')
  return res.data
}

export async function updatePlatformConfig(data: UpdatePlatformConfigRequest): Promise<PlatformConfigResponse> {
  const res = await http.put<PlatformConfigResponse>('/admin/platform-config', data)
  return res.data
}

export async function createCheckout(sessionId: string, seatIds: string[]): Promise<{ checkoutUrl: string }> {
  const res = await http.post<{ checkoutUrl: string }>('/payments/checkout', { sessionId, seatIds })
  return res.data
}

export async function getMyOrders(): Promise<OrderResponse[]> {
  const res = await http.get<OrderResponse[]>('/payments/orders')
  return res.data
}

// ---- Admin: Stripe webhook audit log ----

export type WebhookEventStatus = 'Received' | 'Processed' | 'Failed' | 'Skipped'

export interface WebhookEventSummary {
  id: string
  stripeEventId: string
  eventType: string
  status: WebhookEventStatus
  attemptCount: number
  error: string | null
  receivedAt: string
  processedAt: string | null
}

export interface WebhookEventDetail extends WebhookEventSummary {
  payload: string
}

export async function getWebhookEvents(
  status: WebhookEventStatus | undefined,
  page: number,
  size: number,
): Promise<WebhookEventSummary[]> {
  const res = await http.get<WebhookEventSummary[]>('/payments/admin/webhooks', {
    params: { status, page, size },
  })
  return res.data
}

export async function getWebhookEvent(id: string): Promise<WebhookEventDetail> {
  const res = await http.get<WebhookEventDetail>(`/payments/admin/webhooks/${id}`)
  return res.data
}
