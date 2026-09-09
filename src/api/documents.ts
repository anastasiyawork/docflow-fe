import { DOCUMENT_CONTENT_ENDPOINT, DOCUMENT_ENDPOINT, DOCUMENTS_ENDPOINT } from '../constants/endpoints'
import { client, unwrap } from './client'
import { ApiRequestError } from './errors'
import { t } from '../i18n'
import type { components } from './schema'

type DocumentResponse = components['schemas']['DocumentResponse']
type PageResponse = components['schemas']['PageResponseDocumentResponse']

export type DocumentDto = Required<DocumentResponse>
export type DocumentPage = Omit<Required<PageResponse>, 'content'> & { content: DocumentDto[] }

export type DocumentContentType = NonNullable<DocumentResponse['contentType']>
export type DocumentStatus = NonNullable<DocumentResponse['status']>

export interface DocumentUploadError {
  filename: string
  message: string
}

export const documentsApi = {
  list: (page: number) =>
    unwrap<DocumentPage>((init) =>
      client.GET(DOCUMENTS_ENDPOINT, {
        ...init,
        params: { query: { paginationRequest: { page } } },
      } as never) as never),
  upload: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return unwrap<DocumentDto>((init) =>
      client.POST(DOCUMENTS_ENDPOINT, {
        ...init,
        body: formData as unknown as { file: string },
      }) as never, {
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

export async function downloadDocument(id: string, filename: string): Promise<void> {
  const { response, error } = await client.GET(DOCUMENT_CONTENT_ENDPOINT, {
    params: { path: { id } },
  })
  if (error || !response || !response.ok) {
    const status = response?.status ?? 0
    throw new ApiRequestError(status === 404 ? t('documents.errors.notFound') : t('errors.generic'), status)
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}
