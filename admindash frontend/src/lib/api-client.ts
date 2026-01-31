/// <reference types="vite/client" />
import axios, { AxiosInstance, AxiosError } from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

type RefreshTokenResponse = {
    success: boolean
    message: string
    data: {
        access_token: string
        refresh_token: string
        token_type: string
        expires_in: number
    }
}

function updatePersistedAuthStorage(accessToken: string, refreshToken: string) {
    try {
        const raw = localStorage.getItem('auth-storage')
        if (!raw) return

        const parsed = JSON.parse(raw)
        if (!parsed || typeof parsed !== 'object') return

        if (parsed.state && typeof parsed.state === 'object') {
            parsed.state.token = accessToken
            parsed.state.refreshToken = refreshToken
            parsed.state.isAuthenticated = true
        }

        localStorage.setItem('auth-storage', JSON.stringify(parsed))
    } catch {
        // ignore
    }
}

class ApiClient {
    private client: AxiosInstance

    constructor() {
        this.client = axios.create({
            baseURL: API_BASE_URL,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        })

        // Request interceptor
        this.client.interceptors.request.use(
            (config) => {
                const token = localStorage.getItem('auth_token')
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`
                }
                return config
            },
            (error) => Promise.reject(error)
        )

        // Response interceptor
        this.client.interceptors.response.use(
            (response) => response,
            async (error: AxiosError) => {
                const originalRequest: any = error.config

                if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
                    originalRequest._retry = true

                    const refreshToken = localStorage.getItem('refresh_token')

                    if (refreshToken) {
                        try {
                            const refreshResponse = await axios.post<RefreshTokenResponse>(
                                `${API_BASE_URL}/auth/refresh`,
                                { refresh_token: refreshToken },
                                {
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Accept': 'application/json',
                                    },
                                }
                            )

                            const newAccessToken = refreshResponse.data.data.access_token
                            const newRefreshToken = refreshResponse.data.data.refresh_token

                            localStorage.setItem('auth_token', newAccessToken)
                            localStorage.setItem('refresh_token', newRefreshToken)
                            updatePersistedAuthStorage(newAccessToken, newRefreshToken)

                            originalRequest.headers = originalRequest.headers ?? {}
                            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`

                            return this.client(originalRequest)
                        } catch (_refreshError) {
                            localStorage.removeItem('auth_token')
                            localStorage.removeItem('refresh_token')
                            localStorage.removeItem('user')
                            window.location.href = '/login'
                        }
                    } else {
                        localStorage.removeItem('auth_token')
                        localStorage.removeItem('refresh_token')
                        localStorage.removeItem('user')
                        window.location.href = '/login'
                    }
                }

                return Promise.reject(error)
            }
        )
    }

    async get<T>(url: string, params?: any): Promise<T> {
        const response = await this.client.get<T>(url, { params })
        return response.data
    }

    async post<T>(url: string, data?: any): Promise<T> {
        const response = await this.client.post<T>(url, data)
        return response.data
    }

    async put<T>(url: string, data?: any): Promise<T> {
        const response = await this.client.put<T>(url, data)
        return response.data
    }

    async delete<T>(url: string): Promise<T> {
        const response = await this.client.delete<T>(url)
        return response.data
    }

    async uploadFile<T>(url: string, file: File, fieldName = 'image'): Promise<T> {
        const formData = new FormData()
        formData.append(fieldName, file)

        const response = await this.client.post<T>(url, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        })
        return response.data
    }

    async uploadFormData<T>(url: string, formData: FormData, method: 'POST' | 'PUT' = 'POST'): Promise<T> {
        const response = method === 'PUT'
            ? await this.client.put<T>(url, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            })
            : await this.client.post<T>(url, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            })
        return response.data
    }

    async downloadFile(url: string, params?: any): Promise<Blob> {
        const response = await this.client.get(url, {
            params,
            responseType: 'blob',
        })
        return response.data
    }
}

export const apiClient = new ApiClient()
