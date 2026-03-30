import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import { AssetsPage } from '@/pages/Assets/AssetsPage'
import { AssetDetailPage } from '@/pages/Assets/AssetDetailPage'
import { WorkOrdersPage } from '@/pages/WorkOrders/WorkOrdersPage'
import { WorkOrderDetailPage } from '@/pages/WorkOrders/WorkOrderDetailPage'
import { PMSchedulesPage } from '@/pages/PM/PMSchedulesPage'
import { MaintenanceTasksPage } from '@/pages/PM/MaintenanceTasksPage'
import { PartsPage } from '@/pages/Inventory/PartsPage'
import { InventoryTransactionsPage } from '@/pages/Inventory/InventoryTransactionsPage'
import { VendorsPage } from '@/pages/Purchasing/VendorsPage'
import { PurchaseOrdersPage } from '@/pages/Purchasing/PurchaseOrdersPage'
import { LocationsPage } from '@/pages/Locations/LocationsPage'
import { UsersPage } from '@/pages/Settings/UsersPage'
import { RolesPage } from '@/pages/Settings/RolesPage'
import { TeamsPage } from '@/pages/Settings/TeamsPage'
import { AssetCategoriesPage } from '@/pages/Settings/AssetCategoriesPage'
import { WorkOrderTypesPage } from '@/pages/Settings/WorkOrderTypesPage'
import { FailureCodesPage } from '@/pages/Settings/FailureCodesPage'
import { PartsCategoriesPage } from '@/pages/Settings/PartsCategoriesPage'
import { OrganizationPage } from '@/pages/Settings/OrganizationPage'

export default function AppRouter() {
  return (
    <BrowserRouter basename="/cmms-app">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/assets" element={<AssetsPage />} />
            <Route path="/assets/:id" element={<AssetDetailPage />} />
            <Route path="/work-orders" element={<WorkOrdersPage />} />
            <Route path="/work-orders/:id" element={<WorkOrderDetailPage />} />
            <Route path="/pm-schedules" element={<PMSchedulesPage />} />
            <Route path="/maintenance-tasks" element={<MaintenanceTasksPage />} />
            <Route path="/inventory/parts" element={<PartsPage />} />
            <Route path="/inventory/transactions" element={<InventoryTransactionsPage />} />
            <Route path="/purchasing/vendors" element={<VendorsPage />} />
            <Route path="/purchasing/orders" element={<PurchaseOrdersPage />} />
            <Route path="/locations" element={<LocationsPage />} />
            <Route path="/settings/organization" element={<OrganizationPage />} />
            <Route path="/settings/users" element={<UsersPage />} />
            <Route path="/settings/roles" element={<RolesPage />} />
            <Route path="/settings/teams" element={<TeamsPage />} />
            <Route path="/settings/asset-categories" element={<AssetCategoriesPage />} />
            <Route path="/settings/work-order-types" element={<WorkOrderTypesPage />} />
            <Route path="/settings/failure-codes" element={<FailureCodesPage />} />
            <Route path="/settings/parts-categories" element={<PartsCategoriesPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
