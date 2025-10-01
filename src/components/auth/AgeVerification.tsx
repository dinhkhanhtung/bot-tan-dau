'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { FacebookLogin } from './FacebookLogin'
import { Calendar, AlertCircle, CheckCircle } from 'lucide-react'
import { verifyTandauAge } from '@/lib/utils'

interface AgeVerificationProps {
    onClose: () => void
    onVerified: () => void
}

export function AgeVerification({ onClose, onVerified }: AgeVerificationProps) {
    const [step, setStep] = useState<'verification' | 'facebook'>('verification')
    const [birthYear, setBirthYear] = useState('')
    const [isVerified, setIsVerified] = useState(false)

    const handleYearSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const year = parseInt(birthYear)

        if (year === 1981) {
            setIsVerified(true)
            setStep('facebook')
        } else {
            alert('Chỉ dành cho thành viên sinh năm 1981. Vui lòng nhập đúng năm sinh.')
        }
    }

    const handleFacebookSuccess = () => {
        onVerified()
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-r from-dau-600 to-tan-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Calendar className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-gradient">
                        Xác minh tuổi Tân Dậu 1981
                    </CardTitle>
                    <CardDescription>
                        Platform chỉ dành cho thành viên sinh năm 1981
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    {step === 'verification' && (
                        <div className="space-y-6">
                            <div className="text-center">
                                <Badge variant="tan" className="mb-4">
                                    🐓 Tân Dậu 1981
                                </Badge>
                                <p className="text-sm text-gray-600 mb-4">
                                    Để đảm bảo tính xác thực của cộng đồng, chúng tôi chỉ chấp nhận
                                    thành viên sinh năm 1981 (tuổi Tân Dậu).
                                </p>
                            </div>

                            <form onSubmit={handleYearSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Năm sinh của bạn
                                    </label>
                                    <Input
                                        type="number"
                                        placeholder="1981"
                                        value={birthYear}
                                        onChange={(e) => setBirthYear(e.target.value)}
                                        min="1980"
                                        max="1982"
                                        required
                                        className="text-center text-lg"
                                    />
                                </div>

                                <div className="flex space-x-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={onClose}
                                        className="flex-1"
                                    >
                                        Hủy
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="flex-1"
                                        disabled={!birthYear}
                                    >
                                        Xác minh
                                    </Button>
                                </div>
                            </form>

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-start space-x-3">
                                    <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                                    <div className="text-sm text-blue-800">
                                        <p className="font-medium mb-1">Tại sao cần xác minh tuổi?</p>
                                        <p>
                                            Chúng tôi tạo ra một cộng đồng đặc biệt dành riêng cho những người
                                            cùng tuổi Tân Dậu 1981 để có trải nghiệm mua bán phù hợp và thân thiện.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 'facebook' && (
                        <div className="space-y-6">
                            <div className="text-center">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle className="w-8 h-8 text-green-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                    Xác minh thành công! ✅
                                </h3>
                                <p className="text-sm text-gray-600 mb-6">
                                    Bây giờ hãy đăng nhập bằng Facebook để hoàn tất đăng ký
                                </p>
                            </div>

                            <FacebookLogin
                                onSuccess={handleFacebookSuccess}
                                onError={(error) => {
                                    console.error('Facebook login error:', error)
                                }}
                            />

                            <Button
                                variant="outline"
                                onClick={() => setStep('verification')}
                                className="w-full"
                            >
                                Quay lại
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
