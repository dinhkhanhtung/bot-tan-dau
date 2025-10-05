'use client'

import { useState, useEffect, useCallback } from 'react'
import { AIGenerateRequest, AIPromptForm, AITemplate, AIDashboardStats } from '@/types'

interface AIPromptGeneratorProps {
    onStatsUpdate?: (stats: AIDashboardStats) => void
}

export default function AIPromptGenerator({ onStatsUpdate }: AIPromptGeneratorProps) {
    // Form state
    const [prompt, setPrompt] = useState('')
    const [tone, setTone] = useState<'friendly' | 'professional' | 'casual'>('friendly')
    const [context, setContext] = useState<'user_type' | 'situation' | 'goal'>('situation')
    const [category, setCategory] = useState('')
    const [templateName, setTemplateName] = useState('')

    // UI state
    const [isGenerating, setIsGenerating] = useState(false)
    const [generatedResponse, setGeneratedResponse] = useState('')
    const [isSavingTemplate, setIsSavingTemplate] = useState(false)
    const [templates, setTemplates] = useState<AITemplate[]>([])
    const [isLoadingTemplates, setIsLoadingTemplates] = useState(false)
    const [stats, setStats] = useState<AIDashboardStats | null>(null)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    // Load templates and stats on component mount
    const loadStats = useCallback(async () => {
        try {
            const token = localStorage.getItem('admin_token')
            const adminInfo = JSON.parse(localStorage.getItem('admin_info') || '{}')

            const response = await fetch('/api/ai/analytics', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'x-admin-info': JSON.stringify(adminInfo)
                }
            })

            const data = await response.json()

            if (response.ok && data.success) {
                setStats(data.data.dashboard_stats)
                onStatsUpdate?.(data.data.dashboard_stats)
            }
        } catch (error) {
            console.error('Error loading AI stats:', error)
        }
    }, [onStatsUpdate])

    useEffect(() => {
        loadTemplates()
        loadStats()
    }, [loadStats])

    const loadTemplates = async () => {
        setIsLoadingTemplates(true)
        try {
            const token = localStorage.getItem('admin_token')
            const adminInfo = JSON.parse(localStorage.getItem('admin_info') || '{}')

            const response = await fetch('/api/ai/save-template', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'x-admin-info': JSON.stringify(adminInfo)
                }
            })

            const data = await response.json()

            if (response.ok && data.success) {
                setTemplates(data.data)
            }
        } catch (error) {
            console.error('Error loading templates:', error)
        } finally {
            setIsLoadingTemplates(false)
        }
    }

    const generateResponse = async () => {
        if (!prompt.trim()) {
            setError('Vui lòng nhập prompt')
            return
        }

        setIsGenerating(true)
        setError('')
        setGeneratedResponse('')

        try {
            const token = localStorage.getItem('admin_token')
            const adminInfo = JSON.parse(localStorage.getItem('admin_info') || '{}')

            const request: AIGenerateRequest = {
                prompt: prompt.trim(),
                tone,
                context,
                maxTokens: 2000,
                temperature: 0.7
            }

            const response = await fetch('/api/ai/generate-response', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'x-admin-info': JSON.stringify(adminInfo)
                },
                body: JSON.stringify(request)
            })

            const data = await response.json()

            if (response.ok && data.success) {
                setGeneratedResponse(data.data.response)
                setSuccess('Tạo phản hồi thành công!')

                // Reload stats to update counts
                loadStats()

                // Clear success message after 3 seconds
                setTimeout(() => setSuccess(''), 3000)
            } else {
                setError(data.error || 'Có lỗi xảy ra khi tạo phản hồi')
            }
        } catch (error) {
            console.error('Error generating response:', error)
            setError('Có lỗi xảy ra khi kết nối đến server')
        } finally {
            setIsGenerating(false)
        }
    }

    const saveTemplate = async () => {
        if (!prompt.trim() || !templateName.trim() || !category.trim()) {
            setError('Vui lòng điền đầy đủ thông tin để lưu template')
            return
        }

        setIsSavingTemplate(true)
        setError('')

        try {
            const token = localStorage.getItem('admin_token')
            const adminInfo = JSON.parse(localStorage.getItem('admin_info') || '{}')

            const templateData: AIPromptForm = {
                prompt: prompt.trim(),
                tone,
                context,
                category: category.trim(),
                templateName: templateName.trim()
            }

            const response = await fetch('/api/ai/save-template', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'x-admin-info': JSON.stringify(adminInfo)
                },
                body: JSON.stringify(templateData)
            })

            const data = await response.json()

            if (response.ok && data.success) {
                setSuccess('Template đã được lưu thành công!')
                setTemplateName('')
                loadTemplates() // Reload templates

                // Clear success message after 3 seconds
                setTimeout(() => setSuccess(''), 3000)
            } else {
                setError(data.error || 'Có lỗi xảy ra khi lưu template')
            }
        } catch (error) {
            console.error('Error saving template:', error)
            setError('Có lỗi xảy ra khi kết nối đến server')
        } finally {
            setIsSavingTemplate(false)
        }
    }

    const loadTemplate = (template: AITemplate) => {
        setPrompt(template.prompt)
        setTone(template.tone)
        setContext(template.context)
        setCategory(template.category)
        setTemplateName(template.name)
    }

    const deleteTemplate = async (templateId: string) => {
        if (!confirm('Bạn có chắc chắn muốn xóa template này?')) {
            return
        }

        try {
            const token = localStorage.getItem('admin_token')
            const adminInfo = JSON.parse(localStorage.getItem('admin_info') || '{}')

            const response = await fetch(`/api/ai/save-template?id=${templateId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'x-admin-info': JSON.stringify(adminInfo)
                }
            })

            const data = await response.json()

            if (response.ok && data.success) {
                setSuccess('Template đã được xóa!')
                loadTemplates() // Reload templates

                // Clear success message after 3 seconds
                setTimeout(() => setSuccess(''), 3000)
            } else {
                setError(data.error || 'Có lỗi xảy ra khi xóa template')
            }
        } catch (error) {
            console.error('Error deleting template:', error)
            setError('Có lỗi xảy ra khi kết nối đến server')
        }
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
        setSuccess('Đã sao chép vào clipboard!')

        // Clear success message after 2 seconds
        setTimeout(() => setSuccess(''), 2000)
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">🤖 AI Assistant</h2>
                <p className="text-gray-600">Tạo phản hồi thông minh cho người dùng với sự hỗ trợ của AI</p>

                {/* Stats Cards */}
                {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">{stats.today_requests}</div>
                            <div className="text-sm text-blue-800">Hôm nay</div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">{stats.weekly_requests}</div>
                            <div className="text-sm text-green-800">Tuần này</div>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg">
                            <div className="text-2xl font-bold text-purple-600">{stats.total_templates}</div>
                            <div className="text-sm text-purple-800">Templates</div>
                        </div>
                        <div className="bg-orange-50 p-4 rounded-lg">
                            <div className="text-2xl font-bold text-orange-600">{stats.success_rate}%</div>
                            <div className="text-sm text-orange-800">Thành công</div>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Main Form */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Tạo phản hồi AI</h3>

                    {/* Prompt Input */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Prompt *
                        </label>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Nhập yêu cầu của bạn... Ví dụ: Tạo lời chào mừng cho người dùng mới"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            rows={4}
                            maxLength={4000}
                        />
                        <div className="text-xs text-gray-500 mt-1">
                            {prompt.length}/4000 ký tự
                        </div>
                    </div>

                    {/* Tone Selection */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Tone
                        </label>
                        <select
                            value={tone}
                            onChange={(e) => setTone(e.target.value as typeof tone)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                            <option value="friendly">Thân thiện</option>
                            <option value="professional">Chuyên nghiệp</option>
                            <option value="casual">Tự nhiên</option>
                        </select>
                    </div>

                    {/* Context Selection */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Context
                        </label>
                        <select
                            value={context}
                            onChange={(e) => setContext(e.target.value as typeof context)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                            <option value="situation">Tình huống</option>
                            <option value="user_type">Loại người dùng</option>
                            <option value="goal">Mục tiêu</option>
                        </select>
                    </div>

                    {/* Category Input */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Danh mục
                        </label>
                        <input
                            type="text"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            placeholder="Ví dụ: welcome, support, selling..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={generateResponse}
                            disabled={isGenerating || !prompt.trim()}
                            className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {isGenerating ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Đang tạo...
                                </>
                            ) : (
                                '🚀 Tạo phản hồi'
                            )}
                        </button>

                        <button
                            onClick={saveTemplate}
                            disabled={isSavingTemplate || !prompt.trim() || !templateName.trim()}
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        >
                            {isSavingTemplate ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Đang lưu...
                                </>
                            ) : (
                                '💾 Lưu Template'
                            )}
                        </button>
                    </div>

                    {/* Template Name Input (for saving) */}
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Tên Template (để lưu)
                        </label>
                        <input
                            type="text"
                            value={templateName}
                            onChange={(e) => setTemplateName(e.target.value)}
                            placeholder="Nhập tên để lưu template..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Templates Sidebar */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">📚 Templates đã lưu</h3>

                    {isLoadingTemplates ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                            <span className="ml-2 text-gray-600">Đang tải...</span>
                        </div>
                    ) : templates.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            Chưa có template nào được lưu
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {templates.map((template) => (
                                <div key={template.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-medium text-gray-900 text-sm">{template.name}</h4>
                                        <button
                                            onClick={() => deleteTemplate(template.id)}
                                            className="text-red-500 hover:text-red-700 text-xs"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                    <div className="text-xs text-gray-600 mb-2">
                                        <span className="capitalize">{template.tone}</span> •
                                        <span className="capitalize ml-1">{template.context}</span> •
                                        <span className="ml-1">{template.category}</span>
                                    </div>
                                    <button
                                        onClick={() => loadTemplate(template)}
                                        className="w-full text-left text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-100"
                                    >
                                        📋 Sử dụng template này
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Generated Response */}
            {generatedResponse && (
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">📝 Phản hồi được tạo</h3>
                        <button
                            onClick={() => copyToClipboard(generatedResponse)}
                            className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                        >
                            📋 Sao chép
                        </button>
                    </div>
                    <div className="bg-gray-50 border rounded-lg p-4">
                        <pre className="whitespace-pre-wrap text-gray-800 text-sm leading-relaxed">
                            {generatedResponse}
                        </pre>
                    </div>
                </div>
            )}

            {/* Error and Success Messages */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex">
                        <div className="text-red-400">❌</div>
                        <div className="ml-3">
                            <p className="text-sm text-red-800">{error}</p>
                        </div>
                    </div>
                </div>
            )}

            {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex">
                        <div className="text-green-400">✅</div>
                        <div className="ml-3">
                            <p className="text-sm text-green-800">{success}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
