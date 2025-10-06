'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AIPromptGenerator from './components/AIPromptGenerator'
import { AIDashboardStats } from '@/types'

// Toast notification component
const Toast = ({ message, type, show, onClose }: { message: string, type: 'success' | 'error' | 'info', show: boolean, onClose: () => void }) => {
    useEffect(() => {
        if (show) {
            const timer = setTimeout(onClose, 3000)
            return () => clearTimeout(timer)
        }
    }, [show, onClose])

    if (!show) return null

    const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500'

    return (
        <div className={`fixed top-4 right-4 z-50 ${bgColor} text-white px-6 py-3 rounded-md shadow-lg`}>
            {message}
        </div>
    )
}

interface DashboardStats {
    totalUsers: number
    activeUsers: number
    trialUsers: number
    totalRevenue: number
    pendingPayments: number
    totalListings: number
    activeListings: number
    todayStats: {
        newUsers: number
        newListings: number
        revenue: number
    }
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [adminInfo, setAdminInfo] = useState<any>(null)
    const [activeTab, setActiveTab] = useState<'overview' | 'ai'>('overview')
    const [aiStats, setAiStats] = useState<AIDashboardStats | null>(null)
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info', show: boolean }>({
        message: '',
        type: 'info',
        show: false
    })
    const [loadingActions, setLoadingActions] = useState<{ [key: string]: boolean }>({})
    const router = useRouter()

    useEffect(() => {
        // Check admin authentication
        const token = localStorage.getItem('admin_token')
        const adminInfoStr = localStorage.getItem('admin_info')

        if (!token || !adminInfoStr) {
            router.push('/admin/login')
            return
        }

        setAdminInfo(JSON.parse(adminInfoStr))

        // Fetch dashboard stats
        fetchStats()
    }, [router])

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('admin_token')
            const response = await fetch('/api/admin/dashboard/stats', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })
            const data = await response.json()

            if (response.ok) {
                setStats(data.stats)
            } else {
                console.error('Failed to fetch stats:', data.message)
            }
        } catch (error) {
            console.error('Error fetching stats:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleLogout = () => {
        localStorage.removeItem('admin_token')
        localStorage.removeItem('admin_info')
        router.push('/admin/login')
    }

    const showToast = (message: string, type: 'success' | 'error' | 'info') => {
        setToast({ message, type, show: true })
    }

    const handleActionWithLoading = async (actionKey: string, action: () => Promise<void>) => {
        setLoadingActions(prev => ({ ...prev, [actionKey]: true }))
        try {
            await action()
        } catch (error) {
            console.error(`Error in ${actionKey}:`, error)
            showToast(`Có lỗi xảy ra khi thực hiện ${actionKey}`, 'error')
        } finally {
            setLoadingActions(prev => ({ ...prev, [actionKey]: false }))
        }
    }

    const handleBulkMessage = async () => {
        const message = prompt('Nhập nội dung tin nhắn gửi đến tất cả người dùng:')
        if (!message) return

        await handleActionWithLoading('bulkMessage', async () => {
            const token = localStorage.getItem('admin_token')
            const response = await fetch('/api/admin/notifications', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    action: 'sendGeneral',
                    message: message
                })
            })

            const data = await response.json()
            
            if (data.success) {
                showToast(`Đã gửi tin nhắn hàng loạt đến ${data.sentCount} người dùng!`, 'success')
            } else {
                showToast(`Lỗi gửi tin nhắn: ${data.message}`, 'error')
            }
        })
    }

    const handleSendButton = async () => {
        const userId = prompt('Nhập Facebook ID của người dùng:')
        if (!userId) return

        await handleActionWithLoading('sendButton', async () => {
            const token = localStorage.getItem('admin_token')
            const response = await fetch('/api/admin/notifications', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    action: 'sendSpecific',
                    userId: userId,
                    message: 'Admin đã gửi nút tương tác cho bạn!'
                })
            })

            const data = await response.json()
            
            if (data.success) {
                showToast('Đã gửi nút cho người dùng thành công!', 'success')
            } else {
                showToast(`Lỗi gửi nút: ${data.message}`, 'error')
            }
        })
    }

    const handleChatWithUser = async () => {
        const userId = prompt('Nhập Facebook ID của người dùng để chat:')
        if (!userId) return

        await handleActionWithLoading('chatWithUser', async () => {
            // Open Facebook Messenger in new window
            const messengerUrl = `https://m.me/${userId}`
            window.open(messengerUrl, '_blank')
            showToast('Đã mở cửa sổ chat với người dùng!', 'success')
        })
    }

    const handleSendNotification = async () => {
        const message = prompt('Nhập nội dung thông báo gửi đến tất cả người dùng:')
        if (!message) return

        await handleActionWithLoading('sendNotification', async () => {
            const token = localStorage.getItem('admin_token')
            const response = await fetch('/api/admin/notifications', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    action: 'sendGeneral',
                    message: message
                })
            })

            const data = await response.json()
            
            if (data.success) {
                showToast(`Đã gửi thông báo đến ${data.sentCount} người dùng!`, 'success')
            } else {
                showToast(`Lỗi gửi thông báo: ${data.message}`, 'error')
            }
        })
    }

    const handleGivePoints = async () => {
        const userId = prompt('Nhập User ID:')
        if (!userId) return
        
        const points = prompt('Nhập số điểm muốn tặng:')
        if (!points || isNaN(Number(points))) return

        await handleActionWithLoading('givePoints', async () => {
            const token = localStorage.getItem('admin_token')
            const response = await fetch(`/api/admin/users/${userId}/points`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    points: Number(points),
                    reason: 'Admin tặng điểm thưởng'
                })
            })

            const data = await response.json()
            
            if (data.success) {
                showToast(`Đã tặng ${points} điểm thưởng cho người dùng!`, 'success')
            } else {
                showToast(`Lỗi tặng điểm: ${data.message}`, 'error')
            }
        })
    }

    const handleSyncFromDashboard = async () => {
        await handleActionWithLoading('syncFromDashboard', async () => {
            const token = localStorage.getItem('admin_token')
            const response = await fetch('/api/admin/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ action: 'sync' })
            })

            const data = await response.json()
            
            if (data.success) {
                showToast(`Đồng bộ dữ liệu thành công! ${data.data.users} users, ${data.data.listings} listings`, 'success')
            } else {
                showToast(`Lỗi đồng bộ: ${data.message}`, 'error')
            }
        })
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
            </div>
        )
    }

    if (!stats) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Không thể tải dữ liệu</h2>
                    <button
                        onClick={fetchStats}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                    >
                        Thử lại
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col sm:flex-row justify-between items-center py-4 sm:py-6 space-y-4 sm:space-y-0">
                        <div className="flex items-center">
                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                                🤖 Admin Dashboard
                            </h1>
                        </div>
                        <div className="flex items-center space-x-2 sm:space-x-4">
                            <span className="text-sm sm:text-base text-gray-700">
                                Xin chào, {adminInfo?.name || adminInfo?.username}
                            </span>
                            <button
                                onClick={handleLogout}
                                className="bg-red-600 text-white px-3 sm:px-4 py-2 rounded-md hover:bg-red-700 text-sm sm:text-base"
                            >
                                Đăng xuất
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {/* Total Users */}
                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                                        <span className="text-white text-sm">👥</span>
                                    </div>
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">
                                            Tổng người dùng
                                        </dt>
                                        <dd className="text-lg font-medium text-gray-900">
                                            {stats.totalUsers.toLocaleString()}
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Revenue */}
                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                                        <span className="text-white text-sm">💰</span>
                                    </div>
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">
                                            Tổng doanh thu
                                        </dt>
                                        <dd className="text-lg font-medium text-gray-900">
                                            {stats.totalRevenue.toLocaleString()}đ
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Pending Payments */}
                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                                        <span className="text-white text-sm">⏳</span>
                                    </div>
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">
                                            Thanh toán chờ duyệt
                                        </dt>
                                        <dd className="text-lg font-medium text-gray-900">
                                            {stats.pendingPayments}
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Active Listings */}
                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                                        <span className="text-white text-sm">🛒</span>
                                    </div>
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">
                                            Tin đăng hoạt động
                                        </dt>
                                        <dd className="text-lg font-medium text-gray-900">
                                            {stats.activeListings}
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Today's Stats */}
                <div className="bg-white shadow rounded-lg mb-8">
                    <div className="px-4 py-5 sm:p-6">
                        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                            📊 Thống kê hôm nay
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-blue-600">
                                    {stats.todayStats.newUsers}
                                </div>
                                <div className="text-sm text-gray-500">Người dùng mới</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">
                                    {stats.todayStats.revenue.toLocaleString()}đ
                                </div>
                                <div className="text-sm text-gray-500">Doanh thu</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-purple-600">
                                    {stats.todayStats.newListings}
                                </div>
                                <div className="text-sm text-gray-500">Tin đăng mới</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                            ⚡ Chức năng nhanh
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                            <button
                                onClick={() => router.push('/admin/payments')}
                                className="inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 transition-colors duration-200"
                            >
                                💰 Thanh toán
                            </button>
                            <button
                                onClick={() => router.push('/admin/users')}
                                className="inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
                            >
                                👥 Người dùng
                            </button>
                            <button
                                onClick={() => router.push('/admin/listings')}
                                className="inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 transition-colors duration-200"
                            >
                                🛒 Tin đăng
                            </button>
                            <button
                                onClick={() => router.push('/admin/stats')}
                                className="inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors duration-200"
                            >
                                📊 Thống kê
                            </button>
                            <button
                                onClick={() => router.push('/admin/notifications')}
                                className="inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 transition-colors duration-200"
                            >
                                📢 Thông báo
                            </button>
                            <button
                                onClick={() => router.push('/admin/settings')}
                                className="inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 transition-colors duration-200"
                            >
                                ⚙️ Cài đặt
                            </button>
                            <button
                                onClick={() => router.push('/admin/ads')}
                                className="inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 transition-colors duration-200"
                            >
                                📢 Quảng cáo
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="bg-white shadow rounded-lg mb-6">
                    <div className="border-b border-gray-200">
                        <nav className="-mb-px flex space-x-8 px-6">
                            <button
                                onClick={() => setActiveTab('overview')}
                                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                                    activeTab === 'overview'
                                        ? 'border-indigo-500 text-indigo-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                📊 Tổng quan
                            </button>
                            <button
                                onClick={() => setActiveTab('ai')}
                                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                                    activeTab === 'ai'
                                        ? 'border-indigo-500 text-indigo-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                🤖 AI Assistant
                            </button>
                        </nav>
                    </div>
                </div>

                {/* Tab Content */}
                {activeTab === 'overview' && (
                    <>
                        {/* User Interaction Tools */}
                        <div className="bg-white shadow rounded-lg">
                            <div className="px-4 py-5 sm:p-6">
                                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                                    🚀 Công cụ tương tác
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    <button
                                        onClick={handleBulkMessage}
                                        disabled={loadingActions.bulkMessage}
                                        className="inline-flex items-center justify-center px-3 py-2 border border-indigo-300 text-sm font-medium rounded-md text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 transition-colors duration-200"
                                    >
                                        {loadingActions.bulkMessage ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mr-2"></div>
                                                Đang gửi...
                                            </>
                                        ) : (
                                            '📨 Gửi tin nhắn hàng loạt'
                                        )}
                                    </button>
                                    <button
                                        onClick={handleSendButton}
                                        disabled={loadingActions.sendButton}
                                        className="inline-flex items-center justify-center px-3 py-2 border border-green-300 text-sm font-medium rounded-md text-green-700 bg-green-50 hover:bg-green-100 disabled:opacity-50 transition-colors duration-200"
                                    >
                                        {loadingActions.sendButton ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 mr-2"></div>
                                                Đang gửi...
                                            </>
                                        ) : (
                                            '🎯 Gửi nút cho user'
                                        )}
                                    </button>
                                    <button
                                        onClick={handleChatWithUser}
                                        disabled={loadingActions.chatWithUser}
                                        className="inline-flex items-center justify-center px-3 py-2 border border-purple-300 text-sm font-medium rounded-md text-purple-700 bg-purple-50 hover:bg-purple-100 disabled:opacity-50 transition-colors duration-200"
                                    >
                                        {loadingActions.chatWithUser ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mr-2"></div>
                                                Đang mở...
                                            </>
                                        ) : (
                                            '💬 Chat với user'
                                        )}
                                    </button>
                                    <button
                                        onClick={handleSendNotification}
                                        disabled={loadingActions.sendNotification}
                                        className="inline-flex items-center justify-center px-3 py-2 border border-orange-300 text-sm font-medium rounded-md text-orange-700 bg-orange-50 hover:bg-orange-100 disabled:opacity-50 transition-colors duration-200"
                                    >
                                        {loadingActions.sendNotification ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600 mr-2"></div>
                                                Đang gửi...
                                            </>
                                        ) : (
                                            '📢 Gửi thông báo'
                                        )}
                                    </button>
                                    <button
                                        onClick={handleGivePoints}
                                        disabled={loadingActions.givePoints}
                                        className="inline-flex items-center justify-center px-3 py-2 border border-teal-300 text-sm font-medium rounded-md text-teal-700 bg-teal-50 hover:bg-teal-100 disabled:opacity-50 transition-colors duration-200"
                                    >
                                        {loadingActions.givePoints ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-600 mr-2"></div>
                                                Đang tặng...
                                            </>
                                        ) : (
                                            '🎁 Tặng điểm thưởng'
                                        )}
                                    </button>
                                    <button
                                        onClick={handleSyncFromDashboard}
                                        disabled={loadingActions.syncFromDashboard}
                                        className="inline-flex items-center justify-center px-3 py-2 border border-pink-300 text-sm font-medium rounded-md text-pink-700 bg-pink-50 hover:bg-pink-100 disabled:opacity-50 transition-colors duration-200"
                                    >
                                        {loadingActions.syncFromDashboard ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-pink-600 mr-2"></div>
                                                Đang đồng bộ...
                                            </>
                                        ) : (
                                            '🔄 Đồng bộ dữ liệu'
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'ai' && (
                    <AIPromptGenerator onStatsUpdate={setAiStats} />
                )}
            </main>

            {/* Toast Notifications */}
            <Toast
                message={toast.message}
                type={toast.type}
                show={toast.show}
                onClose={() => setToast(prev => ({ ...prev, show: false }))}
            />
        </div>
    )
}
