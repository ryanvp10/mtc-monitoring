import { useState } from 'react'
import { EquipmentDetail } from './EquipmentDetail'
import { EquipmentForm } from './EquipmentForm'
import { EquipmentList } from './EquipmentList'

type View =
  | { name: 'list' }
  | { name: 'create' }
  | { name: 'edit'; id: string }
  | { name: 'detail'; id: string }

export function EquipmentPage() {
  const [view, setView] = useState<View>({ name: 'list' })

  switch (view.name) {
    case 'create':
      return (
        <EquipmentForm
          onCancel={() => setView({ name: 'list' })}
          onSaved={(id) => setView({ name: 'detail', id })}
        />
      )
    case 'edit':
      return (
        <EquipmentForm
          key={view.id}
          equipmentId={view.id}
          onCancel={() => setView({ name: 'detail', id: view.id })}
          onSaved={(id) => setView({ name: 'detail', id })}
        />
      )
    case 'detail':
      return (
        <EquipmentDetail
          equipmentId={view.id}
          onBack={() => setView({ name: 'list' })}
          onEdit={() => setView({ name: 'edit', id: view.id })}
        />
      )
    default:
      return (
        <EquipmentList
          onCreate={() => setView({ name: 'create' })}
          onOpen={(id) => setView({ name: 'detail', id })}
          onEdit={(id) => setView({ name: 'edit', id })}
        />
      )
  }
}