/**
 * Advanced Database Connection Pool
 * Connection pooling và query optimization cho Supabase
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { logger, logPerformance } from '../logger'
import { CONFIG } from '../config'

// Connection pool configuration
interface PoolConfig {
    minConnections: number
    maxConnections: number
    acquireTimeoutMillis: number
    idleTimeoutMillis: number
    maxLifetimeMillis: number
}

// Connection wrapper
class Connection {
    public readonly id: string
    public readonly client: SupabaseClient
    public readonly createdAt: number
    public lastUsedAt: number
    public isActive: boolean
    public queryCount: number

    constructor(client: SupabaseClient) {
        this.id = Math.random().toString(36).substr(2, 9)
        this.client = client
        this.createdAt = Date.now()
        this.lastUsedAt = Date.now()
        this.isActive = true
        this.queryCount = 0
    }

    isExpired(maxLifetime: number): boolean {
        return Date.now() - this.createdAt > maxLifetime
    }

    isIdle(idleTimeout: number): boolean {
        return Date.now() - this.lastUsedAt > idleTimeout
    }

    markUsed(): void {
        this.lastUsedAt = Date.now()
        this.queryCount++
    }

    close(): void {
        this.isActive = false
    }
}

// Advanced connection pool
export class DatabaseConnectionPool {
    private static instance: DatabaseConnectionPool
    private connections: Map<string, Connection> = new Map()
    private availableConnections: Set<string> = new Set()
    private waitingQueue: Array<{
        resolve: (connection: Connection) => void
        reject: (error: Error) => void
        timestamp: number
    }> = []
    
    private readonly config: PoolConfig
    private readonly supabaseUrl: string
    private readonly supabaseKey: string
    private cleanupInterval: NodeJS.Timeout | null = null

    private constructor() {
        this.config = {
            minConnections: 2,
            maxConnections: 10,
            acquireTimeoutMillis: 30000,
            idleTimeoutMillis: 300000, // 5 minutes
            maxLifetimeMillis: 1800000 // 30 minutes
        }
        
        this.supabaseUrl = CONFIG.BOT.SUPABASE_URL
        this.supabaseKey = CONFIG.BOT.SUPABASE_SERVICE_ROLE_KEY
        
        this.startCleanupInterval()
    }

    public static getInstance(): DatabaseConnectionPool {
        if (!DatabaseConnectionPool.instance) {
            DatabaseConnectionPool.instance = new DatabaseConnectionPool()
        }
        return DatabaseConnectionPool.instance
    }

    // Get connection from pool
    async getConnection(): Promise<Connection> {
        // Try to get available connection
        if (this.availableConnections.size > 0) {
            const connectionId = this.availableConnections.values().next().value
            this.availableConnections.delete(connectionId)
            
            const connection = this.connections.get(connectionId)!
            connection.markUsed()
            
            logger.debug('Connection acquired from pool', { 
                connectionId, 
                poolSize: this.connections.size,
                availableCount: this.availableConnections.size 
            })
            
            return connection
        }

        // Create new connection if under limit
        if (this.connections.size < this.config.maxConnections) {
            const connection = await this.createConnection()
            connection.markUsed()
            
            logger.debug('New connection created', { 
                connectionId: connection.id,
                poolSize: this.connections.size 
            })
            
            return connection
        }

        // Wait for available connection
        return this.waitForConnection()
    }

    // Return connection to pool
    releaseConnection(connection: Connection): void {
        if (!connection.isActive) {
            return
        }

        this.availableConnections.add(connection.id)
        
        logger.debug('Connection released to pool', { 
            connectionId: connection.id,
            availableCount: this.availableConnections.size 
        })
    }

    // Create new connection
    private async createConnection(): Promise<Connection> {
        const client = createClient(this.supabaseUrl, this.supabaseKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            },
            db: {
                schema: 'public'
            }
        })

        const connection = new Connection(client)
        this.connections.set(connection.id, connection)
        this.availableConnections.add(connection.id)

        return connection
    }

    // Wait for available connection
    private waitForConnection(): Promise<Connection> {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                const index = this.waitingQueue.findIndex(item => item.resolve === resolve)
                if (index !== -1) {
                    this.waitingQueue.splice(index, 1)
                }
                reject(new Error('Connection acquisition timeout'))
            }, this.config.acquireTimeoutMillis)

            this.waitingQueue.push({
                resolve: (connection) => {
                    clearTimeout(timeout)
                    resolve(connection)
                },
                reject: (error) => {
                    clearTimeout(timeout)
                    reject(error)
                },
                timestamp: Date.now()
            })
        })
    }

    // Process waiting queue
    private processWaitingQueue(): void {
        while (this.waitingQueue.length > 0 && this.availableConnections.size > 0) {
            const connectionId = this.availableConnections.values().next().value
            this.availableConnections.delete(connectionId)
            
            const connection = this.connections.get(connectionId)!
            connection.markUsed()
            
            const waiter = this.waitingQueue.shift()!
            waiter.resolve(connection)
        }
    }

    // Start cleanup interval
    private startCleanupInterval(): void {
        this.cleanupInterval = setInterval(() => {
            this.cleanup()
        }, 60000) // Run every minute
    }

    // Cleanup expired and idle connections
    private cleanup(): void {
        const now = Date.now()
        const toRemove: string[] = []

        for (const [id, connection] of this.connections) {
            if (!connection.isActive) {
                toRemove.push(id)
                continue
            }

            // Remove expired connections
            if (connection.isExpired(this.config.maxLifetimeMillis)) {
                logger.info('Removing expired connection', { connectionId: id })
                connection.close()
                toRemove.push(id)
                continue
            }

            // Remove idle connections (but keep minimum)
            if (connection.isIdle(this.config.idleTimeoutMillis) && 
                this.connections.size > this.config.minConnections) {
                logger.info('Removing idle connection', { connectionId: id })
                connection.close()
                toRemove.push(id)
                continue
            }
        }

        // Remove connections
        for (const id of toRemove) {
            this.connections.delete(id)
            this.availableConnections.delete(id)
        }

        // Process waiting queue
        this.processWaitingQueue()

        if (toRemove.length > 0) {
            logger.info('Connection cleanup completed', {
                removedCount: toRemove.length,
                remainingCount: this.connections.size,
                availableCount: this.availableConnections.size
            })
        }
    }

    // Execute query with connection pooling
    async executeQuery<T>(
        queryName: string,
        queryFn: (client: SupabaseClient) => Promise<T>
    ): Promise<T> {
        const startTime = Date.now()
        let connection: Connection | null = null

        try {
            connection = await this.getConnection()
            const result = await queryFn(connection.client)
            
            const duration = Date.now() - startTime
            logPerformance(`Query executed: ${queryName}`, duration, {
                connectionId: connection.id,
                queryCount: connection.queryCount
            })

            return result
        } catch (error) {
            const duration = Date.now() - startTime
            logger.error(`Query failed: ${queryName}`, {
                duration,
                connectionId: connection?.id,
                error: error instanceof Error ? error.message : String(error)
            })
            throw error
        } finally {
            if (connection) {
                this.releaseConnection(connection)
            }
        }
    }

    // Get pool statistics
    getStats() {
        return {
            totalConnections: this.connections.size,
            availableConnections: this.availableConnections.size,
            waitingQueue: this.waitingQueue.length,
            connections: Array.from(this.connections.values()).map(conn => ({
                id: conn.id,
                queryCount: conn.queryCount,
                lastUsedAt: conn.lastUsedAt,
                isActive: conn.isActive
            }))
        }
    }

    // Close all connections
    async close(): Promise<void> {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval)
            this.cleanupInterval = null
        }

        for (const connection of this.connections.values()) {
            connection.close()
        }

        this.connections.clear()
        this.availableConnections.clear()
        
        // Reject all waiting requests
        for (const waiter of this.waitingQueue) {
            waiter.reject(new Error('Pool is closing'))
        }
        this.waitingQueue = []

        logger.info('Database connection pool closed')
    }
}

// Export singleton instance
export const dbPool = DatabaseConnectionPool.getInstance()
