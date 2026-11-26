import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { RequireRole } from '../../auth/RequireRole'
import { useSession } from '../../auth/sessionContext'
import { deletePart } from '../../db/inventoryService'
import { listPartCategories, queryParts } from '../../db/partQueries'
import { useDebouncedValue } from '../../lib/useDebouncedValue'

const PAGE_SIZE = 20

interface PartListProps {
  onOpen: (id: string) => void
  onEdit: (id: string) => void
  onCreate: () => void
  /** Low stock page: the filter is locked on and the heading changes. */
  lowStockOnly?: boolean
}

export function StockPill({ stock, min }: { stock: number; min: number }) {
  const low = stock < min
  return (
    <span className={`stock-pill ${low ? 'stock-low' : 'stock-ok'}`}>
      {stock}
      {low && <span className="stock-pill-note"> low</span>}
    </span>
  )
}

export function PartList({ onOpen, onEdit, onCreate, lowStockOnly = false }: PartListProps) {
  const { profile } = useSession()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [onlyLow, setOnlyLow] = useState(false)
  const [page, setPage] = useState(0)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const debouncedSearch = useDebouncedValue(search, 200)
  const lowFilter = lowStockOnly || onlyLow

  const categories = useLiveQuery(() => listPartCategories(), [])
  const result = useLiveQuery(
    () =>
      queryParts({
        search: debouncedSearch,
        category: category || undefined,
        lowStockOnly: lowFilter,
        page,
        pageSize: PAGE_SIZE,
      }),
    [debouncedSearch, category, lowFilter, page],
  )

  const total = result?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  async function confirmDelete(id: string) {
    setActionError(null)
    try {
      if (!profile) throw new Error('Sign in to delete spare parts')
      await deletePart({ id: profile.id, role: profile.role }, id)
      setConfirmingId(null)
      if (result && result.items.length === 1 && page > 0) setPage(page - 1)
    } catch {
      setActionError('Delete failed: only an admin can delete spare parts.')
    }
  }

  return (
    <section className="equipment-page">
      <div className="page-heading">
        <div>
          <h2 className="page-title">{lowStockOnly ? 'Low stock' : 'Spare parts'}</h2>
          <p className="page-sub">
            {result === undefined
              ? 'Loading…'
              : lowStockOnly
                ? `${total} part${total === 1 ? '' : 's'} below minimum stock`
                : `${total} item${total === 1 ? '' : 's'}`}
          </p>
        </div>
        {!lowStockOnly && (
          <button className="button button-primary" type="button" onClick={onCreate}>
            New part
          </button>
        )}
      </div>

      <div className="filters">
        <label className="field field-search">
          <span className="field-label">Search</span>
          <input
            className="input"
            type="search"
            value={search}
            placeholder="Code, name or category"
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(0)
            }}
          />
        </label>
        <label className="field">
          <span className="field-label">Category</span>
          <select
            className="input"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value)
              setPage(0)
            }}
          >
            <option value="">All categories</option>
            {(categories ?? []).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        {!lowStockOnly && (
          <label className="field field-checkbox">
            <input
              type="checkbox"
              checked={onlyLow}
              onChange={(e) => {
                setOnlyLow(e.target.checked)
                setPage(0)
              }}
            />
            <span>Low stock only</span>
          </label>
        )}
      </div>

      {actionError && (
        <p className="form-error" role="alert">
          {actionError}
        </p>
      )}

      {result === undefined ? (
        <p className="muted">Loading spare parts…</p>
      ) : result.items.length === 0 ? (
        <p className="empty-state">
          {lowStockOnly ? 'Nothing is below minimum stock right now.' : 'No spare parts match these filters.'}
        </p>
      ) : (
        <>
          <div className="data-table-wrap">
            <table className="data-table parts-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Stock</th>
                  <th>Min</th>
                  <th className="col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((item) => (
                  <tr key={item.id}>
                    <td data-label="Code">
                      <span className="mono">{item.code}</span>
                    </td>
                    <td data-label="Name">
                      <button className="link-button" type="button" onClick={() => onOpen(item.id)}>
                        {item.name}
                      </button>
                    </td>
                    <td data-label="Category">{item.category || '—'}</td>
                    <td data-label="Stock">
                      <StockPill stock={item.stock} min={item.min_stock} />
                      {item.unit && <span className="unit-note"> {item.unit}</span>}
                    </td>
                    <td data-label="Min">{item.min_stock}</td>
                    <td data-label="Actions" className="col-actions">
                      <div className="row-actions">
                        <button className="button button-quiet" type="button" onClick={() => onEdit(item.id)}>
                          Edit
                        </button>
                        <RequireRole role="admin">
                          {confirmingId === item.id ? (
                            <>
                              <button
                                className="button button-danger"
                                type="button"
                                onClick={() => void confirmDelete(item.id)}
                              >
                                Confirm
                              </button>
                              <button
                                className="button button-quiet"
                                type="button"
                                onClick={() => setConfirmingId(null)}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              className="button button-quiet"
                              type="button"
                              onClick={() => setConfirmingId(item.id)}
                            >
                              Delete
                            </button>
                          )}
                        </RequireRole>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <nav className="pagination" aria-label="Spare part pages">
            <button
              className="button button-quiet"
              type="button"
              disabled={page === 0}
              onClick={() => setPage((current) => Math.max(0, current - 1))}
            >
              Previous
            </button>
            <span className="pagination-info">
              Page {page + 1} of {totalPages} · {total} total
            </span>
            <button
              className="button button-quiet"
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
            >
              Next
            </button>
          </nav>
        </>
      )}
    </section>
  )
}
