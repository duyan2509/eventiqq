export interface InvitationResponse {
  id: string
  organizationId: string
  organizationName: string
  userId?: string
  userEmail: string
  expiresAt: string
  status: string
  permissionId: string
  permissionName: string
}

export interface CreateInvitationDto {
  userEmail: string
  permissionId: string
}

export interface PermissionResponse {
  id: string
  name: string
  isDesigner: boolean
}

export interface PermissionDto {
  name: string
  isDesigner: boolean
}

export interface UpdatePermissionDto {
  name?: string
  isDesigner?: boolean
}

export interface PaymentConnectResponse {
  onboardingUrl: string
  organizationId: string
}

export interface PaymentStatusResponse {
  organizationId: string
  paymentStatus: number
  stripeAccountId?: string
  paymentConfiguredAt?: string
  isPaymentReady: boolean
}

export interface SessionResponse {
  id: string
  name: string
  startTime: string
  endTime: string
  chartId: string
  chartName: string
}

export interface CreateSessionDto {
  name: string
  startTime: string
  endTime: string
  chartId: string
}

export interface UpdateSessionDto {
  name?: string
  startTime?: string
  endTime?: string
  chartId?: string
}

export interface SubmissionResponse {
  adminEmail: string
  adminId: string
  message: string
  status: number
  createdAt: string
}

export interface UpdateSubmissionDto {
  message?: string
}

export interface LegendResponse {
  id: string
  name: string
  color?: string
  price: number
}

export interface CreateLegendDto {
  name: string
  color?: string
  price: number
}

export interface UpdateLegendDto {
  name?: string
  color?: string
  price?: number
}

export interface ChartResponse {
  id: string
  name: string
}

export interface CreateChartDto {
  name: string
}

export interface UpdateChartDto {
  name?: string
}

export interface UserResponse {
  id: string
  email: string
  isBanned: boolean
  roles: string[]
}

export interface BanUserRequest {
  banReason?: string
}

export interface PlatformConfigResponse {
  currentFeeRate: number
  pendingFeeRate?: number
  effectiveDate?: string
  payoutDayOfMonth: number
  updatedAt?: string
}

export interface UpdatePlatformConfigRequest {
  pendingFeeRate?: number
  payoutDayOfMonth?: number
}

export interface OrderItemResponse {
  seatId: string
  seatLabel: string
  legendName: string
  price: number
}

export interface OrderResponse {
  id: string
  sessionId: string
  eventName: string
  sessionName: string
  sessionDate: string
  status: string
  totalAmount: number
  platformFee: number
  createdAt: string
  paidAt?: string
  items: OrderItemResponse[]
}

export interface TicketResponse {
  id: string
  orderId: string
  sessionId: string
  seatLabel: string
  legendName: string
  price: number
  qrCode: string
  isCheckedIn: boolean
  checkedInAt?: string
  issuedAt: string
}
