'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase'
import { toast } from 'react-hot-toast'
import { Facebook, Loader2, CheckCircle } from 'lucide-react'

interface FacebookLoginRealProps {
  onSuccess?: (user: any) => void
  onError?: (error: string) => void
}

declare global {
  interface Window {
    FB: any
  }
}

export function FacebookLoginReal({ onSuccess, onError }: FacebookLoginRealProps) {
  const [loading, setLoading] = useState(false)
  const [isFacebookLoaded, setIsFacebookLoaded] = useState(false)
  const supabase = createClient()

  // Load Facebook SDK
  useEffect(() => {
    const facebookAppId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID
    
    if (!facebookAppId) {
      console.error('Facebook App ID not configured')
      toast.error('Facebook App ID chưa được cấu hình. Vui lòng liên hệ admin.')
      return
    }

    if (typeof window !== 'undefined' && !window.FB) {
      const script = document.createElement('script')
      script.src = 'https://connect.facebook.net/vi_VN/sdk.js'
      script.async = true
      script.defer = true
      script.crossOrigin = 'anonymous'
      document.body.appendChild(script)

      script.onload = () => {
        window.FB.init({
          appId: facebookAppId,
          cookie: true,
          xfbml: true,
          version: 'v18.0'
        })
        setIsFacebookLoaded(true)
      }

      script.onerror = () => {
        console.error('Failed to load Facebook SDK')
        toast.error('Không thể tải Facebook SDK')
      }
    } else if (window.FB) {
      setIsFacebookLoaded(true)
    }
  }, [])

  const handleFacebookLogin = async () => {
    if (!isFacebookLoaded) {
      toast.error('Facebook SDK chưa sẵn sàng')
      return
    }

    try {
      setLoading(true)
      
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
                  console.error('Database error:', userError)
                  throw new Error('Lỗi cơ sở dữ liệu')
                }

                // Create user analytics record
                await supabase
                  .from('user_analytics')
                  .upsert({
                    user_id: userData.id,
                    total_listings: 0,
                    total_connections: 0,
                    response_rate: 0,
                    avg_response_time: 0,
                    conversion_rate: 0,
                    revenue_generated: 0,
                    last_activity: new Date().toISOString(),
                  })

                // Create user points record
                await supabase
                  .from('user_points')
                  .upsert({
                    user_id: userData.id,
                    points: 0,
                    level: 1,
                    total_earned: 0,
                    last_activity: new Date().toISOString(),
                  })

                // Create user astrology record
                await supabase
                  .from('user_astrology')
                  .upsert({
                    user_id: userData.id,
                    chinese_zodiac: 'Tân Dậu',
                    element: 'Kim',
                    lucky_numbers: [1, 6, 8, 9],
                    lucky_colors: ['Vàng', 'Trắng', 'Xanh dương'],
                  })

                // Add New Member achievement
                await supabase
                  .from('user_achievements')
                  .insert({
                    user_id: userData.id,
                    achievement_type: 'New Member',
                  })

                toast.success('Đăng nhập thành công! Chào mừng đến với BOT TÂN DẬU 1981!')
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

  // Check if Facebook App ID is configured
  const facebookAppId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID
  
  if (!facebookAppId) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-yellow-500 bg-clip-text text-transparent">
            Đăng nhập với Facebook
          </CardTitle>
          <CardDescription>
            Chỉ dành cho thành viên sinh năm 1981
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="text-yellow-600">⚠️</div>
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">Tính năng đang được cấu hình</p>
                <p>
                  Facebook Login đang được thiết lập. Vui lòng thử lại sau hoặc liên hệ admin.
                </p>
              </div>
            </div>
          </div>
          
          <Button
            onClick={() => {
              alert('Tính năng Facebook Login sẽ được thêm vào sau!')
              onSuccess?.({})
            }}
            className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white"
            size="lg"
          >
            <Facebook className="w-5 h-5 mr-2" />
            Tiếp tục với Facebook (Demo)
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-yellow-500 bg-clip-text text-transparent">
          Đăng nhập với Facebook
        </CardTitle>
        <CardDescription>
          Chỉ dành cho thành viên sinh năm 1981
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={handleFacebookLogin}
          disabled={loading || !isFacebookLoaded}
          className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white"
          size="lg"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : !isFacebookLoaded ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <Facebook className="w-5 h-5 mr-2" />
          )}
          {loading ? 'Đang đăng nhập...' : !isFacebookLoaded ? 'Đang tải...' : 'Tiếp tục với Facebook'}
        </Button>
        
        {isFacebookLoaded && (
          <div className="flex items-center justify-center text-sm text-green-600">
            <CheckCircle className="w-4 h-4 mr-2" />
            Facebook SDK đã sẵn sàng
          </div>
        )}
        
        <div className="text-center text-sm text-gray-500">
          <p>Bằng cách đăng nhập, bạn đồng ý với</p>
          <p>
            <a href="#" className="text-blue-600 hover:underline">
              Điều khoản sử dụng
            </a>
            {' '}và{' '}
            <a href="#" className="text-blue-600 hover:underline">
              Chính sách bảo mật
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
