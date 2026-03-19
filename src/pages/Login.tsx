import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { gasGet, gasPost } from '@/lib/api'
import type { GASUser } from '@/lib/api'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

const registerSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(4, 'Password must be at least 4 characters'),
})

type LoginFormData = z.infer<typeof loginSchema>
type RegisterFormData = z.infer<typeof registerSchema>

export default function Login() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [serverError, setServerError] = useState<string | null>(null)
  const [mode, setMode] = useState<'login' | 'register'>('login')

  const loginForm = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) })
  const registerForm = useForm<RegisterFormData>({ resolver: zodResolver(registerSchema) })

  const onLogin = loginForm.handleSubmit(async (data) => {
    try {
      setServerError(null)
      const res = await gasGet<{ success?: boolean; error?: string; token: string; user: GASUser }>(
        'login',
        { email: data.email, password: data.password }
      )
      login(res.user, res.token)
      navigate('/', { replace: true })
    } catch (err: unknown) {
      setServerError((err as Error).message || 'Login failed. Please try again.')
    }
  })

  const onRegister = registerForm.handleSubmit(async (data) => {
    try {
      setServerError(null)
      const res = await gasPost<{ success?: boolean; error?: string; user: GASUser }>(
        'register',
        { name: data.name, email: data.email, password: data.password }
      )
      // After register, log in automatically
      const loginRes = await gasGet<{ success?: boolean; token: string; user: GASUser }>(
        'login',
        { email: data.email, password: data.password }
      )
      login(loginRes.user, loginRes.token)
      navigate('/', { replace: true })
    } catch (err: unknown) {
      setServerError((err as Error).message || 'Registration failed. Please try again.')
    }
  })

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">CMMS</h1>
          <p className="text-muted-foreground mt-1">Maintenance Management System</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{mode === 'login' ? 'Sign in' : 'Create account'}</CardTitle>
            <CardDescription>
              {mode === 'login'
                ? 'Enter your credentials to access the system'
                : 'Register a new technician account'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {mode === 'login' ? (
              <form onSubmit={onLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="you@example.com" autoComplete="email" {...loginForm.register('email')} />
                  {loginForm.formState.errors.email && (
                    <p className="text-sm text-destructive">{loginForm.formState.errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" placeholder="••••••••" autoComplete="current-password" {...loginForm.register('password')} />
                  {loginForm.formState.errors.password && (
                    <p className="text-sm text-destructive">{loginForm.formState.errors.password.message}</p>
                  )}
                </div>
                {serverError && (
                  <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
                    <p className="text-sm text-destructive">{serverError}</p>
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={loginForm.formState.isSubmitting}>
                  {loginForm.formState.isSubmitting ? 'Signing in…' : 'Sign in'}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  No account?{' '}
                  <button type="button" onClick={() => { setMode('register'); setServerError(null) }} className="text-primary underline-offset-4 hover:underline">
                    Register
                  </button>
                </p>
              </form>
            ) : (
              <form onSubmit={onRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" type="text" placeholder="John Doe" {...registerForm.register('name')} />
                  {registerForm.formState.errors.name && (
                    <p className="text-sm text-destructive">{registerForm.formState.errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email">Email</Label>
                  <Input id="reg-email" type="email" placeholder="you@example.com" {...registerForm.register('email')} />
                  {registerForm.formState.errors.email && (
                    <p className="text-sm text-destructive">{registerForm.formState.errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password">Password</Label>
                  <Input id="reg-password" type="password" placeholder="••••••••" {...registerForm.register('password')} />
                  {registerForm.formState.errors.password && (
                    <p className="text-sm text-destructive">{registerForm.formState.errors.password.message}</p>
                  )}
                </div>
                {serverError && (
                  <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
                    <p className="text-sm text-destructive">{serverError}</p>
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={registerForm.formState.isSubmitting}>
                  {registerForm.formState.isSubmitting ? 'Creating account…' : 'Create account'}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{' '}
                  <button type="button" onClick={() => { setMode('login'); setServerError(null) }} className="text-primary underline-offset-4 hover:underline">
                    Sign in
                  </button>
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
