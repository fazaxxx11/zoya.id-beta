/**
 * Zustand Store - State Management & Data Caching
 * Poin #2: Sistem State Management dan Data Caching modern
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAppStore = create(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      clearUser: () => set({ user: null }),
      formData: {},
      updateFormData: (data) => set((state) => ({ formData: { ...state.formData, ...data } })),
      clearFormData: () => set({ formData: {} }),
      analysisResults: {},
      setAnalysisResults: (results) => set({ analysisResults: results }),
      clearAnalysisResults: () => set({ analysisResults: {} }),
      uploadedFiles: [],
      addUploadedFile: (file) => set((state) => ({ uploadedFiles: [...state.uploadedFiles, file] })),
      removeUploadedFile: (fileId) => set((state) => ({ uploadedFiles: state.uploadedFiles.filter(f => f.id !== fileId) })),
      clearUploadedFiles: () => set({ uploadedFiles: [] }),
      settings: { theme: 'light', language: 'id', autoSave: true, useWorker: true, cacheDuration: 3600000 },
      updateSettings: (settings) => set((state) => ({ settings: { ...state.settings, ...settings } })),
      isLoading: false,
      setIsLoading: (isLoading) => set({ isLoading }),
      notifications: [],
      addNotification: (notification) => set((state) => ({ notifications: [...state.notifications, { id: Date.now(), ...notification }] })),
      removeNotification: (id) => set((state) => ({ notifications: state.notifications.filter(n => n.id !== id) })),
      clearNotifications: () => set({ notifications: [] }),
    }),
    { name: 'zaaaxx-app-store', partialize: (state) => ({ user: state.user, settings: state.settings }) }
  )
)

export const useCacheStore = create(
  persist(
    (set, get) => ({
      cache: {},
      setCache: (key, data, ttl = 3600000) => {
        set((state) => ({ cache: { ...state.cache, [key]: { data, timestamp: Date.now(), ttl } } }))
      },
      getCache: (key) => {
        const cached = get().cache[key]
        if (!cached) return null
        if (Date.now() - cached.timestamp > cached.ttl) { get().removeCache(key); return null }
        return cached.data
      },
      removeCache: (key) => set((state) => { const c = { ...state.cache }; delete c[key]; return { cache: c } }),
      clearCache: () => set({ cache: {} }),
    }),
    { name: 'zaaaxx-cache-store' }
  )
)
