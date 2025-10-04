'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface SystemSettings {
    botStatus: string
    paymentFee: number
    trialDays: number
    maxListingsPerUser: number
    autoApproveListings: boolean
    maintenanceMode: boolean
}

export default function AdminSettings() {
    const [settings, setSettings] = useState<SystemSettings>({
        botStatus: 'active',
        paymentFee: 7000,
        trialDays: 3,
        maxListingsPerUser: 10,
        autoApproveListings: false,
        maintenanceMode: false
    })
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [adminInfo, setAdminInfo] = useState<any>(null)
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
                alert('Cài đặt đã được lưu thành công!')
            } else {
                alert('Có lỗi xảy ra khi lưu cài đặt')
            }
        } catch (error) {
            console.error('Error saving settings:', error)
            alert('Có lỗi xảy ra khi lưu cài đặt')
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
                    {/* Bot Settings */}
                    <div className="bg-white shadow rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                                🤖 Cài đặt Bot
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Trạng thái Bot
                                    </label>
                                    <select
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
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
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
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
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                        value={settings.trialDays}
                                        onChange={(e) => handleInputChange('trialDays', parseInt(e.target.value))}
                                    />
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
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
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

                    {/* System Actions */}
                    <div className="bg-white shadow rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                                🔧 Hành động hệ thống
                            </h3>
                            <div className="space-y-4">
                                <button className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                                    📊 Xuất dữ liệu hệ thống
                                </button>
                                <button className="w-full bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700">
                                    🔄 Reset bộ đếm spam
                                </button>
                                <button className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">
                                    🧹 Dọn dẹp dữ liệu cũ
                                </button>
                                <button className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700">
                                    ⚠️ Khôi phục cài đặt mặc định
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
        </div>
    )
}
