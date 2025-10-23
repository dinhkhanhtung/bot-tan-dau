'use client'

import { useEffect, useState } from 'react'

interface EnhancedStatsCardProps {
    title: string
    value: string | number
    change?: {
        value: number
        label: string
        type: 'increase' | 'decrease' | 'neutral'
    }
    icon?: React.ReactNode
    trend?: number[]
    format?: 'number' | 'currency' | 'percentage'
    className?: string
}

export default function EnhancedStatsCard({
    title,
    value,
    change,
    icon,
    trend,
    format = 'number',
    className = ''
}: EnhancedStatsCardProps) {
    const [animatedValue, setAnimatedValue] = useState(0)
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        setIsVisible(true)

        // Animate number counting
        const numericValue = typeof value === 'string' ? parseFloat(value.replace(/[^\d.-]/g, '')) : value
        if (typeof numericValue === 'number' && numericValue > 0) {
            const duration = 1000
            const steps = 60
            const increment = numericValue / steps
            let current = 0

            const timer = setInterval(() => {
                current += increment
                if (current >= numericValue) {
                    setAnimatedValue(numericValue)
                    clearInterval(timer)
                } else {
                    setAnimatedValue(current)
                }
            }, duration / steps)

            return () => clearInterval(timer)
        } else {
            setAnimatedValue(numericValue)
        }
    }, [value])

    const formatValue = (val: number) => {
        switch (format) {
            case 'currency':
                return new Intl.NumberFormat('vi-VN', {
                    style: 'currency',
                    currency: 'VND',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                }).format(val)
            case 'percentage':
                return `${val.toFixed(1)}%`
            default:
                return new Intl.NumberFormat('vi-VN').format(val)
        }
    }

    const getChangeColor = () => {
        if (!change) return ''
        switch (change.type) {
            case 'increase':
                return 'text-green-600 bg-green-50 border-green-200'
            case 'decrease':
                return 'text-red-600 bg-red-50 border-red-200'
            default:
                return 'text-gray-600 bg-gray-50 border-gray-200'
        }
    }

    const getChangeIcon = () => {
        if (!change) return null
        switch (change.type) {
            case 'increase':
                return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            case 'decrease':
                return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
            default:
                return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
        }
    }

    return (
        <div className={`relative bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 ${isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-4'} ${className}`}>
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl opacity-50"></div>

            {/* Content */}
            <div className="relative">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                        {icon && (
                            <div className="p-2 bg-indigo-100 rounded-lg">
                                {icon}
                            </div>
                        )}
                        <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                            {title}
                        </h3>
                    </div>

                    {/* Trend Indicator */}
                    {trend && trend.length > 1 && (
                        <div className="flex items-center space-x-1">
                            <div className={`w-2 h-2 rounded-full ${trend[trend.length - 1] > trend[trend.length - 2] ? 'bg-green-400' : 'bg-red-400'}`}></div>
                            <span className={`text-xs font-medium ${trend[trend.length - 1] > trend[trend.length - 2] ? 'text-green-600' : 'text-red-600'}`}>
                                {trend[trend.length - 1] > trend[trend.length - 2] ? '↗' : '↘'}
                            </span>
                        </div>
                    )}
                </div>

                {/* Value */}
                <div className="mb-3">
                    <div className="text-3xl font-bold text-gray-900 mb-1">
                        {formatValue(animatedValue)}
                    </div>

                    {/* Change Indicator */}
                    {change && (
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getChangeColor()}`}>
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {getChangeIcon()}
                            </svg>
                            {change.value > 0 ? '+' : ''}{change.value}% {change.label}
                        </div>
                    )}
                </div>

                {/* Mini Chart */}
                {trend && trend.length > 0 && (
                    <div className="flex items-end space-x-1 h-8">
                        {trend.slice(-7).map((point, index) => {
                            const max = Math.max(...trend)
                            const height = (point / max) * 100
                            return (
                                <div
                                    key={index}
                                    className={`flex-1 rounded-t transition-all duration-300 ${point === Math.max(...trend.slice(-7)) ? 'bg-indigo-500' : 'bg-indigo-200'}`}
                                    style={{ height: `${height}%` }}
                                ></div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Hover Effect */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-400 to-purple-400 opacity-0 hover:opacity-10 transition-opacity duration-300 pointer-events-none"></div>
        </div>
    )
}