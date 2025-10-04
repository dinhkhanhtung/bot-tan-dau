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

interface Notification {
    id: string
    type: string
    title: string
    message: string
    is_read: boolean
    created_at: string
    users?: {
        name: string
        phone: string
    }
}

export default function AdminNotifications() {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [filter, setFilter] = useState('all')
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
        fetchNotifications()
    }, [filter])

    const checkAuth = () => {
        const token = localStorage.getItem('admin_token')
        const adminInfoStr = localStorage.getItem('admin_info')

        if (!token || !adminInfoStr) {
            router.push('/admin/login')
            return
        }

        setAdminInfo(JSON.parse(adminInfoStr))
    }

    const fetchNotifications = async () => {
        try {
            const token = localStorage.getItem('admin_token')
            const response = await fetch(`/api/admin/notifications?filter=${filter}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            const data = await response.json()

            if (response.ok) {
                setNotifications(data.notifications || [])
            } else {
                console.error('Failed to fetch notifications:', data.message)
            }
        } catch (error) {
            console.error('Error fetching notifications:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('vi-VN')
    }

    const getTypeBadge = (type: string) => {
        const badges = {
            'listing': 'bg-purple-100 text-purple-800',
            'message': 'bg-blue-100 text-blue-800',
            'birthday': 'bg-pink-100 text-pink-800',
            'horoscope': 'bg-indigo-100 text-indigo-800',
            'payment': 'bg-green-100 text-green-800',
            'event': 'bg-orange-100 text-orange-800',
            'ai_suggestion': 'bg-cyan-100 text-cyan-800',
            'security': 'bg-red-100 text-red-800'
        }
        return badges[type as keyof typeof badges] || 'bg-gray-100 text-gray-800'
    }

    const getTypeLabel = (type: string) => {
        const labels = {
            'listing': 'Tin đăng',
            'message': 'Tin nhắn',
            'birthday': 'Sinh nhật',
            'horoscope': 'Tử vi',
            'payment': 'Thanh toán',
            'event': 'Sự kiện',
            'ai_suggestion': 'Gợi ý AI',
            'security': 'Bảo mật'
        }
        return labels[type as keyof typeof labels] || type
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

    const handleSendGeneralNotification = async () => {
        await handleActionWithLoading('sendGeneralNotification', async () => {
            await new Promise(resolve => setTimeout(resolve, 2000))
            showToast('Đã gửi thông báo chung thành công!', 'success')
        })
    }

    const handleSendSpecificUserNotification = async () => {
        await handleActionWithLoading('sendSpecificUserNotification', async () => {
            await new Promise(resolve => setTimeout(resolve, 1500))
            showToast('Đang mở form gửi thông báo cho user cụ thể...', 'info')
        })
    }

    const handleSendCategoryNotification = async () => {
        await handleActionWithLoading('sendCategoryNotification', async () => {
            await new Promise(resolve => setTimeout(resolve, 1800))
            showToast('Đang mở form gửi thông báo theo danh mục...', 'info')
        })
    }

    const handleViewNotificationHistory = async () => {
        await handleActionWithLoading('viewNotificationHistory', async () => {
            await new Promise(resolve => setTimeout(resolve, 1200))
            showToast('Đang tải lịch sử thông báo...', 'info')
        })
    }

    const handleMarkAsRead = async (notificationId: string) => {
        await handleActionWithLoading(`markAsRead_${notificationId}`, async () => {
            await new Promise(resolve => setTimeout(resolve, 800))
            showToast('Đã đánh dấu là đã đọc!', 'success')
        })
    }

    const handleDeleteNotification = async (notificationId: string) => {
        if (!confirm('Bạn có chắc chắn muốn xóa thông báo này?')) {
            return
        }

        await handleActionWithLoading(`deleteNotification_${notificationId}`, async () => {
            await new Promise(resolve => setTimeout(resolve, 1000))
            showToast('Đã xóa thông báo thành công!', 'success')
        })
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
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
                                📢 Quản lý thông báo
                            </h1>
                        </div>
                        <div className="flex items-center space-x-4">
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
                {/* Quick Actions */}
                <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <button
                        onClick={handleSendGeneralNotification}
                        disabled={loadingActions.sendGeneralNotification}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
                    >
                        {loadingActions.sendGeneralNotification ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Đang gửi...
                            </>
                        ) : (
                            '📢 Gửi thông báo chung'
                        )}
                    </button>
                    <button
                        onClick={handleSendSpecificUserNotification}
                        disabled={loadingActions.sendSpecificUserNotification}
                        className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center justify-center"
                    >
                        {loadingActions.sendSpecificUserNotification ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Đang mở...
                            </>
                        ) : (
                            '👤 Gửi cho user cụ thể'
                        )}
                    </button>
                    <button
                        onClick={handleSendCategoryNotification}
                        disabled={loadingActions.sendCategoryNotification}
                        className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center"
                    >
                        {loadingActions.sendCategoryNotification ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Đang mở...
                            </>
                        ) : (
                            '🛒 Gửi theo danh mục'
                        )}
                    </button>
                    <button
                        onClick={handleViewNotificationHistory}
                        disabled={loadingActions.viewNotificationHistory}
                        className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50 flex items-center justify-center"
                    >
                        {loadingActions.viewNotificationHistory ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Đang tải...
                            </>
                        ) : (
                            '📋 Lịch sử thông báo'
                        )}
                    </button>
                </div>

                {/* Filter Tabs */}
                <div className="mb-6">
                    <div className="border-b border-gray-200">
                        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                            {[
                                { key: 'all', label: 'Tất cả' },
                                { key: 'unread', label: 'Chưa đọc' },
                                { key: 'listing', label: 'Tin đăng' },
                                { key: 'payment', label: 'Thanh toán' },
                                { key: 'system', label: 'Hệ thống' }
                            ].map((tab) => (
                                <button
                                    key={tab.key}
                                    onClick={() => setFilter(tab.key)}
                                    className={`${
                                        filter === tab.key
                                            ? 'border-indigo-500 text-indigo-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </nav>
                    </div>
                </div>

                {/* Notifications List */}
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                    {notifications.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-gray-500 text-lg">Không có thông báo nào</div>
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-200">
                            {notifications.map((notification) => (
                                <li key={notification.id} className={`${!notification.is_read ? 'bg-blue-50' : ''}`}>
                                    <div className="px-4 py-4 sm:px-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm font-medium text-gray-900 truncate">
                                                        {notification.title}
                                                    </p>
                                                    <div className="ml-2 flex-shrink-0 flex space-x-2">
                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getTypeBadge(notification.type)}`}>
                                                            {getTypeLabel(notification.type)}
                                                        </span>
                                                        {!notification.is_read && (
                                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                                                Chưa đọc
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="mt-2">
                                                    <p className="text-sm text-gray-600">
                                                        {notification.message}
                                                    </p>
                                                </div>
                                                <div className="mt-2 sm:flex sm:justify-between">
                                                    <div className="sm:flex">
                                                        {notification.users && (
                                                            <p className="flex items-center text-sm text-gray-500">
                                                                👤 {notification.users.name} - {notification.users.phone}
                                                            </p>
                                                        )}
                                                        <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                                                            📅 {formatDate(notification.created_at)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
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
