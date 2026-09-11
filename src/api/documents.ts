import { DOCUMENT_CONTENT_ENDPOINT, DOCUMENT_ENDPOINT, DOCUMENTS_ENDPOINT } from '../constants/endpoints'
import { client, unwrap } from './client'
import { ApiRequestError } from './errors'
import { t } from '../i18n'
import type { components } from './schema'

export type DocumentDto = components['schemas']['DocumentResponse']
export type DocumentPage = components['schemas']['PageResponseDocumentResponse']

export type DocumentContentType = NonNullable<DocumentDto['contentType']>
export type DocumentStatus = NonNullable<DocumentDto['status']>

export interface DocumentUploadError {
  filename: string
  message: string
}

export const documentsApi = {
  list: async (page: number): Promise<DocumentPage> => {
    return unwrap((init) =>
      client.GET(DOCUMENTS_ENDPOINT, {
        ...init,
        params: { query: { page } },
      }))
  },
  upload: async (file: File): Promise<DocumentDto> => {
    const formData = new FormData()
    formData.append('file', file)
    return unwrap((init) =>
      client.POST(DOCUMENTS_ENDPOINT, {
        ...init,
        body: formData as never,
      }), {
      method: 'POST',
    })
  },
  remove: async (id: string) => {
    const { response, error } = await client.DELETE(DOCUMENT_ENDPOINT, {
      params: { path: { id } },
    })
    if (error || !response || !response.ok) {
      throw new ApiRequestError(t('errors.generic'), response?.status ?? 0)
    }
  },
}

export async function downloadDocument(id: string, filename: string, signal?: AbortSignal): Promise<void> {
  const { data: blob, response } = await client.GET(DOCUMENT_CONTENT_ENDPOINT, {
    params: { path: { id } },
    parseAs: 'blob',
    signal,
  })

  if (!response.ok) {
    const status = response.status
    throw new ApiRequestError(status === 404 ? t('documents.errors.notFound') : t('errors.generic'), status)
  }

  if (blob == null) {
    throw new ApiRequestError(t('errors.noDataReceived'), response.status)
  }

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename

  document.body.appendChild(link)

  try {
    link.click()
  } finally {
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
  }
}
