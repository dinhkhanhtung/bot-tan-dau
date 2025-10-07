const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function cleanupEmptyMessages() {
    try {
        console.log('🧹 Cleaning up empty messages...')

        // Find messages with empty or whitespace-only text
        const { data: emptyMessages, error: findError } = await supabase
            .from('messages')
            .select('id, message_text, sender_id, created_at')
            .or('message_text.is.null,message_text.eq.,message_text.eq.')
            .limit(100)

        if (findError) {
            console.error('❌ Error finding empty messages:', findError)
            return
        }

        if (!emptyMessages || emptyMessages.length === 0) {
            console.log('✅ No empty messages found')
            return
        }

        console.log(`📊 Found ${emptyMessages.length} empty messages`)

        // Delete empty messages
        const messageIds = emptyMessages.map(msg => msg.id)
        const { error: deleteError } = await supabase
            .from('messages')
            .delete()
            .in('id', messageIds)

        if (deleteError) {
            console.error('❌ Error deleting empty messages:', deleteError)
        } else {
            console.log(`✅ Successfully deleted ${messageIds.length} empty messages`)

            // Log deleted messages for reference
            emptyMessages.forEach(msg => {
                console.log(`   - Deleted message ID: ${msg.id} from user: ${msg.sender_id}`)
            })
        }

        // Clean up conversations with no messages
        console.log('🧹 Cleaning up empty conversations...')
        const { error: convError } = await supabase
            .from('conversations')
            .delete()
            .not('id', 'in', `(${supabase.from('messages').select('conversation_id').not('conversation_id', 'is', null)})`)

        if (convError) {
            console.error('❌ Error cleaning up empty conversations:', convError)
        } else {
            console.log('✅ Empty conversations cleaned up')
        }

        console.log('✅ Database cleanup completed successfully!')

    } catch (error) {
        console.error('❌ Cleanup error:', error)
    }
}

cleanupEmptyMessages()