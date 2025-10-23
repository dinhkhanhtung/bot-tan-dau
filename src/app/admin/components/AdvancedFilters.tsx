'use client'

import { useState } from 'react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

export interface FilterOptions {
    search?: string
    status?: string
    dateRange?: {
        start: Date | null
        end: Date | null
    }
    activityLevel?: 'low' | 'medium' | 'high' | 'all'
    category?: string
    location?: string
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
}

interface AdvancedFiltersProps {
    filters: FilterOptions
    onFiltersChange: (filters: FilterOptions) => void
    availableStatuses?: string[]
    availableCategories?: string[]
    availableLocations?: string[]
    showDateRange?: boolean
    showActivityLevel?: boolean
    showCategory?: boolean
    showLocation?: boolean
    showSorting?: boolean
    className?: string
}

export default function AdvancedFilters({
    filters,
    onFiltersChange,
    availableStatuses = [],
    availableCategories = [],
    availableLocations = [],
    showDateRange = true,
    showActivityLevel = false,
    showCategory = false,
    showLocation = false,
    showSorting = true,
    className = ''
}: AdvancedFiltersProps) {
    const [isExpanded, setIsExpanded] = useState(false)

    const updateFilter = (key: keyof FilterOptions, value: any) => {
        onFiltersChange({
            ...filters,
            [key]: value
        })
    }

    const clearFilters = () => {
        onFiltersChange({
            search: '',
            status: undefined,
            dateRange: undefined,
            activityLevel: undefined,
            category: undefined,
            location: undefined,
            sortBy: undefined,
            sortOrder: undefined
        })
    }

    const hasActiveFilters = Object.values(filters).some(value =>
        value !== undefined && value !== null && value !== '' && value !== 'all'
    )

    return (
        <div className={`bg-white p-4 rounded-lg shadow-sm border ${className}`}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                    {/* Search Input */}
                    <div className="flex-1 min-w-64">
                        <input
                            type="text"
                            placeholder="Tìm kiếm..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            value={filters.search || ''}
                            onChange={(e) => updateFilter('search', e.target.value)}
                        />
                    </div>

                    {/* Status Filter */}
                    {availableStatuses.length > 0 && (
                        <select
                            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            value={filters.status || 'all'}
                            onChange={(e) => updateFilter('status', e.target.value === 'all' ? undefined : e.target.value)}
                        >
                            <option value="all">Tất cả trạng thái</option>
                            {availableStatuses.map(status => (
                                <option key={status} value={status}>
                                    {status === 'trial' ? 'Trial' :
                                     status === 'registered' ? 'Đã đăng ký' :
                                     status === 'expired' ? 'Hết hạn' :
                                     status === 'suspended' ? 'Đình chỉ' :
                                     status === 'active' ? 'Đang hoạt động' :
                                     status === 'inactive' ? 'Không hoạt động' :
                                     status === 'sold' ? 'Đã bán' :
                                     status === 'pending' ? 'Chờ duyệt' :
                                     status.charAt(0).toUpperCase() + status.slice(1)}
                                </option>
                            ))}
                        </select>
                    )}

                    {/* Category Filter */}
                    {showCategory && availableCategories.length > 0 && (
                        <select
                            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            value={filters.category || 'all'}
                            onChange={(e) => updateFilter('category', e.target.value === 'all' ? undefined : e.target.value)}
                        >
                            <option value="all">Tất cả danh mục</option>
                            {availableCategories.map(category => (
                                <option key={category} value={category}>{category}</option>
                            ))}
                        </select>
                    )}

                    {/* Location Filter */}
                    {showLocation && availableLocations.length > 0 && (
                        <select
                            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            value={filters.location || 'all'}
                            onChange={(e) => updateFilter('location', e.target.value === 'all' ? undefined : e.target.value)}
                        >
                            <option value="all">Tất cả địa điểm</option>
                            {availableLocations.map(location => (
                                <option key={location} value={location}>{location}</option>
                            ))}
                        </select>
                    )}
                </div>

                <div className="flex items-center space-x-2">
                    {/* Expand/Collapse Button */}
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="px-3 py-2 text-sm text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-md transition-colors"
                    >
                        {isExpanded ? 'Thu gọn' : 'Bộ lọc nâng cao'}
                    </button>

                    {/* Clear Filters */}
                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-md transition-colors"
                        >
                            Xóa bộ lọc
                        </button>
                    )}
                </div>
            </div>

            {/* Expanded Filters */}
            {isExpanded && (
                <div className="border-t border-gray-200 pt-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Date Range Filter */}
                        {showDateRange && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Khoảng thời gian
                                </label>
                                <div className="flex space-x-2">
                                    <DatePicker
                                        selected={filters.dateRange?.start || null}
                                        onChange={(date: Date | null) => updateFilter('dateRange', {
                                            ...filters.dateRange,
                                            start: date
                                        })}
                                        placeholderText="Từ ngày"
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        dateFormat="dd/MM/yyyy"
                                    />
                                    <DatePicker
                                        selected={filters.dateRange?.end || null}
                                        onChange={(date: Date | null) => updateFilter('dateRange', {
                                            ...filters.dateRange,
                                            end: date
                                        })}
                                        placeholderText="Đến ngày"
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        dateFormat="dd/MM/yyyy"
                                        minDate={filters.dateRange?.start || undefined}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Activity Level Filter */}
                        {showActivityLevel && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Mức độ hoạt động
                                </label>
                                <select
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    value={filters.activityLevel || 'all'}
                                    onChange={(e) => updateFilter('activityLevel', e.target.value === 'all' ? undefined : e.target.value)}
                                >
                                    <option value="all">Tất cả</option>
                                    <option value="high">Cao</option>
                                    <option value="medium">Trung bình</option>
                                    <option value="low">Thấp</option>
                                </select>
                            </div>
                        )}

                        {/* Sorting Options */}
                        {showSorting && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Sắp xếp theo
                                    </label>
                                    <select
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        value={filters.sortBy || 'created_at'}
                                        onChange={(e) => updateFilter('sortBy', e.target.value)}
                                    >
                                        <option value="created_at">Ngày tạo</option>
                                        <option value="updated_at">Cập nhật gần đây</option>
                                        <option value="name">Tên</option>
                                        <option value="status">Trạng thái</option>
                                        {showActivityLevel && <option value="activity_score">Điểm hoạt động</option>}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Thứ tự
                                    </label>
                                    <select
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        value={filters.sortOrder || 'desc'}
                                        onChange={(e) => updateFilter('sortOrder', e.target.value)}
                                    >
                                        <option value="desc">Giảm dần</option>
                                        <option value="asc">Tăng dần</option>
                                    </select>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Active Filters Display */}
                    {hasActiveFilters && (
                        <div className="flex flex-wrap gap-2">
                            <span className="text-sm font-medium text-gray-700">Bộ lọc đang áp dụng:</span>

                            {filters.search && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                                    Tìm kiếm: {filters.search}
                                    <button
                                        onClick={() => updateFilter('search', '')}
                                        className="ml-1 text-blue-600 hover:text-blue-800"
                                    >
                                        ×
                                    </button>
                                </span>
                            )}

                            {filters.status && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                                    Trạng thái: {filters.status}
                                    <button
                                        onClick={() => updateFilter('status', undefined)}
                                        className="ml-1 text-green-600 hover:text-green-800"
                                    >
                                        ×
                                    </button>
                                </span>
                            )}

                            {filters.dateRange?.start && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                                    Từ: {filters.dateRange.start.toLocaleDateString()}
                                    <button
                                        onClick={() => updateFilter('dateRange', { ...filters.dateRange, start: null })}
                                        className="ml-1 text-purple-600 hover:text-purple-800"
                                    >
                                        ×
                                    </button>
                                </span>
                            )}

                            {filters.dateRange?.end && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                                    Đến: {filters.dateRange.end.toLocaleDateString()}
                                    <button
                                        onClick={() => updateFilter('dateRange', { ...filters.dateRange, end: null })}
                                        className="ml-1 text-purple-600 hover:text-purple-800"
                                    >
                                        ×
                                    </button>
                                </span>
                            )}

                            {filters.activityLevel && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
                                    Hoạt động: {filters.activityLevel}
                                    <button
                                        onClick={() => updateFilter('activityLevel', undefined)}
                                        className="ml-1 text-orange-600 hover:text-orange-800"
                                    >
                                        ×
                                    </button>
                                </span>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}