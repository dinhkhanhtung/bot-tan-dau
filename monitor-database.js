#!/usr/bin/env node

/**
 * Database Monitoring Script for Admin Takeover Logic
 * Monitors database operations in real-time for debugging
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

class DatabaseMonitor {
  constructor() {
    this.isMonitoring = false;
    this.monitoringInterval = null;
    this.logs = [];
    this.maxLogs = 1000;

    console.log('🚀 Database Monitor initialized');
    console.log(`📊 Monitoring URL: ${supabaseUrl}`);
  }

  log(message, type = 'INFO') {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      type,
      message
    };

    this.logs.push(logEntry);

    // Keep only latest logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output with colors
    const typeColors = {
      'INFO': '\x1b[36m',    // Cyan
      'SUCCESS': '\x1b[32m', // Green
      'WARNING': '\x1b[33m', // Yellow
      'ERROR': '\x1b[31m',   // Red
      'ADMIN': '\x1b[35m'    // Magenta
    };

    const color = typeColors[type] || '\x1b[37m';
    const reset = '\x1b[0m';

    console.log(`${color}[${timestamp}] ${type}:${reset} ${message}`);
  }

  async checkAdminTakeoverStates() {
    try {
      // Check active admin takeovers
      const { data: activeTakeovers, error } = await supabase
        .from('admin_takeovers')
        .select(`
          *,
          admin:admin_id(id, username),
          user:user_id(id, username)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        this.log(`Error fetching admin takeovers: ${error.message}`, 'ERROR');
        return;
      }

      if (activeTakeovers && activeTakeovers.length > 0) {
        this.log(`📋 Found ${activeTakeovers.length} active admin takeover(s):`, 'ADMIN');

        activeTakeovers.forEach((takeover, index) => {
          const adminName = takeover.admin?.username || 'Unknown';
          const userName = takeover.user?.username || 'Unknown';
          const duration = this.getDuration(takeover.created_at);

          this.log(
            `  ${index + 1}. Admin: ${adminName} -> User: ${userName} (Duration: ${duration})`,
            'ADMIN'
          );
        });
      } else {
        this.log('✅ No active admin takeovers found', 'SUCCESS');
      }

      // Check recent admin takeover activities
      const { data: recentActivities, error: activityError } = await supabase
        .from('admin_takeovers')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(10);

      if (!activityError && recentActivities) {
        this.log(`📈 Recent admin takeover activities:`, 'INFO');

        recentActivities.forEach((activity, index) => {
          const status = activity.is_active ? '🟢 Active' : '🔴 Inactive';
          const action = activity.created_at === activity.updated_at ? 'Created' : 'Updated';

          this.log(
            `  ${index + 1}. ${action} - ${status} (${this.getDuration(activity.updated_at)} ago)`,
            'INFO'
          );
        });
      }

    } catch (error) {
      this.log(`Unexpected error in checkAdminTakeoverStates: ${error.message}`, 'ERROR');
    }
  }

  async checkMessageProcessing() {
    try {
      // Check recent messages
      const { data: recentMessages, error } = await supabase
        .from('messages')
        .select(`
          *,
          user:user_id(id, username),
          conversation:conversation_id(title)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        this.log(`Error fetching messages: ${error.message}`, 'ERROR');
        return;
      }

      if (recentMessages && recentMessages.length > 0) {
        this.log(`💬 Recent message processing:`, 'INFO');

        recentMessages.forEach((message, index) => {
          const userName = message.user?.username || 'Unknown';
          const conversationTitle = message.conversation?.title || 'Unknown';
          const content = message.content?.substring(0, 50) || 'Empty';

          this.log(
            `  ${index + 1}. ${userName} -> ${conversationTitle}: "${content}..."`,
            'INFO'
          );
        });
      }

      // Check for spam patterns
      const { data: spamCheck, error: spamError } = await supabase
        .from('messages')
        .select('user_id, content, created_at')
        .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes
        .not('content', 'is', null);

      if (!spamError && spamCheck) {
        const userMessageCounts = {};
        spamCheck.forEach(msg => {
          const userId = msg.user_id;
          if (!userMessageCounts[userId]) {
            userMessageCounts[userId] = [];
          }
          userMessageCounts[userId].push(msg);
        });

        // Find users with high message frequency
        Object.entries(userMessageCounts).forEach(([userId, messages]) => {
          if (messages.length > 5) { // More than 5 messages in 5 minutes
            this.log(`⚠️  Potential spam detected - User ${userId}: ${messages.length} messages in 5 minutes`, 'WARNING');
          }
        });
      }

    } catch (error) {
      this.log(`Unexpected error in checkMessageProcessing: ${error.message}`, 'ERROR');
    }
  }

  async checkSystemHealth() {
    try {
      // Check database connectivity
      const { data, error } = await supabase
        .from('users')
        .select('count', { count: 'exact' })
        .limit(1);

      if (error) {
        this.log(`❌ Database connectivity issue: ${error.message}`, 'ERROR');
      } else {
        this.log(`✅ Database connected - System operational`, 'SUCCESS');
      }

      // Check for any errors in logs table if it exists
      try {
        const { data: errors, error: logError } = await supabase
          .from('error_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);

        if (!logError && errors && errors.length > 0) {
          this.log(`🚨 Recent errors found:`, 'ERROR');
          errors.forEach((error, index) => {
            this.log(`  ${index + 1}. ${error.message || 'Unknown error'} (${this.getDuration(error.created_at)} ago)`, 'ERROR');
          });
        }
      } catch (e) {
        // Error logs table might not exist, skip silently
      }

    } catch (error) {
      this.log(`Unexpected error in checkSystemHealth: ${error.message}`, 'ERROR');
    }
  }

  getDuration(timestamp) {
    const now = Date.now();
    const time = new Date(timestamp).getTime();
    const diffMs = now - time;

    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);

    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes % 60}m ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes}m ${diffSeconds % 60}s ago`;
    } else {
      return `${diffSeconds}s ago`;
    }
  }

  start(intervalMs = 5000) {
    if (this.isMonitoring) {
      this.log('⚠️  Monitoring already running', 'WARNING');
      return;
    }

    this.isMonitoring = true;
    this.log(`🔄 Starting database monitoring (interval: ${intervalMs}ms)`, 'SUCCESS');

    this.monitoringInterval = setInterval(async () => {
      await this.checkAdminTakeoverStates();
      await this.checkMessageProcessing();
      await this.checkSystemHealth();

      // Separator between monitoring cycles
      console.log('\x1b[37m' + '='.repeat(80) + '\x1b[0m');
    }, intervalMs);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      this.log('🛑 SIGINT received, stopping monitoring...', 'WARNING');
      this.stop();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      this.log('🛑 SIGTERM received, stopping monitoring...', 'WARNING');
      this.stop();
      process.exit(0);
    });
  }

  stop() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    this.log('⏹️  Database monitoring stopped', 'INFO');
  }

  getLogs() {
    return this.logs;
  }

  saveLogsToFile(filename = null) {
    if (!filename) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      filename = `database-monitor-logs-${timestamp}.json`;
    }

    try {
      fs.writeFileSync(filename, JSON.stringify(this.logs, null, 2));
      this.log(`💾 Logs saved to ${filename}`, 'SUCCESS');
      return filename;
    } catch (error) {
      this.log(`❌ Failed to save logs: ${error.message}`, 'ERROR');
      return null;
    }
  }
}

// Export for use in other scripts
module.exports = DatabaseMonitor;

// Run if called directly
if (require.main === module) {
  const monitor = new DatabaseMonitor();

  // Start monitoring with 5 second intervals
  monitor.start(5000);

  console.log('\n🎯 Database Monitor Controls:');
  console.log('  Press Ctrl+C to stop monitoring');
  console.log('  Logs are saved automatically to database-monitor-logs-*.json');
  console.log('');
}