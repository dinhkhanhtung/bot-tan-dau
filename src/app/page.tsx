'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Navigation } from '@/components/Navigation'
import { FacebookLoginReal } from '@/components/auth/FacebookLoginReal'
import { useUser } from '@/contexts/UserContext'
import { 
  ShoppingBag, 
  MessageCircle, 
  Users, 
  Star, 
  Calendar,
  Shield,
  Zap,
  Heart,
  ArrowRight
} from 'lucide-react'

export default function HomePage() {
  const [showAgeVerification, setShowAgeVerification] = useState(false)
  const [showFacebookLogin, setShowFacebookLogin] = useState(false)
  const { user, loading } = useUser()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-yellow-50">
      <Navigation />

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Chào mừng đến với
            <span className="bg-gradient-to-r from-blue-600 to-yellow-500 bg-clip-text text-transparent block mt-2">
              BOT TÂN DẬU 1981
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Platform kết nối mua bán dành riêng cho thành viên sinh năm 1981. 
            Chỉ 1,000đ/ngày, trial 3 ngày miễn phí.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button 
              size="lg" 
              className="text-lg px-8 py-4"
              onClick={() => setShowAgeVerification(true)}
            >
              🚀 Bắt đầu ngay - Trial 3 ngày
            </Button>
            <Link href="/marketplace">
              <Button 
                variant="outline" 
                size="lg" 
                className="text-lg px-8 py-4"
              >
                🛒 Khám phá Marketplace
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <ShoppingBag className="w-12 h-12 text-blue-600 mx-auto mb-2" />
                <CardTitle className="text-lg">Marketplace</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Mua bán sản phẩm và dịch vụ trong cộng đồng Tân Dậu
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <MessageCircle className="w-12 h-12 text-yellow-600 mx-auto mb-2" />
                <CardTitle className="text-lg">Chat Kết Nối</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Trò chuyện trực tiếp với người bán/mua
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <Users className="w-12 h-12 text-green-600 mx-auto mb-2" />
                <CardTitle className="text-lg">Cộng Đồng</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Kết nối với những người cùng tuổi Tân Dậu
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <Shield className="w-12 h-12 text-purple-600 mx-auto mb-2" />
                <CardTitle className="text-lg">An Toàn</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Xác minh tuổi và đánh giá uy tín
                </CardDescription>
              </CardContent>
            </Card>
          </div>

          {/* Stats */}
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">
              Thống kê cộng đồng
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">1,247</div>
                <div className="text-gray-600">Thành viên</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600 mb-2">3,456</div>
                <div className="text-gray-600">Tin đăng</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">8,912</div>
                <div className="text-gray-600">Kết nối</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600 mb-2">4.8</div>
                <div className="text-gray-600">Đánh giá TB</div>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-gradient-to-r from-blue-600 to-yellow-500 rounded-2xl p-8 text-white">
            <h2 className="text-3xl font-bold mb-4">
              💰 Chỉ 1,000đ/ngày
            </h2>
            <p className="text-xl mb-6">
              Trial 3 ngày miễn phí • Tối thiểu 7 ngày
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <div className="flex items-center">
                <Zap className="w-4 h-4 mr-2" />
                Kết nối không giới hạn
              </div>
              <div className="flex items-center">
                <Heart className="w-4 h-4 mr-2" />
                Cộng đồng Tân Dậu
              </div>
              <div className="flex items-center">
                <Shield className="w-4 h-4 mr-2" />
                An toàn & uy tín
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-yellow-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">TD</span>
            </div>
            <span className="text-xl font-bold">BOT TÂN DẬU 1981</span>
          </div>
          <p className="text-gray-400 mb-4">
            Platform kết nối mua bán dành riêng cho thành viên sinh năm 1981
          </p>
          <p className="text-sm text-gray-500">
            © 2025 BOT TÂN DẬU 1981. Tất cả quyền được bảo lưu.
          </p>
        </div>
      </footer>

      {/* Age Verification Modal */}
      {showAgeVerification && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-yellow-500 bg-clip-text text-transparent">
                Xác minh tuổi Tân Dậu 1981
              </CardTitle>
              <CardDescription>
                Platform chỉ dành cho thành viên sinh năm 1981
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-6">
                <div className="text-center">
                  <Badge variant="tan" className="mb-4">
                    🐓 Tân Dậu 1981
                  </Badge>
                  <p className="text-sm text-gray-600 mb-4">
                    Để đảm bảo tính xác thực của cộng đồng, chúng tôi chỉ chấp nhận 
                    thành viên sinh năm 1981 (tuổi Tân Dậu).
                  </p>
                </div>

                <div className="flex space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowAgeVerification(false)}
                    className="flex-1"
                  >
                    Hủy
                  </Button>
                  <Button
                    onClick={() => {
                      setShowAgeVerification(false)
                      setShowFacebookLogin(true)
                    }}
                    className="flex-1"
                  >
                    Xác minh
                  </Button>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Tại sao cần xác minh tuổi?</p>
                      <p>
                        Chúng tôi tạo ra một cộng đồng đặc biệt dành riêng cho những người 
                        cùng tuổi Tân Dậu 1981 để có trải nghiệm mua bán phù hợp và thân thiện.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Facebook Login Modal */}
      {showFacebookLogin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md">
            <FacebookLoginReal 
              onSuccess={() => {
                setShowFacebookLogin(false)
                // Refresh page to show user dashboard
                window.location.reload()
              }}
              onError={() => {
                setShowFacebookLogin(false)
              }}
            />
            <div className="mt-4 text-center">
              <Button
                variant="outline"
                onClick={() => setShowFacebookLogin(false)}
                className="w-full"
              >
                Hủy
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
