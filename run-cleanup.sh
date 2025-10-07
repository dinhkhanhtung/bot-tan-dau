#!/bin/bash

# Script để chạy complete cleanup một cách dễ dàng
# Tác giả: Roo (Code Supernova)
# Ngày: 2025-10-07

echo "🧹 Complete Database Cleanup Script"
echo "=================================="
echo ""

# Kiểm tra Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js không được tìm thấy!"
    echo "Vui lòng cài đặt Node.js để chạy script này."
    exit 1
fi

# Kiểm tra file script tồn tại
if [ ! -f "complete-cleanup.js" ]; then
    echo "❌ File complete-cleanup.js không tồn tại!"
    echo "Vui lòng đảm bảo bạn đang chạy script từ thư mục gốc của dự án."
    exit 1
fi

# Kiểm tra biến môi trường
if [ -z "$SUPABASE_URL" ] && [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo "⚠️  Cảnh báo: SUPABASE_URL chưa được thiết lập"
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "⚠️  Cảnh báo: SUPABASE_SERVICE_ROLE_KEY chưa được thiết lập"
fi

echo "📋 Những gì script sẽ làm:"
echo "   1. Xóa tất cả bot sessions"
echo "   2. Reset user interaction states về trạng thái ban đầu"
echo "   3. Clear tất cả conversations và messages"
echo "   4. Reset user states về trạng thái ban đầu"
echo "   5. Clear cache và temporary data"
echo "   6. Reset admin states nếu cần thiết"
echo ""

echo "⚠️  CẢNH BÁO: Script này sẽ xóa sạch toàn bộ dữ liệu!"
echo "Không thể hoàn tác hành động này."
echo ""

read -p "Bạn có chắc chắn muốn tiếp tục? (yes/no): " -n 3 -r
echo ""

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "🛑 Cleanup đã bị hủy bỏ."
    exit 0
fi

echo ""
echo "🚀 Đang thực hiện complete cleanup..."
echo ""

# Chạy script cleanup
node complete-cleanup.js

echo ""
echo "🎉 Hoàn thành!"

# Hiển thị hướng dẫn tiếp theo
echo ""
echo "📖 Để biết thêm thông tin:"
echo "   - Xem README-cleanup.md để có hướng dẫn chi tiết"
echo "   - Kiểm tra logs để đảm bảo mọi thứ hoạt động bình thường"
echo ""

echo "🔄 Bạn có thể bắt đầu test lại từ đầu ngay bây giờ!"