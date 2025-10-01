import { createClient } from '@/lib/supabase'

// Bot handlers cho các tính năng cụ thể
export class BotHandlers {
  private supabase = createClient()

  // Handle marketplace commands
  async handleMarketplace(senderId: string, payload: string) {
    switch (payload) {
      case 'CATEGORY_PHONE':
        await this.sendPhoneListings(senderId)
        break
      case 'CATEGORY_LAPTOP':
        await this.sendLaptopListings(senderId)
        break
      case 'CATEGORY_VEHICLE':
        await this.sendVehicleListings(senderId)
        break
      case 'CATEGORY_REAL_ESTATE':
        await this.sendRealEstateListings(senderId)
        break
      case 'SEARCH':
        await this.sendSearchPrompt(senderId)
        break
      case 'CREATE_LISTING':
        await this.sendCreateListingForm(senderId)
        break
    }
  }

  // Handle chat commands
  async handleChat(senderId: string, payload: string) {
    switch (payload) {
      case 'GROUP_CHAT':
        await this.sendGroupChatInfo(senderId)
        break
      case 'PRIVATE_CHAT':
        await this.sendPrivateChatInfo(senderId)
        break
      case 'FIND_CHAT':
        await this.sendFindChatInfo(senderId)
        break
      case 'CHAT_HISTORY':
        await this.sendChatHistory(senderId)
        break
    }
  }

  // Handle community commands
  async handleCommunity(senderId: string, payload: string) {
    switch (payload) {
      case 'RATINGS':
        await this.sendRatingsInfo(senderId)
        break
      case 'EVENTS':
        await this.sendEventsInfo(senderId)
        break
      case 'ACHIEVEMENTS':
        await this.sendAchievementsInfo(senderId)
        break
      case 'ASTROLOGY':
        await this.sendAstrologyInfo(senderId)
        break
      case 'STORIES':
        await this.sendStoriesInfo(senderId)
        break
    }
  }

  // Send phone listings
  async sendPhoneListings(senderId: string) {
    const { data: listings } = await this.supabase
      .from('listings')
      .select('*')
      .eq('category', 'Điện thoại')
      .eq('status', 'active')
      .limit(5)

    if (listings && listings.length > 0) {
      const message = {
        recipient: { id: senderId },
        message: {
          text: `📱 ĐIỆN THOẠI TÂN DẬU 1981\n\n${listings.map(listing => 
            `• ${listing.title}\n💰 ${listing.price.toLocaleString()}đ\n📍 ${listing.location}\n👤 ${listing.seller_name}`
          ).join('\n\n')}`
        }
      }
      await this.sendMessage(message)
    } else {
      await this.sendMessage({
        recipient: { id: senderId },
        message: { text: 'Hiện tại chưa có điện thoại nào được đăng bán.' }
      })
    }
  }

  // Send laptop listings
  async sendLaptopListings(senderId: string) {
    const { data: listings } = await this.supabase
      .from('listings')
      .select('*')
      .eq('category', 'Laptop')
      .eq('status', 'active')
      .limit(5)

    if (listings && listings.length > 0) {
      const message = {
        recipient: { id: senderId },
        message: {
          text: `💻 LAPTOP TÂN DẬU 1981\n\n${listings.map(listing => 
            `• ${listing.title}\n💰 ${listing.price.toLocaleString()}đ\n📍 ${listing.location}\n👤 ${listing.seller_name}`
          ).join('\n\n')}`
        }
      }
      await this.sendMessage(message)
    } else {
      await this.sendMessage({
        recipient: { id: senderId },
        message: { text: 'Hiện tại chưa có laptop nào được đăng bán.' }
      })
    }
  }

  // Send vehicle listings
  async sendVehicleListings(senderId: string) {
    const { data: listings } = await this.supabase
      .from('listings')
      .select('*')
      .eq('category', 'Xe cộ')
      .eq('status', 'active')
      .limit(5)

    if (listings && listings.length > 0) {
      const message = {
        recipient: { id: senderId },
        message: {
          text: `🚗 XE CỘ TÂN DẬU 1981\n\n${listings.map(listing => 
            `• ${listing.title}\n💰 ${listing.price.toLocaleString()}đ\n📍 ${listing.location}\n👤 ${listing.seller_name}`
          ).join('\n\n')}`
        }
      }
      await this.sendMessage(message)
    } else {
      await this.sendMessage({
        recipient: { id: senderId },
        message: { text: 'Hiện tại chưa có xe cộ nào được đăng bán.' }
      })
    }
  }

