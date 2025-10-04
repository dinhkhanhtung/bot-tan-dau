/**
 * Smart User Experience System
 * Hệ thống trải nghiệm người dùng thông minh với personalization và context awareness
 */

import { logger, logUserAction } from './logger'
import { monitoringSystem, recordCounter, recordTimer } from './monitoring-system'
import { CONFIG } from './config'

// User experience states
export enum UXState {
    FIRST_TIME = 'first_time',
    LEARNING = 'learning',
    ENGAGED = 'engaged',
    EXPERT = 'expert',
    INACTIVE = 'inactive'
}

// User preferences
export interface UserPreferences {
    language: string
    responseStyle: 'formal' | 'casual' | 'friendly'
    notificationFrequency: 'high' | 'medium' | 'low'
    preferredCategories: string[]
    timezone: string
    lastActiveTime: number
}

// User behavior patterns
export interface UserBehavior {
    averageSessionLength: number
    preferredInteractionTime: string
    mostUsedFeatures: string[]
    responseTime: number
    engagementScore: number
    lastInteraction: number
}

// Smart UX manager
export class SmartUXManager {
    private static instance: SmartUXManager
    private userProfiles: Map<string, {
        preferences: UserPreferences
        behavior: UserBehavior
        uxState: UXState
        context: Record<string, any>
    }> = new Map()

    private constructor() {
        this.startProfileAnalysis()
    }

    public static getInstance(): SmartUXManager {
        if (!SmartUXManager.instance) {
            SmartUXManager.instance = new SmartUXManager()
        }
        return SmartUXManager.instance
    }

    // Get or create user profile
    async getUserProfile(userId: string): Promise<{
        preferences: UserPreferences
        behavior: UserBehavior
        uxState: UXState
        context: Record<string, any>
    }> {
        if (!this.userProfiles.has(userId)) {
            await this.createUserProfile(userId)
        }

        return this.userProfiles.get(userId)!
    }

    // Create new user profile
    private async createUserProfile(userId: string): Promise<void> {
        const defaultPreferences: UserPreferences = {
            language: 'vi',
            responseStyle: 'friendly',
            notificationFrequency: 'medium',
            preferredCategories: [],
            timezone: 'Asia/Ho_Chi_Minh',
            lastActiveTime: Date.now()
        }

        const defaultBehavior: UserBehavior = {
            averageSessionLength: 0,
            preferredInteractionTime: 'any',
            mostUsedFeatures: [],
            responseTime: 0,
            engagementScore: 0,
            lastInteraction: Date.now()
        }

        this.userProfiles.set(userId, {
            preferences: defaultPreferences,
            behavior: defaultBehavior,
            uxState: UXState.FIRST_TIME,
            context: {}
        })

        logger.info('User profile created', { userId })
    }

    // Update user preferences
    async updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<void> {
        const profile = await this.getUserProfile(userId)
        profile.preferences = { ...profile.preferences, ...preferences }
        profile.preferences.lastActiveTime = Date.now()

        this.userProfiles.set(userId, profile)
        logger.info('User preferences updated', { userId, preferences })
    }

    // Track user interaction
    async trackInteraction(
        userId: string,
        action: string,
        context: Record<string, any> = {}
    ): Promise<void> {
        const profile = await this.getUserProfile(userId)
        const now = Date.now()

        // Update behavior patterns
        profile.behavior.lastInteraction = now
        profile.behavior.responseTime = now - (profile.behavior.lastInteraction || now)

        // Update most used features
        if (!profile.behavior.mostUsedFeatures.includes(action)) {
            profile.behavior.mostUsedFeatures.push(action)
        }

        // Update engagement score
        profile.behavior.engagementScore = this.calculateEngagementScore(profile.behavior)

        // Update UX state
        profile.uxState = this.determineUXState(profile.behavior)

        // Update context
        profile.context = { ...profile.context, ...context }

        this.userProfiles.set(userId, profile)

        // Record metrics
        recordCounter('user_interaction', 1, { userId, action })
        logUserAction(userId, action, context)
    }

    // Get personalized response
    async getPersonalizedResponse(
        userId: string,
        baseResponse: string,
        context: Record<string, any> = {}
    ): Promise<string> {
        const profile = await this.getUserProfile(userId)
        const preferences = profile.preferences

        // Personalize based on user preferences
        let personalizedResponse = baseResponse

        // Adjust response style
        switch (preferences.responseStyle) {
            case 'formal':
                personalizedResponse = this.makeFormal(personalizedResponse)
                break
            case 'casual':
                personalizedResponse = this.makeCasual(personalizedResponse)
                break
            case 'friendly':
                personalizedResponse = this.makeFriendly(personalizedResponse)
                break
        }

        // Add contextual information
        if (profile.uxState === UXState.FIRST_TIME) {
            personalizedResponse = this.addFirstTimeGuidance(personalizedResponse)
        } else if (profile.uxState === UXState.EXPERT) {
            personalizedResponse = this.addExpertFeatures(personalizedResponse)
        }

        // Add time-based context
        const timeContext = this.getTimeContext(preferences.timezone)
        if (timeContext) {
            personalizedResponse = this.addTimeContext(personalizedResponse, timeContext)
        }

        return personalizedResponse
    }

