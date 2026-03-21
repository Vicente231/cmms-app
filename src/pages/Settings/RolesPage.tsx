import { useRoles } from '@/hooks/useUsers'
import { DataTable } from '@/components/shared/DataTable'
import { Badge } from '@/components/ui/badge'
import type { ColumnDef } from '@tanstack/react-table'
import type { Role } from '@/types'
import { Lock } from 'lucide-react'

export function RolesPage() {
  const { data: roles, isLoading } = useRoles()

  const columns: ColumnDef<Role>[] = [
    { accessorKey: 'name', header: 'Name', cell: ({ row }) => <div className="flex items-center gap-2"><span className="font-medium capitalize">{row.original.name}</span><Lock className="h-3 w-3 text-muted-foreground" /></div> },
    { accessorKey: 'description', header: 'Description', cell: ({ row }) => row.original.description || '-' },
    { accessorKey: 'isSystem', header: 'Type', cell: () => <Badge variant="secondary">System</Badge> },
  ]

  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold">Roles</h1><p className="text-muted-foreground">Built-in roles — admin, supervisor, technician</p></div>
      <DataTable columns={columns} data={roles || []} isLoading={isLoading} />
    </div>
  )
}
