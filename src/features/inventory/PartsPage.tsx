import { useState } from 'react'
import { PartDetail } from './PartDetail'
import { PartForm } from './PartForm'
import { PartList } from './PartList'

type View =
  | { name: 'list' }
  | { name: 'low' }
  | { name: 'create' }
  | { name: 'edit'; id: string }
  | { name: 'detail'; id: string }

export function PartsPage({ startAtLowStock = false }: { startAtLowStock?: boolean }) {
  const [view, setView] = useState<View>(startAtLowStock ? { name: 'low' } : { name: 'list' })

  switch (view.name) {
    case 'create':
      return <PartForm onCancel={() => setView({ name: 'list' })} onSaved={(id) => setView({ name: 'detail', id })} />
    case 'edit':
      return (
        <PartForm
          key={view.id}
          partId={view.id}
          onCancel={() => setView({ name: 'detail', id: view.id })}
          onSaved={(id) => setView({ name: 'detail', id })}
        />
      )
    case 'detail':
      return (
        <PartDetail
          partId={view.id}
          onBack={() => setView({ name: 'list' })}
          onEdit={() => setView({ name: 'edit', id: view.id })}
        />
      )
    case 'low':
      return (
        <PartList
          lowStockOnly
          onCreate={() => setView({ name: 'create' })}
          onOpen={(id) => setView({ name: 'detail', id })}
          onEdit={(id) => setView({ name: 'edit', id })}
        />
      )
    default:
      return (
        <PartList
          onCreate={() => setView({ name: 'create' })}
          onOpen={(id) => setView({ name: 'detail', id })}
          onEdit={(id) => setView({ name: 'edit', id })}
        />
      )
  }
}
