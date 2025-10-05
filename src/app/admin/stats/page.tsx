'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

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

interface StatsData {
    overview: {
        totalUsers: number
        activeUsers: number
        trialUsers: number
        totalRevenue: number
        pendingPayments: number
        totalListings: number
        activeListings: number
    }
    todayStats: {
        newUsers: number
        newListings: number
        revenue: number
        payments: number
    }
    growth: {
        usersGrowth: number
        revenueGrowth: number
        listingsGrowth: number
    }
    topCategories: Array<{
        category: string
        count: number
        percentage: number
    }>
    recentActivity: Array<{
        id: string
        type: string
        description: string
        timestamp: string
        user?: string
    }>
}

export default function AdminStats() {
    const [stats, setStats] = useState<StatsData | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [timeRange, setTimeRange] = useState('7d')
    const [adminInfo, setAdminInfo] = useState<any>(null)
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info', show: boolean }>({
        message: '',
        type: 'info',
        show: false
    })
    const [loadingActions, setLoadingActions] = useState<{ [key: string]: boolean }>({})
    const router = useRouter()

    useEffect(() => {
        checkAuth()
        fetchStats()
    }, [timeRange])

    const checkAuth = () => {
        const token = localStorage.getItem('admin_token')
        const adminInfoStr = localStorage.getItem('admin_info')

        if (!token || !adminInfoStr) {
            router.push('/admin/login')
            return
        }

        setAdminInfo(JSON.parse(adminInfoStr))
    }

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('admin_token')
            const response = await fetch(`/api/admin/stats?range=${timeRange}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
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

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN').format(amount) + 'đ'
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('vi-VN')
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

    const handleExportOverviewReport = async () => {
        await handleActionWithLoading('exportOverview', async () => {
            const token = localStorage.getItem('admin_token')
            const response = await fetch('/api/admin/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ action: 'export' })
            })

            const data = await response.json()
            
            if (data.success) {
                // Download the exported data as JSON file
                const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `overview-report-${new Date().toISOString().split('T')[0]}.json`
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                URL.revokeObjectURL(url)
                
                showToast(`Đã xuất báo cáo tổng quan thành công! ${data.data.summary.totalUsers} users, ${data.data.summary.totalListings} listings`, 'success')
            } else {
                showToast(`Lỗi xuất báo cáo: ${data.message}`, 'error')
            }
        })
    }

    const handleExportUsersReport = async () => {
        await handleActionWithLoading('exportUsers', async () => {
            const token = localStorage.getItem('admin_token')
            const response = await fetch('/api/admin/users', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            const data = await response.json()
            
            if (data.success) {
                // Download users data as JSON file
                const blob = new Blob([JSON.stringify(data.users, null, 2)], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `users-report-${new Date().toISOString().split('T')[0]}.json`
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                URL.revokeObjectURL(url)
                
                showToast(`Đã xuất danh sách ${data.users.length} người dùng thành công!`, 'success')
            } else {
                showToast(`Lỗi xuất danh sách người dùng: ${data.message}`, 'error')
            }
        })
    }

    const handleExportFinancialReport = async () => {
        await handleActionWithLoading('exportFinancial', async () => {
            const token = localStorage.getItem('admin_token')
            const response = await fetch('/api/admin/payments', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            const data = await response.json()
            
            if (data.success) {
                // Download payments data as JSON file
                const blob = new Blob([JSON.stringify(data.payments, null, 2)], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `financial-report-${new Date().toISOString().split('T')[0]}.json`
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                URL.revokeObjectURL(url)
                
                const totalRevenue = data.payments
                    ?.filter((p: any) => p.status === 'approved')
                    ?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0
                
                showToast(`Đã xuất báo cáo tài chính thành công! ${data.payments.length} payments, Tổng doanh thu: ${totalRevenue.toLocaleString()} VNĐ`, 'success')
            } else {
                showToast(`Lỗi xuất báo cáo tài chính: ${data.message}`, 'error')
            }
        })
    }

    const handleRefreshStats = async () => {
        await handleActionWithLoading('refreshStats', async () => {
            await fetchStats()
            showToast('Đã cập nhật dữ liệu thống kê!', 'success')
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
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Không thể tải dữ liệu thống kê</h2>
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
                    <div className="flex justify-between items-center py-6">
                        <div className="flex items-center">
                            <button
                                onClick={() => router.push('/admin/dashboard')}
                                className="mr-4 text-gray-600 hover:text-gray-900"
                            >
                                ← Quay lại
                            </button>
                            <h1 className="text-3xl font-bold text-gray-900">
                                📊 Thống kê chi tiết
                            </h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={handleRefreshStats}
                                disabled={loadingActions.refreshStats}
                                className="inline-flex items-center px-3 py-2 border border-indigo-300 text-sm font-medium rounded-md text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50"
                            >
                                {loadingActions.refreshStats ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mr-2"></div>
                                        Đang cập nhật...
                                    </>
                                ) : (
                                    '🔄 Làm mới'
                                )}
                            </button>
                            <select
                                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"
                                value={timeRange}
                                onChange={(e) => setTimeRange(e.target.value)}
                            >
                                <option value="1d">Hôm nay</option>
                                <option value="7d">7 ngày qua</option>
                                <option value="30d">30 ngày qua</option>
                                <option value="90d">90 ngày qua</option>
                            </select>
                            <span className="text-gray-700">
                                Xin chào, {adminInfo?.name || adminInfo?.username}
                            </span>
                            <button
                                onClick={() => {
                                    localStorage.removeItem('admin_token')
                                    localStorage.removeItem('admin_info')
                                    router.push('/admin/login')
                                }}
                                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
                            >
                                Đăng xuất
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                {/* Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
                                            {stats.overview.totalUsers.toLocaleString()}
                                        </dd>
                                        <dd className={`text-sm ${stats.growth.usersGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {stats.growth.usersGrowth >= 0 ? '+' : ''}{stats.growth.usersGrowth.toFixed(1)}%
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>

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
                                            {formatCurrency(stats.overview.totalRevenue)}
                                        </dd>
                                        <dd className={`text-sm ${stats.growth.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {stats.growth.revenueGrowth >= 0 ? '+' : ''}{stats.growth.revenueGrowth.toFixed(1)}%
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>

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
                                            Tổng tin đăng
                                        </dt>
                                        <dd className="text-lg font-medium text-gray-900">
                                            {stats.overview.totalListings.toLocaleString()}
                                        </dd>
                                        <dd className={`text-sm ${stats.growth.listingsGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {stats.growth.listingsGrowth >= 0 ? '+' : ''}{stats.growth.listingsGrowth.toFixed(1)}%
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>

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
                                            {stats.overview.pendingPayments}
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Today's Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-blue-600">
                                    {stats.todayStats.newUsers}
                                </div>
                                <div className="text-sm text-gray-500">Người dùng mới</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">
                                    {formatCurrency(stats.todayStats.revenue)}
                                </div>
                                <div className="text-sm text-gray-500">Doanh thu hôm nay</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-purple-600">
                                    {stats.todayStats.newListings}
                                </div>
                                <div className="text-sm text-gray-500">Tin đăng mới</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-orange-600">
                                    {stats.todayStats.payments}
                                </div>
                                <div className="text-sm text-gray-500">Thanh toán hôm nay</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Top Categories */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    <div className="bg-white shadow rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                                🏆 Danh mục phổ biến
                            </h3>
                            <div className="space-y-4">
                                {stats.topCategories.map((category, index) => (
                                    <div key={category.category} className="flex items-center">
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-gray-900">
                                                    {category.category}
                                                </span>
                                                <span className="text-sm text-gray-500">
                                                    {category.count} tin đăng
                                                </span>
                                            </div>
                                            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-indigo-600 h-2 rounded-full"
                                                    style={{ width: `${category.percentage}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="bg-white shadow rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                                📋 Hoạt động gần đây
                            </h3>
                            <div className="space-y-4 max-h-80 overflow-y-auto">
                                {stats.recentActivity.map((activity) => (
                                    <div key={activity.id} className="flex items-start space-x-3">
                                        <div className="flex-shrink-0">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                                activity.type === 'user' ? 'bg-blue-100' :
                                                activity.type === 'payment' ? 'bg-green-100' :
                                                activity.type === 'listing' ? 'bg-purple-100' :
                                                'bg-gray-100'
                                            }`}>
                                                <span className="text-sm">
                                                    {activity.type === 'user' ? '👤' :
                                                     activity.type === 'payment' ? '💰' :
                                                     activity.type === 'listing' ? '🛒' : '📋'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-gray-900">
                                                {activity.description}
                                            </p>
                                            {activity.user && (
                                                <p className="text-sm text-gray-500">
                                                    bởi {activity.user}
                                                </p>
                                            )}
                                            <p className="text-xs text-gray-400">
                                                {formatDate(activity.timestamp)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Export Options */}
                <div className="bg-white shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                            📤 Xuất báo cáo
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <button
                                onClick={handleExportOverviewReport}
                                disabled={loadingActions.exportOverview}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                            >
                                {loadingActions.exportOverview ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Đang xuất...
                                    </>
                                ) : (
                                    '📊 Xuất báo cáo tổng quan (Excel)'
                                )}
                            </button>
                            <button
                                onClick={handleExportUsersReport}
                                disabled={loadingActions.exportUsers}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                            >
                                {loadingActions.exportUsers ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Đang xuất...
                                    </>
                                ) : (
                                    '👥 Xuất danh sách người dùng (CSV)'
                                )}
                            </button>
                            <button
                                onClick={handleExportFinancialReport}
                                disabled={loadingActions.exportFinancial}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
                            >
                                {loadingActions.exportFinancial ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Đang xuất...
                                    </>
                                ) : (
                                    '💰 Xuất báo cáo tài chính (PDF)'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
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