    // Get smart suggestions
    async getSmartSuggestions(userId: string, context: Record<string, any> = {}): Promise<string[]> {
        const profile = await this.getUserProfile(userId)
        const behavior = profile.behavior
        const preferences = profile.preferences

        const suggestions: string[] = []

        // Based on user state
        switch (profile.uxState) {
            case UXState.FIRST_TIME:
                suggestions.push('🚀 Đăng ký thành viên', 'ℹ️ Tìm hiểu thêm', '💬 Hỗ trợ')
                break
            case UXState.LEARNING:
                suggestions.push('📚 Hướng dẫn', '🔍 Tìm kiếm', '💬 Hỗ trợ')
                break
            case UXState.ENGAGED:
                suggestions.push('🛒 Tìm kiếm hàng hóa', '📝 Đăng bán', '💬 Hỗ trợ')
                break
            case UXState.EXPERT:
                suggestions.push('⚡ Tính năng nâng cao', '📊 Thống kê', '⚙️ Cài đặt')
                break
            case UXState.INACTIVE:
                suggestions.push('🔄 Kích hoạt lại', 'ℹ️ Cập nhật thông tin', '💬 Hỗ trợ')
                break
        }

        // Based on preferred categories
        if (preferences.preferredCategories.length > 0) {
            suggestions.push(`🔍 Tìm kiếm ${preferences.preferredCategories[0]}`)
        }

        // Based on time of day
        const timeContext = this.getTimeContext(preferences.timezone)
        if (timeContext.isMorning) {
            suggestions.push('🌅 Chào buổi sáng!')
        } else if (timeContext.isEvening) {
            suggestions.push('🌆 Chào buổi tối!')
        }

        return suggestions.slice(0, 6) // Limit to 6 suggestions
    }

    // Get adaptive flow
    async getAdaptiveFlow(userId: string, currentStep: string): Promise<{
        nextSteps: string[]
        skipSteps: string[]
        personalizedContent: string
    }> {
        const profile = await this.getUserProfile(userId)
        const behavior = profile.behavior

        const nextSteps: string[] = []
        const skipSteps: string[] = []
        let personalizedContent = ''

        // Based on user expertise level
        if (profile.uxState === UXState.EXPERT) {
            // Skip basic explanations
            skipSteps.push('basic_intro', 'feature_explanation')
            nextSteps.push('advanced_features', 'customization')
            personalizedContent = 'Chào mừng trở lại! Bạn có muốn sử dụng tính năng nâng cao không?'
        } else if (profile.uxState === UXState.FIRST_TIME) {
            // Include all steps
            nextSteps.push('welcome', 'intro', 'features', 'registration')
            personalizedContent = 'Chào mừng bạn đến với Tân Dậu! Hãy để tôi hướng dẫn bạn.'
        } else {
            // Balanced approach
            nextSteps.push('quick_intro', 'main_features')
            personalizedContent = 'Tôi có thể giúp gì cho bạn hôm nay?'
        }

        return { nextSteps, skipSteps, personalizedContent }
    }

    // Calculate engagement score
    private calculateEngagementScore(behavior: UserBehavior): number {
        let score = 0

        // Based on session length
        if (behavior.averageSessionLength > 300000) { // 5 minutes
            score += 30
        } else if (behavior.averageSessionLength > 60000) { // 1 minute
            score += 20
        } else {
            score += 10
        }

        // Based on feature usage
        score += behavior.mostUsedFeatures.length * 10

        // Based on response time
        if (behavior.responseTime < 1000) { // 1 second
            score += 20
        } else if (behavior.responseTime < 5000) { // 5 seconds
            score += 10
        }

        // Based on recency
        const daysSinceLastInteraction = (Date.now() - behavior.lastInteraction) / (1000 * 60 * 60 * 24)
        if (daysSinceLastInteraction < 1) {
            score += 20
        } else if (daysSinceLastInteraction < 7) {
            score += 10
        }

        return Math.min(score, 100)
    }

    // Determine UX state
    private determineUXState(behavior: UserBehavior): UXState {
        const engagementScore = behavior.engagementScore
        const daysSinceLastInteraction = (Date.now() - behavior.lastInteraction) / (1000 * 60 * 60 * 24)

        if (daysSinceLastInteraction > 30) {
            return UXState.INACTIVE
        }

        if (engagementScore >= 80) {
            return UXState.EXPERT
        } else if (engagementScore >= 60) {
            return UXState.ENGAGED
        } else if (engagementScore >= 30) {
            return UXState.LEARNING
        } else {
            return UXState.FIRST_TIME
        }
    }

    // Response style adjustments
    private makeFormal(text: string): string {
        return text.replace(/bạn/g, 'quý khách')
            .replace(/mình/g, 'chúng tôi')
            .replace(/tôi/g, 'chúng tôi')
    }

    private makeCasual(text: string): string {
        return text.replace(/quý khách/g, 'bạn')
            .replace(/chúng tôi/g, 'mình')
    }

