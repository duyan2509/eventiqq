export interface SeatMapResponse {
  id: string
  chartId: string
  eventId: string
  organizationId: string
  sessionId?: string
  name: string
  status: string
  canvasSettings?: string
  version: number
  totalSeats: number
  createdAt: string
  updatedAt?: string
}

export interface SeatResponse {
  id: string
  seatMapId: string
  label: string
  seatNumber: number
  status: string
  seatType: number
  position?: string
  legendId?: string
  customProperties?: string
}

export interface SeatLayoutResponse {
  id: string
  seatMapId: string
  label: string
  seatNumber: number
  seatType: number
  position?: string
  legendId?: string
  customProperties?: string
}

export interface SeatObjectResponse {
  id: string
  seatMapId: string
  objectType: string
  label?: string
  geometry?: string
  style?: string
  zIndex: number
}

export interface SeatMapDetailResponse extends SeatMapResponse {
  seats: SeatResponse[]
  objects: SeatObjectResponse[]
}

export interface SeatMapLayoutResponse extends SeatMapResponse {
  seats: SeatLayoutResponse[]
  objects: SeatObjectResponse[]
}

export interface CreateSeatMapDto {
  chartId: string
  eventId: string
  name: string
  canvasSettings?: string
}

export interface SeatStatusUpdate {
  seatId: string
  status: string
  heldUntil?: string
}

export interface HoldSeatsResponse {
  seatIds: string[]
  status: string
  heldUntil: string
}

export interface SeatMapStatsResponse {
  totalSeats: number
  availableSeats: number
  holdingSeats: number
  soldSeats: number
  blockedSeats: number
}
