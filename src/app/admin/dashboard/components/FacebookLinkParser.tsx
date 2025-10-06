'use client'

import { useState } from 'react'
import { extractFacebookId, parseFacebookLink } from '@/lib/facebook-utils'

interface FacebookLinkParserProps {
    onIdExtracted: (facebookId: string) => void
    placeholder?: string
    className?: string
}

export default function FacebookLinkParser({
    onIdExtracted,
    placeholder = "Dán link Facebook hoặc nhập Facebook ID...",
    className = ""
}: FacebookLinkParserProps) {
    const [input, setInput] = useState('')
    const [parsedData, setParsedData] = useState<{
        type: 'id' | 'username' | 'invalid'
        id: string | null
        profileLink: string | null
        messengerLink: string | null
    } | null>(null)
    const [error, setError] = useState('')


    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        setInput(value)
        setError('')

        if (value.trim()) {
            const parsed = parseFacebookLink(value)
            setParsedData(parsed)

            if (parsed.id) {
                onIdExtracted(parsed.id)
            } else {
                setError('Không thể trích xuất Facebook ID từ link này')
            }
        } else {
            setParsedData(null)
        }
    }

    const handlePaste = (e: React.ClipboardEvent) => {
        const pastedText = e.clipboardData.getData('text')
        setTimeout(() => {
            const parsed = parseFacebookLink(pastedText)
            setParsedData(parsed)

            if (parsed.id) {
                onIdExtracted(parsed.id)
                setError('')
            } else {
                setError('Không thể trích xuất Facebook ID từ link này')
            }
        }, 100)
    }

    const clearInput = () => {
        setInput('')
        setParsedData(null)
        setError('')
    }

    return (
        <div className={`space-y-2 ${className}`}>
            <div className="relative">
                <input
                    type="text"
                    value={input}
                    onChange={handleInputChange}
                    onPaste={handlePaste}
                    placeholder={placeholder}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${error ? 'border-red-300 bg-red-50' :
                            parsedData?.id ? 'border-green-300 bg-green-50' :
                                'border-gray-300'
                        }`}
                />
                {input && (
                    <button
                        onClick={clearInput}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        ✕
                    </button>
                )}
            </div>

            {parsedData?.id && (
                <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                        <span className="text-green-600">✅</span>
                        <span className="text-green-700 font-medium">
                            {parsedData.type === 'id' ? 'Facebook ID' : 'Username'}: {parsedData.id}
                        </span>
                        <button
                            onClick={() => navigator.clipboard.writeText(parsedData.id!)}
                            className="text-blue-600 hover:text-blue-800 text-xs"
                            title="Sao chép ID"
                        >
                            📋
                        </button>
                    </div>

                    {parsedData.profileLink && (
                        <div className="flex items-center space-x-2 text-xs text-gray-600">
                            <span>🔗</span>
                            <a
                                href={parsedData.profileLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline"
                            >
                                Xem profile
                            </a>
                        </div>
                    )}

                    {parsedData.messengerLink && (
                        <div className="flex items-center space-x-2 text-xs text-gray-600">
                            <span>💬</span>
                            <a
                                href={parsedData.messengerLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline"
                            >
                                Mở Messenger
                            </a>
                        </div>
                    )}
                </div>
            )}

            {error && (
                <div className="flex items-center space-x-2 text-sm text-red-600">
                    <span>❌</span>
                    <span>{error}</span>
                </div>
            )}

            <div className="text-xs text-gray-500">
                <p>Hỗ trợ các định dạng:</p>
                <ul className="list-disc list-inside ml-2 space-y-1">
                    <li>Facebook ID: 123456789</li>
                    <li>Profile link: facebook.com/profile.php?id=123456789</li>
                    <li>Username: facebook.com/username</li>
                    <li>Messenger: m.me/username</li>
                </ul>
            </div>
        </div>
    )
}
