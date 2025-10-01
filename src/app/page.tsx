'use client'

import { useAuth } from './providers'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FacebookLogin } from '@/components/auth/FacebookLogin'
import { AgeVerification } from '@/components/auth/AgeVerification'
import { useState } from 'react'
import {
    ShoppingBag,
    MessageCircle,
    Users,
    Star,
    Calendar,
    Shield,
    Zap,
    Heart
} from 'lucide-react'

export default function HomePage() {
    const { user, loading } = useAuth()
    const [showAgeVerification, setShowAgeVerification] = useState(false)

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-dau-600"></div>
            </div>
        )
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-dau-50 to-tan-50">
                {/* Header */}
                <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center h-16">
                            <div className="flex items-center space-x-2">
                                <div className="w-8 h-8 bg-gradient-to-r from-dau-600 to-tan-500 rounded-lg flex items-center justify-center">
                                    <span className="text-white font-bold text-sm">TD</span>
                                </div>
                                <span className="text-xl font-bold text-gradient">BOT TÂN DẬU 1981</span>
                            </div>
                            <Badge variant="tan" className="text-sm">
                                🐓 Chỉ dành cho Tân Dậu 1981
                            </Badge>
                        </div>
                    </div>
                </header>

                {/* Hero Section */}
                <section className="py-20 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-7xl mx-auto text-center">
                        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
                            Chào mừng đến với
                            <span className="text-gradient block mt-2">
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
                            <Button
                                variant="outline"
                                size="lg"
                                className="text-lg px-8 py-4"
                            >
                                📖 Tìm hiểu thêm
                            </Button>
                        </div>

                        {/* Features Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
                            <Card className="text-center hover:shadow-lg transition-shadow">
                                <CardHeader>
                                    <ShoppingBag className="w-12 h-12 text-dau-600 mx-auto mb-2" />
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
                                    <MessageCircle className="w-12 h-12 text-tan-600 mx-auto mb-2" />
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
                                    <div className="text-3xl font-bold text-dau-600 mb-2">1,247</div>
                                    <div className="text-gray-600">Thành viên</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-tan-600 mb-2">3,456</div>
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
                        <div className="bg-gradient-to-r from-dau-600 to-tan-500 rounded-2xl p-8 text-white">
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
                            <div className="w-8 h-8 bg-gradient-to-r from-dau-600 to-tan-500 rounded-lg flex items-center justify-center">
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
                    <AgeVerification
                        onClose={() => setShowAgeVerification(false)}
                        onVerified={() => setShowAgeVerification(false)}
                    />
                )}
            </div>
        )
    }

    // User is logged in - show dashboard
    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-gradient-to-r from-dau-600 to-tan-500 rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold text-sm">TD</span>
                            </div>
                            <span className="text-xl font-bold text-gradient">BOT TÂN DẬU 1981</span>
                        </div>
                        <div className="flex items-center space-x-4">
                            <Badge variant="success">
                                {user.status === 'trial' ? 'Trial' : 'Active'}
                            </Badge>
                            <Button variant="outline" size="sm">
                                Đăng xuất
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Chào mừng trở lại, {user.name}! 👋
                    </h1>
                    <p className="text-gray-600">
                        Khám phá marketplace và kết nối với cộng đồng Tân Dậu
                    </p>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <ShoppingBag className="w-5 h-5 mr-2 text-dau-600" />
                                Khám phá Marketplace
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <CardDescription>
                                Tìm kiếm sản phẩm và dịch vụ từ cộng đồng
                            </CardDescription>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <MessageCircle className="w-5 h-5 mr-2 text-tan-600" />
                                Tin nhắn mới
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <CardDescription>
                                Bạn có 3 tin nhắn chưa đọc
                            </CardDescription>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <Users className="w-5 h-5 mr-2 text-green-600" />
                                Cộng đồng
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <CardDescription>
                                Tham gia sự kiện và hoạt động
                            </CardDescription>
                        </CardContent>
                    </Card>
                </div>

                {/* Recent Activity */}
                <Card>
                    <CardHeader>
                        <CardTitle>Hoạt động gần đây</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center space-x-3">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="text-sm text-gray-600">
                                    Bạn đã kết nối với 2 người dùng mới
                                </span>
                                <span className="text-xs text-gray-400">2 giờ trước</span>
                            </div>
                            <div className="flex items-center space-x-3">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <span className="text-sm text-gray-600">
                                    Tin đăng của bạn đã được xem 15 lần
                                </span>
                                <span className="text-xs text-gray-400">5 giờ trước</span>
                            </div>
                            <div className="flex items-center space-x-3">
                                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                <span className="text-sm text-gray-600">
                                    Bạn đã nhận được đánh giá 5 sao
                                </span>
                                <span className="text-xs text-gray-400">1 ngày trước</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    )
}
