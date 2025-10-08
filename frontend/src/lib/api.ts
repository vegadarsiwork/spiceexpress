// Get API URL with fallback options
const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.PROD 
    ? 'https://spiceexpress-backend.onrender.com/api'
    : 'http://localhost:5000/api');

// Debug logging (temporary)
console.log('🚀 API Configuration:');
console.log('- VITE_API_URL:', import.meta.env.VITE_API_URL);
console.log('- PROD mode:', import.meta.env.PROD);
console.log('- MODE:', import.meta.env.MODE);
console.log('- Final API_BASE_URL:', API_BASE_URL);
console.log('- Current URL:', window.location.href);

export { API_BASE_URL };

// Test API connectivity
export async function testAPIConnection(): Promise<boolean> {
  try {
    console.log('🔍 Testing API connection to:', API_BASE_URL.replace('/api', '/health'));
    const response = await fetch(API_BASE_URL.replace('/api', '/health'), {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit'
    });
    console.log('🏥 Health check response:', response.status, response.statusText);
    return response.ok;
  } catch (error) {
    console.error('❌ API connection test failed:', error);
    return false;
  }
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function httpGet<T>(path: string): Promise<T> {
  try {
    console.log(`🔄 GET ${API_BASE_URL}${path}`);
    const res = await fetch(`${API_BASE_URL}${path}`, { 
      headers: { ...authHeaders() },
      mode: 'cors',
      credentials: 'omit'
    });
    console.log(`📊 Response:`, res.status, res.statusText);
    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Unknown error');
      throw new Error(`GET ${path} failed: ${res.status} ${res.statusText} - ${errorText}`);
    }
    return res.json();
  } catch (error) {
    console.error(`❌ GET ${path} error:`, error);
    throw error;
  }
}

export async function httpPost<T>(path: string, body: unknown): Promise<T> {
  try {
    console.log(`🔄 POST ${API_BASE_URL}${path}`, body);
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(body),
      mode: 'cors',
      credentials: 'omit'
    });
    console.log(`📊 Response:`, res.status, res.statusText);
    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Unknown error');
      throw new Error(`POST ${path} failed: ${res.status} ${res.statusText} - ${errorText}`);
    }
    return res.json();
  } catch (error) {
    console.error(`❌ POST ${path} error:`, error);
    throw error;
  }
}

// LR API functions
export const lrApi = {
  getAll: () => httpGet<LR[]>('/lr'),
  getById: (id: string) => httpGet<LR>(`/lr/${id}`),
  getCount: () => httpGet<{ count: number }>('/lr/count'),
  create: (data: CreateLRData) => httpPost<LR>('/lr', data),
  update: (id: string, data: Partial<LR>) => fetch(`${API_BASE_URL}/lr/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  }).then(res => {
    if (!res.ok) throw new Error(`PUT /lr/${id} failed: ${res.status}`)
    return res.json()
  }),
  delete: (id: string) => fetch(`${API_BASE_URL}/lr/${id}`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  }).then(res => {
    if (!res.ok) throw new Error(`DELETE /lr/${id} failed: ${res.status}`)
    return res.json()
  }),
  download: (id: string) => `${API_BASE_URL}/lr/${id}/download`
}

// Invoice API functions
export const invoiceApi = {
  getUnpaid: () => httpGet<Invoice[]>('/invoice/unpaid'),
  getAll: () => httpGet<Invoice[]>('/invoice'),
  getById: (id: string) => httpGet<Invoice>(`/invoice/${id}`),
  create: (data: CreateInvoiceData) => httpPost<Invoice>('/invoice', data),
  download: (id: string) => `${API_BASE_URL}/invoice/${id}/download`
}

// Customer API functions
export const customerApi = {
  getAll: () => httpGet<Customer[]>('/customers'),
  create: (data: CreateCustomerData) => httpPost<Customer>('/customers', data),
  // getSummary: (id: string) => httpGet<any>(`/customers/${id}/summary`),
  getById: (id: string) => httpGet<Customer>(`/customers/${id}`),
  update: (id: string, data: Partial<Customer>) => fetch(`${API_BASE_URL}/customers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  }).then(res => {
    if (!res.ok) throw new Error(`PUT /customers/${id} failed: ${res.status}`)
    return res.json();
  })
}

// Analytics API functions
export const analyticsApi = {
  getBusinessComparison: (params: any) => {
    const searchParams = new URLSearchParams(params)
    return httpGet<any>(`/v1/analytics/comparison?${searchParams}`)
  }
}

