import { OpenAI } from 'openai'
import { AIGenerateRequest, AIGenerateResponse } from '@/types'

class OpenAIClient {
    private client: OpenAI | null = null
    private apiKey: string | undefined

    constructor() {
        this.apiKey = process.env.OPENAI_API_KEY
        if (this.apiKey && process.env.OPENAI_ENABLED === 'true') {
            this.client = new OpenAI({
                apiKey: this.apiKey,
            })
        }
    }

    isEnabled(): boolean {
        return this.client !== null && process.env.OPENAI_ENABLED === 'true'
    }

    async generateResponse(request: AIGenerateRequest): Promise<AIGenerateResponse> {
        if (!this.client) {
            throw new Error('OpenAI client not initialized')
        }

        const startTime = Date.now()

        try {
            // Build the prompt with tone and context
            const enhancedPrompt = this.buildEnhancedPrompt(request)

            const response = await this.client.chat.completions.create({
                model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: 'Bạn là một trợ lý AI hữu ích cho BOT Tân Dậu - một nền tảng thương mại điện tử tại Việt Nam. Hãy trả lời một cách thân thiện và chuyên nghiệp bằng tiếng Việt.'
                    },
                    {
                        role: 'user',
                        content: enhancedPrompt
                    }
                ],
                max_tokens: request.maxTokens || parseInt(process.env.OPENAI_MAX_TOKENS || '2000'),
                temperature: request.temperature || parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
            })

            const responseTime = Date.now() - startTime
            const tokensUsed = response.usage?.total_tokens || 0
            const generatedResponse = response.choices[0]?.message?.content || ''

            return {
                response: generatedResponse,
                model_used: 'openai',
                tokens_used: tokensUsed,
                response_time: responseTime,
                metadata: {
                    tone: request.tone,
                    context: request.context,
                    prompt_length: enhancedPrompt.length,
                    response_length: generatedResponse.length
                }
            }
        } catch (error) {
            console.error('OpenAI API error:', error)
            throw new Error(`OpenAI API error: ${error instanceof Error ? error.message : 'Unknown error'}`)
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

Hãy trả lời bằng tiếng Việt một cách tự nhiên và hữu ích.`
    }
}

export const openaiClient = new OpenAIClient()
