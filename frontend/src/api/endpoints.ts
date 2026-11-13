/**
 * Funciones para llamar a cada microservicio a través del gateway.
 * Agrupadas por servicio; cada una corresponde a una ruta de la API.
 */
import { api, qs } from './http';
import type {
  Address,
  Affiliation,
  CardInput,
  Cart,
  Category,
  LoginResponse,
  Order,
  OrderStatus,
  Page,
  Payment,
  Product,
  ProductSort,
  RecommendationList,
  SearchResult,
  SearchSort,
  ShippingAddress,
  User,
} from './types';

/** Datos editables de una dirección. */
export type AddressInput = Omit<Address, 'id' | 'isDefault'> & { isDefault?: boolean };

/** Datos editables de un producto (admin). */
export interface ProductInput {
  name: string;
  description: string;
  price: number;
  categoryId: string;
  images: string[];
}

// --- Usuarios: /api/auth y /api/users ----------------------------------------------

export const authApi = {
  register: (data: { name: string; email: string; password: string; affiliation: Affiliation }) =>
    api<{ user: User; verificationEmailSent: boolean }>('POST', '/auth/register', data),
  verifyEmail: (email: string, code: string) => api<User>('POST', '/auth/verify-email', { email, code }),
  resendCode: (email: string) => api<void>('POST', '/auth/resend-code', { email }),
  login: (email: string, password: string) => api<LoginResponse>('POST', '/auth/login', { email, password }),
};

export const usersApi = {
  me: () => api<User>('GET', '/users/me'),
  updateMe: (data: { name?: string; phone?: string | null }) => api<User>('PATCH', '/users/me', data),
  addAddress: (data: AddressInput) => api<Address>('POST', '/users/me/addresses', data),
  updateAddress: (id: string, data: Partial<AddressInput>) => api<Address>('PATCH', `/users/me/addresses/${id}`, data),
  removeAddress: (id: string) => api<void>('DELETE', `/users/me/addresses/${id}`),
};

// --- Catálogo: /api/catalog --------------------------------------------------------

export const catalogApi = {
  categories: () => api<Category[]>('GET', '/catalog/categories'),
  products: (params: { categoryId?: string; page?: number; pageSize?: number; sort?: ProductSort; includeInactive?: boolean }) =>
    api<Page<Product>>('GET', `/catalog/products${qs(params)}`),
  product: (id: string) => api<Product>('GET', `/catalog/products/${id}`),

  // Solo administradores
  createCategory: (data: { name: string; description?: string | null }) => api<Category>('POST', '/catalog/categories', data),
  updateCategory: (id: string, data: { name?: string; description?: string | null }) =>
    api<Category>('PATCH', `/catalog/categories/${id}`, data),
  deleteCategory: (id: string) => api<void>('DELETE', `/catalog/categories/${id}`),
  createProduct: (data: ProductInput & { stock: number }) => api<Product>('POST', '/catalog/products', data),
  updateProduct: (id: string, data: Partial<ProductInput> & { active?: boolean }) =>
    api<Product>('PATCH', `/catalog/products/${id}`, data),
  adjustStock: (id: string, delta: number) => api<Product>('POST', `/catalog/products/${id}/stock-adjustments`, { delta }),
};

// --- Búsqueda: /api/search ---------------------------------------------------------

export const searchApi = {
  search: (params: {
    q?: string;
    categoryId?: string;
    minPrice?: number;
    maxPrice?: number;
    available?: boolean;
    sort?: SearchSort;
    page?: number;
    pageSize?: number;
  }) => api<SearchResult>('GET', `/search${qs(params)}`),
  suggestions: (q: string) => api<string[]>('GET', `/search/suggestions${qs({ q })}`),
  recent: () => api<{ text: string; at: string }[]>('GET', '/search/recent'),
  clearRecent: () => api<void>('DELETE', '/search/recent'),
};

// --- Recomendación: /api/recommendations -------------------------------------------

export const recommendationsApi = {
  forMe: (limit = 8) => api<RecommendationList>('GET', `/recommendations/me${qs({ limit })}`),
  popular: (limit = 8) => api<RecommendationList>('GET', `/recommendations/popular${qs({ limit })}`),
  related: (productId: string, limit = 4) =>
    api<RecommendationList>('GET', `/recommendations/products/${productId}/related${qs({ limit })}`),
};

// --- Pedidos: /api/cart, /api/orders y /api/admin/orders -----------------------------

export const cartApi = {
  get: () => api<Cart>('GET', '/cart'),
  add: (productId: string, quantity: number) => api<Cart>('POST', '/cart/items', { productId, quantity }),
  update: (productId: string, quantity: number) => api<Cart>('PATCH', `/cart/items/${productId}`, { quantity }),
  remove: (productId: string) => api<Cart>('DELETE', `/cart/items/${productId}`),
  clear: () => api<Cart>('DELETE', '/cart'),
};

export const ordersApi = {
  place: (shippingAddress: ShippingAddress, card: CardInput) => api<Order>('POST', '/orders', { shippingAddress, card }),
  mine: (page = 1) => api<Page<Order>>('GET', `/orders${qs({ page })}`),
  get: (id: string) => api<Order>('GET', `/orders/${id}`),
  cancel: (id: string) => api<Order>('POST', `/orders/${id}/cancel`),

  // Solo administradores
  all: (params: { status?: OrderStatus; page?: number }) => api<Page<Order>>('GET', `/admin/orders${qs(params)}`),
  setStatus: (id: string, status: 'SHIPPED' | 'DELIVERED') => api<Order>('PATCH', `/admin/orders/${id}/status`, { status }),
};

// --- Pagos: /api/payments ----------------------------------------------------------

export const paymentsApi = {
  forOrder: (orderId: string) => api<Payment>('GET', `/payments/orders/${orderId}`),
};
