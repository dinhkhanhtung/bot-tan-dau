/**
 * User Service Wrapper
 * Service để encapsulate các operations liên quan đến user
 */

import { getUserByFacebookId as dbGetUser, createUser as dbCreateUser, updateUser as dbUpdateUser, deleteUser as dbDeleteUser } from './database-service'
import { logger } from './logger'
import { errorHandler, createDatabaseError } from './error-handler'

// Types cho User
export interface User {
  id?: string
  facebook_id: string
  name?: string | null
  phone?: string | null
  status?: string | null
  membership_expires_at?: string | null
  trial_end?: string | null
  welcome_sent?: boolean
  welcome_message_sent?: boolean
  last_welcome_sent?: string
  created_at?: string
  updated_at?: string
}

export interface UserUpdates {
  name?: string | null
  phone?: string | null
  status?: string | null
  membership_expires_at?: string | null
  trial_end?: string | null
  welcome_sent?: boolean
  welcome_message_sent?: boolean
  last_welcome_sent?: string
  updated_at?: string
}

// UserService class
export class UserService {
  private static instance: UserService

  private constructor() { }

  public static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService()
    }
    return UserService.instance
  }

  // Lấy user theo Facebook ID với validation
  public async getUserByFacebookId(facebookId: string): Promise<User | null> {
    try {
      if (!facebookId || typeof facebookId !== 'string') {
        throw new Error(`Invalid facebookId: ${facebookId}`)
      }

      logger.debug('Getting user by Facebook ID', { facebookId })

      const user = await dbGetUser(facebookId)

      if (user) {
        logger.debug('User found', {
          facebookId,
          userId: user.id,
          status: user.status
        })
      } else {
        logger.debug('User not found', { facebookId })
      }

      return user
    } catch (error) {
      logger.error('Error getting user by Facebook ID', {
        facebookId,
        error: error instanceof Error ? error.message : String(error)
      })
      throw errorHandler.handleError(createDatabaseError(`Failed to get user: ${facebookId}`, {
        facebookId
      }))
    }
  }

  // Tạo user mới với validation
  public async createUser(userData: User): Promise<User> {
    try {
      if (!userData || typeof userData !== 'object') {
        throw new Error(`Invalid userData: ${userData}`)
      }

      if (!userData.facebook_id || typeof userData.facebook_id !== 'string') {
        throw new Error(`Invalid facebook_id: ${userData.facebook_id}`)
      }

      logger.debug('Creating new user', {
        facebookId: userData.facebook_id,
        name: userData.name
      })

      const user = await dbCreateUser(userData)

      logger.info('User created successfully', {
        facebookId: userData.facebook_id,
        userId: user.id
      })

      return user
    } catch (error) {
      logger.error('Error creating user', {
        userData,
        error: error instanceof Error ? error.message : String(error)
      })
      throw errorHandler.handleError(createDatabaseError('Failed to create user', {
        userData,
        error: error instanceof Error ? error.message : String(error)
      }))
    }
  }

  // Cập nhật user với validation
  public async updateUser(facebookId: string, updates: UserUpdates): Promise<User> {
    try {
      if (!facebookId || typeof facebookId !== 'string') {
        throw new Error(`Invalid facebookId: ${facebookId}`)
      }

      if (!updates || typeof updates !== 'object') {
        throw new Error(`Invalid updates: ${updates}`)
      }

      logger.debug('Updating user', { facebookId, updates })

      const user = await dbUpdateUser(facebookId, updates)

      logger.info('User updated successfully', {
        facebookId,
        updatedFields: Object.keys(updates)
      })

      return user
    } catch (error) {
      logger.error('Error updating user', {
        facebookId,
        updates,
        error: error instanceof Error ? error.message : String(error)
      })
      throw errorHandler.handleError(createDatabaseError('Failed to update user', {
        facebookId,
        updates,
        error: error instanceof Error ? error.message : String(error)
      }))
    }
  }

  // Xóa user với validation
  public async deleteUser(facebookId: string): Promise<boolean> {
    try {
      if (!facebookId || typeof facebookId !== 'string') {
        throw new Error(`Invalid facebookId: ${facebookId}`)
      }

      logger.debug('Deleting user', { facebookId })

      await dbDeleteUser(facebookId)

      logger.info('User deleted successfully', { facebookId })

      return true
    } catch (error) {
      logger.error('Error deleting user', {
        facebookId,
        error: error instanceof Error ? error.message : String(error)
      })
      throw errorHandler.handleError(createDatabaseError('Failed to delete user', {
        facebookId,
        error: error instanceof Error ? error.message : String(error)
      }))
    }
  }

  // Kiểm tra user có tồn tại không
  public async userExists(facebookId: string): Promise<boolean> {
    try {
      const user = await this.getUserByFacebookId(facebookId)
      return user !== null
    } catch (error) {
      logger.error('Error checking if user exists', {
        facebookId,
        error: error instanceof Error ? error.message : String(error)
      })
      return false
    }
  }

  // Lấy thông tin cơ bản của user (cho các trường hợp cần ít dữ liệu)
  public async getUserBasicInfo(facebookId: string): Promise<Pick<User, 'facebook_id' | 'name' | 'status'> | null> {
    try {
      const user = await this.getUserByFacebookId(facebookId)
      if (!user) return null

      return {
        facebook_id: user.facebook_id,
        name: user.name,
        status: user.status
      }
    } catch (error) {
      logger.error('Error getting user basic info', {
        facebookId,
        error: error instanceof Error ? error.message : String(error)
      })
      return null
    }
  }

  // Calculate user level based on points
  public calculateUserLevel(points: number): string {
    if (points >= 1000) return 'Bạch kim'
    if (points >= 500) return 'Vàng'
    if (points >= 200) return 'Bạc'
    return 'Đồng'
  }

  // Get suggestions for achieving next level
  public getLevelSuggestions(currentLevel: string, currentPoints: number): string {
    switch (currentLevel) {
      case 'Đồng':
        const pointsToSilver = 200 - currentPoints
        return `💡 GỢI Ý: Đăng ${Math.ceil(pointsToSilver / 10)} tin bán để lên Bạc!`
      case 'Bạc':
        const pointsToGold = 500 - currentPoints
        return `💡 GỢI Ý: Đăng ${Math.ceil(pointsToGold / 10)} tin và đánh giá 5 sản phẩm để lên Vàng!`
      case 'Vàng':
        const pointsToPlatinum = 1000 - currentPoints
        return `💡 GỢI Ý: Giới thiệu ${Math.ceil(pointsToPlatinum / 50)} bạn bè để đạt Bạch kim!`
      case 'Bạch kim':
        return `💡 CHÚC MỪNG! Bạn đã đạt cấp độ cao nhất!`
      default:
        return `💡 GỢI Ý: Tiếp tục tích điểm để thăng hạng!`
    }
  }
}

// Export singleton instance
export const userService = UserService.getInstance()

// Export convenience functions
export const getUserByFacebookId = (facebookId: string) =>
  userService.getUserByFacebookId(facebookId)

export const createUser = (userData: User) =>
  userService.createUser(userData)

export const updateUser = (facebookId: string, updates: UserUpdates) =>
  userService.updateUser(facebookId, updates)

export const deleteUser = (facebookId: string) =>
  userService.deleteUser(facebookId)

export const userExists = (facebookId: string) =>
  userService.userExists(facebookId)

export const getUserBasicInfo = (facebookId: string) =>
  userService.getUserBasicInfo(facebookId)

export const calculateUserLevel = (points: number) =>
  userService.calculateUserLevel(points)

export const getLevelSuggestions = (currentLevel: string, currentPoints: number) =>
  userService.getLevelSuggestions(currentLevel, currentPoints)

export default userService
