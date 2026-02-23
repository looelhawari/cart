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
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { Lock, Mail, Shield, TrendingUp, Package, Users, BarChart3, Eye, EyeOff } from 'lucide-react'

const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    remember_me: z.boolean().optional(),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
    const navigate = useNavigate()
    const { setAuth } = useAuthStore()
    const { toast } = useToast()
    const { t } = useTranslation()
    const [isLoading, setIsLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            remember_me: false,
        },
    })

    const onSubmit = async (data: LoginFormData) => {
        setIsLoading(true)
        try {
            const response = await authService.login({
                email: data.email,
                password: data.password,
                remember_me: data.remember_me,
            })
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
            setAuth(user, response.data.access_token, response.data.refresh_token)
            toast({
                title: t('auth.loginSuccess'),
                description: `${t('auth.welcomeBack')}, ${response.data.user.first_name}!`,
            })
            navigate('/dashboard')
        } catch (error: any) {
            toast({
                title: t('auth.loginFailed'),
                description: error.response?.data?.message || t('auth.invalidCredentials'),
                variant: 'destructive',
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex bg-gradient-to-br from-elbaraka-primary via-elbaraka-secondary to-gray-900 relative overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-white/5 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-white/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
            </div>

            {/* Language Switcher */}
            <div className="absolute top-6 right-6 z-20">
                <LanguageSwitcher />
            </div>

            <div className="flex-1 flex items-center justify-center p-6 relative z-10">
                {/* Left Side - Branding & Stats */}
                <div className="hidden lg:flex flex-col justify-center flex-1 max-w-2xl ml-12 items-start">
                    <div className="space-y-6">
                        {/* Logo and Title */}
                        <div className="flex items-center gap-4">
                            <div className="h-20 w-20 rounded-2xl bg-white/10 backdrop-blur-lg flex items-center justify-center border border-white/20 shadow-2xl">
                                <span className="text-white text-3xl font-bold">EB</span>
                            </div>
                            <div>
                                <h1 className="text-5xl font-bold text-white mb-2">El Baraka</h1>
                                <p className="text-white/80 text-xl">{t('auth.adminPortal')}</p>
                            </div>
                        </div>

                        <p className="text-white/90 text-lg leading-relaxed max-w-md">
                            {t('auth.secureLogin')}
                        </p>

                        {/* Stats Cards */}
                        <div className="grid grid-cols-2 gap-4 mt-8">
                            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-4 hover:bg-white/15 transition-all">
                                <div className="flex items-center gap-3">
                                    <Package className="h-8 w-8 text-white/90" />
                                    <div>
                                        <p className="text-white/70 text-sm">{t('common.products')}</p>
                                        <p className="text-white text-2xl font-bold">1000+</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-4 hover:bg-white/15 transition-all">
                                <div className="flex items-center gap-3">
                                    <Users className="h-8 w-8 text-white/90" />
                                    <div>
                                        <p className="text-white/70 text-sm">{t('dashboard.totalUsers')}</p>
                                        <p className="text-white text-2xl font-bold">5000+</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-4 hover:bg-white/15 transition-all">
                                <div className="flex items-center gap-3">
                                    <TrendingUp className="h-8 w-8 text-white/90" />
                                    <div>
                                        <p className="text-white/70 text-sm">{t('dashboard.totalOrders')}</p>
                                        <p className="text-white text-2xl font-bold">10K+</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-4 hover:bg-white/15 transition-all">
                                <div className="flex items-center gap-3">
                                    <BarChart3 className="h-8 w-8 text-white/90" />
                                    <div>
                                        <p className="text-white/70 text-sm">{t('dashboard.revenue')}</p>
                                        <p className="text-white text-2xl font-bold">2M+</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side - Login Form */}
                <div className="flex-1 flex items-center justify-center max-w-md w-full">
                    <Card className="w-full shadow-2xl border-0 bg-white/95 backdrop-blur-lg">
                        <CardHeader className="space-y-3 pb-6">
                            <div className="flex items-center justify-center">
                                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-elbaraka-primary to-elbaraka-secondary flex items-center justify-center shadow-lg">
                                    <Shield className="h-8 w-8 text-white" />
                                </div>
                            </div>
                            <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-elbaraka-primary to-elbaraka-secondary bg-clip-text text-transparent">
                                {t('auth.adminLogin')}
                            </CardTitle>
                            <CardDescription className="text-center text-base">
                                {t('auth.signInDescription')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-sm font-medium">
                                        {t('auth.email')}
                                    </Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="admin@elbaraka.com"
                                            className="pl-10 h-12 border-2 focus:border-elbaraka-primary transition-colors"
                                            {...register('email')}
                                        />
                                    </div>
                                    {errors.email && (
                                        <p className="text-sm text-red-600">{t('validation.invalidEmail')}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="password" className="text-sm font-medium">
                                        {t('auth.password')}
                                    </Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                        <Input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="••••••••"
                                            className="pl-10 pr-10 h-12 border-2 focus:border-elbaraka-primary transition-colors"
                                            {...register('password')}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                    {errors.password && (
                                        <p className="text-sm text-red-600">
                                            {t('validation.minLength', { field: t('auth.password'), count: 6 })}
                                        </p>
                                    )}
                                </div>

                                <div className="flex items-center space-x-2">
                                    <input
                                        id="remember_me"
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-gray-300 text-elbaraka-primary focus:ring-elbaraka-primary cursor-pointer"
                                        {...register('remember_me')}
                                    />
                                    <Label htmlFor="remember_me" className="cursor-pointer text-sm font-medium">
                                        {t('auth.rememberMe')}
                                    </Label>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full h-12 bg-gradient-to-r from-elbaraka-primary to-elbaraka-secondary hover:opacity-90 text-white font-semibold text-base shadow-lg hover:shadow-xl transition-all duration-300"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <div className="flex items-center gap-2">
                                            <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                                            <span>{t('auth.signingIn')}</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <Shield className="h-5 w-5" />
                                            <span>{t('auth.signIn')}</span>
                                        </div>
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Mobile Logo - Shown on small screens */}
            <div className="lg:hidden absolute top-6 left-1/2 -translate-x-1/2 z-20">
                <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-white/10 backdrop-blur-lg flex items-center justify-center border border-white/20">
                        <span className="text-white text-xl font-bold">EB</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white">El Baraka</h1>
                </div>
            </div>
        </div>
    )
}
