export interface EventQuickViewData {
  id: string
  eventBanner?: string
  name: string
  start: string
  status: string
  lowestPrice?: number
  provinceName?: string
}

export interface EventDetail {
  id: string
  organizationId: string
  eventBanner?: string
  name: string
  startTime: string
  endTime: string
  description?: string
  status: string
  detailAddress?: string
  provinceCode?: string
  communeCode?: string
  provinceName?: string
  communeName?: string
  sessions: SessionResponse[]
  legends: LegendResponse[]
}

export interface SessionResponse {
  id: string
  [key: string]: unknown
}

export interface LegendResponse {
  id: string
  [key: string]: unknown
}

export interface CreateEventDto {
  name: string
  description?: string
  detailAddress: string
  provinceCode: string
  communeCode: string
  provinceName: string
  communeName: string
  startTime: string
  endTime: string
}

export interface UpdateEventDto {
  name?: string
  description?: string
  detailAddress?: string
  provinceCode?: string
  communeCode?: string
  provinceName?: string
  communeName?: string
  startTime?: string
  endTime?: string
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  size: number
}
