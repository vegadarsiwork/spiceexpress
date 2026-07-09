import { useEffect, useState } from 'react'
import { customerApi } from '../lib/api'
import type { Customer, CreateCustomerData } from '../lib/api'
import Card from '../components/Card'
import Input from '../components/Input'
import { motion } from 'framer-motion'

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<CreateCustomerData>({
    code: '',
    company: '',
    address: '',
    state: '',
    city: '',
    pin: '',
    phone: '',
    fax: '',
    email: '',
    hsnCode: '',
    cftRatio: '',
    gst1: '',
    gstin: '',
    pan: '',
    bankName: '',
    accountNo: '',
    micr: '',
    ifsc: ''
  })

  async function loadCustomers() {
    setLoading(true)
    setError(null)
    try {
      const data = await customerApi.getAll()
      setCustomers(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load customers')
      console.error('Customers load error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCustomers()
  }, [])

  async function addCustomer(e: React.FormEvent) {
    e.preventDefault()
  if (!formData.code.trim() || !formData.company.trim()) return

    setSubmitting(true)
    setError(null)
    try {
      await customerApi.create(formData)
  setFormData({ code: '', company: '', address: '', state: '', city: '', pin: '', phone: '', fax: '', email: '', hsnCode: '', cftRatio: '', gst1: '', gstin: '', pan: '', bankName: '', accountNo: '', micr: '', ifsc: '' })
      await loadCustomers()
    } catch (err: any) {
      setError(err.message || 'Failed to create customer')
      console.error('Customer creation error:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleInputChange = (field: keyof CreateCustomerData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="p-8 bg-slate-50 dark:bg-slate-950 min-h-[calc(100dvh-4rem)]"
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600 dark:text-gray-300">Loading customers...</div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="p-8 bg-slate-50 dark:bg-slate-950 min-h-[calc(100dvh-4rem)] relative"
    >
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8">Customers</h1>

      {/* Floating Add Customer Button */}
      <button
        onClick={() => window.location.href = '/admin/add-customer'}
        className="fixed bottom-8 right-8 z-50 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full shadow-lg font-semibold text-lg transition-colors"
      >
        + Add Customer
      </button>

      {/* Add Customer Form */}
      <Card className="mb-8 bg-white dark:bg-slate-900 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Add New Customer</h2>
        <form onSubmit={addCustomer} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Customer Code *</label>
            <Input placeholder="Customer code (unique)" value={formData.code} onChange={e => handleInputChange('code', e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Company *</label>
            <Input placeholder="Company name" value={formData.company} onChange={e => handleInputChange('company', e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Address</label>
            <Input placeholder="Full address" value={formData.address} onChange={e => handleInputChange('address', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">State</label>
            <Input placeholder="State" value={formData.state} onChange={e => handleInputChange('state', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">City</label>
            <Input placeholder="City" value={formData.city} onChange={e => handleInputChange('city', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Pin</label>
            <Input placeholder="Pin" value={formData.pin} onChange={e => handleInputChange('pin', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone</label>
            <Input placeholder="Phone" value={formData.phone} onChange={e => handleInputChange('phone', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Fax</label>
            <Input placeholder="Fax" value={formData.fax} onChange={e => handleInputChange('fax', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
            <Input type="email" placeholder="customer@example.com" value={formData.email} onChange={e => handleInputChange('email', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">HSN Code</label>
            <Input placeholder="HSN Code" value={formData.hsnCode} onChange={e => handleInputChange('hsnCode', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">CFT Ratio</label>
            <Input placeholder="CFT Ratio" value={formData.cftRatio} onChange={e => handleInputChange('cftRatio', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">GST 1</label>
            <Input placeholder="GST 1" value={formData.gst1} onChange={e => handleInputChange('gst1', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">GSTIN</label>
            <Input placeholder="GSTIN" value={formData.gstin} onChange={e => handleInputChange('gstin', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">PAN</label>
            <Input placeholder="PAN" value={formData.pan} onChange={e => handleInputChange('pan', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Bank Name</label>
            <Input placeholder="Bank Name" value={formData.bankName} onChange={e => handleInputChange('bankName', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Account No</label>
            <Input placeholder="Account No" value={formData.accountNo} onChange={e => handleInputChange('accountNo', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">MICR</label>
            <Input placeholder="MICR" value={formData.micr} onChange={e => handleInputChange('micr', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">IFSC</label>
            <Input placeholder="IFSC" value={formData.ifsc} onChange={e => handleInputChange('ifsc', e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={!formData.company.trim() || submitting}
              className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {submitting ? 'Adding...' : 'Add Customer'}
            </button>
          </div>
        </form>
        
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 dark:bg-red-950 dark:border-red-900">
            <div className="text-red-800 text-sm dark:text-red-300">{error}</div>
          </div>
        )}
      </Card>

      {/* Customers List */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Customer List</h2>
        {customers.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="text-gray-500 text-lg dark:text-gray-400">No customers found</div>
            <div className="text-gray-400 text-sm mt-2">Add your first customer above</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customers.map((customer) => (
              <Card key={customer._id} className="bg-white dark:bg-slate-900 dark:border-gray-700">
                <div className="space-y-2">
                  <div className="font-medium text-gray-900 dark:text-gray-100">{customer.company}</div>
                  {customer.email && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">{customer.email}</div>
                  )}
                  {customer.phone && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">{customer.phone}</div>
                  )}
                  {customer.address && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">{customer.address}</div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}


