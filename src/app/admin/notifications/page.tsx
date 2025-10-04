'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

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
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                        📢 Gửi thông báo chung
                    </button>
                    <button className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">
                        👤 Gửi cho user cụ thể
                    </button>
                    <button className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700">
                        🛒 Gửi theo danh mục
                    </button>
                    <button className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700">
                        📋 Lịch sử thông báo
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
        </div>
    )
}
