'use client'

import { useState, useMemo } from 'react'

export interface Column<T> {
    key: keyof T | string
    header: string
    sortable?: boolean
    render?: (value: any, item: T) => React.ReactNode
    className?: string
    width?: string
}

export interface SortConfig {
    key: string
    direction: 'asc' | 'desc'
}

interface EnhancedDataTableProps<T> {
    data: T[]
    columns: Column<T>[]
    loading?: boolean
    pagination?: {
        pageSize?: number
        showPageSize?: boolean
        pageSizeOptions?: number[]
    }
    search?: {
        placeholder?: string
        searchableColumns?: (keyof T)[]
    }
    actions?: {
        render: (item: T) => React.ReactNode
    }
    className?: string
    emptyMessage?: string
}

export default function EnhancedDataTable<T extends Record<string, any>>({
    data,
    columns,
    loading = false,
    pagination = { pageSize: 10, showPageSize: true, pageSizeOptions: [5, 10, 20, 50] },
    search,
    actions,
    className = '',
    emptyMessage = 'Không có dữ liệu'
}: EnhancedDataTableProps<T>) {
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: '', direction: 'asc' })
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(pagination.pageSize || 10)
    const [searchTerm, setSearchTerm] = useState('')

    // Filter data based on search term
    const filteredData = useMemo(() => {
        if (!searchTerm || !search?.searchableColumns) return data

        return data.filter(item =>
            search.searchableColumns!.some(column => {
                const value = item[column]
                return String(value).toLowerCase().includes(searchTerm.toLowerCase())
            })
        )
    }, [data, searchTerm, search?.searchableColumns])

    // Sort data
    const sortedData = useMemo(() => {
        if (!sortConfig.key) return filteredData

        return [...filteredData].sort((a, b) => {
            const aValue = a[sortConfig.key]
            const bValue = b[sortConfig.key]

            if (aValue < bValue) {
                return sortConfig.direction === 'asc' ? -1 : 1
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'asc' ? 1 : -1
            }
            return 0
        })
    }, [filteredData, sortConfig])

    // Paginate data
    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * pageSize
        return sortedData.slice(startIndex, startIndex + pageSize)
    }, [sortedData, currentPage, pageSize])

    const totalPages = Math.ceil(sortedData.length / pageSize)

    const handleSort = (key: string) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }))
    }

    const getSortIcon = (key: string) => {
        if (sortConfig.key !== key) return '↕️'
        return sortConfig.direction === 'asc' ? '↑' : '↓'
    }

    if (loading) {
        return (
            <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    <span className="ml-2 text-gray-600">Đang tải...</span>
                </div>
            </div>
        )
    }

    return (
        <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
            {/* Search Bar */}
            {search && (
                <div className="p-4 border-b border-gray-200">
                    <input
                        type="text"
                        placeholder={search.placeholder || 'Tìm kiếm...'}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value)
                            setCurrentPage(1) // Reset to first page when searching
                        }}
                    />
                </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            {columns.map((column, index) => (
                                <th
                                    key={index}
                                    className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${column.className || ''}`}
                                    style={{ width: column.width }}
                                >
                                    {column.sortable ? (
                                        <button
                                            className="flex items-center space-x-1 hover:text-gray-700 focus:outline-none"
                                            onClick={() => handleSort(String(column.key))}
                                        >
                                            <span>{column.header}</span>
                                            <span className="text-xs">{getSortIcon(String(column.key))}</span>
                                        </button>
                                    ) : (
                                        column.header
                                    )}
                                </th>
                            ))}
                            {actions && (
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Hành động
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedData.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={columns.length + (actions ? 1 : 0)}
                                    className="px-6 py-12 text-center text-gray-500"
                                >
                                    {searchTerm ? `Không tìm thấy kết quả cho "${searchTerm}"` : emptyMessage}
                                </td>
                            </tr>
                        ) : (
                            paginatedData.map((item, index) => (
                                <tr key={index} className="hover:bg-gray-50 transition-colors">
                                    {columns.map((column, colIndex) => (
                                        <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {column.render
                                                ? column.render(item[column.key], item)
                                                : String(item[column.key] || '')
                                            }
                                        </td>
                                    ))}
                                    {actions && (
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {actions.render(item)}
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {pagination && sortedData.length > 0 && (
                <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                    <div className="flex items-center space-x-4">
                        {/* Page Size Selector */}
                        {pagination.showPageSize && (
                            <div className="flex items-center space-x-2">
                                <span className="text-sm text-gray-700">Hiển thị</span>
                                <select
                                    className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    value={pageSize}
                                    onChange={(e) => {
                                        setPageSize(Number(e.target.value))
                                        setCurrentPage(1)
                                    }}
                                >
                                    {pagination.pageSizeOptions?.map(size => (
                                        <option key={size} value={size}>{size}</option>
                                    ))}
                                </select>
                                <span className="text-sm text-gray-700">trên trang</span>
                            </div>
                        )}

                        {/* Results Info */}
                        <div className="text-sm text-gray-700">
                            Hiển thị {(currentPage - 1) * pageSize + 1} đến{' '}
                            {Math.min(currentPage * pageSize, sortedData.length)} của{' '}
                            {sortedData.length} kết quả
                        </div>
                    </div>

                    {/* Page Navigation */}
                    <div className="flex items-center space-x-2">
                        <button
                            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                        >
                            Trước
                        </button>

                        {/* Page Numbers */}
                        <div className="flex space-x-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                const pageNumber = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                                return (
                                    <button
                                        key={pageNumber}
                                        className={`px-3 py-1 text-sm border rounded ${
                                            pageNumber === currentPage
                                                ? 'bg-indigo-600 text-white border-indigo-600'
                                                : 'border-gray-300 hover:bg-gray-50'
                                        }`}
                                        onClick={() => setCurrentPage(pageNumber)}
                                    >
                                        {pageNumber}
                                    </button>
                                )
                            })}
                        </div>

                        <button
                            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                        >
                            Tiếp
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}