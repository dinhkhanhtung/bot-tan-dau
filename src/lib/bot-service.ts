/**
 * Bot Service Wrapper
 * Service để encapsulate các operations liên quan đến bot
 */

import { getBotSession as dbGetBotSession, updateBotSession as dbUpdateBotSession, deleteBotSession as dbDeleteBotSession, getBotSettings as dbGetBotSettings, getBotStatus as dbGetBotStatus, updateBotStatus as dbUpdateBotStatus } from './database-service'
import { logger } from './logger'
import { errorHandler, createDatabaseError } from './error-handler'

// Types cho Bot Session
export interface BotSession {
  id?: string
  facebook_id: string
  session_data?: any
  current_flow?: string | null
  step?: number
  current_step?: number
  data?: any
  created_at?: string
  updated_at?: string
}

export interface SessionData {
  current_flow?: string | null
  step?: number
  current_step?: number
  data?: any
}

// Types cho Bot Settings
export interface BotSettings {
  key: string
  value: string
  created_at?: string
  updated_at?: string
}

// BotService class
export class BotService {
  private static instance: BotService

  private constructor() { }

  public static getInstance(): BotService {
    if (!BotService.instance) {
      BotService.instance = new BotService()
    }
    return BotService.instance
  }

  // Lấy bot session theo Facebook ID với validation
  public async getBotSession(facebookId: string): Promise<BotSession | null> {
    try {
      if (!facebookId || typeof facebookId !== 'string') {
        throw new Error(`Invalid facebookId: ${facebookId}`)
      }

      logger.debug('Getting bot session', { facebookId })

      const session = await dbGetBotSession(facebookId)

      if (session) {
        logger.debug('Bot session found', {
          facebookId,
          currentFlow: session.current_flow,
          step: session.step
        })
      } else {
        logger.debug('Bot session not found', { facebookId })
      }

      return session
    } catch (error) {
      logger.error('Error getting bot session', {
        facebookId,
        error: error instanceof Error ? error.message : String(error)
      })
      throw errorHandler.handleError(createDatabaseError(`Failed to get bot session: ${facebookId}`, {
        facebookId
      }))
    }
  }

  // Cập nhật bot session với validation
  public async updateBotSession(facebookId: string, sessionData: SessionData): Promise<BotSession> {
    try {
      if (!facebookId || typeof facebookId !== 'string') {
        throw new Error(`Invalid facebookId: ${facebookId}`)
      }

      if (!sessionData || typeof sessionData !== 'object') {
        throw new Error(`Invalid sessionData: ${sessionData}`)
      }

      logger.debug('Updating bot session', { facebookId, sessionData })

      const session = await dbUpdateBotSession(facebookId, sessionData)

      logger.info('Bot session updated successfully', {
        facebookId,
        currentFlow: session.current_flow,
        step: session.step
      })

      return session
    } catch (error) {
      logger.error('Error updating bot session', {
        facebookId,
        sessionData,
        error: error instanceof Error ? error.message : String(error)
      })
      throw errorHandler.handleError(createDatabaseError('Failed to update bot session', {
        facebookId,
        sessionData,
        error: error instanceof Error ? error.message : String(error)
      }))
    }
  }

  // Xóa bot session với validation
  public async deleteBotSession(facebookId: string): Promise<boolean> {
    try {
      if (!facebookId || typeof facebookId !== 'string') {
        throw new Error(`Invalid facebookId: ${facebookId}`)
      }

      logger.debug('Deleting bot session', { facebookId })

      await dbDeleteBotSession(facebookId)

      logger.info('Bot session deleted successfully', { facebookId })

      return true
    } catch (error) {
      logger.error('Error deleting bot session', {
        facebookId,
        error: error instanceof Error ? error.message : String(error)
      })
      throw errorHandler.handleError(createDatabaseError('Failed to delete bot session', {
        facebookId,
        error: error instanceof Error ? error.message : String(error)
      }))
    }
  }

  // Lấy tất cả bot settings
  public async getBotSettings(): Promise<BotSettings[]> {
    try {
      logger.debug('Getting bot settings')

      const settings = await dbGetBotSettings()

      logger.debug('Bot settings retrieved', { count: settings.length })

      return settings
    } catch (error) {
      logger.error('Error getting bot settings', {
        error: error instanceof Error ? error.message : String(error)
      })
      throw errorHandler.handleError(createDatabaseError('Failed to get bot settings', {
        error: error instanceof Error ? error.message : String(error)
      }))
    }
  }

