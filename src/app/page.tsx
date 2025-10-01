export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-yellow-50 flex items-center justify-center">
      <div className="text-center max-w-2xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-6xl mb-4">🐓</h1>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            BOT TÂN DẬU 1981
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Facebook Messenger Bot dành riêng cho cộng đồng sinh năm 1981
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            🤖 Bot đã sẵn sàng!
          </h2>
          <p className="text-gray-600 mb-6">
            Bot đang chạy và sẵn sàng phục vụ cộng đồng Tân Dậu 1981.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">🛒 Marketplace</h3>
              <p className="text-sm text-blue-700">Mua bán sản phẩm</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-900 mb-2">💬 Chat</h3>
              <p className="text-sm text-green-700">Tin nhắn riêng tư</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-semibold text-purple-900 mb-2">👥 Community</h3>
              <p className="text-sm text-purple-700">Cộng đồng tương tác</p>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-900 mb-2">📱 Cách sử dụng:</h3>
            <ol className="text-left text-sm text-yellow-800 space-y-1">
              <li>1. Tìm kiếm "BOT TÂN DẬU 1981" trên Facebook Messenger</li>
              <li>2. Nhấn "Bắt đầu" để kích hoạt bot</li>
              <li>3. Sử dụng menu để khám phá các tính năng</li>
              <li>4. Gõ "help" để xem hướng dẫn chi tiết</li>
            </ol>
          </div>
        </div>

        <div className="text-sm text-gray-500">
          <p>Webhook URL: <code className="bg-gray-100 px-2 py-1 rounded">/api/webhook</code></p>
          <p className="mt-2">Bot được phát triển cho cộng đồng Tân Dậu 1981</p>
        </div>
      </div>
    </div>
  )
}
