import { useCallback, useEffect, useRef, useState } from 'react'
import { documentsApi, type DocumentDto, type DocumentPage, type DocumentUploadError } from '../api/documents'
import { ApiRequestError } from '../api/errors'
import { MAX_PARALLEL_UPLOADS, STATUS_POLL_INTERVAL_MS } from '../constants/api'
import { t } from '../i18n'

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
  deleteError: string | null
}

export interface UseDocumentsResult extends DocumentsState {
  setPage: (page: number) => void
  upload: (files: FileList | File[]) => Promise<void>
  remove: (id: string) => Promise<void>
  refresh: () => void
  dismissDeleteError: () => void
}

function hasPendingStatuses(documents: DocumentDto[]): boolean {
  return documents.some((doc) => doc.status === 'PROCESSING' || doc.status === 'UPLOADED')
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
    deleteError: null,
  })

  const requestIdRef = useRef(0)
  const mountedRef = useRef(true)
  const isUploadingRef = useRef(false)
  const deletingIdsRef = useRef<ReadonlySet<string>>(new Set())

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const load = useCallback(async (pageToLoad: number, options?: { silent?: boolean }) => {
    const requestId = ++requestIdRef.current
    if (options?.silent) {
      setState((prev) => ({ ...prev, loadError: null }))
    } else {
      setState((prev) => ({ ...prev, isLoading: true, loadError: null }))
    }
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

  const hasPending = hasPendingStatuses(state.documents)
  useEffect(() => {
    if (!hasPending) return
    const timerId = window.setInterval(() => {
      void load(state.page, { silent: true })
    }, STATUS_POLL_INTERVAL_MS)
    return () => {
      window.clearInterval(timerId)
    }
  }, [hasPending, state.page, load])

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
      if (isUploadingRef.current) return
      isUploadingRef.current = true

      setState((prev) => ({ ...prev, isUploading: true, uploadErrors: [] }))
      const errors: DocumentUploadError[] = []
      let successCount = 0

      let nextIndex = 0
      const worker = async (): Promise<void> => {
        while (nextIndex < list.length) {
          const file = list[nextIndex]
          nextIndex += 1
          try {
            await documentsApi.upload(file)
            successCount += 1
          } catch (err) {
            errors.push({
              filename: file.name,
              message:
                err instanceof ApiRequestError ? err.message : (err as Error)?.message ?? String(err),
            })
          }
        }
      }

      await Promise.all(
        Array.from({ length: Math.min(MAX_PARALLEL_UPLOADS, list.length) }, () => worker()),
      )

      if (!mountedRef.current) {
        isUploadingRef.current = false
        return
      }
      isUploadingRef.current = false
      setState((prev) => ({ ...prev, isUploading: false, uploadErrors: errors }))
      if (successCount > 0) {
        void load(state.page)
      }
    },
    [load, state.page],
  )

  const remove = useCallback(
    async (id: string) => {
      if (deletingIdsRef.current.has(id)) return
      deletingIdsRef.current = new Set(deletingIdsRef.current).add(id)
      setState((prev) => {
        const next = new Set(prev.deletingIds)
        next.add(id)
        return { ...prev, deletingIds: next, deleteError: null }
      })

      const isLastOnPage = state.documents.length === 1 && state.page > 0
      try {
        await documentsApi.remove(id)
        if (!mountedRef.current) return
        const nextIds = new Set(deletingIdsRef.current)
        nextIds.delete(id)
        deletingIdsRef.current = nextIds
        setState((prev) => {
          const next = new Set(prev.deletingIds)
          next.delete(id)
          return { ...prev, deletingIds: next }
        })
        void load(isLastOnPage ? state.page - 1 : state.page)
      } catch (err) {
        const nextIds = new Set(deletingIdsRef.current)
        nextIds.delete(id)
        deletingIdsRef.current = nextIds
        if (!mountedRef.current) return
        setState((prev) => {
          const next = new Set(prev.deletingIds)
          next.delete(id)
          return {
            ...prev,
            deletingIds: next,
            deleteError: err instanceof ApiRequestError ? err.message : t('errors.generic'),
          }
        })
      }
    },
    [load, state.documents.length, state.page],
  )

  const dismissDeleteError = useCallback(() => {
    setState((prev) => ({ ...prev, deleteError: null }))
  }, [])

  return { ...state, setPage, upload, remove, refresh, dismissDeleteError }
}
