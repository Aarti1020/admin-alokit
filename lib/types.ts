export interface AdminUser {
  id?: string;
  _id?: string;
  fullName: string;
  email: string;
  phone?: string;
  role: "user" | "admin" | "superAdmin";
  isActive: boolean;
  avatar?: {
    public_id?: string;
    url?: string;
  };
  lastLoginAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  isActive?: boolean;
}

export interface SubCategory {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  isActive?: boolean;
  category: string | Category;
}

export interface ProductImage {
  publicId: string;
  public_id?: string;
  url: string;
  alt: string;
  isPrimary: boolean;
  variants?: {
    original: string;
    thumbnail: string;
    productCard: string;
    productDetail: string;
  };
}

export interface ProductVideo {
  publicId: string;
  url: string;
  mimeType?: string;
  size?: number;
}

export interface Product {
  _id: string;
  title: string;
  name: string;
  slug: string;
  sku?: string;
  category: string | Category;
  subCategory: string | SubCategory;
  productType: "gemstone" | "rudraksha" | "bracelet" | "jewellery" | "crystal";
  status: "draft" | "published" | "active" | "inactive";
  basePrice: number;
  salePrice: number;
  stock: number;
  lowStockThreshold?: number;
  shortDescription?: string;
  description?: string;
  isFeatured: boolean;
  showOnHomepage: boolean;
  isDeleted?: boolean;
  images: ProductImage[];
  featuredImage?: string | null;
  galleryImages?: string[];
  thumbnail?: string | null;
  primaryImage?: string | null;
  primaryImageData?: ProductImage | null;
  productVideo?: ProductVideo | null;
  tags?: string[];
  collections?: string[];
  specifications?: Record<string, unknown>;
  seo?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
  effectivePrice?: number;
  isLowStock?: boolean;
}

export interface OrderItem {
  _id: string;
  product?: Product;
  productName: string;
  sku?: string;
  quantity: number;
  lineTotal: number;
  finalPrice: number;
}

export interface Order {
  _id: string;
  orderNumber: string;
  user: AdminUser | string;
  items: OrderItem[];
  pricing: {
    subtotal: number;
    discount: number;
    shippingCharge: number;
    tax: number;
    total: number;
  };
  shippingAddress: {
    fullName: string;
    email: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  billingAddress: {
    fullName: string;
    email: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  orderStatus:
    | "created"
    | "pending"
    | "confirmed"
    | "packed"
    | "processing"
    | "shipped"
    | "delivered"
    | "cancelled";
  paymentStatus: "pending" | "paid" | "failed" | "refunded" | "partially_refunded";
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  _id: string;
  product?: Product | string;
  name: string;
  email?: string;
  rating: number;
  title?: string;
  comment: string;
  status: "pending" | "approved" | "rejected" | "hidden" | "spam";
  isFeatured: boolean;
  rejectionReason?: string;
  createdAt: string;
}

export interface Lead {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  message: string;
  formType: string;
  source?: string;
  consultationDetails?: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string | null;
    gender?: "Male" | "Female" | "";
    language?: "Hindi" | "English" | "";
    cityOfBirth?: string;
    pinCode?: string;
    state?: string;
    country?: string;
    selectedPackage?: string;
    amount?: number;
    wantsKundaliReport?: boolean;
  };
  status: "new" | "contacted" | "qualified" | "converted" | "closed" | "spam";
  notes?: Array<{ note: string; createdAt?: string }>;
  createdAt: string;
}

export interface DashboardAnalytics {
  overview: {
    totalUsers: number;
    totalProducts: number;
    totalOrders: number;
    revenue: number;
    lowStockProductsCount: number;
  };
  recentOrders: Array<{
    _id: string;
    orderNumber: string;
    pricing: { total: number };
    orderStatus: string;
    paymentStatus: string;
    createdAt: string;
    user?: Pick<AdminUser, "fullName" | "email">;
  }>;
  lowStockProducts: Product[];
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  total?: number;
  results?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message?: string;
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  data: {
    user: AdminUser;
    token: string;
  };
}
