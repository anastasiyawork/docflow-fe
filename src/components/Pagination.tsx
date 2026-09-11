import { FC } from 'react'
import { t } from '../i18n'

export interface PaginationProps {
  page: number
  totalPages: number
  totalElements?: number
  disabled?: boolean
  onPageChange: (page: number) => void
}

export const Pagination: FC<PaginationProps> = ({ page, totalPages, totalElements, disabled = false, onPageChange }) => {
  if (totalPages <= 1) return null

  return (
    <nav className="pagination" aria-label="Pagination">
      <button type="button" onClick={() => onPageChange(page - 1)} disabled={page === 0 || disabled}>
        {t('pagination.previous')}
      </button>
      <span>
        {t('pagination.pageInfo', { page: page + 1, totalPages })}
        {totalElements !== undefined && <> · {totalElements}</>}
      </span>
      <button type="button" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages - 1 || disabled}>
        {t('pagination.next')}
      </button>
    </nav>
  )
}
