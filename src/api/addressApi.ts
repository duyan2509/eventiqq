import { http } from './httpClient'

export interface Province {
  code: string
  name: string
}

export interface Commune {
  code: string
  name: string
}

function normalizeList(data: unknown): { code: string; name: string }[] {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object' && 'data' in data && Array.isArray((data as any).data)) return (data as any).data
  return []
}

export async function getProvinces(): Promise<Province[]> {
  const res = await http.get('/address/provinces')
  return normalizeList(res.data)
}

export async function getCommunes(provinceCode: string): Promise<Commune[]> {
  const res = await http.get(`/address/provinces/${provinceCode}/communes`)
  return normalizeList(res.data)
}
