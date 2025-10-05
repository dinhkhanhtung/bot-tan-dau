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

interface SystemSettings {
    botStatus: string
    aiStatus: string
    paymentFee: number
    trialDays: number
    maxListingsPerUser: number
    autoApproveListings: boolean
    maintenanceMode: boolean
    autoApprovePayments: boolean
    paymentApprovalTimeout: number
}

export default function AdminSettings() {
    const [settings, setSettings] = useState<SystemSettings>({
        botStatus: 'active',
        aiStatus: 'active',
        paymentFee: 7000,
        trialDays: 3,
        maxListingsPerUser: 10,
        autoApproveListings: false,
        maintenanceMode: false,
        autoApprovePayments: false,
        paymentApprovalTimeout: 24
    })
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
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
        fetchSettings()
    }, [])

    const checkAuth = () => {
        const token = localStorage.getItem('admin_token')
        const adminInfoStr = localStorage.getItem('admin_info')

        if (!token || !adminInfoStr) {
            router.push('/admin/login')
            return
        }

        setAdminInfo(JSON.parse(adminInfoStr))
    }

    const fetchSettings = async () => {
        try {
            const token = localStorage.getItem('admin_token')
            const response = await fetch('/api/admin/settings', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            const data = await response.json()

            if (response.ok) {
                setSettings(data.settings)
            } else {
                console.error('Failed to fetch settings:', data.message)
            }
        } catch (error) {
            console.error('Error fetching settings:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleSaveSettings = async () => {
        setIsSaving(true)
        try {
            const token = localStorage.getItem('admin_token')
            const response = await fetch('/api/admin/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(settings)
            })

            if (response.ok) {
                showToast('Cài đặt đã được lưu thành công!', 'success')
            } else {
                showToast('Có lỗi xảy ra khi lưu cài đặt', 'error')
            }
        } catch (error) {
            console.error('Error saving settings:', error)
            showToast('Có lỗi xảy ra khi lưu cài đặt', 'error')
        } finally {
            setIsSaving(false)
        }
    }

    const handleInputChange = (field: keyof SystemSettings, value: any) => {
        setSettings(prev => ({
            ...prev,
            [field]: value
        }))
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

    const handleChangePassword = async () => {
        const newPassword = prompt('Nhập mật khẩu mới:')
        if (!newPassword) return

        await handleActionWithLoading('changePassword', async () => {
            const token = localStorage.getItem('admin_token')
            const response = await fetch('/api/admin/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    action: 'changePassword',
                    newPassword: newPassword
                })
            })

            const data = await response.json()
            
            if (data.success) {
                showToast('Đã đổi mật khẩu thành công!', 'success')
            } else {
                showToast(`Lỗi đổi mật khẩu: ${data.message}`, 'error')
            }
        })
    }

    const handleAddAdmin = async () => {
        const username = prompt('Nhập tên đăng nhập admin mới:')
        if (!username) return
        
        const password = prompt('Nhập mật khẩu admin mới:')
        if (!password) return

        await handleActionWithLoading('addAdmin', async () => {
            const token = localStorage.getItem('admin_token')
            const response = await fetch('/api/admin/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    action: 'addAdmin',
                    username: username,
                    password: password
                })
            })

            const data = await response.json()
            
            if (data.success) {
                showToast(`Đã thêm admin "${username}" thành công!`, 'success')
            } else {
                showToast(`Lỗi thêm admin: ${data.message}`, 'error')
            }
        })
    }

    const handleViewLogs = async () => {
        await handleActionWithLoading('viewLogs', async () => {
            const token = localStorage.getItem('admin_token')
            const response = await fetch('/api/admin/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ action: 'viewLogs' })
            })

            const data = await response.json()
            
            if (data.success) {
                // Open logs in new window
                const logsWindow = window.open('', '_blank', 'width=800,height=600')
                if (logsWindow) {
                    logsWindow.document.write(`
                        <html>
                            <head><title>System Logs</title></head>
                            <body style="font-family: monospace; padding: 20px;">
                                <h1>System Logs</h1>
                                <pre>${data.logs}</pre>
                            </body>
                        </html>
                    `)
                }
                showToast('Đã mở nhật ký hệ thống!', 'success')
            } else {
                showToast(`Lỗi xem nhật ký: ${data.message}`, 'error')
            }
        })
    }

    const handleSyncData = async () => {
        await handleActionWithLoading('syncData', async () => {
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

    const handleExportData = async () => {
        await handleActionWithLoading('exportData', async () => {
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
                a.download = `bot-data-export-${new Date().toISOString().split('T')[0]}.json`
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                URL.revokeObjectURL(url)
                
                showToast(`Xuất dữ liệu thành công! ${data.data.summary.totalUsers} users, ${data.data.summary.totalListings} listings`, 'success')
            } else {
                showToast(`Lỗi xuất dữ liệu: ${data.message}`, 'error')
            }
        })
    }

    const handleResetSpamCounter = async () => {
        await handleActionWithLoading('resetSpamCounter', async () => {
            const token = localStorage.getItem('admin_token')
            const response = await fetch('/api/admin/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ action: 'resetSpam' })
            })

            const data = await response.json()
            
            if (data.success) {
                showToast(`Đã reset bộ đếm spam thành công! ${data.details.spamTrackingCleared ? 'Spam tracking cleared' : ''}`, 'success')
            } else {
                showToast(`Lỗi reset spam: ${data.message}`, 'error')
            }
        })
    }

    const handleCleanupData = async () => {
        if (!confirm('⚠️ CẢNH BÁO: Thao tác này sẽ xóa TẤT CẢ dữ liệu trong database!\n\nBạn có chắc chắn muốn tiếp tục?')) {
            return
        }

        await handleActionWithLoading('cleanupData', async () => {
            const token = localStorage.getItem('admin_token')
            const response = await fetch('/api/admin/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ action: 'cleanup' })
            })

            const data = await response.json()
            
            if (data.success) {
                showToast(`Đã làm sạch dữ liệu thành công! Cleaned ${data.details.cleanedTables} tables`, 'success')
            } else {
                showToast(`Lỗi cleanup: ${data.message}`, 'error')
            }
        })
    }

    const handleResetToDefault = async () => {
        if (!confirm('Bạn có chắc chắn muốn khôi phục cài đặt mặc định? Hành động này không thể hoàn tác.')) {
            return
        }

        await handleActionWithLoading('resetToDefault', async () => {
            const token = localStorage.getItem('admin_token')
            const response = await fetch('/api/admin/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ action: 'resetToDefault' })
            })

            const data = await response.json()
            
            if (data.success) {
                showToast('Đã khôi phục cài đặt mặc định!', 'success')
                // Reset local settings
                setSettings({
                    botStatus: 'active',
                    aiStatus: 'active',
                    paymentFee: 7000,
                    trialDays: 3,
                    maxListingsPerUser: 10,
                    autoApproveListings: false,
                    maintenanceMode: false,
                    autoApprovePayments: false,
                    paymentApprovalTimeout: 24
                })
            } else {
                showToast(`Lỗi reset settings: ${data.message}`, 'error')
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
                                ⚙️ Cài đặt hệ thống
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Bot & AI Settings */}
                    <div className="bg-white shadow rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                                🤖 Cài đặt Bot & AI
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Trạng thái Bot
                                    </label>
                                    <select
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"
                                        value={settings.botStatus}
                                        onChange={(e) => handleInputChange('botStatus', e.target.value)}
                                    >
                                        <option value="active">Đang hoạt động</option>
                                        <option value="stopped">Tạm dừng</option>
                                        <option value="maintenance">Bảo trì</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Trạng thái AI
                                    </label>
                                    <select
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"
                                        value={settings.aiStatus}
                                        onChange={(e) => handleInputChange('aiStatus', e.target.value)}
                                    >
                                        <option value="active">Đang hoạt động</option>
                                        <option value="stopped">Tạm dừng</option>
                                        <option value="maintenance">Bảo trì</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Chế độ bảo trì
                                    </label>
                                    <div className="mt-1">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                            checked={settings.maintenanceMode}
                                            onChange={(e) => handleInputChange('maintenanceMode', e.target.checked)}
                                        />
                                        <span className="ml-2 text-sm text-gray-700">
                                            Bật chế độ bảo trì (chỉ admin mới truy cập được)
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Payment Settings */}
                    <div className="bg-white shadow rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                                💰 Cài đặt thanh toán
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Phí dịch vụ (VNĐ/ngày)
                                    </label>
                                    <input
                                        type="number"
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"
                                        value={settings.paymentFee}
                                        onChange={(e) => handleInputChange('paymentFee', parseInt(e.target.value))}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Số ngày dùng thử miễn phí
                                    </label>
                                    <input
                                        type="number"
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"
                                        value={settings.trialDays}
                                        onChange={(e) => handleInputChange('trialDays', parseInt(e.target.value))}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Tự động duyệt thanh toán
                                    </label>
                                    <div className="mt-1">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                            checked={settings.autoApprovePayments}
                                            onChange={(e) => handleInputChange('autoApprovePayments', e.target.checked)}
                                        />
                                        <span className="ml-2 text-sm text-gray-700">
                                            Tự động duyệt thanh toán sau khi nhận ảnh chuyển khoản
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Thời gian chờ duyệt (giờ)
                                    </label>
                                    <input
                                        type="number"
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                        value={settings.paymentApprovalTimeout}
                                        onChange={(e) => handleInputChange('paymentApprovalTimeout', parseInt(e.target.value))}
                                        placeholder="24"
                                    />
                                    <p className="mt-1 text-sm text-gray-500">
                                        Số giờ chờ trước khi tự động duyệt thanh toán
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Listing Settings */}
                    <div className="bg-white shadow rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                                🛒 Cài đặt tin đăng
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Số tin đăng tối đa mỗi user
                                    </label>
                                    <input
                                        type="number"
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"
                                        value={settings.maxListingsPerUser}
                                        onChange={(e) => handleInputChange('maxListingsPerUser', parseInt(e.target.value))}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Tự động duyệt tin đăng
                                    </label>
                                    <div className="mt-1">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                            checked={settings.autoApproveListings}
                                            onChange={(e) => handleInputChange('autoApproveListings', e.target.checked)}
                                        />
                                        <span className="ml-2 text-sm text-gray-700">
                                            Tự động duyệt tin đăng mới (không cần kiểm duyệt thủ công)
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Admin Management */}
                    <div className="bg-white shadow rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                                👨‍💼 Quản lý Admin
                            </h3>
                            <div className="space-y-4">
                                <button
                                    onClick={handleChangePassword}
                                    disabled={loadingActions.changePassword}
                                    className="w-full bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center"
                                >
                                    {loadingActions.changePassword ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Đang xử lý...
                                        </>
                                    ) : (
                                        '🔐 Đổi mật khẩu'
                                    )}
                                </button>
                                <button
                                    onClick={handleAddAdmin}
                                    disabled={loadingActions.addAdmin}
                                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
                                >
                                    {loadingActions.addAdmin ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Đang xử lý...
                                        </>
                                    ) : (
                                        '👥 Thêm Admin mới'
                                    )}
                                </button>
                                <button
                                    onClick={handleViewLogs}
                                    disabled={loadingActions.viewLogs}
                                    className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center justify-center"
                                >
                                    {loadingActions.viewLogs ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Đang xử lý...
                                        </>
                                    ) : (
                                        '📋 Nhật ký hoạt động'
                                    )}
                                </button>
                                <button
                                    onClick={handleSyncData}
                                    disabled={loadingActions.syncData}
                                    className="w-full bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center"
                                >
                                    {loadingActions.syncData ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Đang đồng bộ...
                                        </>
                                    ) : (
                                        '🔄 Đồng bộ dữ liệu'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* System Actions */}
                    <div className="bg-white shadow rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                                🔧 Hành động hệ thống
                            </h3>
                            <div className="space-y-4">
                                <button
                                    onClick={handleExportData}
                                    disabled={loadingActions.exportData}
                                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
                                >
                                    {loadingActions.exportData ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Đang xuất dữ liệu...
                                        </>
                                    ) : (
                                        '📊 Xuất dữ liệu hệ thống'
                                    )}
                                </button>
                                <button
                                    onClick={handleResetSpamCounter}
                                    disabled={loadingActions.resetSpamCounter}
                                    className="w-full bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 disabled:opacity-50 flex items-center justify-center"
                                >
                                    {loadingActions.resetSpamCounter ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Đang reset...
                                        </>
                                    ) : (
                                        '🔄 Reset bộ đếm spam'
                                    )}
                                </button>
                                <button
                                    onClick={handleCleanupData}
                                    disabled={loadingActions.cleanupData}
                                    className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center justify-center"
                                >
                                    {loadingActions.cleanupData ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Đang dọn dẹp...
                                        </>
                                    ) : (
                                        '🧹 Dọn dẹp dữ liệu cũ'
                                    )}
                                </button>
                                <button
                                    onClick={handleResetToDefault}
                                    disabled={loadingActions.resetToDefault}
                                    className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center justify-center"
                                >
                                    {loadingActions.resetToDefault ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Đang khôi phục...
                                        </>
                                    ) : (
                                        '⚠️ Khôi phục cài đặt mặc định'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div className="mt-8 flex justify-end">
                    <button
                        onClick={handleSaveSettings}
                        disabled={isSaving}
                        className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {isSaving ? 'Đang lưu...' : '💾 Lưu cài đặt'}
                    </button>
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
