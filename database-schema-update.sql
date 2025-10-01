-- Add product_service column to users table
ALTER TABLE users ADD COLUMN product_service TEXT;

-- Add comment
COMMENT ON COLUMN users.product_service IS 'Sản phẩm/dịch vụ mà user muốn chia sẻ với cộng đồng';