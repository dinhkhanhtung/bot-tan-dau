export default function Home() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-24">
            <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
                <div className="fixed bottom-0 left-0 flex h-48 w-full items-end justify-center bg-gradient-to-t from-white via-white dark:from-black dark:via-black lg:static lg:h-auto lg:w-auto lg:bg-none">
                    <div className="text-center">
                        <h1 className="text-4xl font-bold text-center mb-8">
                            🤖 BOT TÂN DẬU 1981
                        </h1>
                        <p className="text-lg text-center mb-8">
                            Facebook Messenger Bot kết nối mua bán cho cộng đồng Tân Dậu 1981
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
                            <div className="p-4 border rounded-lg">
                                <h3 className="font-semibold mb-2">🛒 Niêm yết</h3>
                                <p className="text-sm text-gray-600">
                                    Đăng sản phẩm/dịch vụ của bạn
                                </p>
                            </div>
                            <div className="p-4 border rounded-lg">
                                <h3 className="font-semibold mb-2">🔍 Tìm kiếm</h3>
                                <p className="text-sm text-gray-600">
                                    Tìm sản phẩm/dịch vụ phù hợp
                                </p>
                            </div>
                            <div className="p-4 border rounded-lg">
                                <h3 className="font-semibold mb-2">👥 Cộng đồng</h3>
                                <p className="text-sm text-gray-600">
                                    Kết nối với cộng đồng Tân Dậu 1981
                                </p>
                            </div>
                            <div className="p-4 border rounded-lg">
                                <h3 className="font-semibold mb-2">💰 Thanh toán</h3>
                                <p className="text-sm text-gray-600">
                                    Chỉ 1,000đ/ngày, trial 3 ngày miễn phí
                                </p>
                            </div>
                            <div className="p-4 border rounded-lg">
                                <h3 className="font-semibold mb-2">🔮 Tử vi</h3>
                                <p className="text-sm text-gray-600">
                                    Tử vi hàng ngày cho Tân Dậu 1981
                                </p>
                            </div>
                            <div className="p-4 border rounded-lg">
                                <h3 className="font-semibold mb-2">⭐ Điểm thưởng</h3>
                                <p className="text-sm text-gray-600">
                                    Hệ thống điểm và phần thưởng
                                </p>
                            </div>
                        </div>
                        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                            <p className="text-sm text-blue-800">
                                <strong>Lưu ý:</strong> Bot chỉ hoạt động trên Facebook Messenger.
                                Vui lòng tìm kiếm "BOT TÂN DẬU 1981" trên Facebook để bắt đầu sử dụng.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    )
}