  // Send real estate listings
  async sendRealEstateListings(senderId: string) {
    const { data: listings } = await this.supabase
      .from('listings')
      .select('*')
      .eq('category', 'Bất động sản')
      .eq('status', 'active')
      .limit(5)

    if (listings && listings.length > 0) {
      const message = {
        recipient: { id: senderId },
        message: {
          text: `🏠 BẤT ĐỘNG SẢN TÂN DẬU 1981\n\n${listings.map(listing => 
            `• ${listing.title}\n💰 ${listing.price.toLocaleString()}đ\n📍 ${listing.location}\n👤 ${listing.seller_name}`
          ).join('\n\n')}`
        }
      }
      await this.sendMessage(message)
    } else {
      await this.sendMessage({
        recipient: { id: senderId },
        message: { text: 'Hiện tại chưa có bất động sản nào được đăng bán.' }
      })
    }
  }

  // Send search prompt
  async sendSearchPrompt(senderId: string) {
    const message = {
      recipient: { id: senderId },
      message: {
        text: `🔍 TÌM KIẾM SẢN PHẨM

Gõ từ khóa bạn muốn tìm kiếm, ví dụ:
• "iPhone 13"
• "MacBook Pro"
• "Honda Wave"
• "Nhà Hà Nội"

Tôi sẽ tìm kiếm trong tất cả sản phẩm của cộng đồng Tân Dậu 1981.`
      }
    }
    await this.sendMessage(message)
  }

  // Send create listing form
  async sendCreateListingForm(senderId: string) {
    const message = {
      recipient: { id: senderId },
      message: {
        text: `📝 ĐĂNG TIN MỚI

Để đăng tin, vui lòng cung cấp thông tin theo format:

📋 Tên sản phẩm: [Tên sản phẩm]
💰 Giá: [Giá tiền]
📍 Địa điểm: [Thành phố/Tỉnh]
📂 Danh mục: [Điện thoại/Laptop/Xe cộ/Bất động sản/Khác]
📝 Mô tả: [Mô tả chi tiết]
📞 Liên hệ: [Số điện thoại]

Ví dụ:
📋 Tên sản phẩm: iPhone 13 Pro Max 128GB
💰 Giá: 15,000,000
📍 Địa điểm: Hà Nội
📂 Danh mục: Điện thoại
📝 Mô tả: Máy còn bảo hành, ít sử dụng
📞 Liên hệ: 0123456789`
      }
    }
    await this.sendMessage(message)
  }

  // Send group chat info
  async sendGroupChatInfo(senderId: string) {
    const message = {
      recipient: { id: senderId },
      message: {
        text: `👥 CHAT NHÓM TÂN DẬU 1981

Chúng tôi có các nhóm chat theo chủ đề:
• 💬 Chat chung - Thảo luận mọi chủ đề
• 🛒 Mua bán - Chia sẻ sản phẩm
• 🎉 Sự kiện - Thông báo sự kiện
• 🔮 Tử vi - Chia sẻ tử vi hàng ngày

Để tham gia nhóm chat, vui lòng liên hệ admin: @admin_tan_dau_1981`
      }
    }
    await this.sendMessage(message)
  }

  // Send private chat info
  async sendPrivateChatInfo(senderId: string) {
    const message = {
      recipient: { id: senderId },
      message: {
        text: `💬 CHAT RIÊNG TÂN DẬU 1981

Để chat riêng với thành viên khác:
1. Tìm thành viên qua marketplace
2. Nhấn "Chat riêng" trên sản phẩm
3. Hoặc gõ "Tìm [tên thành viên]"

Ví dụ: "Tìm Nguyễn Văn A" để tìm và chat với thành viên đó.`
      }
    }
    await this.sendMessage(message)
  }

  // Send find chat info
  async sendFindChatInfo(senderId: string) {
    const message = {
      recipient: { id: senderId },
      message: {
        text: `🔍 TÌM NGƯỜI CHAT

Gõ tên hoặc từ khóa để tìm thành viên:
• "Tìm Nguyễn Văn A"
• "Tìm người bán iPhone"
• "Tìm người Hà Nội"

Tôi sẽ tìm kiếm trong danh sách thành viên Tân Dậu 1981.`
      }
    }
    await this.sendMessage(message)
  }

  // Send chat history
  async sendChatHistory(senderId: string) {
    const { data: chats } = await this.supabase
      .from('chats')
      .select('*')
      .or(`sender_id.eq.${senderId},receiver_id.eq.${senderId}`)
      .order('created_at', { ascending: false })
      .limit(10)

    if (chats && chats.length > 0) {
      const message = {
        recipient: { id: senderId },
        message: {
          text: `📋 LỊCH SỬ CHAT\n\n${chats.map(chat => 
            `• ${chat.sender_name}: ${chat.message}\n⏰ ${new Date(chat.created_at).toLocaleString('vi-VN')}`
          ).join('\n\n')}`
        }
      }
      await this.sendMessage(message)
    } else {
      await this.sendMessage({
        recipient: { id: senderId },
        message: { text: 'Bạn chưa có lịch sử chat nào.' }
      })
    }
  }

