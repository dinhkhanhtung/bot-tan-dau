import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { BotHandlers } from '@/lib/bot-handlers'

// Facebook Messenger Bot cho Tân Dậu 1981
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  // Verify webhook
  if (mode === 'subscribe' && token === process.env.FACEBOOK_VERIFY_TOKEN) {
    console.log('Webhook verified successfully!')
    return new NextResponse(challenge, { status: 200 })
  } else {
    console.log('Webhook verification failed!')
    return new NextResponse('Forbidden', { status: 403 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Check if it's a page subscription
    if (body.object === 'page') {
      // Process each entry
      for (const entry of body.entry) {
        const webhookEvent = entry.messaging[0]
        console.log('Received webhook event:', webhookEvent)

        // Get sender ID
        const senderId = webhookEvent.sender.id

        // Handle different types of messages
        if (webhookEvent.message) {
          await handleMessage(senderId, webhookEvent.message)
        } else if (webhookEvent.postback) {
          await handlePostback(senderId, webhookEvent.postback)
        }
      }
    }

    return new NextResponse('OK', { status: 200 })
  } catch (error) {
    console.error('Webhook error:', error)
    return new NextResponse('Error', { status: 500 })
  }
}

// Handle text messages
async function handleMessage(senderId: string, message: any) {
  const messageText = message.text?.toLowerCase() || ''
  
  // Get user info from database
  const supabase = createClient()
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('facebook_id', senderId)
    .single()

  // If user not found, create new user
  if (!user) {
    await createNewUser(senderId)
  }

  // Handle different commands
  if (messageText.includes('chào') || messageText.includes('hello') || messageText.includes('hi')) {
    await sendWelcomeMessage(senderId)
  } else if (messageText.includes('marketplace') || messageText.includes('mua bán')) {
    await sendMarketplaceMenu(senderId)
  } else if (messageText.includes('chat') || messageText.includes('tin nhắn')) {
    await sendChatMenu(senderId)
  } else if (messageText.includes('community') || messageText.includes('cộng đồng')) {
    await sendCommunityMenu(senderId)
  } else if (messageText.includes('help') || messageText.includes('trợ giúp')) {
    await sendHelpMenu(senderId)
  } else {
    await sendDefaultResponse(senderId)
  }
}

// Handle postback events (button clicks)
async function handlePostback(senderId: string, postback: any) {
  const payload = postback.payload
  const botHandlers = new BotHandlers()
  
  switch (payload) {
    case 'GET_STARTED':
      await sendWelcomeMessage(senderId)
      break
    case 'MARKETPLACE':
      await sendMarketplaceMenu(senderId)
      break
    case 'CHAT':
      await sendChatMenu(senderId)
      break
    case 'COMMUNITY':
      await sendCommunityMenu(senderId)
      break
    case 'HELP':
      await sendHelpMenu(senderId)
      break
    // Handle marketplace sub-commands
    case 'CATEGORY_PHONE':
    case 'CATEGORY_LAPTOP':
    case 'CATEGORY_VEHICLE':
    case 'CATEGORY_REAL_ESTATE':
    case 'SEARCH':
    case 'CREATE_LISTING':
      await botHandlers.handleMarketplace(senderId, payload)
      break
    // Handle chat sub-commands
    case 'GROUP_CHAT':
    case 'PRIVATE_CHAT':
    case 'FIND_CHAT':
    case 'CHAT_HISTORY':
      await botHandlers.handleChat(senderId, payload)
      break
    // Handle community sub-commands
    case 'RATINGS':
    case 'EVENTS':
    case 'ACHIEVEMENTS':
    case 'ASTROLOGY':
    case 'STORIES':
      await botHandlers.handleCommunity(senderId, payload)
      break
    default:
      await sendDefaultResponse(senderId)
  }
}

// Create new user
async function createNewUser(facebookId: string) {
  const supabase = createClient()
  
  // Get user info from Facebook
  const userInfo = await getFacebookUserInfo(facebookId)
  
  if (userInfo) {
    await supabase
      .from('users')
      .insert({
        facebook_id: facebookId,
        name: userInfo.name,
        email: userInfo.email,
        birthday: userInfo.birthday,
        avatar_url: userInfo.picture?.data?.url,
        status: 'trial',
        membership_expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        referral_code: `TD1981-${facebookId.slice(-6).toUpperCase()}`,
      })
  }
}

// Get user info from Facebook
async function getFacebookUserInfo(facebookId: string) {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${facebookId}?fields=id,name,email,birthday,picture&access_token=${process.env.FACEBOOK_PAGE_ACCESS_TOKEN}`
    )
    return await response.json()
  } catch (error) {
    console.error('Error getting Facebook user info:', error)
    return null
  }
}

// Send welcome message
async function sendWelcomeMessage(senderId: string) {
  const message = {
    recipient: { id: senderId },
    message: {
      text: `🐓 Chào mừng đến với BOT TÂN DẬU 1981! 🐓

Chúng tôi là cộng đồng đặc biệt dành riêng cho những người sinh năm 1981 (tuổi Tân Dậu).

Tại đây bạn có thể:
🛒 Mua bán với thành viên cùng tuổi
💬 Chat riêng tư
👥 Tham gia cộng đồng
⭐ Đánh giá và tin tưởng

Chọn một tùy chọn bên dưới để bắt đầu:`,
      quick_replies: [
        {
          content_type: 'text',
          title: '🛒 Marketplace',
          payload: 'MARKETPLACE'
        },
        {
          content_type: 'text',
          title: '💬 Chat',
          payload: 'CHAT'
        },
        {
          content_type: 'text',
          title: '👥 Community',
          payload: 'COMMUNITY'
        },
        {
          content_type: 'text',
          title: '❓ Trợ giúp',
          payload: 'HELP'
        }
      ]
    }
  }

  await sendMessage(message)
}

// Send marketplace menu
async function sendMarketplaceMenu(senderId: string) {
  const message = {
    recipient: { id: senderId },
    message: {
      text: `🛒 MARKETPLACE TÂN DẬU 1981

Chọn loại sản phẩm bạn muốn:`,
      quick_replies: [
        {
          content_type: 'text',
          title: '📱 Điện thoại',
          payload: 'CATEGORY_PHONE'
        },
        {
          content_type: 'text',
          title: '💻 Laptop',
          payload: 'CATEGORY_LAPTOP'
        },
        {
          content_type: 'text',
          title: '🚗 Xe cộ',
          payload: 'CATEGORY_VEHICLE'
        },
        {
          content_type: 'text',
          title: '🏠 Bất động sản',
          payload: 'CATEGORY_REAL_ESTATE'
        },
        {
          content_type: 'text',
          title: '🔍 Tìm kiếm',
          payload: 'SEARCH'
        },
        {
          content_type: 'text',
          title: '📝 Đăng tin',
          payload: 'CREATE_LISTING'
        }
      ]
    }
  }

  await sendMessage(message)
}

// Send chat menu
async function sendChatMenu(senderId: string) {
  const message = {
    recipient: { id: senderId },
    message: {
      text: `💬 CHAT TÂN DẬU 1981

Chọn loại chat:`,
      quick_replies: [
        {
          content_type: 'text',
          title: '👥 Chat nhóm',
          payload: 'GROUP_CHAT'
        },
        {
          content_type: 'text',
          title: '💬 Chat riêng',
          payload: 'PRIVATE_CHAT'
        },
        {
          content_type: 'text',
          title: '🔍 Tìm người chat',
          payload: 'FIND_CHAT'
        },
        {
          content_type: 'text',
          title: '📋 Lịch sử chat',
          payload: 'CHAT_HISTORY'
        }
      ]
    }
  }

  await sendMessage(message)
}

// Send community menu
async function sendCommunityMenu(senderId: string) {
  const message = {
    recipient: { id: senderId },
    message: {
      text: `👥 COMMUNITY TÂN DẬU 1981

Chọn hoạt động cộng đồng:`,
      quick_replies: [
        {
          content_type: 'text',
          title: '⭐ Đánh giá',
          payload: 'RATINGS'
        },
        {
          content_type: 'text',
          title: '🎉 Sự kiện',
          payload: 'EVENTS'
        },
        {
          content_type: 'text',
          title: '🏆 Thành tích',
          payload: 'ACHIEVEMENTS'
        },
        {
          content_type: 'text',
          title: '🔮 Tử vi',
          payload: 'ASTROLOGY'
        },
        {
          content_type: 'text',
          title: '📖 Câu chuyện',
          payload: 'STORIES'
        }
      ]
    }
  }

  await sendMessage(message)
}

// Send help menu
async function sendHelpMenu(senderId: string) {
  const message = {
    recipient: { id: senderId },
    message: {
      text: `❓ TRỢ GIÚP BOT TÂN DẬU 1981

Các lệnh bạn có thể sử dụng:
• "chào" - Chào hỏi
• "marketplace" - Mua bán
• "chat" - Tin nhắn
• "community" - Cộng đồng
• "help" - Trợ giúp

Liên hệ admin: @admin_tan_dau_1981`
    }
  }

  await sendMessage(message)
}

// Send default response
async function sendDefaultResponse(senderId: string) {
  const message = {
    recipient: { id: senderId },
    message: {
      text: `Xin lỗi, tôi chưa hiểu. Hãy sử dụng menu bên dưới hoặc gõ "help" để xem hướng dẫn.`,
      quick_replies: [
        {
          content_type: 'text',
          title: '🛒 Marketplace',
          payload: 'MARKETPLACE'
        },
        {
          content_type: 'text',
          title: '💬 Chat',
          payload: 'CHAT'
        },
        {
          content_type: 'text',
          title: '👥 Community',
          payload: 'COMMUNITY'
        },
        {
          content_type: 'text',
          title: '❓ Trợ giúp',
          payload: 'HELP'
        }
      ]
    }
  }

  await sendMessage(message)
}

// Send message to Facebook
async function sendMessage(messageData: any) {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/me/messages?access_token=${process.env.FACEBOOK_PAGE_ACCESS_TOKEN}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageData),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('Error sending message:', error)
    }
  } catch (error) {
    console.error('Error sending message:', error)
  }
}
