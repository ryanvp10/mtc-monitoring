import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { RequireRole } from '../../auth/RequireRole'
import { useSession } from '../../auth/sessionContext'
import { db } from '../../db/db'
import { queryEquipment } from '../../db/equipmentQueries'
import { deleteEquipment } from '../../db/equipmentService'
import { listActive } from '../../db/repo'
import type { Equipment, EquipmentStatus } from '../../db/types'
import { useDebouncedValue } from '../../lib/useDebouncedValue'

const PAGE_SIZE = 20

interface EquipmentListProps {
  onOpen: (id: string) => void
  onEdit: (id: string) => void
  onCreate: () => void
}

export function EquipmentList({ onOpen, onEdit, onCreate }: EquipmentListProps) {
  const { profile } = useSession()
  const [search, setSearch] = useState('')
  const [line, setLine] = useState('')
  const [status, setStatus] = useState<EquipmentStatus | ''>('')
  const [page, setPage] = useState(0)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const debouncedSearch = useDebouncedValue(search, 200)

  const lines = useLiveQuery(async () => {
    const rows = await listActive(db.equipment)
    return [...new Set(rows.map((row) => row.line).filter(Boolean))].sort((a, b) => a.localeCompare(b))
  }, [])

  const result = useLiveQuery(
    () =>
      queryEquipment({
        search: debouncedSearch,
        line: line || undefined,
        status: status || undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
    [debouncedSearch, line, status, page],
  )

  const total = result?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  async function confirmDelete(item: Equipment) {
    setActionError(null)
    try {
      if (!profile) throw new Error('Sign in to delete equipment')
      await deleteEquipment({ id: profile.id, role: profile.role }, item.id)
      setConfirmingId(null)
      if (result && result.items.length === 1 && page > 0) setPage(page - 1)
    } catch {
      setActionError('Delete failed: only an admin can delete equipment.')
    }
  }

  const statusOptions: { value: EquipmentStatus | ''; label: string }[] = [
    { value: '', label: 'All statuses' },
    { value: 'running', label: 'Running' },
    { value: 'standby', label: 'Standby' },
    { value: 'breakdown', label: 'Breakdown' },
  ]

  return (
    <section className="equipment-page">
      <div className="page-heading">
        <div>
          <h2 className="page-title">Equipment</h2>
          <p className="page-sub">
            {result === undefined ? 'Loading…' : `${total} item${total === 1 ? '' : 's'}`}
          </p>
        </div>
        <button className="button button-primary" type="button" onClick={onCreate}>
          New equipment
        </button>
      </div>

      <div className="filters">
        <label className="field field-search">
          <span className="field-label">Search</span>
          <input
            className="input"
            type="search"
            value={search}
            placeholder="Code or name"
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(0)
            }}
          />
        </label>
        <label className="field">
          <span className="field-label">Line</span>
          <select
            className="input"
            value={line}
            onChange={(e) => {
              setLine(e.target.value)
              setPage(0)
            }}
          >
            <option value="">All lines</option>
            {(lines ?? []).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">Status</span>
          <select
            className="input"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as EquipmentStatus | '')
              setPage(0)
            }}
          >
            {statusOptions.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {actionError && (
        <p className="form-error" role="alert">
          {actionError}
        </p>
      )}

      {result === undefined ? (
        <p className="muted">Loading equipment…</p>
      ) : result.items.length === 0 ? (
        <p className="empty-state">No equipment matches these filters.</p>
      ) : (
        <>
          <div className="equipment-table-wrap">
            <table className="equipment-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Line</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th className="col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((item) => (
                  <tr key={item.id}>
                    <td className="mono">{item.code}</td>
                    <td>
                      <button className="link-button" type="button" onClick={() => onOpen(item.id)}>
                        {item.name}
                      </button>
                    </td>
                    <td>{item.line || '—'}</td>
                    <td>{item.category || '—'}</td>
                    <td>
                      <StatusPill status={item.status} />
                    </td>
                    <td className="col-actions">
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
                                onClick={() => void confirmDelete(item)}
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

          <div className="equipment-cards">
            {result.items.map((item) => (
              <article className="equipment-card" key={item.id}>
                <div className="card-top">
                  <span className="mono card-code">{item.code}</span>
                  <StatusPill status={item.status} />
                </div>
                <button className="link-button card-name" type="button" onClick={() => onOpen(item.id)}>
                  {item.name}
                </button>
                <dl className="card-meta">
                  <div>
                    <dt>Line</dt>
                    <dd>{item.line || '—'}</dd>
                  </div>
                  <div>
                    <dt>Category</dt>
                    <dd>{item.category || '—'}</dd>
                  </div>
                </dl>
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
                          onClick={() => void confirmDelete(item)}
                        >
                          Confirm delete
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
              </article>
            ))}
          </div>

          <nav className="pagination" aria-label="Equipment pages">
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

export function StatusPill({ status }: { status: EquipmentStatus }) {
  return <span className={`status-pill status-${status}`}>{status}</span>
}