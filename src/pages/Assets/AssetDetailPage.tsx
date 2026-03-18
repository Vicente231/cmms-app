import { useParams, useNavigate } from 'react-router-dom'
import { useAsset } from '@/hooks/useAssets'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ArrowLeft, Package } from 'lucide-react'
import { format } from 'date-fns'

export function AssetDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: asset, isLoading } = useAsset(+id!)

  if (isLoading) return <div className="flex items-center justify-center h-64">Loading...</div>
  if (!asset) return <div className="text-center">Asset not found</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex items-center gap-3 flex-1">
          <div className="rounded-full bg-primary/10 p-2"><Package className="h-5 w-5 text-primary" /></div>
          <div>
            <h1 className="text-2xl font-bold">{asset.name}</h1>
            <p className="text-muted-foreground">{asset.assetTag || asset.serialNumber}</p>
          </div>
          <StatusBadge type="asset" value={asset.status} />
        </div>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="meters">Meters ({asset.meters?.length || 0})</TabsTrigger>
          <TabsTrigger value="custom-fields">Custom Fields ({asset.customFields?.length || 0})</TabsTrigger>
          <TabsTrigger value="children">Sub-Assets ({asset.childAssets?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Asset Information</CardTitle></CardHeader>
              <CardContent>
                <dl className="space-y-3 text-sm">
                  {[
                    ['Asset Tag', asset.assetTag],
                    ['Serial Number', asset.serialNumber],
                    ['Model', asset.model],
                    ['Manufacturer', asset.manufacturer],
                    ['Category', asset.category?.name],
                    ['Location', asset.location?.name],
                    ['Assigned To', asset.assignedUser ? `${asset.assignedUser.firstName} ${asset.assignedUser.lastName}` : null],
                  ].map(([label, value]) => (
                    <div key={label as string} className="flex justify-between">
                      <dt className="font-medium text-muted-foreground">{label}</dt>
                      <dd>{value || '-'}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Financial & Warranty</CardTitle></CardHeader>
              <CardContent>
                <dl className="space-y-3 text-sm">
                  {[
                    ['Purchase Date', asset.purchaseDate ? format(new Date(asset.purchaseDate), 'MMM d, yyyy') : null],
                    ['Purchase Cost', asset.purchaseCost ? `$${Number(asset.purchaseCost).toLocaleString()}` : null],
                    ['Warranty Expiry', asset.warrantyExpiry ? format(new Date(asset.warrantyExpiry), 'MMM d, yyyy') : null],
                  ].map(([label, value]) => (
                    <div key={label as string} className="flex justify-between">
                      <dt className="font-medium text-muted-foreground">{label}</dt>
                      <dd>{value || '-'}</dd>
                    </div>
                  ))}
                </dl>
                {asset.description && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Description</p>
                    <p className="text-sm">{asset.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="meters">
          <Card>
            <CardContent className="pt-6">
              {asset.meters?.length ? (
                <div className="space-y-3">
                  {asset.meters.map((meter) => (
                    <div key={meter.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium">{meter.name}</p>
                        <p className="text-sm text-muted-foreground">{meter.meterType}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">{Number(meter.currentValue).toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">{meter.unit}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-muted-foreground text-center py-8">No meters configured</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custom-fields">
          <Card>
            <CardContent className="pt-6">
              {asset.customFields?.length ? (
                <dl className="space-y-3 text-sm">
                  {asset.customFields.map((field) => (
                    <div key={field.id} className="flex justify-between border-b pb-2">
                      <dt className="font-medium text-muted-foreground">{field.fieldName}</dt>
                      <dd>{field.fieldValue || '-'}</dd>
                    </div>
                  ))}
                </dl>
              ) : <p className="text-muted-foreground text-center py-8">No custom fields</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="children">
          <Card>
            <CardContent className="pt-6">
              {asset.childAssets?.length ? (
                <div className="space-y-2">
                  {asset.childAssets.map((child) => (
                    <div key={child.id} className="flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:bg-accent" onClick={() => navigate(`/assets/${child.id}`)}>
                      <div>
                        <p className="font-medium">{child.name}</p>
                        <p className="text-sm text-muted-foreground">{child.assetTag}</p>
                      </div>
                      <StatusBadge type="asset" value={child.status} />
                    </div>
                  ))}
                </div>
              ) : <p className="text-muted-foreground text-center py-8">No sub-assets</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
