import axios from 'axios'
import { clearAccessToken, getAccessToken, setAccessToken } from '../store/authStore'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL 

export const http = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,       // always send cookies (refresh token)
})

// Attach access token to every request
http.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let isRefreshing = false
let pendingRequests: Array<(token: string | null) => void> = []

async function refreshTokenIfNeeded() {
  if (isRefreshing) {
    return new Promise<string | null>((resolve) => {
      pendingRequests.push(resolve)
    })
  }

  isRefreshing = true

  try {
    // POST to refresh — no body needed, refresh token is in HttpOnly cookie
    const res = await axios.post<{ accessToken: string }>(
      `${API_BASE_URL}/auth/refresh`,
      {},
      { withCredentials: true },
    )

    const { accessToken } = res.data
    setAccessToken(accessToken)

    pendingRequests.forEach((fn) => fn(accessToken))
    pendingRequests = []
    return accessToken
  } catch {
    clearAccessToken()
    pendingRequests.forEach((fn) => fn(null))
    pendingRequests = []
    return null
  } finally {
    isRefreshing = false
  }
}

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (!originalRequest || error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    originalRequest._retry = true
    const newAccessToken = await refreshTokenIfNeeded()
    if (!newAccessToken) {
      return Promise.reject(error)
    }

    originalRequest.headers = originalRequest.headers ?? {}
    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
    return http(originalRequest)
  },
)
