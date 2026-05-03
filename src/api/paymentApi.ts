import type { PaymentConnectResponse, PaymentStatusResponse } from '../types/index'
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
