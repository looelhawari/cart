/// <reference types="vite/client" />
import axios, { AxiosInstance, AxiosError } from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

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
            (error: AxiosError) => {
                if (error.response?.status === 401) {
                    localStorage.removeItem('auth_token')
                    localStorage.removeItem('user')
                    window.location.href = '/login'
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
