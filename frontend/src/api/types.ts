/**
 * Tipos de los datos que devuelven los microservicios a través del gateway.
 * Reflejan los DTO de respuesta de cada servicio.
 */

// --- Usuarios -----------------------------------------------------------------

export type Affiliation = 'STUDENT' | 'PROFESSOR' | 'STAFF';
export type Role = 'CUSTOMER' | 'ADMIN';

export interface Address {
  id: string;
  label: string;
  street: string;
  city: string;
  department: string;
  additionalInfo: string | null;
  isDefault: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  affiliation: Affiliation;
  role: Role;
  phone: string | null;
  emailVerified: boolean;
  addresses: Address[];
  createdAt: string;
}

export interface LoginResponse {
  accessToken: string;
  expiresIn: number;
  user: User;
}

// --- Catálogo -----------------------------------------------------------------

export interface Category {
  id: string;
  name: string;
  description: string | null;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: Category | null;
  images: string[];
  stock: number;
  available: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type ProductSort = 'newest' | 'price_asc' | 'price_desc' | 'name';

// --- Búsqueda -----------------------------------------------------------------

export interface ProductHit {
  id: string;
  name: string;
  description: string;
  price: number;
  category: { id: string; name: string } | null;
  imageUrl: string | null;
  available: boolean;
}

export interface SearchResult extends Page<ProductHit> {
  terms: string[];
}

export type SearchSort = 'relevance' | 'price_asc' | 'price_desc' | 'newest';

// --- Recomendación ------------------------------------------------------------

export interface RecommendedProduct {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  category: { id: string; name: string } | null;
  reason: string;
}

export interface RecommendationList {
  strategy: 'personalized' | 'popular' | 'related';
  degraded: boolean;
  items: RecommendedProduct[];
}

// --- Pedidos ------------------------------------------------------------------

export interface CartItem {
  productId: string;
  name: string;
  unitPrice: number;
  imageUrl: string | null;
  quantity: number;
  subtotal: number;
}

export interface Cart {
  items: CartItem[];
  totalItems: number;
  estimatedTotal: number;
}

export type OrderStatus = 'PENDING_PAYMENT' | 'PAID' | 'PAYMENT_FAILED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export interface ShippingAddress {
  recipientName: string;
  street: string;
  city: string;
  department: string;
  phone: string;
  additionalInfo?: string | null;
}

export interface Order {
  id: string;
  userId: string;
  status: OrderStatus;
  items: { productId: string; name: string; unitPrice: number; quantity: number; subtotal: number }[];
  total: number;
  shippingAddress: ShippingAddress;
  payment: { cardLast4: string | null; failureReason: string | null };
  history: { status: OrderStatus; at: string }[];
  cancellable: boolean;
  createdAt: string;
}

export interface CardInput {
  number: string;
  holderName: string;
  expMonth: number;
  expYear: number;
  cvv: string;
}

// --- Pagos --------------------------------------------------------------------

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  status: 'APPROVED' | 'REJECTED' | 'REFUNDED';
  cardBrand: string | null;
  cardLast4: string | null;
  reason: string | null;
  createdAt: string;
  refundedAt: string | null;
}
