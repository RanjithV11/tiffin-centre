const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TopItem {
  id: string
  name_telugu: string
  name_english: string
  count: number
  revenue: number
}

export interface RetentionData {
  new_customers: number
  returning_customers: number
  at_risk_customers: number
}

export interface FeedbackEntry {
  id: string
  customer_name: string
  customer_phone: string
  rating: number
  comment: string
  created_at: string
  sentiment: 'positive' | 'neutral' | 'negative'
}

export interface RevenueData {
  date: string
  revenue: number
  orders: number
}

export interface MenuItem {
  id: string
  name_telugu: string
  name_english: string
  price: number
  category: string
  available: boolean
  is_available?: boolean
  description?: string
}

export interface Customer {
  id: string
  name: string
  phone: string
  phone_number?: string
  loyalty_points: number
  last_visit: string
  days_since_visit: number
  total_visits: number
  at_risk: boolean
}

export interface Order {
  id: string
  customer_id?: string
  customer_name?: string
  items: Array<{ menu_item_id: string; quantity: number; price: number }>
  total: number
  status?: 'pending' | 'preparing' | 'ready' | 'delivered'
  created_at: string
  table_number?: number
}

export interface NewOrder {
  customer_name?: string
  customer_phone?: string
  items: Array<{ menu_item_id: string; quantity: number }>
  table_number?: number
}

export interface NewMenuItem {
  name_telugu: string
  name_english: string
  price: number
  category: string
  description?: string
}

export interface DashboardStats {
  today_revenue: number
  total_customers: number
  avg_rating: number
  at_risk_count: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API error ${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export async function fetchTopItems(days = 30): Promise<TopItem[]> {
  const raw = await request<any[]>(`/api/analytics/top-items?days=${days}`)
  return (raw || []).map((item) => ({
    id: item.id || String(Math.random()),
    name_telugu: item.name_telugu || item.item_name_telugu || '',
    name_english: item.name_english || item.item_name || 'Item',
    count: Number(item.count || 0),
    revenue: Number(item.revenue || 0),
  }))
}

export async function fetchRetention(): Promise<RetentionData> {
  const raw = await request<any>('/api/analytics/retention')
  return {
    new_customers: Number(raw.new_customers ?? raw.new_customers_this_week ?? 0),
    returning_customers: Number(raw.returning_customers ?? 0),
    at_risk_customers: Number(raw.at_risk_customers ?? raw.at_risk_count ?? 0),
  }
}

export async function fetchFeedback(): Promise<FeedbackEntry[]> {
  const raw = await request<any>('/api/analytics/feedback')
  const list = Array.isArray(raw) ? raw : (raw.recent_comments || [])
  return list.map((item: any) => ({
    id: String(item.id || Math.random()),
    customer_name: item.customer_name || 'గ్రాహకుడు',
    customer_phone: item.customer_phone || item.phone || '',
    rating: Number(item.rating || 5),
    comment: item.comment || item.comment_original || '',
    created_at: item.created_at || new Date().toISOString(),
    sentiment: item.sentiment || (item.rating >= 4 ? 'positive' : item.rating <= 2 ? 'negative' : 'neutral'),
  }))
}

export async function fetchRevenue(days = 30): Promise<RevenueData[]> {
  const raw = await request<any>(`/api/analytics/revenue?days=${days}`)
  if (Array.isArray(raw)) return raw
  return [
    {
      date: new Date().toISOString().split('T')[0],
      revenue: Number(raw.today_revenue || 0),
      orders: 1,
    },
  ]
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const raw = await request<any>('/api/analytics/stats')
  return {
    today_revenue: Number(raw.today_revenue || 0),
    total_customers: Number(raw.total_customers || 0),
    avg_rating: Number(raw.avg_rating || 0),
    at_risk_count: Number(raw.at_risk_count || 0),
  }
}

// ─── Menu ─────────────────────────────────────────────────────────────────────

export async function fetchMenu(): Promise<MenuItem[]> {
  const raw = await request<any[]>('/api/menu')
  return (raw || []).map((item) => ({
    id: String(item.id),
    name_telugu: item.name_telugu,
    name_english: item.name_english,
    price: Number(item.price),
    category: item.category,
    available: Boolean(item.available ?? item.is_available ?? true),
    is_available: Boolean(item.available ?? item.is_available ?? true),
    description: item.description || '',
  }))
}

export async function addMenuItem(item: NewMenuItem): Promise<MenuItem> {
  return request<MenuItem>('/api/menu', {
    method: 'POST',
    body: JSON.stringify(item),
  })
}

export async function toggleMenuItemAvailability(
  id: string,
  available: boolean,
): Promise<MenuItem> {
  return request<MenuItem>(`/api/menu/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ available }),
  })
}

export async function updateMenuItem(
  id: string,
  item: Partial<NewMenuItem> & { available?: boolean },
): Promise<MenuItem> {
  return request<MenuItem>(`/api/menu/${id}`, {
    method: 'PUT',
    body: JSON.stringify(item),
  })
}

export async function deleteMenuItem(id: string): Promise<void> {
  await request<unknown>(`/api/menu/${id}`, { method: 'DELETE' })
}

export async function seedMenu(): Promise<{ message: string }> {
  return request<{ message: string }>('/api/seed-menu', { method: 'POST' })
}

// ─── Customers ───────────────────────────────────────────────────────────────

export async function fetchCustomers(): Promise<Customer[]> {
  const raw = await request<any[]>('/api/customers')
  return (raw || []).map((c) => ({
    id: String(c.id),
    name: c.name || 'గ్రాహకుడు',
    phone: c.phone || c.phone_number || '',
    loyalty_points: Number(c.loyalty_points || 0),
    last_visit: c.last_visit || '',
    days_since_visit: Number(c.days_since_visit || 0),
    total_visits: Number(c.total_visits || 1),
    at_risk: Boolean(c.at_risk),
  }))
}

export async function sendReminder(customerId: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/api/customers/${customerId}/send-reminder`, {
    method: 'POST',
  })
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export async function fetchOrders(date?: string): Promise<Order[]> {
  const qs = date ? `?date=${date}` : ''
  return request<Order[]>(`/api/orders${qs}`)
}

export async function createOrder(order: NewOrder): Promise<Order> {
  return request<Order>('/api/orders', {
    method: 'POST',
    body: JSON.stringify(order),
  })
}

// ─── QR Code ─────────────────────────────────────────────────────────────────

export async function getQRCode(tableNumber: number): Promise<string> {
  const res = await fetch(`${API_URL}/api/qr/${tableNumber}`)
  if (!res.ok) throw new Error(`QR API error ${res.status}`)
  const blob = await res.blob()
  return URL.createObjectURL(blob)
}

export interface QRPreviewResponse {
  table_number: number
  data_url: string
  whatsapp_url: string
  telugu_message: string
}

export async function getQRPreview(tableNumber: number): Promise<QRPreviewResponse> {
  return request<QRPreviewResponse>(`/api/qr/${tableNumber}/preview`)
}

// ─── WhatsApp Bot Simulator ──────────────────────────────────────────────────

export interface BotReply {
  phone: string
  message: string
  reply: string
}

export async function sendTestBotMessage(message: string, phone = '+919848012345'): Promise<BotReply> {
  return request<BotReply>('/api/test-bot', {
    method: 'POST',
    body: JSON.stringify({ message, phone }),
  })
}
