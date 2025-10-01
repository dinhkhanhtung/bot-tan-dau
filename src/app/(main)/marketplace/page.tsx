'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Search, 
  Filter, 
  Plus, 
  MapPin, 
  Star,
  Eye,
  Heart,
  MessageCircle
} from 'lucide-react'

interface Listing {
  id: string
  title: string
  price: number
  description: string
  category: string
  location: string
  images: string[]
  user: {
    name: string
    avatar_url?: string
    rating: number
  }
  created_at: string
  view_count: number
  like_count: number
}

export default function MarketplacePage() {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedLocation, setSelectedLocation] = useState('all')

  // Mock data for demo
  useEffect(() => {
    const mockListings: Listing[] = [
      {
        id: '1',
        title: 'Nhà phố 3 tầng tại Quận 7',
        price: 2500000000,
        description: 'Nhà phố 3 tầng, 4PN, 3WC, sân thượng, gần chợ, trường học',
        category: 'Bất động sản',
        location: 'TP. Hồ Chí Minh',
        images: ['/placeholder-house.jpg'],
        user: {
          name: 'Nguyễn Văn A',
          avatar_url: '/placeholder-avatar.jpg',
          rating: 4.8
        },
        created_at: '2025-01-15',
        view_count: 156,
        like_count: 23
      },
      {
        id: '2',
        title: 'Toyota Camry 2020',
        price: 850000000,
        description: 'Xe cũ, chạy 45k km, bảo dưỡng định kỳ, không tai nạn',
        category: 'Ô tô - Xe máy',
        location: 'Hà Nội',
        images: ['/placeholder-car.jpg'],
        user: {
          name: 'Trần Thị B',
          avatar_url: '/placeholder-avatar.jpg',
          rating: 4.9
        },
        created_at: '2025-01-14',
        view_count: 89,
        like_count: 12
      },
      {
        id: '3',
        title: 'iPhone 14 Pro Max 128GB',
        price: 18500000,
        description: 'Máy mới 99%, còn bảo hành Apple, phụ kiện đầy đủ',
        category: 'Điện tử - Công nghệ',
        location: 'Đà Nẵng',
        images: ['/placeholder-phone.jpg'],
        user: {
          name: 'Lê Văn C',
          avatar_url: '/placeholder-avatar.jpg',
          rating: 4.7
        },
        created_at: '2025-01-13',
        view_count: 234,
        like_count: 45
      }
    ]
    
    setTimeout(() => {
      setListings(mockListings)
      setLoading(false)
    }, 1000)
  }, [])

  const categories = [
    'Tất cả',
    'Bất động sản',
    'Ô tô - Xe máy', 
    'Điện tử - Công nghệ',
    'Thời trang - Làm đẹp',
    'Ẩm thực - Đồ uống'
  ]

  const locations = [
    'Tất cả',
    'Hà Nội',
    'TP. Hồ Chí Minh',
    'Đà Nẵng',
    'Hải Phòng',
    'Cần Thơ'
  ]

  const filteredListings = listings.filter(listing => {
    const matchesSearch = listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         listing.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || listing.category === selectedCategory
    const matchesLocation = selectedLocation === 'all' || listing.location === selectedLocation
    
    return matchesSearch && matchesCategory && matchesLocation
  })

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN')
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Tìm kiếm sản phẩm, dịch vụ..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="lg:w-48">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {categories.map(category => (
                  <option key={category} value={category === 'Tất cả' ? 'all' : category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            {/* Location Filter */}
            <div className="lg:w-48">
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {locations.map(location => (
                  <option key={location} value={location === 'Tất cả' ? 'all' : location}>
                    {location}
                  </option>
                ))}
              </select>
            </div>

            <Button className="lg:w-auto">
              <Filter className="w-4 h-4 mr-2" />
              Lọc
            </Button>
          </div>
        </div>

        {/* Results Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Marketplace Tân Dậu
          </h1>
          <p className="text-gray-600">
            {filteredListings.length} kết quả
          </p>
        </div>

        {/* Listings Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-48 bg-gray-200 rounded-t-lg"></div>
                <CardContent className="p-4">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map((listing) => (
              <Card key={listing.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <div className="relative">
                  <div className="h-48 bg-gradient-to-br from-blue-100 to-yellow-100 rounded-t-lg flex items-center justify-center">
                    <div className="text-6xl">🏠</div>
                  </div>
                  <Badge className="absolute top-2 left-2 bg-blue-600">
                    {listing.category}
                  </Badge>
                  <div className="absolute top-2 right-2 flex space-x-1">
                    <Button size="sm" variant="secondary" className="h-8 w-8 p-0">
                      <Heart className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg line-clamp-2">
                      {listing.title}
                    </h3>
                    <div className="text-right">
                      <p className="text-lg font-bold text-blue-600">
                        {formatPrice(listing.price)}
                      </p>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {listing.description}
                  </p>
                  
                  <div className="flex items-center text-sm text-gray-500 mb-3">
                    <MapPin className="w-4 h-4 mr-1" />
                    {listing.location}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium">
                          {listing.user.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{listing.user.name}</p>
                        <div className="flex items-center">
                          <Star className="w-4 h-4 text-yellow-400 fill-current" />
                          <span className="text-sm text-gray-600 ml-1">
                            {listing.user.rating}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline">
                        <MessageCircle className="w-4 h-4 mr-1" />
                        Chat
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-3 pt-3 border-t text-xs text-gray-500">
                    <div className="flex items-center">
                      <Eye className="w-4 h-4 mr-1" />
                      {listing.view_count} lượt xem
                    </div>
                    <div>
                      {formatDate(listing.created_at)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredListings.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Không tìm thấy kết quả
            </h3>
            <p className="text-gray-600 mb-6">
              Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc
            </p>
            <Button onClick={() => {
              setSearchQuery('')
              setSelectedCategory('all')
              setSelectedLocation('all')
            }}>
              Xóa bộ lọc
            </Button>
          </div>
        )}
    </div>
  )
}
