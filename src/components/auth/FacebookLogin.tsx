'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase'
import { toast } from 'react-hot-toast'
import { Facebook, Loader2 } from 'lucide-react'

interface FacebookLoginProps {
    onSuccess?: (user: any) => void
    onError?: (error: string) => void
}

export function FacebookLogin({ onSuccess, onError }: FacebookLoginProps) {
    const [loading, setLoading] = useState(false)
    const supabase = createClient()

    const handleFacebookLogin = async () => {
        try {
            setLoading(true)

            // Initialize Facebook SDK
            if (!window.FB) {
                throw new Error('Facebook SDK chưa được tải')
            }

            // Login with Facebook
            window.FB.login(async (response: any) => {
                if (response.authResponse) {
                    try {
                        // Get user info from Facebook
                        window.FB.api('/me', { fields: 'id,name,email,birthday,picture' }, async (userInfo: any) => {
                            try {
                                // Verify age (must be born in 1981)
                                if (userInfo.birthday) {
                                    const birthYear = new Date(userInfo.birthday).getFullYear()
                                    if (birthYear !== 1981) {
                                        throw new Error('Chỉ dành cho thành viên sinh năm 1981')
                                    }
                                } else {
                                    throw new Error('Không thể xác minh năm sinh. Vui lòng cập nhật thông tin trên Facebook')
                                }

                                // Create or update user in Supabase
                                const { data: userData, error: userError } = await supabase
                                    .from('users')
                                    .upsert({
                                        facebook_id: userInfo.id,
                                        name: userInfo.name,
                                        email: userInfo.email,
                                        birthday: userInfo.birthday,
                                        avatar_url: userInfo.picture?.data?.url,
                                        status: 'trial',
                                        membership_expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days trial
                                        referral_code: `TD1981-${userInfo.id.slice(-6).toUpperCase()}`,
                                    })
                                    .select()
                                    .single()

                                if (userError) {
                                    throw new Error(userError.message)
                                }

                                // Sign in with Supabase Auth
                                const { error: authError } = await supabase.auth.signInWithPassword({
                                    email: userInfo.email || `${userInfo.id}@facebook.com`,
                                    password: userInfo.id, // Use Facebook ID as password for simplicity
                                })

                                if (authError) {
                                    // If user doesn't exist in auth, create them
                                    const { error: signUpError } = await supabase.auth.signUp({
                                        email: userInfo.email || `${userInfo.id}@facebook.com`,
                                        password: userInfo.id,
                                        options: {
                                            data: {
                                                facebook_id: userInfo.id,
                                                name: userInfo.name,
                                            }
                                        }
                                    })

                                    if (signUpError) {
                                        throw new Error(signUpError.message)
                                    }
                                }

                                toast.success('Đăng nhập thành công!')
                                onSuccess?.(userData)
                            } catch (error: any) {
                                console.error('Facebook login error:', error)
                                toast.error(error.message || 'Đăng nhập thất bại')
                                onError?.(error.message)
                            } finally {
                                setLoading(false)
                            }
                        })
                    } catch (error: any) {
                        console.error('Facebook API error:', error)
                        toast.error(error.message || 'Lỗi kết nối Facebook')
                        onError?.(error.message)
                        setLoading(false)
                    }
                } else {
                    setLoading(false)
                    toast.error('Đăng nhập Facebook bị hủy')
                }
            }, { scope: 'email,public_profile,user_birthday' })
        } catch (error: any) {
            console.error('Facebook login error:', error)
            toast.error(error.message || 'Lỗi đăng nhập Facebook')
            onError?.(error.message)
            setLoading(false)
        }
    }

    // Load Facebook SDK
    useState(() => {
        if (typeof window !== 'undefined' && !window.FB) {
            const script = document.createElement('script')
            script.src = 'https://connect.facebook.net/vi_VN/sdk.js'
            script.async = true
            script.defer = true
            script.crossOrigin = 'anonymous'
            document.body.appendChild(script)

            script.onload = () => {
                window.FB.init({
                    appId: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID!,
                    cookie: true,
                    xfbml: true,
                    version: 'v18.0'
                })
            }
        }
    })

    return (
        <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold text-gradient">
                    Đăng nhập với Facebook
                </CardTitle>
                <CardDescription>
                    Chỉ dành cho thành viên sinh năm 1981
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Button
                    onClick={handleFacebookLogin}
                    disabled={loading}
                    className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white"
                    size="lg"
                >
                    {loading ? (
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                        <Facebook className="w-5 h-5 mr-2" />
                    )}
                    {loading ? 'Đang đăng nhập...' : 'Tiếp tục với Facebook'}
                </Button>

                <div className="text-center text-sm text-gray-500">
                    <p>Bằng cách đăng nhập, bạn đồng ý với</p>
                    <p>
                        <a href="#" className="text-dau-600 hover:underline">
                            Điều khoản sử dụng
                        </a>
                        {' '}và{' '}
                        <a href="#" className="text-dau-600 hover:underline">
                            Chính sách bảo mật
                        </a>
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}

// Extend Window interface for Facebook SDK
declare global {
    interface Window {
        FB: any
    }
}