  // Send ratings info
  async sendRatingsInfo(senderId: string) {
    const { data: user } = await this.supabase
      .from('users')
      .select('rating, total_transactions')
      .eq('facebook_id', senderId)
      .single()

    const message = {
      recipient: { id: senderId },
      message: {
        text: `⭐ ĐÁNH GIÁ CỦA BẠN

🌟 Điểm đánh giá: ${user?.rating || 0}/5
📊 Tổng giao dịch: ${user?.total_transactions || 0}
🏆 Cấp độ: ${this.getUserLevel(user?.rating || 0)}

Để xem đánh giá chi tiết, vui lòng truy cập web app.`
      }
    }
    await this.sendMessage(message)
  }

  // Send events info
  async sendEventsInfo(senderId: string) {
    const { data: events } = await this.supabase
      .from('fun_events')
      .select('*')
      .eq('status', 'active')
      .order('event_date', { ascending: true })
      .limit(5)

    if (events && events.length > 0) {
      const message = {
        recipient: { id: senderId },
        message: {
          text: `🎉 SỰ KIỆN TÂN DẬU 1981\n\n${events.map(event => 
            `• ${event.title}\n📅 ${new Date(event.event_date).toLocaleDateString('vi-VN')}\n📍 ${event.location}\n👥 ${event.participant_count} người tham gia`
          ).join('\n\n')}`
        }
      }
      await this.sendMessage(message)
    } else {
      await this.sendMessage({
        recipient: { id: senderId },
        message: { text: 'Hiện tại chưa có sự kiện nào.' }
      })
    }
  }

  // Send achievements info
  async sendAchievementsInfo(senderId: string) {
    const { data: achievements } = await this.supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', senderId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (achievements && achievements.length > 0) {
      const message = {
        recipient: { id: senderId },
        message: {
          text: `🏆 THÀNH TÍCH CỦA BẠN\n\n${achievements.map(achievement => 
            `• ${achievement.achievement_type}\n⏰ ${new Date(achievement.created_at).toLocaleDateString('vi-VN')}`
          ).join('\n\n')}`
        }
      }
      await this.sendMessage(message)
    } else {
      await this.sendMessage({
        recipient: { id: senderId },
        message: { text: 'Bạn chưa có thành tích nào.' }
      })
    }
  }

  // Send astrology info
  async sendAstrologyInfo(senderId: string) {
    const { data: astrology } = await this.supabase
      .from('user_astrology')
      .select('*')
      .eq('user_id', senderId)
      .single()

    if (astrology) {
      const message = {
        recipient: { id: senderId },
        message: {
          text: `🔮 TỬ VI TÂN DẬU 1981

🐓 Tuổi: ${astrology.chinese_zodiac}
⚡ Ngũ hành: ${astrology.element}
🍀 Số may mắn: ${astrology.lucky_numbers.join(', ')}
🎨 Màu may mắn: ${astrology.lucky_colors.join(', ')}

Hôm nay là ngày tốt để mua bán và giao lưu!`
        }
      }
      await this.sendMessage(message)
    } else {
      await this.sendMessage({
        recipient: { id: senderId },
        message: { text: 'Chưa có thông tin tử vi. Vui lòng liên hệ admin.' }
      })
    }
  }

  // Send stories info
  async sendStoriesInfo(senderId: string) {
    const { data: stories } = await this.supabase
      .from('community_stories')
      .select('*')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(5)

    if (stories && stories.length > 0) {
      const message = {
        recipient: { id: senderId },
        message: {
          text: `📖 CÂU CHUYỆN CỘNG ĐỒNG\n\n${stories.map(story => 
            `• ${story.title}\n👤 ${story.author_name}\n📅 ${new Date(story.created_at).toLocaleDateString('vi-VN')}\n❤️ ${story.likes} lượt thích`
          ).join('\n\n')}`
        }
      }
      await this.sendMessage(message)
    } else {
      await this.sendMessage({
        recipient: { id: senderId },
        message: { text: 'Chưa có câu chuyện nào.' }
      })
    }
  }

  // Get user level based on rating
  getUserLevel(rating: number): string {
    if (rating >= 4.5) return 'Kim Cương'
    if (rating >= 4.0) return 'Vàng'
    if (rating >= 3.5) return 'Bạc'
    if (rating >= 3.0) return 'Đồng'
    return 'Mới'
  }

  // Send message to Facebook
  async sendMessage(messageData: any) {
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
}
