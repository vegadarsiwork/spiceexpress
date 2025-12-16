import { invoiceApi, customerApi, lrApi } from '../lib/api'
import type { Invoice, CreateInvoiceData } from '../lib/api'
import { useEffect, useState } from 'react'
import { Input } from '../components/ui/input'
import { Card as ShadCard } from '../components/ui/card'
import { Button as ShadButton } from '../components/ui/button'
import { Label as ShadLabel } from '../components/ui/label'
import { motion } from 'framer-motion'

export default function Invoices() {
  const [invoiceSearch, setInvoiceSearch] = useState('');
  // Helper to get customer name/code from code
  function getCustomerDisplay(code: string) {
    const c = customers.find(cust => cust.code === code);
    return c ? `${c.company} (${c.code})` : code;
  }
  async function downloadInvoice(id: string) {
    const token = localStorage.getItem('auth_token');
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    console.log('Download Invoice Debug:', { token, headers, url: invoiceApi.download(id) });
    const res = await fetch(invoiceApi.download(id), { headers, credentials: 'omit' });
    if (!res.ok) {
      let errText = '';
      try { errText = await res.text(); } catch { }
      console.error('Invoice download error:', res.status, errText);
      alert(`Failed to download invoice. Status: ${res.status}\n${errText}`);
      return;
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${id}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }
  async function downloadAnnexure(id: string) {
    const token = localStorage.getItem('auth_token');
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await fetch(invoiceApi.annexure(id), { headers, credentials: 'omit' });
    if (!res.ok) {
      let errText = '';
      try { errText = await res.text(); } catch { }
      alert(`Failed to download annexure. Status: ${res.status}\n${errText}`);
      return;
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-annexure-${id}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<CreateInvoiceData>({
    customerCode: '',
    lrList: [],
    invoiceNo: '',
    invoiceDate: new Date().toISOString().slice(0, 10),
    companyCode: '11', // Default to SPICE EXPRESS
    gstPercent: 0
  })
  const [customers, setCustomers] = useState<any[]>([])
  const [availableLrs, setAvailableLrs] = useState<any[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')
  const [codeInput, setCodeInput] = useState<string>('')
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const filteredCustomers = customerSearch
    ? customers.filter(c =>
      c.company?.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.code?.toLowerCase().includes(customerSearch.toLowerCase())
    )
    : customers;
  const user = (() => {
    try {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    } catch { return null; }
  })();

  async function loadInvoices() {
    setLoading(true)
    setError(null)
    try {
      const data = await invoiceApi.getAll()
      setInvoices(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load invoices')
      console.error('Invoices load error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function loadAvailableLrs() {
    try {
      const lrs = await lrApi.getAll()
      setAvailableLrs(lrs || [])
    } catch (err) {
      // ignore
    }
  }

  async function loadCustomers() {
    try {
      const data = await customerApi.getAll()
      setCustomers(data || [])
    } catch (err) {
      // ignore
    }
  }

  useEffect(() => {
    loadInvoices()
    loadAvailableLrs()
    loadCustomers()
  }, [])

  async function createInvoice(e: React.FormEvent) {
    e.preventDefault();
    if (!user || user.role !== 'admin') return;
    if (!selectedCustomerId) return;
    if (formData.lrList.length === 0) return;

    setSubmitting(true);
    setError(null);
    try {
      // compute totals server-side, but provide freight and gst for convenience
      // compute basic freight from selected LRs
      const selectedCustomer = customers.find(c => c._id === selectedCustomerId)
      const selectedLrs = availableLrs.filter(lr => formData.lrList.includes(lr._id))
      const basicFreight = selectedLrs.reduce((s: any, lr: any) => s + (Number(lr.amount || 0)), 0)
      const payload = {
        invoiceNo: formData.invoiceNo,
        invoiceDate: formData.invoiceDate,
        customerCode: selectedCustomer?.code || formData.customerCode,
        lrList: formData.lrList,
        freightValue: basicFreight,
        gstPercent: Number(formData.gstPercent || 0)
      }
      await invoiceApi.create(payload);
      setFormData({ customerCode: '', lrList: [] });
      setFormData({ customerCode: '', lrList: [], invoiceNo: '', invoiceDate: new Date().toISOString().slice(0, 10), freightValue: 0, gstPercent: 0 })
      await loadInvoices();
    } catch (err: any) {
      setError(err.message || 'Failed to create invoice');
      console.error('Invoice creation error:', err);
    } finally {
      setSubmitting(false);
    }
  }

  const handleInputChange = (field: keyof CreateInvoiceData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Remove duplicate filteredCustomers, use the one defined at the top for search-as-you-type

  // Filter LRs by customer ObjectId for robust linkage
  const lrsForSelectedCustomer = selectedCustomerId
    ? availableLrs
      .filter(lr => String(lr.customer) === String(selectedCustomerId))
      .sort((a, b) => {
        const dateA = new Date(a.date || a.bookingDate || 0).getTime();
        const dateB = new Date(b.date || b.bookingDate || 0).getTime();
        return dateB - dateA;
      })
    : []

  const selectedLrObjects = availableLrs.filter(lr => formData.lrList.includes(lr._id))
  const computedBasicFreight = selectedLrObjects.reduce((s: any, lr: any) => s + (lr.charges?.freight || 0), 0)
  const computedTotal = selectedLrObjects.reduce((s: any, lr: any) => s + (lr.charges?.total || 0), 0)

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="p-4 sm:p-8 bg-gray-50 dark:bg-gray-900 min-h-full font-publicsans"
      >
        <div className="text-lg text-gray-600 dark:text-gray-300">Loading invoices...</div>
      </motion.div>
    )
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="p-4 sm:p-8 bg-gray-50 dark:bg-gray-900 min-h-full font-publicsans"
    >
      {/* Create Invoice Form (admin only) */}
      {user && user.role === 'admin' && (
        <ShadCard className="mb-8 bg-white dark:bg-gray-800 dark:border-gray-700">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Create New Invoice</h2>
            <form onSubmit={createInvoice} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <ShadLabel className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Code (e.g. 11 or 12)</ShadLabel>
                <Input placeholder="11" value={codeInput} onChange={(e) => { setCodeInput(e.target.value); }} />
              </div>
              <div className="relative">
                <ShadLabel className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Customer</ShadLabel>
                <Input
                  type="text"
                  placeholder="Search customer by name or code"
                  value={customerSearch}
                  onChange={e => {
                    setCustomerSearch(e.target.value);
                    setShowCustomerDropdown(true);
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 150)}
                  className="w-full border rounded px-2 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
                {showCustomerDropdown && filteredCustomers.length > 0 && (
                  <div className="absolute z-10 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded shadow max-h-60 overflow-y-auto">
                    {filteredCustomers.map(c => (
                      <div
                        key={c._id}
                        className="px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                        onMouseDown={() => {
                          setSelectedCustomerId(c._id);
                          setCustomerSearch(c.company + ' (' + c.code + ')');
                          handleInputChange('customerCode', c.code || '');
                          setShowCustomerDropdown(false);
                        }}
                      >
                        {c.company} ({c.code})
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <ShadLabel className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Invoice No</ShadLabel>
                <Input placeholder="Leave blank for auto generate" value={formData.invoiceNo} onChange={(e) => handleInputChange('invoiceNo', e.target.value)} />
              </div>
              <div>
                <ShadLabel className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Invoice Date</ShadLabel>
                <Input type="date" value={formData.invoiceDate} onChange={(e) => handleInputChange('invoiceDate', e.target.value)} />
              </div>
              <div>
                <ShadLabel className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Company</ShadLabel>
                <select
                  value={formData.companyCode || '11'}
                  onChange={(e) => handleInputChange('companyCode', e.target.value)}
                  className="w-full border rounded px-2 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700"
                >
                  <option value="11">SPICE EXPRESS</option>
                  <option value="12">ASIAN TRADES LINK</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <ShadLabel className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Shipment Info</ShadLabel>
                <div className="border rounded bg-white dark:bg-gray-900">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
                        <th className="px-3 py-2"><input type="checkbox" onChange={(e) => {
                          if (!e.target.checked) handleInputChange('lrList', [])
                          else {
                            const ids = lrsForSelectedCustomer.map(l => l._id)
                            handleInputChange('lrList', ids)
                          }
                        }} checked={lrsForSelectedCustomer.length > 0 && lrsForSelectedCustomer.every(l => formData.lrList.includes(l._id))} /></th>
                        <th className="px-3 py-2">AWB No</th>
                        <th className="px-3 py-2">Date Time</th>
                        <th className="px-3 py-2">Mode Of Transport</th>
                        <th className="px-3 py-2">From City</th>
                        <th className="px-3 py-2">To City</th>
                        <th className="px-3 py-2">Packages</th>
                        <th className="px-3 py-2">Rate</th>
                        <th className="px-3 py-2">Charged Wt.</th>
                        <th className="px-3 py-2">Basic Freight</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lrsForSelectedCustomer.length === 0 ? (
                        <tr><td colSpan={10} className="p-4 text-sm text-gray-500">No LRs for selected customer</td></tr>
                      ) : lrsForSelectedCustomer.map(lr => (
                        <tr key={lr._id} className="border-t">
                          <td className="px-3 py-2"><input type="checkbox" checked={formData.lrList.includes(lr._id)} onChange={(e) => {
                            const next = e.target.checked ? [...formData.lrList, lr._id] : formData.lrList.filter(x => x !== lr._id)
                            handleInputChange('lrList', next)
                          }} /></td>
                          <td className="px-3 py-2">{lr.lrNumber}</td>
                          <td className="px-3 py-2">{new Date(lr.bookingDate || lr.date).toLocaleString()}</td>
                          <td className="px-3 py-2">{lr.charges?.paymentType || '-'}</td>
                          <td className="px-3 py-2">{lr.consignor?.city || '-'}</td>
                          <td className="px-3 py-2">{lr.consignee?.city || '-'}</td>
                          <td className="px-3 py-2">{lr.shipmentDetails?.numberOfArticles ?? '-'}</td>
                          <td className="px-3 py-2">{lr.charges?.freight ?? 0}</td>
                          <td className="px-3 py-2">{lr.shipmentDetails?.chargedWeight ?? '-'}</td>
                          <td className="px-3 py-2">{lr.charges?.total?.toFixed(2) ?? '0.00'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div>
                <ShadLabel className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Basic Freight</ShadLabel>
                <Input type="number" value={computedBasicFreight} readOnly />
              </div>
              <div>
                <ShadLabel className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">GST(%)</ShadLabel>
                <Input type="number" value={formData.gstPercent} onChange={(e) => handleInputChange('gstPercent', Number(e.target.value))} />
              </div>
              <div className="md:col-span-2">
                <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded">
                  <div className="text-sm text-gray-700 dark:text-gray-300">Total Amount</div>
                  <div className="text-xl font-semibold">₹{computedTotal.toLocaleString()}</div>
                </div>
              </div>
              <div className="md:col-span-2">
                <ShadButton
                  type="submit"
                  disabled={!formData.customerCode.trim() || submitting}
                  className="w-full bg-blue-500 text-white hover:bg-blue-600 font-medium"
                >
                  {submitting ? 'Creating...' : 'Create Invoice'}
                </ShadButton>
              </div>
            </form>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 dark:bg-red-950 dark:border-red-900">
              <span className="text-red-700 dark:text-red-300">{error}</span>
            </div>
          )}
        </ShadCard>
      )}

      {/* Invoices List */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">All Invoices</h2>
        <div className="mb-4">
          <input
            type="text"
            value={invoiceSearch}
            onChange={e => setInvoiceSearch(e.target.value)}
            placeholder="Search invoices by customer, code, invoice #, or date"
            className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
        </div>
        {error && (
          <div className="text-red-800 font-medium dark:text-red-300 mb-4">{error}</div>
        )}
        {invoices.length === 0 ? (
          <div className="text-gray-500 text-sm dark:text-gray-400">No unpaid invoices found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm">
                  <th className="px-4 py-2 text-left">Invoice #</th>
                  <th className="px-4 py-2 text-left">Customer</th>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Total Amount</th>
                  <th className="px-4 py-2 text-left">LRs</th>
                  <th className="px-4 py-2 text-left">Details</th>
                  <th className="px-4 py-2 text-left">Download</th>
                </tr>
              </thead>
              <tbody>
                {invoices
                  .filter(inv => {
                    const c = customers.find(cust => cust.code === inv.customerCode);
                    const customerDisplay = c ? `${c.company} (${c.code})` : (inv.customerCode || '');
                    const search = invoiceSearch.toLowerCase();
                    return (
                      (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(search)) ||
                      customerDisplay.toLowerCase().includes(search) ||
                      (inv.customerCode && inv.customerCode.toLowerCase().includes(search)) ||
                      (inv.date && new Date(inv.date).toLocaleDateString().toLowerCase().includes(search))
                    );
                  })
                  .map(inv => (
                    <tr key={inv._id} className="border-t text-sm border-gray-100 dark:border-gray-700">
                      <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-100">{inv.invoiceNumber}</td>
                      <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{getCustomerDisplay(inv.customerCode)}</td>
                      <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{inv.date ? new Date(inv.date).toLocaleDateString() : '-'}</td>
                      <td className="px-4 py-2 text-gray-900 dark:text-gray-100">₹{inv.totalAmount?.toLocaleString()}</td>
                      <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{Array.isArray(inv.lrList) ? inv.lrList.length : 0}</td>
                      <td className="px-4 py-2">
                        <a
                          href={`/invoices/${inv._id}`}
                          className="inline-flex items-center px-3 py-1.5 rounded bg-green-500 text-white hover:bg-green-600 text-xs font-medium"
                        >
                          View Details
                        </a>
                      </td>
                      <td className="px-4 py-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => downloadInvoice(inv._id)}
                          className="inline-flex items-center px-3 py-1.5 rounded bg-blue-500 text-white hover:bg-blue-600 text-xs font-medium"
                        >
                          📄 PDF
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadAnnexure(inv._id)}
                          className="inline-flex items-center px-3 py-1.5 rounded bg-emerald-500 text-white hover:bg-emerald-600 text-xs font-medium"
                        >
                          📊 Annexure
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  )
}


