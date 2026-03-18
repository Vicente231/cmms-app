import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import type { Organization, ApiResponse } from '@/types'
import { useForm } from 'react-hook-form'
import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'

export function OrganizationPage() {
  const { toast } = useToast()
  const qc = useQueryClient()
  const { user } = useAuthStore()

  const { data: org, isLoading } = useQuery({
    queryKey: ['organization', user?.orgId],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Organization>>(`/organizations/${user?.orgId}`)
      return data.data
    },
    enabled: !!user?.orgId,
  })

  const update = useMutation({
    mutationFn: async (body: Partial<Organization>) => {
      const { data } = await api.put(`/organizations/${user?.orgId}`, body)
      return data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['organization'] }),
  })

  const { register, handleSubmit, reset } = useForm<Partial<Organization>>()

  useEffect(() => {
    if (org) reset(org)
  }, [org, reset])

  const onSubmit = handleSubmit(async (data) => {
    try {
      await update.mutateAsync(data)
      toast({ title: 'Organization settings saved' })
    } catch {
      toast({ title: 'Error saving settings', variant: 'destructive' })
    }
  })

  if (isLoading) return <div>Loading...</div>

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Organization Settings</h1><p className="text-muted-foreground">Manage your organization information</p></div>

      <Card className="max-w-2xl">
        <CardHeader><CardTitle>General Information</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Organization Name *</Label><Input {...register('name', { required: true })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Timezone</Label><Input {...register('timezone')} /></div>
              <div className="space-y-2"><Label>Currency</Label><Input {...register('currency')} maxLength={3} /></div>
            </div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" {...register('email')} /></div>
            <div className="space-y-2"><Label>Phone</Label><Input {...register('phone')} /></div>
            <div className="space-y-2"><Label>Address</Label><Input {...register('address')} /></div>
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
