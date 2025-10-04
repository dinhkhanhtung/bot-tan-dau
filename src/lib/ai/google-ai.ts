import { GoogleGenerativeAI } from '@google/generative-ai'
import { AIGenerateRequest, AIGenerateResponse } from '@/types'

class GoogleAIClient {
    private client: GoogleGenerativeAI | null = null
    private apiKey: string | undefined

    constructor() {
        this.apiKey = process.env.GOOGLE_AI_API_KEY
        if (this.apiKey && process.env.GOOGLE_AI_ENABLED === 'true') {
            this.client = new GoogleGenerativeAI(this.apiKey)
        }
    }

    isEnabled(): boolean {
        return this.client !== null && process.env.GOOGLE_AI_ENABLED === 'true'
    }

    async generateResponse(request: AIGenerateRequest): Promise<AIGenerateResponse> {
        if (!this.client) {
            throw new Error('Google AI client not initialized')
        }

        const startTime = Date.now()

        try {
            // Get the model
            const model = this.client.getGenerativeModel({
                model: process.env.GOOGLE_AI_MODEL || 'gemini-1.5-flash'
            })

            // Build the prompt with tone and context
            const enhancedPrompt = this.buildEnhancedPrompt(request)

            const result = await model.generateContent(enhancedPrompt)
            const response = await result.response
            const text = response.text()

            const responseTime = Date.now() - startTime

            // Estimate tokens (Google AI doesn't provide exact token count in the same way)
            const tokensUsed = this.estimateTokens(enhancedPrompt + text)

            return {
                response: text,
                model_used: 'google',
                tokens_used: tokensUsed,
                response_time: responseTime,
                metadata: {
                    tone: request.tone,
                    context: request.context,
                    prompt_length: enhancedPrompt.length,
                    response_length: text.length
                }
            }
        } catch (error) {
            console.error('Google AI API error:', error)
            throw new Error(`Google AI API error: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    private buildEnhancedPrompt(request: AIGenerateRequest): string {
        const { prompt, tone, context } = request

        // Add tone instructions
        let toneInstruction = ''
        switch (tone) {
            case 'friendly':
                toneInstruction = 'Hãy trả lời một cách thân thiện, gần gũi như bạn bè:'
                break
            case 'professional':
                toneInstruction = 'Hãy trả lời một cách chuyên nghiệp, lịch sự:'
                break
            case 'casual':
                toneInstruction = 'Hãy trả lời một cách tự nhiên, thoải mái:'
                break
        }

        // Add context instructions
        let contextInstruction = ''
        switch (context) {
            case 'user_type':
                contextInstruction = 'Hãy điều chỉnh ngôn ngữ phù hợp với loại người dùng khác nhau (người bán, người mua, admin).'
                break
            case 'situation':
                contextInstruction = 'Hãy điều chỉnh nội dung phù hợp với tình huống cụ thể (hỗ trợ, tư vấn, chào mừng).'
                break
            case 'goal':
                contextInstruction = 'Hãy tập trung vào mục tiêu cuối cùng (bán hàng, hỗ trợ, thông tin).'
                break
        }

        return `${toneInstruction} ${contextInstruction}

Prompt: ${prompt}

Hãy trả lời bằng tiếng Việt một cách tự nhiên và hữu ích cho BOT Tân Dậu - nền tảng thương mại điện tử tại Việt Nam.`
    }

    private estimateTokens(text: string): number {
        // Rough estimation: ~4 characters per token for Vietnamese text
        return Math.ceil(text.length / 4)
    }
}

export const googleAIClient = new GoogleAIClient()
