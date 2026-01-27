import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'

const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
    const navigate = useNavigate()
    const { setAuth } = useAuthStore()
    const { toast } = useToast()
    const [isLoading, setIsLoading] = useState(false)

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
    })



    const onSubmit = async (data: LoginFormData) => {
        setIsLoading(true)
        try {
            const response = await authService.login(data)
            const user = {
                id: response.data.user.id,
                first_name: response.data.user.first_name,
                last_name: response.data.user.last_name,
                email: response.data.user.email,
                phone: response.data.user.phone,
                role: response.data.user.role,
                is_active: true,
                email_verified_at: null,
                two_factor_enabled: false,
                last_login_at: null,
                last_login_ip: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            }
            setAuth(user, response.data.access_token)
            toast({
                title: 'Login successful',
                description: `Welcome back, ${response.data.user.first_name}!`,
            })
            navigate('/dashboard')
        } catch (error: any) {
            toast({
                title: 'Login failed',
                description: error.response?.data?.message || 'Invalid credentials',
                variant: 'destructive',
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-elbaraka-bg">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="h-16 w-16 rounded-full bg-elbaraka-primary flex items-center justify-center text-white text-2xl font-bold">
                            EB
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold text-elbaraka-primary">ElBaraka Admin</CardTitle>
                    <CardDescription>
                        Sign in to your admin account to manage the platform
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="admin@elbaraka.com"
                                {...register('email')}
                            />
                            {errors.email && (
                                <p className="text-sm text-destructive">{errors.email.message}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                {...register('password')}
                            />
                            {errors.password && (
                                <p className="text-sm text-destructive">{errors.password.message}</p>
                            )}
                        </div>
                        <Button
                            type="submit"
                            className="w-full bg-elbaraka-primary hover:bg-elbaraka-secondary"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Signing in...' : 'Sign In'}
                        </Button>
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>

                        </div>

                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
