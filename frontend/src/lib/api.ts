// API URL Configuration
// Development: http://localhost:5000/api
// Production: https://spiceexpress.onrender.com/api
// Override with VITE_API_URL env var if needed

const USE_LOCALHOST = false; // Toggle this for local development

const PRODUCTION_URL = 'https://spiceexpress.onrender.com/api';
const LOCAL_URL = 'http://localhost:5000/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || (USE_LOCALHOST ? LOCAL_URL : PRODUCTION_URL);

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
      credentials: 'omit',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log('🏥 Health check response:', response.status, response.statusText);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Backend is healthy:', data);
      return true;
    } else {
      console.warn('⚠️ Backend responded with error:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ API connection test failed:', error);
    if (error instanceof TypeError && error.message.includes('CORS')) {
      console.error('🚫 CORS Error: Backend is not allowing requests from this domain');
    }
    return false;
  }
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Guard to prevent multiple simultaneous redirects
let isRedirecting = false;

// Handle 401 responses by clearing auth and redirecting to login
function handleUnauthorized(response: Response): void {
  if (response.status === 401 && !isRedirecting) {
    isRedirecting = true;
    console.warn('🔐 Unauthorized response detected - clearing auth and redirecting to login');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');

    // Dispatch auth state change event
    window.dispatchEvent(new CustomEvent('authStateChanged'));

    // Redirect to login page (with small delay to ensure single redirect)
    if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
      setTimeout(() => {
        window.location.href = '/login';
      }, 100);
    } else {
      isRedirecting = false;
    }
  }
}

export async function httpGet<T>(path: string): Promise<T> {
  try {
    console.log(`🔄 GET ${API_BASE_URL}${path}`);
    const res = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders()
      },
      mode: 'cors',
      credentials: 'omit'
    });
    console.log(`📊 Response:`, res.status, res.statusText);

    // Handle 401 immediately - redirect to login
    handleUnauthorized(res);

    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Unknown error');
      throw new Error(`GET ${path} failed: ${res.status} ${res.statusText} - ${errorText}`);
    }
    return res.json();
  } catch (error) {
    console.error(`❌ GET ${path} error:`, error);
    if (error instanceof TypeError && error.message.includes('CORS')) {
      console.error('🚫 CORS Error: Check backend CORS configuration for this domain');
    }
    throw error;
  }
}

export async function httpPost<T>(path: string, body: unknown): Promise<T> {
  try {
    console.log(`🔄 POST ${API_BASE_URL}${path}`, body);
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders()
      },
      body: JSON.stringify(body),
      mode: 'cors',
      credentials: 'omit'
    });
    console.log(`📊 Response:`, res.status, res.statusText);

    // Handle 401 immediately - redirect to login
    handleUnauthorized(res);

    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Unknown error');
      throw new Error(`POST ${path} failed: ${res.status} ${res.statusText} - ${errorText}`);
    }
    return res.json();
  } catch (error) {
    console.error(`❌ POST ${path} error:`, error);
    if (error instanceof TypeError && error.message.includes('CORS')) {
      console.error('🚫 CORS Error: Check backend CORS configuration for this domain');
    }
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
    handleUnauthorized(res);
    if (!res.ok) throw new Error(`PUT /lr/${id} failed: ${res.status}`)
    return res.json()
  }),
  delete: (id: string) => fetch(`${API_BASE_URL}/lr/${id}`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  }).then(res => {
    handleUnauthorized(res);
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
  download: (id: string) => `${API_BASE_URL}/invoice/${id}/download`,
  annexure: (id: string) => `${API_BASE_URL}/invoice/${id}/annexure`
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
    handleUnauthorized(res);
    if (!res.ok) throw new Error(`PUT /customers/${id} failed: ${res.status}`)
    return res.json();
  }),
  delete: (id: string) => fetch(`${API_BASE_URL}/customers/${id}`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  }).then(res => {
    handleUnauthorized(res);
    if (!res.ok) throw new Error(`DELETE /customers/${id} failed: ${res.status}`)
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
  getCustomerMIS: (customerId: string) => httpGet<any>(`/mis/summary/${customerId}`),
  downloadExcel: (customerId: string) => `${API_BASE_URL}/mis/export/${customerId}/excel`,
  downloadPdf: (customerId: string) => `${API_BASE_URL}/mis/export/${customerId}/pdf`,
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
    declaredValue?: number;
    expectedDeliveryDate?: string;
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
    declaredValue?: number;
    expectedDeliveryDate?: string;
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
  invoiceNo?: string
  companyCode?: string // 11=SPICE, 12=ASIAN
  customerCode: string
  lrList: LR[]
  date: string
  invoiceDate?: string
  dueDate?: string
  billingOU?: string
  supplierName?: string
  supplierGstin?: string
  billingAddress?: string
  poNumber?: string
  hsn?: string
  freightValue?: number
  cgst?: number
  sgst?: number
  igst?: number
  gstPercent?: number
  amountInWords?: string
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
  companyCode?: string // 11=SPICE, 12=ASIAN
  freightValue?: number
  gstPercent?: number
}

export interface LaneRate {
  from: string;
  to: string;
  rateType: 'perKg' | 'perPackage';
  rate: number;
  ratePerKg?: number; // Legacy support
  ratePerPackage?: number; // Legacy support
}

export interface DefaultCharges {
  docketCharge: number;
  doorDeliveryCharge: number;
  handlingCharge: number;
  pickupCharge: number;
  transhipmentCharge: number;
  insurance: number;
  fuelSurcharge: number;
  commission: number;
  other: number;
  carrierRisk: number;
  ownerRisk: number;
  gstPercent: number;
}

export interface Customer {
  _id: string;
  code: string;
  name?: string; // Same as company, auto-set from company if not provided
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
  defaultCharges?: DefaultCharges;
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