    private makeFriendly(text: string): string {
        return text.replace(/quý khách/g, 'bạn')
            .replace(/chúng tôi/g, 'mình')
            .replace(/xin chào/g, 'chào bạn')
    }

    // Add contextual guidance
    private addFirstTimeGuidance(text: string): string {
        return `${text}\n\n💡 Mẹo: Bạn có thể sử dụng các nút bên dưới để điều hướng dễ dàng hơn!`
    }

    private addExpertFeatures(text: string): string {
        return `${text}\n\n⚡ Bạn có thể sử dụng các tính năng nâng cao như tìm kiếm nâng cao, lọc theo nhiều tiêu chí, v.v.`
    }

    // Time context
    private getTimeContext(timezone: string): {
        isMorning: boolean
        isAfternoon: boolean
        isEvening: boolean
        isNight: boolean
        greeting: string
    } {
        const now = new Date()
        const hour = now.getHours()

        return {
            isMorning: hour >= 6 && hour < 12,
            isAfternoon: hour >= 12 && hour < 18,
            isEvening: hour >= 18 && hour < 22,
            isNight: hour >= 22 || hour < 6,
            greeting: hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối'
        }
    }

    private addTimeContext(text: string, timeContext: any): string {
        if (timeContext.isMorning) {
            return `🌅 ${timeContext.greeting}! ${text}`
        } else if (timeContext.isEvening) {
            return `🌆 ${timeContext.greeting}! ${text}`
        }
        return text
    }

    // Start profile analysis
    private startProfileAnalysis(): void {
        // Analyze user profiles every 5 minutes
        setInterval(() => {
            this.analyzeUserProfiles()
        }, 300000)
    }

    private analyzeUserProfiles(): void {
        const now = Date.now()
        const inactiveThreshold = 7 * 24 * 60 * 60 * 1000 // 7 days

        for (const [userId, profile] of Array.from(this.userProfiles)) {
            const daysSinceLastInteraction = (now - profile.behavior.lastInteraction) / (1000 * 60 * 60 * 24)

            if (daysSinceLastInteraction > 7) {
                profile.uxState = UXState.INACTIVE
                this.userProfiles.set(userId, profile)
            }
        }

        logger.debug('User profiles analyzed', {
            totalProfiles: this.userProfiles.size,
            inactiveUsers: Array.from(this.userProfiles.values()).filter(p => p.uxState === UXState.INACTIVE).length
        })
    }

    // Get user insights
    getUserInsights(userId: string): {
        engagementLevel: string
        preferredFeatures: string[]
        interactionPattern: string
        recommendations: string[]
    } {
        const profile = this.userProfiles.get(userId)
        if (!profile) {
            return {
                engagementLevel: 'unknown',
                preferredFeatures: [],
                interactionPattern: 'unknown',
                recommendations: []
            }
        }

        const engagementLevel = profile.uxState === UXState.EXPERT ? 'expert' :
            profile.uxState === UXState.ENGAGED ? 'engaged' :
                profile.uxState === UXState.LEARNING ? 'learning' : 'beginner'

        const interactionPattern = profile.behavior.averageSessionLength > 300000 ? 'long_sessions' :
            profile.behavior.averageSessionLength > 60000 ? 'medium_sessions' : 'short_sessions'

        const recommendations = this.getPersonalizedRecommendations(profile)

        return {
            engagementLevel,
            preferredFeatures: profile.behavior.mostUsedFeatures,
            interactionPattern,
            recommendations
        }
    }

    private getPersonalizedRecommendations(profile: any): string[] {
        const recommendations: string[] = []

        if (profile.uxState === UXState.FIRST_TIME) {
            recommendations.push('Hãy thử đăng ký thành viên để sử dụng đầy đủ tính năng')
        }

        if (profile.behavior.mostUsedFeatures.includes('search')) {
            recommendations.push('Bạn có thể sử dụng tìm kiếm nâng cao với nhiều bộ lọc')
        }

        if (profile.behavior.engagementScore < 50) {
            recommendations.push('Hãy khám phá thêm các tính năng khác của bot')
        }

        return recommendations
    }

    // Get system statistics
    getSystemStats(): {
        totalUsers: number
        activeUsers: number
        userStates: Record<UXState, number>
        averageEngagement: number
    } {
        const profiles = Array.from(this.userProfiles.values())
        const now = Date.now()
        const activeThreshold = 24 * 60 * 60 * 1000 // 24 hours

        const activeUsers = profiles.filter(p => now - p.behavior.lastInteraction < activeThreshold).length
        const userStates: Record<UXState, number> = {
            [UXState.FIRST_TIME]: 0,
            [UXState.LEARNING]: 0,
            [UXState.ENGAGED]: 0,
            [UXState.EXPERT]: 0,
            [UXState.INACTIVE]: 0
        }

        profiles.forEach(p => {
            userStates[p.uxState]++
        })

        const averageEngagement = profiles.length > 0
            ? profiles.reduce((sum, p) => sum + p.behavior.engagementScore, 0) / profiles.length
            : 0

        return {
            totalUsers: profiles.length,
            activeUsers,
            userStates,
            averageEngagement
        }
    }
}

// Export singleton instance
export const smartUXManager = SmartUXManager.getInstance()
