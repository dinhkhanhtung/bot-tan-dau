# 🎯 PENDING_USER IMPLEMENTATION GUIDE

## 📋 Tổng Quan

Hệ thống PENDING_USER cho phép người dùng đang chờ admin duyệt sử dụng bot với các quyền hạn giới hạn, tạo trải nghiệm mượt mà và tăng khả năng chuyển đổi thành người dùng đầy đủ.

## 🏗️ Kiến Trúc Hệ Thống

### 1. **Core Components**

```
src/lib/
├── core/
│   ├── smart-context-manager.ts    # Permission matrix & user context
│   └── unified-entry-point.ts      # Main routing system
├── flows/
│   └── pending-user-flow.ts        # PENDING_USER specific handlers
├── safety-measures.ts              # Rate limiting & abuse detection
├── monitoring.ts                   # Logging & analytics
└── utils.ts                        # Updated user status logic
```

### 2. **Database Schema**

```sql
-- User Activities Tracking
user_activities (
    facebook_id, date, listings_count, searches_count, 
    messages_count, admin_chat_count, last_activity
)

-- Activity Logs
user_activity_logs (
    facebook_id, user_type, action, details, 
    timestamp, success, error_message, response_time_ms
)

-- System Metrics
system_metrics (
    date, total_pending_users, pending_users_today,
    total_searches_today, total_messages_today,
    average_response_time_ms, error_rate_percentage
)
```

## 🔐 Permission Matrix

### **PENDING_USER Permissions**

| Feature | PENDING_USER | REGISTERED_USER | TRIAL_USER |
|---------|--------------|-----------------|------------|
| **Bot Usage** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Search Products** | ✅ Yes (10/day) | ✅ Yes (50/day) | ✅ Yes (20/day) |
| **View Listings** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Create Listings** | ❌ No | ✅ Yes (10/day) | ✅ Yes (5/day) |
| **Contact Sellers** | ❌ No | ✅ Yes | ✅ Yes |
| **Make Payments** | ❌ No | ✅ Yes | ✅ Yes |
| **Admin Chat** | ✅ Yes (5/day) | ✅ Yes (20/day) | ✅ Yes (10/day) |
| **Community Access** | ❌ No | ✅ Yes | ✅ Yes |
| **Points System** | ❌ No | ✅ Yes | ✅ Yes |
| **Settings** | ❌ No | ✅ Yes | ✅ Yes |

## 🚀 Implementation Details

### 1. **User Context Analysis**

```typescript
// SmartContextManager.analyzeUserContext()
if (userData.status === 'pending') {
    userType = UserType.PENDING_USER
    // User có thể sử dụng bot với quyền hạn giới hạn
}
```

### 2. **Permission Checking**

```typescript
// Kiểm tra permission trước khi thực hiện action
const permissions = SmartContextManager.getUserPermissions(UserType.PENDING_USER)
if (!permissions.canCreateListings) {
    await sendListingRestrictionMessage(user)
    return
}
```

### 3. **Rate Limiting**

```typescript
// Kiểm tra rate limit
const rateLimitCheck = await SafetyMeasures.checkRateLimit(
    UserType.PENDING_USER, 
    'searches', 
    user.facebook_id
)
if (!rateLimitCheck.allowed) {
    await sendRateLimitMessage(user, 'tìm kiếm')
    return
}
```

### 4. **Abuse Detection**

```typescript
// Phát hiện abuse patterns
const abuseCheck = await SafetyMeasures.detectAbuse(user.facebook_id)
if (abuseCheck.isAbuse) {
    await sendAbuseWarningMessage(user, abuseCheck.reason)
    return
}
```

## 📱 User Experience Flow

### **1. Welcome Message**
```
⏳ CHÀO MỪNG [TÊN USER]!

📋 Trạng thái: Đang chờ Admin duyệt (X ngày)
🔍 Bạn có thể tìm kiếm và xem sản phẩm
🚫 Chưa thể niêm yết hoặc liên hệ người bán

💡 Admin sẽ duyệt sớm nhất có thể!
```

### **2. Main Menu**
```
Chọn chức năng:
⏳ CHỜ DUYỆT: X NGÀY
🔍 TÌM KIẾM SẢN PHẨM
👀 XEM TIN ĐĂNG
💬 LIÊN HỆ ADMIN
```

### **3. Search Experience**
```
🔍 TÌM KIẾM SẢN PHẨM
Bạn có thể tìm kiếm sản phẩm trong cộng đồng Tân Dậu.
💡 Nhập từ khóa để tìm kiếm:
```

### **4. Listing Restriction**
```
🚫 CHƯA THỂ NIÊM YẾT
Tài khoản của bạn đang chờ admin duyệt.
Sau khi được duyệt, bạn sẽ có thể:
• Niêm yết sản phẩm/dịch vụ
• Liên hệ với người mua
• Sử dụng đầy đủ tính năng

💡 Liên hệ admin để được hỗ trợ nhanh chóng!
```

## 🛡️ Security Features

### 1. **Rate Limiting**
- **Searches**: 10/ngày
- **Messages**: 20/ngày
- **Admin Chat**: 5/ngày
- **Listings**: 0/ngày (bị chặn)

### 2. **Abuse Detection**
- Phát hiện hoạt động bất thường
- Cảnh báo khi vượt quá giới hạn
- Tự động chặn nếu cần thiết

### 3. **Permission Validation**
- Kiểm tra quyền hạn trước mỗi action
- Fallback an toàn khi có lỗi
- Logging đầy đủ cho audit

## 📊 Monitoring & Analytics

### 1. **User Activity Tracking**
```typescript
await MonitoringSystem.logUserActivity(
    facebookId,
    UserType.PENDING_USER,
    'search',
    { keyword: 'nhà đất' },
    true,
    undefined,
    150
)
```

