export interface SeatMapResponse {
  id: string
  chartId: string
  eventId: string
  organizationId: string
  name: string
  status: string
  canvasSettings?: string
  version: number
  createdAt: string
  updatedAt?: string
}

export interface SeatMapDetailResponse extends SeatMapResponse {
  sections: SeatSectionResponse[]
  objects: SeatObjectResponse[]
}

export interface SeatSectionResponse {
  id: string
  seatMapId: string
  label: string
  sectionType: string
  geometry?: string
  style?: string
  legendId?: string
  sortOrder: number
  rows: SeatRowResponse[]
}

export interface SeatRowResponse {
  id: string
  sectionId: string
  label: string
  rowNumber: number
  curve?: string
  seatSpacing: number
  seats: SeatResponse[]
}

export interface SeatResponse {
  id: string
  rowId: string
  label: string
  seatNumber: number
  status: string
  seatType: string
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

export interface CreateSeatMapDto {
  chartId: string
  eventId: string
  name: string
  canvasSettings?: string
}

export interface SeatMapLayoutResponse extends SeatMapResponse {
  sessionId?: string
  totalSeats: number
  sections: SeatSectionLayoutResponse[]
  objects: SeatObjectResponse[]
}

export interface SeatSectionLayoutResponse {
  id: string
  seatMapId: string
  label: string
  sectionType: string
  geometry?: string
  style?: string
  legendId?: string
  sortOrder: number
  rows: SeatRowLayoutResponse[]
}

export interface SeatRowLayoutResponse {
  id: string
  sectionId: string
  label: string
  rowNumber: number
  curve?: string
  seatSpacing: number
  seats: SeatLayoutItemResponse[]
}

export interface SeatLayoutItemResponse {
  id: string
  rowId: string
  label: string
  seatNumber: number
  seatType: string
  position?: string
  legendId?: string
  customProperties?: string
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
  reservedSeats: number
  soldSeats: number
  blockedSeats: number
  totalSections: number
  totalRows: number
}
