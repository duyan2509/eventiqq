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
  if (data && typeof data === 'object') {
    const obj = data as any
    if (Array.isArray(obj.data)) return obj.data
    if (Array.isArray(obj.provinces)) return obj.provinces
    if (Array.isArray(obj.communes)) return obj.communes
  }
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
