import { Menu, Bell, LogOut, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthStore } from '@/store/authStore'
import { useNavigate } from 'react-router-dom'
import { gasPost } from '@/lib/api'

interface TopbarProps {
  onMenuToggle: () => void
}

export function Topbar({ onMenuToggle }: TopbarProps) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try { await gasPost('logout') } catch { /* ignore */ }
    logout()
    navigate('/login')
  }

  const initials = user?.avatar || user?.name?.substring(0, 2).toUpperCase() || 'U'

  return (
    <header className="flex h-16 items-center border-b bg-background px-4 gap-4">
      <Button variant="ghost" size="icon" onClick={onMenuToggle} className="lg:hidden">
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex-1" />

      <Button variant="ghost" size="icon">
        <Bell className="h-5 w-5" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-9 w-9 rounded-full">
            <Avatar className="h-9 w-9">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{user?.name}</p>
              <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate('/settings/users')}>
            <User className="mr-2 h-4 w-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
