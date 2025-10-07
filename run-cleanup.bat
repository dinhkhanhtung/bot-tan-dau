@echo off
REM Script để chạy complete cleanup trên Windows
REM Tác giả: Roo (Code Supernova)
REM Ngày: 2025-10-07

echo 🧹 Complete Database Cleanup Script
echo ==================================
echo.

REM Kiểm tra Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js không được tìm thấy!
    echo Vui lòng cài đặt Node.js để chạy script này.
    pause
    exit /b 1
)

REM Kiểm tra file script tồn tại
if not exist "complete-cleanup.js" (
    echo ❌ File complete-cleanup.js không tồn tại!
    echo Vui lòng đảm bảo bạn đang chạy script từ thư mục gốc của dự án.
    pause
    exit /b 1
)

REM Kiểm tra biến môi trường
if "%SUPABASE_URL%"=="" if "%NEXT_PUBLIC_SUPABASE_URL%"=="" (
    echo ⚠️  Cảnh báo: SUPABASE_URL chưa được thiết lập
)

if "%SUPABASE_SERVICE_ROLE_KEY%"=="" (
    echo ⚠️  Cảnh báo: SUPABASE_SERVICE_ROLE_KEY chưa được thiết lập
)

echo 📋 Những gì script sẽ làm:
echo    1. Xóa tất cả bot sessions
echo    2. Reset user interaction states về trạng thái ban đầu
echo    3. Clear tất cả conversations và messages
echo    4. Reset user states về trạng thái ban đầu
echo    5. Clear cache và temporary data
echo    6. Reset admin states nếu cần thiết
echo.
echo ⚠️  CẢNH BÁO: Script này sẽ xóa sạch toàn bộ dữ liệu!
echo Không thể hoàn tác hành động này.
echo.

set /p "choice=Bạn có chắc chắn muốn tiếp tục? (yes/no): "

if /i not "%choice%"=="yes" (
    echo 🛑 Cleanup đã bị hủy bỏ.
    pause
    exit /b 0
)

echo.
echo 🚀 Đang thực hiện complete cleanup...
echo.

REM Chạy script cleanup
node complete-cleanup.js

echo.
echo 🎉 Hoàn thành!

REM Hiển thị hướng dẫn tiếp theo
echo.
echo 📖 Để biết thêm thông tin:
echo    - Xem README-cleanup.md để có hướng dẫn chi tiết
echo    - Kiểm tra logs để đảm bảo mọi thứ hoạt động bình thường
echo.
echo 🔄 Bạn có thể bắt đầu test lại từ đầu ngay bây giờ!
echo.

pause