// MIS API functions
export const misApi = {   
  getCustomerMIS: (customerId: string) => httpGet<any>(`/mis/summary/${customerId}`)
}

// Types
export interface LR {
  _id: string;
  lrNumber: string;
  bookingDate?: string;
  status: 'Booked' | 'In Transit' | 'Out for Delivery' | 'Delivered' | 'Cancelled';
  customer: string;
  consignor: {
    name: string;
    address?: string;
    city?: string;
    state?: string;
    pin?: string;
    phone?: string;
    email?: string;
    gstin?: string;
  };
  consignee: {
    name: string;
    address?: string;
    city?: string;
    state?: string;
    pin?: string;
    phone?: string;
    email?: string;
    gstin?: string;
  };
  shipmentDetails?: {
    numberOfArticles?: number;
    actualWeight?: number;
    chargedWeight?: number;
    descriptionOfGoods?: string;
  };
  charges?: {
    paymentType?: string;
    freight?: number;
    docketCharge?: number;
    doorDeliveryCharge?: number;
    handlingCharge?: number;
    pickupCharge?: number;
    transhipmentCharge?: number;
    insurance?: number;
    fuelSurcharge?: number;
    commission?: number;
    other?: number;
    carrierRisk?: number;
    ownerRisk?: number;
    gstCharge?: number;
    total?: number;
    subTotal?: number;
    grandTotal?: number;
  };
  amount?: number;
  [key: string]: any;
}

export interface CreateLRData {
  lrNumber?: string;
  bookingDate?: string;
  status: string;
  customer: string; // ObjectId
  dispatchBranch?: string;
  vehicleNumber?: string;
  driverName?: string;
  consignor: {
    name: string;
    address?: string;
    city?: string;
    pin?: string;
    phone?: string;
    email?: string;
    gstin?: string;
  };
  consignee: {
    name: string;
    address?: string;
    city?: string;
    pin?: string;
    phone?: string;
    email?: string;
    gstin?: string;
  };
  shipmentDetails: {
    numberOfArticles?: number;
    actualWeight?: number;
    chargedWeight?: number;
    descriptionOfGoods?: string;
  };
  charges: {
    paymentType?: string;
    freight?: number;
    docketCharge?: number;
    doorDeliveryCharge?: number;
    handlingCharge?: number;
    pickupCharge?: number;
    transhipmentCharge?: number;
    insurance?: number;
    fuelSurcharge?: number;
    commission?: number;
    other?: number;
    carrierRisk?: number;
    ownerRisk?: number;
    gstCharge?: number;
    total?: number;
  };
  ewayBillNumber?: string;
  customerInvoice?: {
    number?: string;
    date?: string;
    value?: number;
  };
  podDocumentUrl?: string;
}

export interface Invoice {
  _id: string
  invoiceNumber: string
  customerCode: string
  lrList: LR[]
  date: string
  totalAmount: number
  status: 'paid' | 'unpaid'
  createdAt: string
  updatedAt: string
}

export interface CreateInvoiceData {
  customerCode: string
  lrList: string[]
  invoiceNo?: string
  invoiceDate?: string
  freightValue?: number
  gstPercent?: number
}

export interface LaneRate {
  from: string;
  to: string;
  ratePerKg: number;
}

export interface Customer {
  _id: string;
  code: string;
  company: string;
  address?: string;
  state?: string;
  city?: string;
  pin?: string;
  phone?: string;
  fax?: string;
  email?: string;
  hsnCode?: string;
  cftRatio?: string;
  gst1?: string;
  gstin?: string;
  pan?: string;
  bankName?: string;
  accountNo?: string;
  micr?: string;
  ifsc?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
  rate?: {
    [laneKey: string]: LaneRate;
  };
}

export interface CreateCustomerData {
  code: string;
  company: string;
  address?: string;
  state?: string;
  city?: string;
  pin?: string;
  phone?: string;
  fax?: string;
  email?: string;
  hsnCode?: string;
  cftRatio?: string;
  gst1?: string;
  gstin?: string;
  pan?: string;
  bankName?: string;
  accountNo?: string;
  micr?: string;
  ifsc?: string;
  rate?: {
    [laneKey: string]: LaneRate;
  };
}

// Analytics comparison data types
export interface ComparisonPeriod {
  lrCount: number;
  revenue: number;
}

export interface ComparisonData {
  periodA: ComparisonPeriod | null;
  periodB: ComparisonPeriod | null;
}
