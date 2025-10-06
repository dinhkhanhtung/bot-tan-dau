# Facebook Link Parser - Hướng dẫn sử dụng

## Tổng quan

Chức năng Facebook Link Parser cho phép admin dán link Facebook và tự động lọc lấy Facebook ID hoặc username của người dùng. Điều này giúp admin dễ dàng thực hiện các thao tác với người dùng mà không cần phải nhớ hoặc tìm kiếm Facebook ID.

## Các tính năng

### 1. Hỗ trợ nhiều định dạng link Facebook

- **Facebook ID thuần**: `123456789`
- **Profile link với ID**: `https://www.facebook.com/profile.php?id=123456789`
- **Profile link với username**: `https://www.facebook.com/username`
- **Mobile Facebook**: `https://m.facebook.com/profile.php?id=123456789`
- **Mobile Facebook username**: `https://m.facebook.com/username`
- **FB.com**: `https://fb.com/username`
- **FB.me**: `https://fb.me/username`
- **Messenger**: `https://messenger.com/t/username`
- **M.me**: `https://m.me/username`

### 2. Tự động trích xuất thông tin

- Tự động nhận diện Facebook ID hoặc username
- Hiển thị link profile Facebook
- Hiển thị link Messenger để chat trực tiếp
- Sao chép ID/username vào clipboard

### 3. Giao diện thân thiện

- Input field với placeholder rõ ràng
- Hiển thị trạng thái thành công/lỗi với màu sắc
- Nút xóa nhanh
- Hướng dẫn sử dụng chi tiết

## Cách sử dụng trong Dashboard

### 1. Gửi nút tương tác

1. Nhấn nút "🎯 Gửi nút cho user" trong phần "Công cụ tương tác"
2. Modal sẽ hiện ra với Facebook Link Parser
3. Dán link Facebook hoặc nhập Facebook ID
4. Nhấn "Gửi nút" để thực hiện

### 2. Chat với người dùng

1. Nhấn nút "💬 Chat với user" trong phần "Công cụ tương tác"
2. Modal sẽ hiện ra với Facebook Link Parser
3. Dán link Facebook hoặc nhập Facebook ID
4. Nhấn "Mở chat" để mở Messenger

### 3. Tặng điểm thưởng

1. Nhấn nút "🎁 Tặng điểm thưởng" trong phần "Công cụ tương tác"
2. Modal sẽ hiện ra với Facebook Link Parser và input số điểm
3. Dán link Facebook hoặc nhập Facebook ID
4. Nhập số điểm muốn tặng
5. Nhấn "Tặng điểm" để thực hiện

## Các file đã được tạo/cập nhật

### 1. Component mới

- `src/app/admin/dashboard/components/FacebookLinkParser.tsx` - Component chính để parse Facebook link

### 2. Utility functions

- `src/lib/facebook-utils.ts` - Các function tiện ích để xử lý Facebook link

### 3. Dashboard cập nhật

- `src/app/admin/dashboard/page.tsx` - Cập nhật để sử dụng modal với Facebook Link Parser

## API của FacebookLinkParser

```typescript
interface FacebookLinkParserProps {
    onIdExtracted: (facebookId: string) => void
    placeholder?: string
    className?: string
}
```

### Props

- `onIdExtracted`: Callback function được gọi khi ID được trích xuất thành công
- `placeholder`: Text hiển thị trong input field (mặc định: "Dán link Facebook hoặc nhập Facebook ID...")
- `className`: CSS class tùy chỉnh

## API của facebook-utils

### `extractFacebookId(input: string): string | null`

Trích xuất Facebook ID hoặc username từ link Facebook.

### `isValidFacebookId(id: string): boolean`

Kiểm tra xem string có phải là Facebook ID hợp lệ (chỉ chứa số).

### `isFacebookUsername(username: string): boolean`

Kiểm tra xem string có phải là Facebook username hợp lệ.

### `convertToMessengerLink(facebookLink: string): string | null`

Chuyển đổi Facebook link thành Messenger link.

### `getFacebookProfileLink(id: string): string`

Tạo Facebook profile link từ ID hoặc username.

### `parseFacebookLink(input: string)`

Parse Facebook link và trả về thông tin chi tiết:

```typescript
{
    type: 'id' | 'username' | 'invalid'
    id: string | null
    profileLink: string | null
    messengerLink: string | null
}
```

## Ví dụ sử dụng

### Trong component React

```tsx
import FacebookLinkParser from './components/FacebookLinkParser'

function MyComponent() {
    const handleIdExtracted = (facebookId: string) => {
        console.log('Facebook ID:', facebookId)
        // Thực hiện các thao tác với Facebook ID
    }

    return (
        <FacebookLinkParser
            onIdExtracted={handleIdExtracted}
            placeholder="Nhập link Facebook..."
        />
    )
}
```

### Sử dụng utility functions

```typescript
import { extractFacebookId, parseFacebookLink } from '@/lib/facebook-utils'

// Trích xuất ID đơn giản
const id = extractFacebookId('https://www.facebook.com/profile.php?id=123456789')
console.log(id) // "123456789"

// Parse chi tiết
const parsed = parseFacebookLink('https://www.facebook.com/username')
console.log(parsed)
// {
//     type: 'username',
//     id: 'username',
//     profileLink: 'https://www.facebook.com/username',
//     messengerLink: 'https://m.me/username'
// }
```

## Lưu ý

1. **Username vs ID**: Component có thể trích xuất cả username và ID. Username có thể cần được convert sang ID trong một số trường hợp.

2. **Validation**: Component tự động validate input và hiển thị lỗi nếu không thể trích xuất ID.

3. **Performance**: Các function parse được tối ưu để xử lý nhanh các pattern phổ biến.

4. **Accessibility**: Component hỗ trợ keyboard navigation và screen readers.

## Troubleshooting

### Lỗi "Không thể trích xuất Facebook ID"

- Kiểm tra xem link có đúng định dạng không
- Đảm bảo link không bị cắt hoặc thiếu ký tự
- Thử với Facebook ID thuần (chỉ số)

### Link không hoạt động

- Kiểm tra xem profile có public không
- Đảm bảo link không bị Facebook chặn
- Thử với link khác của cùng user

### Component không hiển thị

- Kiểm tra import path
- Đảm bảo component được render trong client-side
- Kiểm tra console để xem lỗi JavaScript
