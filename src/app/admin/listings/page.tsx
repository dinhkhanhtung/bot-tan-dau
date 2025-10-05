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

interface Listing {
    id: string
    title: string
    type: string
    category: string
    price: number
    status: string
    views: number
    created_at: string
    users: {
        name: string
        phone: string
        location: string
    }
}

export default function AdminListings() {
    const [listings, setListings] = useState<Listing[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [filter, setFilter] = useState('all')
    const [searchTerm, setSearchTerm] = useState('')
    const [adminInfo, setAdminInfo] = useState<any>(null)
    const [selectedItems, setSelectedItems] = useState<string[]>([])
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info', show: boolean }>({
        message: '',
        type: 'info',
        show: false
    })
    const [loadingActions, setLoadingActions] = useState<{ [key: string]: boolean }>({})
    const router = useRouter()

    useEffect(() => {
        checkAuth()
        fetchListings()
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

    const fetchListings = async () => {
        try {
            const token = localStorage.getItem('admin_token')
            const response = await fetch(`/api/admin/listings?status=${filter}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            const data = await response.json()

            if (response.ok) {
                setListings(data.listings || [])
            } else {
                console.error('Failed to fetch listings:', data.message)
            }
        } catch (error) {
            console.error('Error fetching listings:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const filteredListings = listings.filter(listing => {
        if (!searchTerm) return true
        return (
            listing.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            listing.users.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            listing.category.toLowerCase().includes(searchTerm.toLowerCase())
        )
    })

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN').format(amount) + 'đ'
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('vi-VN')
    }

    const getStatusBadge = (status: string) => {
        const badges = {
            'active': 'bg-green-100 text-green-800',
            'inactive': 'bg-gray-100 text-gray-800',
            'sold': 'bg-blue-100 text-blue-800',
            'pending': 'bg-yellow-100 text-yellow-800'
        }
        return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800'
    }

    const getTypeBadge = (type: string) => {
        return type === 'product' ? 'bg-purple-100 text-purple-800' : 'bg-orange-100 text-orange-800'
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

    const handleExportListings = async () => {
        await handleActionWithLoading('exportListings', async () => {
            const token = localStorage.getItem('admin_token')
            const response = await fetch('/api/admin/listings', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            const data = await response.json()
            
            if (data.success) {
                // Download listings data as JSON file
                const blob = new Blob([JSON.stringify(data.listings, null, 2)], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `listings-export-${new Date().toISOString().split('T')[0]}.json`
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                URL.revokeObjectURL(url)
                
                showToast(`Đã xuất danh sách ${data.listings.length} tin đăng thành công!`, 'success')
            } else {
                showToast(`Lỗi xuất danh sách tin đăng: ${data.message}`, 'error')
            }
        })
    }

    const handleApproveListing = async (listingId: string) => {
        await handleActionWithLoading(`approveListing_${listingId}`, async () => {
            const token = localStorage.getItem('admin_token')
            const response = await fetch(`/api/admin/listings/${listingId}/approve`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            const data = await response.json()
            
            if (data.success) {
                showToast('Đã duyệt tin đăng thành công!', 'success')
                // Refresh listings
                await fetchListings()
            } else {
                showToast(`Lỗi duyệt tin đăng: ${data.message}`, 'error')
            }
        })
    }

    const handleRejectListing = async (listingId: string) => {
        const reason = prompt('Nhập lý do từ chối (tùy chọn):')
        
        await handleActionWithLoading(`rejectListing_${listingId}`, async () => {
            const token = localStorage.getItem('admin_token')
            const response = await fetch(`/api/admin/listings/${listingId}/reject`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ reason: reason || 'Không đạt yêu cầu' })
            })

            const data = await response.json()
            
            if (data.success) {
                showToast('Đã từ chối tin đăng!', 'success')
                // Refresh listings
                await fetchListings()
            } else {
                showToast(`Lỗi từ chối tin đăng: ${data.message}`, 'error')
            }
        })
    }

    const handleViewListingDetails = async (listingId: string) => {
        await handleActionWithLoading(`viewDetails_${listingId}`, async () => {
            const token = localStorage.getItem('admin_token')
            const response = await fetch(`/api/admin/listings/${listingId}`, {
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
                    const listing = data.listing
                    detailsWindow.document.write(`
                        <html>
                            <head><title>Listing Details - ${listing.title}</title></head>
                            <body style="font-family: Arial, sans-serif; padding: 20px;">
                                <h1>Chi tiết tin đăng</h1>
                                <h2>${listing.title}</h2>
                                <p><strong>Mô tả:</strong> ${listing.description}</p>
                                <p><strong>Giá:</strong> ${listing.price ? listing.price.toLocaleString() + ' VNĐ' : 'Thỏa thuận'}</p>
                                <p><strong>Danh mục:</strong> ${listing.category}</p>
                                <p><strong>Trạng thái:</strong> ${listing.status}</p>
                                <p><strong>Người đăng:</strong> ${listing.users?.name || 'Unknown'}</p>
                                <p><strong>Ngày tạo:</strong> ${new Date(listing.created_at).toLocaleString()}</p>
                                ${listing.images ? `<p><strong>Hình ảnh:</strong> ${listing.images.length} ảnh</p>` : ''}
                            </body>
                        </html>
                    `)
                }
                showToast('Đã mở chi tiết tin đăng!', 'success')
            } else {
                showToast(`Lỗi tải chi tiết: ${data.message}`, 'error')
            }
        })
    }

    const handleBulkApprove = async () => {
        if (!confirm('Bạn có chắc chắn muốn duyệt tất cả tin đăng đang chờ?')) {
            return
        }

        await handleActionWithLoading('bulkApprove', async () => {
            const token = localStorage.getItem('admin_token')
            
            // Get all pending listings
            const response = await fetch('/api/admin/listings?status=pending', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            const data = await response.json()
            
            if (data.success && data.listings.length > 0) {
                // Approve all pending listings
                let approvedCount = 0
                let errorCount = 0

                for (const listing of data.listings) {
                    try {
                        const approveResponse = await fetch(`/api/admin/listings/${listing.id}/approve`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${token}`
                            }
                        })
                        
                        if (approveResponse.ok) {
                            approvedCount++
                        } else {
                            errorCount++
                        }
                    } catch (error) {
                        errorCount++
                    }
                }

                showToast(`Đã duyệt ${approvedCount} tin đăng thành công! ${errorCount > 0 ? `${errorCount} lỗi` : ''}`, 'success')
                // Refresh listings
                await fetchListings()
            } else {
                showToast('Không có tin đăng nào đang chờ duyệt!', 'info')
            }
        })
    }

    const handleBulkDelete = async () => {
        if (!confirm('Bạn có chắc chắn muốn xóa các tin đăng đã chọn? Hành động này không thể hoàn tác.')) {
            return
        }

        await handleActionWithLoading('bulkDelete', async () => {
            const token = localStorage.getItem('admin_token')
            
            // Get selected listings (assuming we have a selection mechanism)
            const selectedListings = selectedItems || [] // This should come from component state
            
            if (selectedListings.length === 0) {
                showToast('Vui lòng chọn tin đăng cần xóa!', 'error')
                return
            }

            let deletedCount = 0
            let errorCount = 0

            for (const listingId of selectedListings) {
                try {
                    const response = await fetch(`/api/admin/listings/${listingId}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    })
                    
                    if (response.ok) {
                        deletedCount++
                    } else {
                        errorCount++
                    }
                } catch (error) {
                    errorCount++
                }
            }

            showToast(`Đã xóa ${deletedCount} tin đăng thành công! ${errorCount > 0 ? `${errorCount} lỗi` : ''}`, 'success')
            // Refresh listings
            await fetchListings()
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
                                🛒 Quản lý tin đăng
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
                            onClick={handleExportListings}
                            disabled={loadingActions.exportListings}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loadingActions.exportListings ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Đang xuất...
                                </>
                            ) : (
                                '📊 Xuất danh sách'
                            )}
                        </button>
                        <button
                            onClick={handleBulkApprove}
                            disabled={loadingActions.bulkApprove}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                        >
                            {loadingActions.bulkApprove ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Đang duyệt...
                                </>
                            ) : (
                                '✅ Duyệt hàng loạt'
                            )}
                        </button>
                        <button
                            onClick={handleBulkDelete}
                            disabled={loadingActions.bulkDelete}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                        >
                            {loadingActions.bulkDelete ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Đang xóa...
                                </>
                            ) : (
                                '🗑️ Xóa đã chọn'
                            )}
                        </button>
                    </div>
                </div>

                {/* Search and Filter */}
                <div className="mb-6 flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <input
                            type="text"
                            placeholder="Tìm kiếm theo tiêu đề, người đăng, danh mục..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="sm:w-48">
                        <select
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        >
                            <option value="all">Tất cả</option>
                            <option value="active">Đang hoạt động</option>
                            <option value="inactive">Không hoạt động</option>
                            <option value="sold">Đã bán</option>
                            <option value="pending">Chờ duyệt</option>
                        </select>
                    </div>
                </div>

                {/* Listings Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                                        <span className="text-white text-sm">🛒</span>
                                    </div>
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">
                                            Tổng tin đăng
                                        </dt>
                                        <dd className="text-lg font-medium text-gray-900">
                                            {listings.length}
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
                                            Đang hoạt động
                                        </dt>
                                        <dd className="text-lg font-medium text-gray-900">
                                            {listings.filter(l => l.status === 'active').length}
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
                                    <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                                        <span className="text-white text-sm">🔄</span>
                                    </div>
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">
                                            Đã bán
                                        </dt>
                                        <dd className="text-lg font-medium text-gray-900">
                                            {listings.filter(l => l.status === 'sold').length}
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
                                        <span className="text-white text-sm">👁️</span>
                                    </div>
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">
                                            Tổng lượt xem
                                        </dt>
                                        <dd className="text-lg font-medium text-gray-900">
                                            {listings.reduce((sum, l) => sum + (l.views || 0), 0).toLocaleString()}
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Listings List */}
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                    {filteredListings.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-gray-500 text-lg">
                                {searchTerm ? 'Không tìm thấy tin đăng nào' : 'Không có tin đăng nào'}
                            </div>
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-200">
                            {filteredListings.map((listing) => (
                                <li key={listing.id}>
                                    <div className="px-4 py-4 sm:px-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm font-medium text-indigo-600 truncate">
                                                        {listing.title}
                                                    </p>
                                                    <div className="ml-2 flex-shrink-0 flex space-x-2">
                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getTypeBadge(listing.type)}`}>
                                                            {listing.type === 'product' ? 'Sản phẩm' : 'Dịch vụ'}
                                                        </span>
                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(listing.status)}`}>
                                                            {listing.status === 'active' ? 'Đang hoạt động' :
                                                             listing.status === 'inactive' ? 'Không hoạt động' :
                                                             listing.status === 'sold' ? 'Đã bán' : 'Chờ duyệt'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="mt-2 sm:flex sm:justify-between">
                                                    <div className="sm:flex">
                                                        <p className="flex items-center text-sm text-gray-500">
                                                            👤 {listing.users.name}
                                                        </p>
                                                        <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                                                            📱 {listing.users.phone}
                                                        </p>
                                                        <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                                                            📍 {listing.users.location}
                                                        </p>
                                                    </div>
                                                    <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                                                        <p>💰 {formatCurrency(listing.price)}</p>
                                                    </div>
                                                </div>
                                                <div className="mt-2 sm:flex sm:justify-between">
                                                    <div className="sm:flex">
                                                        <p className="flex items-center text-sm text-gray-500">
                                                            📂 {listing.category}
                                                        </p>
                                                        <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                                                            👁️ {listing.views || 0} lượt xem
                                                        </p>
                                                        <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                                                            📅 {formatDate(listing.created_at)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="ml-4 flex-shrink-0 flex space-x-2">
                                                <button
                                                    onClick={() => handleViewListingDetails(listing.id)}
                                                    disabled={loadingActions[`viewDetails_${listing.id}`]}
                                                    className="bg-indigo-600 text-white px-3 py-1 rounded-md hover:bg-indigo-700 text-sm disabled:opacity-50 flex items-center"
                                                >
                                                    {loadingActions[`viewDetails_${listing.id}`] ? (
                                                        <>
                                                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                                                            Đang tải...
                                                        </>
                                                    ) : (
                                                        'Chi tiết'
                                                    )}
                                                </button>
                                                {listing.status === 'pending' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleApproveListing(listing.id)}
                                                            disabled={loadingActions[`approveListing_${listing.id}`]}
                                                            className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 text-sm disabled:opacity-50 flex items-center"
                                                        >
                                                            {loadingActions[`approveListing_${listing.id}`] ? (
                                                                <>
                                                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                                                                    ...
                                                                </>
                                                            ) : (
                                                                'Duyệt'
                                                            )}
                                                        </button>
                                                        <button
                                                            onClick={() => handleRejectListing(listing.id)}
                                                            disabled={loadingActions[`rejectListing_${listing.id}`]}
                                                            className="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 text-sm disabled:opacity-50 flex items-center"
                                                        >
                                                            {loadingActions[`rejectListing_${listing.id}`] ? (
                                                                <>
                                                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                                                                    ...
                                                                </>
                                                            ) : (
                                                                'Từ chối'
                                                            )}
                                                        </button>
                                                    </>
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