  // Lấy trạng thái bot
  public async getBotStatus(): Promise<string> {
    try {
      logger.debug('Getting bot status')

      const status = await dbGetBotStatus()

      logger.debug('Bot status retrieved', { status })

      return status
    } catch (error) {
      logger.error('Error getting bot status', {
        error: error instanceof Error ? error.message : String(error)
      })
      throw errorHandler.handleError(createDatabaseError('Failed to get bot status', {
        error: error instanceof Error ? error.message : String(error)
      }))
    }
  }

  // Cập nhật trạng thái bot
  public async updateBotStatus(status: string): Promise<boolean> {
    try {
      if (!status || typeof status !== 'string') {
        throw new Error(`Invalid status: ${status}`)
      }

      logger.debug('Updating bot status', { status })

      await dbUpdateBotStatus(status)

      logger.info('Bot status updated successfully', { status })

      return true
    } catch (error) {
      logger.error('Error updating bot status', {
        status,
        error: error instanceof Error ? error.message : String(error)
      })
      throw errorHandler.handleError(createDatabaseError('Failed to update bot status', {
        status,
        error: error instanceof Error ? error.message : String(error)
      }))
    }
  }

  // Lấy setting theo key
  public async getBotSettingByKey(key: string): Promise<string | null> {
    try {
      if (!key || typeof key !== 'string') {
        throw new Error(`Invalid key: ${key}`)
      }

      const settings = await this.getBotSettings()
      const setting = settings.find(s => s.key === key)

      return setting ? setting.value : null
    } catch (error) {
      logger.error('Error getting bot setting by key', {
        key,
        error: error instanceof Error ? error.message : String(error)
      })
      return null
    }
  }

  // Kiểm tra session có tồn tại không
  public async sessionExists(facebookId: string): Promise<boolean> {
    try {
      const session = await this.getBotSession(facebookId)
      return session !== null
    } catch (error) {
      logger.error('Error checking if session exists', {
        facebookId,
        error: error instanceof Error ? error.message : String(error)
      })
      return false
    }
  }

  // Tạo session mới nếu chưa tồn tại
  public async createSessionIfNotExists(facebookId: string, initialData?: SessionData): Promise<BotSession> {
    try {
      const existingSession = await this.getBotSession(facebookId)

      if (existingSession) {
        return existingSession
      }

      const defaultData: SessionData = {
        current_flow: null,
        step: 0,
        current_step: 0,
        data: {},
        ...initialData
      }

      return await this.updateBotSession(facebookId, defaultData)
    } catch (error) {
      logger.error('Error creating session if not exists', {
        facebookId,
        initialData,
        error: error instanceof Error ? error.message : String(error)
      })
      throw errorHandler.handleError(createDatabaseError('Failed to create session if not exists', {
        facebookId,
        error: error instanceof Error ? error.message : String(error)
      }))
    }
  }

  // Clear session data nhưng giữ nguyên session
  public async clearSessionData(facebookId: string): Promise<BotSession> {
    try {
      const sessionData: SessionData = {
        current_flow: null,
        step: 0,
        current_step: 0,
        data: {}
      }

      return await this.updateBotSession(facebookId, sessionData)
    } catch (error) {
      logger.error('Error clearing session data', {
        facebookId,
        error: error instanceof Error ? error.message : String(error)
      })
      throw errorHandler.handleError(createDatabaseError('Failed to clear session data', {
        facebookId,
        error: error instanceof Error ? error.message : String(error)
      }))
    }
  }
}

// Export singleton instance
export const botService = BotService.getInstance()

// Export convenience functions
export const getBotSession = (facebookId: string) =>
  botService.getBotSession(facebookId)

export const updateBotSession = (facebookId: string, sessionData: SessionData) =>
  botService.updateBotSession(facebookId, sessionData)

export const deleteBotSession = (facebookId: string) =>
  botService.deleteBotSession(facebookId)

export const getBotSettings = () =>
  botService.getBotSettings()

export const getBotStatus = () =>
  botService.getBotStatus()

export const updateBotStatus = (status: string) =>
  botService.updateBotStatus(status)

export const getBotSettingByKey = (key: string) =>
  botService.getBotSettingByKey(key)

export const sessionExists = (facebookId: string) =>
  botService.sessionExists(facebookId)

export const createSessionIfNotExists = (facebookId: string, initialData?: SessionData) =>
  botService.createSessionIfNotExists(facebookId, initialData)

export const clearSessionData = (facebookId: string) =>
  botService.clearSessionData(facebookId)

export default botService