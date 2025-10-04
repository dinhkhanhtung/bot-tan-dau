'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Payment {
    id: string
    amount: number
    status: string
    created_at: string
    approved_at?: string
    receipt_image?: string
    users: {
        name: string
        phone: string
        location: string
        rating: number
        total_transactions: number
    }
}

export default function AdminPayments() {
    const [payments, setPayments] = useState<Payment[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [filter, setFilter] = useState('pending')
    const [adminInfo, setAdminInfo] = useState<any>(null)
    const router = useRouter()

    useEffect(() => {
        checkAuth()
        fetchPayments()
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

    const fetchPayments = async () => {
        try {
            const token = localStorage.getItem('admin_token')
            const response = await fetch(`/api/admin/payments?status=${filter}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            const data = await response.json()

            if (response.ok) {
                setPayments(data.payments || [])
            } else {
                console.error('Failed to fetch payments:', data.message)
            }
        } catch (error) {
            console.error('Error fetching payments:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleApprovePayment = async (paymentId: string) => {
        if (!confirm('Bạn có chắc chắn muốn duyệt thanh toán này?')) return

        try {
            const token = localStorage.getItem('admin_token')
            const response = await fetch(`/api/admin/payments/${paymentId}/approve`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (response.ok) {
                alert('Đã duyệt thanh toán thành công!')
                fetchPayments()
            } else {
                alert('Có lỗi xảy ra khi duyệt thanh toán')
            }
        } catch (error) {
            console.error('Error approving payment:', error)
            alert('Có lỗi xảy ra khi duyệt thanh toán')
        }
    }

    const handleRejectPayment = async (paymentId: string) => {
        if (!confirm('Bạn có chắc chắn muốn từ chối thanh toán này?')) return

        try {
            const token = localStorage.getItem('admin_token')
            const response = await fetch(`/api/admin/payments/${paymentId}/reject`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (response.ok) {
                alert('Đã từ chối thanh toán thành công!')
                fetchPayments()
            } else {
                alert('Có lỗi xảy ra khi từ chối thanh toán')
            }
        } catch (error) {
            console.error('Error rejecting payment:', error)
            alert('Có lỗi xảy ra khi từ chối thanh toán')
        }
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN').format(amount) + 'đ'
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('vi-VN')
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
                                💰 Quản lý thanh toán
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
                {/* Filter Tabs */}
                <div className="mb-6">
                    <div className="sm:hidden">
                        <label htmlFor="tabs" className="sr-only">Chọn trạng thái</label>
                        <select
                            id="tabs"
                            name="tabs"
                            className="block w-full focus:ring-indigo-500 focus:border-indigo-500 border-gray-300 rounded-md"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        >
                            <option value="pending">Chờ duyệt</option>
                            <option value="approved">Đã duyệt</option>
                            <option value="rejected">Đã từ chối</option>
                            <option value="all">Tất cả</option>
                        </select>
                    </div>
                    <div className="hidden sm:block">
                        <div className="border-b border-gray-200">
                            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                                {[
                                    { key: 'pending', label: 'Chờ duyệt', count: payments.filter(p => p.status === 'pending').length },
                                    { key: 'approved', label: 'Đã duyệt', count: payments.filter(p => p.status === 'approved').length },
                                    { key: 'rejected', label: 'Đã từ chối', count: payments.filter(p => p.status === 'rejected').length },
                                    { key: 'all', label: 'Tất cả', count: payments.length }
                                ].map((tab) => (
                                    <button
                                        key={tab.key}
                                        onClick={() => setFilter(tab.key)}
                                        className={`${
                                            filter === tab.key
                                                ? 'border-indigo-500 text-indigo-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center`}
                                    >
                                        {tab.label}
                                        <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                                            filter === tab.key
                                                ? 'bg-indigo-100 text-indigo-600'
                                                : 'bg-gray-100 text-gray-600'
                                        }`}>
                                            {tab.count}
                                        </span>
                                    </button>
                                ))}
                            </nav>
                        </div>
                    </div>
                </div>

                {/* Payments List */}
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                    {payments.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-gray-500 text-lg">Không có thanh toán nào</div>
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-200">
                            {payments.map((payment) => (
                                <li key={payment.id}>
                                    <div className="px-4 py-4 sm:px-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm font-medium text-indigo-600 truncate">
                                                        Thanh toán #{payment.id.slice(-8)}
                                                    </p>
                                                    <div className="ml-2 flex-shrink-0 flex">
                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                            payment.status === 'pending'
                                                                ? 'bg-yellow-100 text-yellow-800'
                                                                : payment.status === 'approved'
                                                                ? 'bg-green-100 text-green-800'
                                                                : 'bg-red-100 text-red-800'
                                                        }`}>
                                                            {payment.status === 'pending' ? 'Chờ duyệt' :
                                                             payment.status === 'approved' ? 'Đã duyệt' : 'Đã từ chối'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="mt-2 sm:flex sm:justify-between">
                                                    <div className="sm:flex">
                                                        <p className="flex items-center text-sm text-gray-500">
                                                            👤 {payment.users.name}
                                                        </p>
                                                        <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                                                            📱 {payment.users.phone}
                                                        </p>
                                                        <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                                                            📍 {payment.users.location}
                                                        </p>
                                                    </div>
                                                    <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                                                        <p>💰 {formatCurrency(payment.amount)}</p>
                                                    </div>
                                                </div>
                                                <div className="mt-2 sm:flex sm:justify-between">
                                                    <div className="sm:flex">
                                                        <p className="flex items-center text-sm text-gray-500">
                                                            ⭐ {payment.users.rating} ({payment.users.total_transactions} giao dịch)
                                                        </p>
                                                        <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                                                            📅 {formatDate(payment.created_at)}
                                                        </p>
                                                    </div>
                                                    {payment.receipt_image && (
                                                        <div className="mt-2 flex items-center text-sm text-blue-500 sm:mt-0">
                                                            📸 Có biên lai
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {payment.status === 'pending' && (
                                                <div className="ml-4 flex-shrink-0 flex space-x-2">
                                                    <button
                                                        onClick={() => handleApprovePayment(payment.id)}
                                                        className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 text-sm"
                                                    >
                                                        Duyệt
                                                    </button>
                                                    <button
                                                        onClick={() => handleRejectPayment(payment.id)}
                                                        className="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 text-sm"
                                                    >
                                                        Từ chối
                                                    </button>
                                                </div>
                                            )}
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
