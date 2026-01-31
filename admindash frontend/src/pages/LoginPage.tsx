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
    const { t, i18n } = useTranslation()
    const [isLoading, setIsLoading] = useState(false)
    const isRTL = i18n.language === 'ar'

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
        <div className="min-h-screen flex items-center justify-center bg-elbaraka-bg relative">
            {/* Language Switcher in top corner */}
            <div className={`absolute top-4 ${isRTL ? 'left-4' : 'right-4'}`}>
                <LanguageSwitcher />
            </div>

            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="h-16 w-16 rounded-full bg-elbaraka-primary flex items-center justify-center text-white text-2xl font-bold">
                            EB
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold text-elbaraka-primary">{t('auth.adminLogin')}</CardTitle>
                    <CardDescription>
                        {t('auth.signInDescription')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">{t('auth.email')}</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="admin@elbaraka.com"
                                className={isRTL ? 'text-right' : 'text-left'}
                                {...register('email')}
                            />
                            {errors.email && (
                                <p className="text-sm text-destructive">{t('validation.invalidEmail')}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">{t('auth.password')}</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                className={isRTL ? 'text-right' : 'text-left'}
                                {...register('password')}
                            />
                            {errors.password && (
                                <p className="text-sm text-destructive">{t('validation.minLength', { field: t('auth.password'), count: 6 })}</p>
                            )}
                        </div>
                        <Button
                            type="submit"
                            className="w-full bg-elbaraka-primary hover:bg-elbaraka-secondary"
                            disabled={isLoading}
                        >
                            {isLoading ? t('auth.signingIn') : t('auth.signIn')}
                        </Button>
                        <div className="flex items-center space-x-2">
                            <input
                                id="remember_me"
                                type="checkbox"
                                className="h-4 w-4"
                                {...register('remember_me')}
                            />
                            <Label htmlFor="remember_me">{t('auth.rememberMe')}</Label>
                        </div>
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
