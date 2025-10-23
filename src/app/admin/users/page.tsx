'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import AdvancedFilters, { FilterOptions } from '../components/AdvancedFilters'
import EnhancedDataTable, { Column } from '../components/EnhancedDataTable'
import PermissionWrapper, { usePermissions } from '../components/PermissionWrapper'
import { AdminRole, AdminPermission, getRoleDisplayName } from '@/types'

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

interface User {
    id: string
    facebook_id: string
    name: string
    phone: string
    location: string
    status: string
    rating: number
    total_transactions: number
    membership_expires_at?: string
    created_at: string
}

export default function AdminUsers() {
    const [users, setUsers] = useState<User[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [filters, setFilters] = useState<FilterOptions>({
        search: '',
        status: undefined,
        dateRange: undefined,
        activityLevel: undefined,
        sortBy: 'created_at',
        sortOrder: 'desc'
    })
    const [adminInfo, setAdminInfo] = useState<any>(null)
    const [adminRole, setAdminRole] = useState<AdminRole>(AdminRole.VIEWER)
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info', show: boolean }>({
        message: '',
        type: 'info',
        show: false
    })
    const [loadingActions, setLoadingActions] = useState<{ [key: string]: boolean }>({})
    const router = useRouter()

    const checkAuth = useCallback(() => {
        const token = localStorage.getItem('admin_token')
        const adminInfoStr = localStorage.getItem('admin_info')

        if (!token || !adminInfoStr) {
            router.push('/admin/login')
            return
        }

        const parsedAdminInfo = JSON.parse(adminInfoStr)
        setAdminInfo(parsedAdminInfo)
        setAdminRole(parsedAdminInfo.role as AdminRole || AdminRole.VIEWER)
    }, [router])

    const fetchUsers = useCallback(async () => {
        try {
            const token = localStorage.getItem('admin_token')
            const queryParams = new URLSearchParams()

            if (filters.status) queryParams.append('status', filters.status)
            if (filters.search) queryParams.append('search', filters.search)
            if (filters.dateRange?.start) queryParams.append('startDate', filters.dateRange.start.toISOString())
            if (filters.dateRange?.end) queryParams.append('endDate', filters.dateRange.end.toISOString())
            if (filters.sortBy) queryParams.append('sortBy', filters.sortBy)
            if (filters.sortOrder) queryParams.append('sortOrder', filters.sortOrder)

            const response = await fetch(`/api/admin/users?${queryParams}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            const data = await response.json()

            if (response.ok) {
                setUsers(data.users || [])
            } else {
                console.error('Failed to fetch users:', data.message)
            }
        } catch (error) {
            console.error('Error fetching users:', error)
        } finally {
            setIsLoading(false)
        }
    }, [filters])

    useEffect(() => {
        checkAuth()
        if (adminRole) {
            fetchUsers()
        }
    }, [checkAuth, fetchUsers, adminRole])

    // Filter users based on current filters
    const filteredUsers = users // Data is already filtered from API

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('vi-VN')
    }

    const getStatusBadge = (status: string) => {
        const badges = {
            'trial': 'bg-yellow-100 text-yellow-800',
            'registered': 'bg-green-100 text-green-800',
            'expired': 'bg-red-100 text-red-800',
            'suspended': 'bg-gray-100 text-gray-800'
        }
        return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800'
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

    const handleExportUsers = async () => {
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
                a.download = `users-export-${new Date().toISOString().split('T')[0]}.json`
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

    const handleSendBulkNotification = async () => {
        const message = prompt('Nhập nội dung thông báo gửi đến tất cả người dùng:')
        if (!message) return

        await handleActionWithLoading('sendBulkNotification', async () => {
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

    const handleSuspendUser = async (userId: string) => {
        const reason = prompt('Nhập lý do đình chỉ (tùy chọn):')
        
        await handleActionWithLoading(`suspendUser_${userId}`, async () => {
            const token = localStorage.getItem('admin_token')
            const response = await fetch(`/api/admin/users/${userId}/suspend`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ reason: reason || 'Vi phạm quy định' })
            })

            const data = await response.json()
            
            if (data.success) {
                showToast('Đã đình chỉ người dùng thành công!', 'success')
                // Refresh users
                await fetchUsers()
            } else {
                showToast(`Lỗi đình chỉ người dùng: ${data.message}`, 'error')
            }
        })
    }

    const handleActivateUser = async (userId: string) => {
        await handleActionWithLoading(`activateUser_${userId}`, async () => {
            const token = localStorage.getItem('admin_token')
            const response = await fetch(`/api/admin/users/${userId}/activate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            const data = await response.json()
            
            if (data.success) {
                showToast('Đã kích hoạt người dùng thành công!', 'success')
                // Refresh users
                await fetchUsers()
            } else {
                showToast(`Lỗi kích hoạt người dùng: ${data.message}`, 'error')
            }
        })
    }

    const handleViewUserDetails = async (userId: string) => {
        await handleActionWithLoading(`viewDetails_${userId}`, async () => {
            const token = localStorage.getItem('admin_token')
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            const data = await response.json()
            
            if (data.success) {
                // Open details in new window
                const detailsWindow = window.open('', '_blank', 'width=800,height=600')
                if (detailsWindow) {
                    const user = data.user
                    detailsWindow.document.write(`
                        <html>
                            <head><title>User Details - ${user.name}</title></head>
                            <body style="font-family: Arial, sans-serif; padding: 20px;">
                                <h1>Chi tiết người dùng</h1>
                                <h2>${user.name}</h2>
                                <p><strong>Facebook ID:</strong> ${user.facebook_id}</p>
                                <p><strong>Số điện thoại:</strong> ${user.phone || 'Chưa cập nhật'}</p>
                                <p><strong>Email:</strong> ${user.email || 'Chưa cập nhật'}</p>
                                <p><strong>Trạng thái:</strong> ${user.status}</p>
                                <p><strong>Ngày đăng ký:</strong> ${new Date(user.created_at).toLocaleString()}</p>
                                <p><strong>Lần cuối hoạt động:</strong> ${user.last_active ? new Date(user.last_active).toLocaleString() : 'Chưa có'}</p>
                                <p><strong>Điểm:</strong> ${user.points || 0}</p>
                                <p><strong>Số tin đăng:</strong> ${user.listings_count || 0}</p>
                                <p><strong>Số thanh toán:</strong> ${user.payments_count || 0}</p>
                            </body>
                        </html>
                    `)
                }
                showToast('Đã mở chi tiết người dùng!', 'success')
            } else {
                showToast(`Lỗi tải chi tiết: ${data.message}`, 'error')
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
                                👥 Quản lý người dùng
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
                {/* Bulk Actions */}
                <div className="mb-6 bg-white p-4 rounded-lg shadow">
                    <h3 className="text-lg font-medium text-gray-900 mb-3">⚡ Hành động hàng loạt</h3>
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={handleExportUsers}
                            disabled={loadingActions.exportUsers}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loadingActions.exportUsers ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Đang xuất...
                                </>
                            ) : (
                                '📊 Xuất danh sách'
                            )}
                        </button>
                        <button
                            onClick={handleSendBulkNotification}
                            disabled={loadingActions.sendBulkNotification}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                        >
                            {loadingActions.sendBulkNotification ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Đang gửi...
                                </>
                            ) : (
                                '📢 Gửi thông báo'
                            )}
                        </button>
                    </div>
                </div>

                {/* Advanced Filters */}
                <AdvancedFilters
                    filters={filters}
                    onFiltersChange={setFilters}
                    availableStatuses={['trial', 'registered', 'expired', 'suspended']}
                    showDateRange={true}
                    showActivityLevel={true}
                    showSorting={true}
                    className="mb-6"
                />

                {/* Users Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
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
                                            {users.length}
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
                                        <span className="text-white text-sm">✅</span>
                                    </div>
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">
                                            Đã đăng ký
                                        </dt>
                                        <dd className="text-lg font-medium text-gray-900">
                                            {users.filter(u => u.status === 'registered').length}
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
                                            Trial
                                        </dt>
                                        <dd className="text-lg font-medium text-gray-900">
                                            {users.filter(u => u.status === 'trial').length}
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
                                    <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                                        <span className="text-white text-sm">⚠️</span>
                                    </div>
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">
                                            Hết hạn
                                        </dt>
                                        <dd className="text-lg font-medium text-gray-900">
                                            {users.filter(u => u.status === 'expired').length}
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Users List */}
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                    {filteredUsers.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-gray-500 text-lg">
                                {filters.search ? `Không tìm thấy kết quả cho "${filters.search}"` : 'Không có người dùng nào'}
                            </div>
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-200">
                            {filteredUsers.map((user) => (
                                <li key={user.id}>
                                    <div className="px-4 py-4 sm:px-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm font-medium text-indigo-600 truncate">
                                                        {user.name}
                                                    </p>
                                                    <div className="ml-2 flex-shrink-0 flex">
                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(user.status)}`}>
                                                            {user.status === 'trial' ? 'Trial' :
                                                             user.status === 'registered' ? 'Đã đăng ký' :
                                                             user.status === 'expired' ? 'Hết hạn' : 'Đình chỉ'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="mt-2 sm:flex sm:justify-between">
                                                    <div className="sm:flex">
                                                        <p className="flex items-center text-sm text-gray-500">
                                                            📱 {user.phone}
                                                        </p>
                                                        <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                                                            📍 {user.location}
                                                        </p>
                                                        <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                                                            🆔 {user.facebook_id}
                                                        </p>
                                                    </div>
                                                    <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                                                        <p>⭐ {user.rating} ({user.total_transactions} giao dịch)</p>
                                                    </div>
                                                </div>
                                                <div className="mt-2 sm:flex sm:justify-between">
                                                    <div className="sm:flex">
                                                        <p className="flex items-center text-sm text-gray-500">
                                                            📅 Tham gia: {formatDate(user.created_at)}
                                                        </p>
                                                        {user.membership_expires_at && (
                                                            <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                                                                ⏰ Hạn: {formatDate(user.membership_expires_at)}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="ml-4 flex-shrink-0 flex space-x-2">
                                                <button
                                                    onClick={() => handleViewUserDetails(user.id)}
                                                    disabled={loadingActions[`viewDetails_${user.id}`]}
                                                    className="bg-indigo-600 text-white px-3 py-1 rounded-md hover:bg-indigo-700 text-sm disabled:opacity-50 flex items-center"
                                                >
                                                    {loadingActions[`viewDetails_${user.id}`] ? (
                                                        <>
                                                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                                                            Đang tải...
                                                        </>
                                                    ) : (
                                                        'Chi tiết'
                                                    )}
                                                </button>
                                                {user.status === 'suspended' ? (
                                                    <button
                                                        onClick={() => handleActivateUser(user.id)}
                                                        disabled={loadingActions[`activateUser_${user.id}`]}
                                                        className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 text-sm disabled:opacity-50 flex items-center"
                                                    >
                                                        {loadingActions[`activateUser_${user.id}`] ? (
                                                            <>
                                                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                                                                ...
                                                            </>
                                                        ) : (
                                                            'Kích hoạt'
                                                        )}
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleSuspendUser(user.id)}
                                                        disabled={loadingActions[`suspendUser_${user.id}`]}
                                                        className="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 text-sm disabled:opacity-50 flex items-center"
                                                    >
                                                        {loadingActions[`suspendUser_${user.id}`] ? (
                                                            <>
                                                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                                                                ...
                                                            </>
                                                        ) : (
                                                            'Đình chỉ'
                                                        )}
                                                    </button>
                                                )}
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
