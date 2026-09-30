/** Paginated listing as returned by the backend (Spring Data `Page`). */
export type Page<T> = {
  content: T[]
  /** Zero-based page index. */
  number: number
  size: number
  totalElements: number
  totalPages: number
}
