import { useCallback, useEffect, useRef, useState } from 'react'
import { documentsApi, type DocumentDto, type DocumentPage, type DocumentUploadError } from '../api/documents'
import { ApiRequestError } from '../api/errors'

interface DocumentsState {
  documents: DocumentDto[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  isLoading: boolean
  isUploading: boolean
  deletingIds: ReadonlySet<string>
  loadError: string | null
  uploadErrors: DocumentUploadError[]
}

export interface UseDocumentsResult extends DocumentsState {
  setPage: (page: number) => void
  upload: (files: FileList | File[]) => Promise<void>
  remove: (id: string) => Promise<void>
  refresh: () => void
}

export function useDocuments(): UseDocumentsResult {
  const [state, setState] = useState<DocumentsState>({
    documents: [],
    page: 0,
    size: 0,
    totalElements: 0,
    totalPages: 0,
    isLoading: true,
    isUploading: false,
    deletingIds: new Set<string>(),
    loadError: null,
    uploadErrors: [],
  })

  const requestIdRef = useRef(0)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const load = useCallback(async (pageToLoad: number) => {
    const requestId = ++requestIdRef.current
    setState((prev) => ({ ...prev, isLoading: true, loadError: null }))
    try {
      const data = await documentsApi.list(pageToLoad)
      if (!mountedRef.current || requestId !== requestIdRef.current) return
      setState((prev) => ({
        ...prev,
        documents: data.content,
        page: data.page,
        size: data.size,
        totalElements: data.totalElements,
        totalPages: data.totalPages,
        isLoading: false,
      }))
    } catch (err) {
      if (!mountedRef.current || requestId !== requestIdRef.current) return
      setState((prev) => ({
        ...prev,
        isLoading: false,
        loadError: err instanceof ApiRequestError ? err.message : null,
      }))
    }
  }, [])

  useEffect(() => {
    void load(0)
  }, [load])

  const setPage = useCallback(
    (page: number) => {
      void load(page)
    },
    [load],
  )

  const refresh = useCallback(() => {
    const page = state.page
    void load(page)
  }, [state.page, load])

  const upload = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files)
      if (list.length === 0) return

      setState((prev) => ({ ...prev, isUploading: true, uploadErrors: [] }))
      const errors: DocumentUploadError[] = []

      for (const file of list) {
        try {
          await documentsApi.upload(file)
        } catch (err) {
          errors.push({
            filename: file.name,
            message: err instanceof ApiRequestError ? err.message : (err as Error)?.message ?? String(err),
          })
        }
      }

      if (!mountedRef.current) return
      setState((prev) => ({ ...prev, isUploading: false, uploadErrors: errors }))
      if (errors.length < list.length) {
        void load(state.page)
      }
    },
    [load, state.page],
  )

  const remove = useCallback(
    async (id: string) => {
      setState((prev) => {
        const next = new Set(prev.deletingIds)
        next.add(id)
        return { ...prev, deletingIds: next }
      })
      try {
        await documentsApi.remove(id)
        if (!mountedRef.current) return
        const isLastOnPage = state.documents.length === 1 && state.page > 0
        const targetPage = isLastOnPage ? state.page - 1 : state.page
        setState((prev) => {
          const next = new Set(prev.deletingIds)
          next.delete(id)
          return { ...prev, deletingIds: next }
        })
        void load(targetPage)
      } catch (err) {
        if (!mountedRef.current) return
        setState((prev) => {
          const next = new Set(prev.deletingIds)
          next.delete(id)
          return {
            ...prev,
            deletingIds: next,
            loadError: err instanceof ApiRequestError ? err.message : prev.loadError,
          }
        })
      }
    },
    [load, state.documents.length, state.page],
  )

  return { ...state, setPage, upload, remove, refresh }
}