### 2. **System Metrics**
```typescript
const metrics = await MonitoringSystem.getSystemMetrics()
// {
//   total_pending_users: 25,
//   pending_users_today: 3,
//   total_searches_today: 45,
//   average_response_time_ms: 180,
//   error_rate_percentage: 2.5
// }
```

### 3. **User Analytics**
```typescript
const userStats = await MonitoringSystem.getUserActivitySummary(facebookId, 7)
// {
//   total_activities: 15,
//   success_rate: 95.5,
//   average_response_time_ms: 165,
//   action_counts: { search: 8, view_listing: 5, contact_admin: 2 }
// }
```

## 🧪 Testing

### 1. **Run Test Suite**
```bash
node test-pending-user.js
```

### 2. **Test Scenarios**
- ✅ Tạo PENDING_USER
- ✅ Kiểm tra permission matrix
- ✅ Test rate limiting
- ✅ Test abuse detection
- ✅ Test user activities tracking
- ✅ Cleanup test data

### 3. **Manual Testing**
1. Tạo user với `status = 'pending'`
2. Test các chức năng được phép
3. Test các chức năng bị chặn
4. Test rate limiting
5. Test abuse detection

## 🚀 Deployment

### 1. **Database Setup**
```bash
# Run database migrations
psql -d your_database -f database-user-activities.sql
psql -d your_database -f database-monitoring.sql
```

### 2. **Environment Variables**
```env
# No additional environment variables needed
# Uses existing SUPABASE_URL and SUPABASE_SERVICE_KEY
```

### 3. **Code Deployment**
```bash
# Deploy updated code
git add .
git commit -m "Implement PENDING_USER system"
git push origin main
```

## 📈 Benefits

### 1. **User Experience**
- ✅ Smooth onboarding experience
- ✅ Immediate value delivery
- ✅ Clear expectations setting
- ✅ Easy admin contact

### 2. **Business Impact**
- ✅ Increased user engagement
- ✅ Higher conversion rates
- ✅ Reduced admin workload
- ✅ Better user retention

### 3. **Technical Benefits**
- ✅ Scalable architecture
- ✅ Comprehensive monitoring
- ✅ Security-first design
- ✅ Easy maintenance

## 🔧 Maintenance

### 1. **Daily Tasks**
- Monitor system metrics
- Check error rates
- Review abuse detection logs

### 2. **Weekly Tasks**
- Analyze user activity patterns
- Review pending user conversion rates
- Update rate limits if needed

### 3. **Monthly Tasks**
- Clean up old logs
- Review and optimize performance
- Update documentation

## 🚨 Troubleshooting

### 1. **Common Issues**
- **Rate limit too strict**: Adjust limits in `SafetyMeasures`
- **Permission errors**: Check `SmartContextManager` logic
- **Database errors**: Verify schema and permissions

### 2. **Debug Tools**
```typescript
// Check user context
const context = await SmartContextManager.analyzeUserContext(user)
console.log('User context:', context)

// Check permissions
const permissions = SmartContextManager.getUserPermissions(context.userType)
console.log('Permissions:', permissions)

// Check rate limits
const rateLimit = await SafetyMeasures.checkRateLimit(context.userType, 'searches', user.facebook_id)
console.log('Rate limit:', rateLimit)
```

### 3. **Log Analysis**
```sql
-- Check user activities
SELECT * FROM user_activity_logs 
WHERE facebook_id = 'user_id' 
ORDER BY timestamp DESC;

-- Check system metrics
SELECT * FROM system_metrics 
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY date DESC;
```

## 📚 API Reference

### **SmartContextManager**
```typescript
// Analyze user context
static async analyzeUserContext(user: any): Promise<UserContext>

// Get user permissions
static getUserPermissions(userType: UserType): UserPermissions

// Check permission
static hasPermission(userType: UserType, permission: keyof UserPermissions): boolean
```

### **SafetyMeasures**
```typescript
// Check rate limit
static async checkRateLimit(userType: UserType, action: string, facebookId: string): Promise<RateLimitResult>

// Record activity
static async recordActivity(userType: UserType, action: string, facebookId: string): Promise<void>

// Detect abuse
static async detectAbuse(facebookId: string): Promise<AbuseResult>
```

### **MonitoringSystem**
```typescript
// Log user activity
static async logUserActivity(facebookId: string, userType: UserType, action: string, ...): Promise<void>

// Get system metrics
static async getSystemMetrics(): Promise<SystemMetrics>

// Get user activity summary
static async getUserActivitySummary(facebookId: string, days: number): Promise<UserActivitySummary>
```

## 🎯 Success Metrics

### 1. **User Engagement**
- PENDING_USER search rate: > 5 searches/day
- PENDING_USER message rate: > 10 messages/day
- PENDING_USER admin contact rate: > 20%

### 2. **Conversion Rates**
- PENDING_USER to REGISTERED_USER: > 60%
- Average pending time: < 3 days
- User satisfaction: > 4.5/5

### 3. **System Performance**
- Response time: < 200ms
- Error rate: < 2%
- Uptime: > 99.9%

---

## 🎉 Kết Luận

Hệ thống PENDING_USER đã được implement một cách toàn diện với:

- ✅ **Architecture**: Scalable và maintainable
- ✅ **Security**: Rate limiting và abuse detection
- ✅ **UX**: Smooth và intuitive
- ✅ **Monitoring**: Comprehensive logging và analytics
- ✅ **Testing**: Automated test suite
- ✅ **Documentation**: Complete implementation guide

Hệ thống sẵn sàng để deploy và sẽ tạo ra trải nghiệm tuyệt vời cho người dùng đang chờ duyệt, đồng thời tăng khả năng chuyển đổi thành người dùng đầy đủ.
