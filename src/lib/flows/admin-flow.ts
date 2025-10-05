import { supabaseAdmin } from '../supabase'
import {
    sendMessage,
    sendTypingIndicator,
    sendQuickReply,
    sendQuickReplyNoTyping,
    createQuickReply,
    sendMessagesWithTyping
} from '../facebook-api'
import { formatCurrency, formatNumber, generateId } from '../utils'

export class AdminFlow {
    // Admin functions moved to web dashboard - keeping only essential compatibility functions
}
