import { FC, DragEvent, MouseEvent, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDocuments } from '../documents/useDocuments'
import { downloadDocument } from '../api/documents'
import { formatBytes, formatDateTime, statusLabel } from '../documents/format'
import { Pagination } from '../components/Pagination'
import { t } from '../i18n'

export const DocumentsPage: FC = () => {
  const {
    documents,
    page,
    totalPages,
    totalElements,
    isLoading,
    isUploading,
    deletingIds,
    loadError,
    uploadErrors,
    setPage,
    upload,
    remove,
    refresh,
  } = useDocuments()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  function handleFilesChosen(files: FileList | null): void {
    if (files && files.length > 0) void upload(files)
  }

  function handleFileInputChange(): void {
    handleFilesChosen(fileInputRef.current?.files ?? null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleDrop(event: DragEvent<HTMLDivElement>): void {
    event.preventDefault()
    setIsDragging(false)
    handleFilesChosen(event.dataTransfer.files)
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>): void {
    event.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(): void {
    setIsDragging(false)
  }

  function handleDownload(id: string, filename: string): void {
    void downloadDocument(id, filename)
  }

  function handleDelete(event: MouseEvent<HTMLButtonElement>, id: string): void {
    event.preventDefault()
    void remove(id)
  }

  return (
    <div className="documents-page">
      <header className="documents-header">
        <Link to="/" className="documents-back">
          {t('documents.back')}
        </Link>
        <h1>{t('documents.title')}</h1>
      </header>

      <div
        className={`documents-dropzone${isDragging ? ' documents-dropzone--dragging' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="documents-file-input"
          id="documents-file-input"
          onChange={handleFileInputChange}
          disabled={isUploading}
        />
        <label htmlFor="documents-file-input" className="documents-dropzone-label">
          {isUploading ? t('documents.uploading') : t('documents.dropHere')}
        </label>
      </div>

      {uploadErrors.length > 0 && (
        <ul className="documents-upload-errors" role="alert">
          {uploadErrors.map(({ filename, message }) => (
            <li key={filename}>{t('documents.errors.uploadFailed', { filename, message })}</li>
          ))}
        </ul>
      )}

      {loadError && (
        <div className="documents-load-error" role="alert">
          <span>{loadError}</span>
          <button type="button" onClick={refresh}>
            {t('documents.retry')}
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="documents-loading" aria-live="polite">
          {t('documents.uploading')}
        </div>
      ) : documents.length === 0 && !loadError ? (
        <p className="documents-empty">{t('documents.empty')}</p>
      ) : (
        <>
          <table className="documents-table">
            <thead>
              <tr>
                <th scope="col">{t('documents.columns.name')}</th>
                <th scope="col">{t('documents.columns.type')}</th>
                <th scope="col">{t('documents.columns.size')}</th>
                <th scope="col">{t('documents.columns.date')}</th>
                <th scope="col">{t('documents.columns.status')}</th>
                <th scope="col">{t('documents.columns.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => {
                const isDeleting = deletingIds.has(doc.id)
                return (
                  <tr key={doc.id} className={isDeleting ? 'documents-row--deleting' : undefined}>
                    <td>{doc.filename}</td>
                    <td>{doc.contentType}</td>
                    <td>{formatBytes(doc.sizeBytes)}</td>
                    <td>{formatDateTime(doc.createdAt)}</td>
                    <td>
                      <span className={`documents-status documents-status--${doc.status.toLowerCase()}`}>
                        {statusLabel(doc.status)}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleDownload(doc.id, doc.filename)}
                        disabled={isDeleting}
                      >
                        {t('documents.download')}
                      </button>
                      <button
                        type="button"
                        onClick={(event) => handleDelete(event, doc.id)}
                        disabled={isDeleting}
                      >
                        {t('documents.delete')}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <Pagination
            page={page}
            totalPages={totalPages}
            totalElements={totalElements}
            disabled={isLoading}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  )
}
