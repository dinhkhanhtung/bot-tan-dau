'use client'

import { useState, useEffect, useCallback } from 'react'
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

interface Ad {
  id: string
  user_id: string
  title: string
  description: string
  image: string | null
  budget: number
  start_date: string
  end_date: string
  status: 'pending' | 'active' | 'paused' | 'completed'
  created_at: string
  user?: {
    id: string
    name: string
  }
}

export default function AdsPage() {
  const [ads, setAds] = useState<Ad[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info', show: boolean }>({
    message: '',
    type: 'info',
    show: false
  })
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image: '',
    budget: '',
    start_date: '',
    end_date: ''
  })
  const router = useRouter()

  const fetchAds = useCallback(async () => {
    try {
      const response = await fetch('/api/ads')
      const data = await response.json()

      if (response.ok) {
        setAds(data.ads || [])
      } else {
        showToast(data.error || 'Failed to fetch ads', 'error')
      }
    } catch (error) {
      showToast('Failed to fetch ads', 'error')
      console.error('Error fetching ads:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAds()
  }, [fetchAds])

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type, show: true })
  }

  const handleCreateAd = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const response = await fetch('/api/ads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          budget: parseFloat(formData.budget),
          user_id: 'current-user-id' // This should be replaced with actual user ID from auth context
        }),
      })

      const data = await response.json()

      if (response.ok) {
        showToast('Ad created successfully', 'success')
        setIsCreateModalOpen(false)
        setFormData({
          title: '',
          description: '',
          image: '',
          budget: '',
          start_date: '',
          end_date: ''
        })
        fetchAds()
      } else {
        showToast(data.error || 'Failed to create ad', 'error')
      }
    } catch (error) {
      showToast('Failed to create ad', 'error')
      console.error('Error creating ad:', error)
    }
  }

  const handleUpdateStatus = async (adId: string, status: string) => {
    try {
      const response = await fetch('/api/ads', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: adId,
          status,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        showToast('Ad status updated successfully', 'success')
        fetchAds()
      } else {
        showToast(data.error || 'Failed to update ad status', 'error')
      }
    } catch (error) {
      showToast('Failed to update ad status', 'error')
      console.error('Error updating ad status:', error)
    }
  }

  const handleDeleteAd = async (adId: string) => {
    if (!confirm('Are you sure you want to delete this ad?')) return

    try {
      const response = await fetch(`/api/ads?id=${adId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (response.ok) {
        showToast('Ad deleted successfully', 'success')
        fetchAds()
      } else {
        showToast(data.error || 'Failed to delete ad', 'error')
      }
    } catch (error) {
      showToast('Failed to delete ad', 'error')
      console.error('Error deleting ad:', error)
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'paused':
        return 'bg-gray-100 text-gray-800'
      case 'completed':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  const filteredAds = activeTab === 'all' ? ads : ads.filter(ad => ad.status === activeTab)

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
              <div>
                <h1 className="text-3xl font-bold text-gray-900">📢 Ads Management</h1>
                <p className="text-gray-600">Manage advertisements on the platform</p>
              </div>
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
            >
              Create New Ad
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Tabs */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {[
                { key: 'all', label: 'All Ads' },
                { key: 'pending', label: 'Pending' },
                { key: 'active', label: 'Active' },
                { key: 'paused', label: 'Paused' },
                { key: 'completed', label: 'Completed' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === tab.key
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Ads List */}
        <div className="space-y-4">
          {filteredAds.map((ad) => (
            <div key={ad.id} className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{ad.title}</h3>
                  <p className="text-sm text-gray-500">
                    By {ad.user?.name || 'Unknown User'} • Created {formatDate(ad.created_at)}
                  </p>
                </div>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(ad.status)}`}>
                  {ad.status}
                </span>
              </div>

              <p className="text-gray-700 mb-4">{ad.description}</p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                <div>
                  <span className="font-medium text-gray-500">Budget:</span>
                  <p className="text-gray-900">{ad.budget.toLocaleString('vi-VN')} VND</p>
                </div>
                <div>
                  <span className="font-medium text-gray-500">Start:</span>
                  <p className="text-gray-900">{formatDate(ad.start_date)}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-500">End:</span>
                  <p className="text-gray-900">{formatDate(ad.end_date)}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-500">Status:</span>
                  <p className="text-gray-900 capitalize">{ad.status}</p>
                </div>
              </div>

              <div className="flex space-x-2">
                <select
                  onChange={(e) => handleUpdateStatus(ad.id, e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                >
                  <option value="">Update Status</option>
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                </select>

                <button
                  onClick={() => handleDeleteAd(ad.id)}
                  className="bg-red-600 text-white px-3 py-1 rounded-md text-sm hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}

          {filteredAds.length === 0 && (
            <div className="bg-white shadow rounded-lg p-8 text-center">
              <p className="text-gray-500">No ads found.</p>
            </div>
          )}
        </div>
      </main>

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Ad</h3>
              <form onSubmit={handleCreateAd} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    rows={3}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                  <input
                    type="url"
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Budget (VND)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="datetime-local"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="datetime-local"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                  >
                    Create Ad
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

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
