# 🔧 Sửa Lỗi Xung Đột Luồng Đăng Ký

## 🎯 **Vấn đề đã được giải quyết:**

Từ hình ảnh, user đang trong flow đăng ký (nhập tên "Đình Khánh Tùng") nhưng bot gửi tin nhắn lỗi "Có lỗi xảy ra. Vui lòng thử lại sau!" thay vì xử lý tin nhắn đăng ký bình thường.

## 🔍 **Nguyên nhân gốc rễ:**

### 1. **Inconsistency trong Session Data Structure**
- Bảng `bot_sessions` có cấu trúc: `facebook_id`, `session_data` (JSONB), `current_flow` (VARCHAR)
- Code lưu trữ session theo 2 cách khác nhau:
  - Một số nơi lưu `current_flow` vào cột `current_flow`
  - Một số nơi lưu `current_flow` vào `session_data.current_flow`
- Khi đọc session, code cố gắng đọc cả 2 cách nhưng không nhất quán

### 2. **Logic ưu tiên không đúng**
- Flow đăng ký không được ưu tiên đúng cách trong `unified-entry-point.ts`
- Tin nhắn của user trong flow đăng ký bị xử lý bởi logic chào mừng thay vì logic đăng ký

## ✅ **Các thay đổi đã thực hiện:**

### 1. **Chuẩn hóa Session Data Structure** (`src/lib/utils.ts`)

```typescript
// Update bot session - CHUẨN HÓA
export async function updateBotSession(facebookId: string, sessionData: any) {
    const currentFlow = sessionData?.current_flow || null
    
    await supabaseAdmin
        .from('bot_sessions')
        .upsert({
            facebook_id: facebookId,
            session_data: sessionData,
            current_flow: currentFlow, // Lưu vào cột riêng để dễ query
            updated_at: new Date().toISOString()
        })
}

// Get bot session - CHUẨN HÓA
export async function getBotSession(facebookId: string) {
    // ... lấy data từ database
    
    // CHUẨN HÓA: Đảm bảo current_flow có sẵn ở cả 2 nơi
    if (data) {
        // Nếu current_flow chỉ có trong session_data, copy ra ngoài
        if (!data.current_flow && data.session_data?.current_flow) {
            data.current_flow = data.session_data.current_flow
        }
        
        // Nếu current_flow chỉ có ở ngoài, copy vào session_data
        if (data.current_flow && !data.session_data?.current_flow) {
            data.session_data = data.session_data || {}
            data.session_data.current_flow = data.current_flow
        }
    }
    
    return data
}
```

### 2. **Cải thiện Logic Ưu Tiên** (`src/lib/core/unified-entry-point.ts`)

```typescript
// Step 3: Check user session and prioritize active flows
const session = await this.getUserSession(user.facebook_id)

// CHUẨN HÓA: Lấy current_flow từ session (đã được chuẩn hóa)
const currentFlow = session?.current_flow || null

// If user is in an active flow, handle flow first - ƯU TIÊN CAO NHẤT
if (currentFlow && ['registration', 'listing', 'search'].includes(currentFlow)) {
    logger.info('User in active flow - PRIORITIZING FLOW', { 
        currentFlow, 
        facebook_id: user.facebook_id,
        step: session?.session_data?.step || session?.current_step
    })
    await this.handleFlowMessage(user, text, session)
    return
}
```

### 3. **Cải thiện Flow Message Handling**

```typescript
private static async handleFlowMessage(user: any, text: string, session?: any): Promise<void> {
    // CHUẨN HÓA: Sử dụng session đã được chuẩn hóa
    const currentFlow = session?.current_flow || null

    logger.debug('Handling flow message', {
        currentFlow,
        facebook_id: user.facebook_id,
        hasSession: !!session,
        sessionData: session?.session_data,
        text: text?.substring(0, 50) + '...'
    })

    // Kiểm tra session hợp lệ
    if (!session || !currentFlow) {
        logger.error('Invalid session for flow message', {
            facebook_id: user.facebook_id,
            session,
            currentFlow
        })
        await this.sendErrorMessage(user.facebook_id)
        return
    }

    // Route đến flow handler phù hợp
    switch (currentFlow) {
        case 'registration':
            logger.info('Routing to registration flow', {
                facebook_id: user.facebook_id,
                step: session?.session_data?.step
            })
            const { AuthFlow } = await import('../flows/auth-flow')
            const authFlow = new AuthFlow()
            await authFlow.handleStep(user, text || '', session)
            break
        // ... other flows
    }
}
```

### 4. **Cải thiện AuthFlow.handleStep** (`src/lib/flows/auth-flow.ts`)

```typescript
async handleStep(user: any, text: string, session: any): Promise<void> {
    // CHUẨN HÓA: Sử dụng session data đã được chuẩn hóa
    const currentStep = session.session_data?.step || session.step || 'name'
    const sessionData = session.session_data?.data || session.data || {}

    console.log('🔄 Processing step:', currentStep, 'with data:', sessionData)

    switch (currentStep) {
        case 'name':
            await this.handleRegistrationName(user, text, sessionData)
            break
        case 'phone':
            await this.handleRegistrationPhone(user, text, sessionData)
            break
        // ... other steps
    }
}
```

## 🎯 **Kết quả đạt được:**

✅ **Flow đăng ký được ưu tiên cao nhất** - không bị ảnh hưởng bởi logic chào mừng  
✅ **Session data được chuẩn hóa** - đảm bảo tương thích với cả 2 cấu trúc cũ và mới  
✅ **Logic xử lý tin nhắn rõ ràng** - user trong flow đăng ký sẽ được xử lý đúng cách  
✅ **Logging chi tiết** - dễ debug khi có vấn đề  
✅ **Không ảnh hưởng luồng khác** - bot mode và các flow khác vẫn hoạt động bình thường  

## 🧪 **Cách test:**

1. **User bắt đầu đăng ký:**
   - Gửi tin nhắn → Ấn "Chat Bot" → Ấn "Đăng ký"
   - Bot sẽ hiển thị form đăng ký

2. **User nhập tên:**
   - Nhập tên "Đình Khánh Tùng"
   - Bot sẽ chuyển sang bước tiếp theo (số điện thoại) thay vì gửi tin nhắn lỗi

3. **User hỏi "sao vậy":**
   - Nếu user hỏi trong flow đăng ký, bot sẽ xử lý theo context đăng ký
   - Không còn gửi tin nhắn lỗi chung chung

## 📋 **Files đã thay đổi:**

- `src/lib/utils.ts` - Chuẩn hóa session data structure
- `src/lib/core/unified-entry-point.ts` - Cải thiện logic ưu tiên và flow handling
- `src/lib/flows/auth-flow.ts` - Cải thiện xử lý session data trong registration flow

## 🚀 **Triển khai:**

Các thay đổi đã được thực hiện và sẵn sàng deploy. Không cần thay đổi database schema vì đã tương thích với cấu trúc hiện tại.
