import { supabaseAdmin } from '../supabase'
import {
    sendMessage,
    sendTypingIndicator,
    sendQuickReply,
    sendQuickReplyNoTyping,
    createQuickReply,
    sendMessagesWithTyping
} from '../facebook-api'
import { formatCurrency } from '../formatters'
import { formatNumber } from '../formatters'
import { generateId } from '../generators'

export class AdminFlow {
    // Admin functions moved to web dashboard - keeping only essential compatibility functions
}
