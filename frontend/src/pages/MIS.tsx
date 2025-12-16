import { useEffect, useState } from 'react'
import { customerApi, misApi } from '../lib/api'
import type { Customer } from '../lib/api'
import { Card as ShadCard } from '../components/ui/card'
import { Button as ShadButton } from '../components/ui/button'
import { motion } from 'framer-motion'

const LAYOUTS = [
  { key: 'summary', label: 'Summary' },
  { key: 'detailed', label: 'Detailed' },
  { key: 'finance', label: 'Finance' },
  { key: 'shipments', label: 'Shipments' },
]

export default function MIS() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<string>('')
  const [summary, setSummary] = useState<any>(null)
  const [layout, setLayout] = useState<string>('summary')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    customerApi.getAll().then(setCustomers)
  }, [])

  useEffect(() => {
    if (!selectedCustomer) return
    setLoading(true)
    setError(null)
    misApi.getCustomerMIS(selectedCustomer)
      .then(setSummary)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [selectedCustomer])

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="p-4 sm:p-8 bg-gray-50 dark:bg-gray-900 min-h-full font-publicsans"
    >
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-blue-700 dark:text-blue-300 mb-4 tracking-tight">Customer 360° MIS</h1>
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <select
            className="border-2 border-blue-300 rounded-xl px-4 py-2 bg-white dark:bg-gray-800 dark:text-gray-100 dark:border-blue-700 shadow focus:ring-2 focus:ring-blue-400"
            value={selectedCustomer}
            onChange={e => setSelectedCustomer(e.target.value)}
          >
            <option value="">Select Customer</option>
            {customers.map(c => (
              <option key={c._id} value={c._id}>{c.company || c.code}</option>
            ))}
          </select>
          <div className="flex gap-2 mt-2 md:mt-0">
            {LAYOUTS.map(l => (
              <ShadButton
                key={l.key}
                className={layout === l.key ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-100 border border-blue-200 dark:border-blue-700'}
                style={{ borderRadius: '0.75rem', fontWeight: 600, padding: '0.5rem 1.25rem' }}
                onClick={() => setLayout(l.key)}
              >
                {l.label}
              </ShadButton>
            ))}
          </div>
          {/* Download Buttons */}
          {selectedCustomer && (
            <div className="flex gap-2 mt-2 md:mt-0 md:ml-4">
              <ShadButton
                className="bg-green-600 hover:bg-green-700 text-white"
                style={{ borderRadius: '0.75rem', fontWeight: 600, padding: '0.5rem 1.25rem' }}
                onClick={async () => {
                  const token = localStorage.getItem('auth_token');
                  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
                  try {
                    const res = await fetch(misApi.downloadExcel(selectedCustomer), { headers, credentials: 'omit' });
                    if (!res.ok) throw new Error('Download failed');
                    const blob = await res.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `MIS_${selectedCustomer}.xlsx`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    window.URL.revokeObjectURL(url);
                  } catch (err) {
                    alert('Failed to download Excel');
                  }
                }}
              >
                📊 Excel
              </ShadButton>
              <ShadButton
                className="bg-red-600 hover:bg-red-700 text-white"
                style={{ borderRadius: '0.75rem', fontWeight: 600, padding: '0.5rem 1.25rem' }}
                onClick={async () => {
                  const token = localStorage.getItem('auth_token');
                  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
                  try {
                    const res = await fetch(misApi.downloadPdf(selectedCustomer), { headers, credentials: 'omit' });
                    if (!res.ok) throw new Error('Download failed');
                    const blob = await res.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `MIS_${selectedCustomer}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    window.URL.revokeObjectURL(url);
                  } catch (err) {
                    alert('Failed to download PDF');
                  }
                }}
              >
                📄 PDF
              </ShadButton>
            </div>
          )}
        </div>
      </div>
      {loading && <div className="text-gray-500 dark:text-gray-400">Loading...</div>}
      {error && <div className="text-red-600 dark:text-red-400">{error}</div>}
      {summary && (
        <div>
          {layout === 'summary' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
              <ShadCard className="p-8 bg-gradient-to-br from-blue-100 to-blue-300 dark:from-blue-900 dark:to-blue-700 rounded-2xl shadow-lg">
                <div className="text-blue-700 dark:text-blue-200 text-sm font-semibold mb-2">Total Shipments</div>
                <div className="text-4xl font-extrabold text-blue-900 dark:text-blue-100 mb-1">{summary.totalOrders}</div>
                <div className="text-sm text-blue-800 dark:text-blue-300">All time</div>
              </ShadCard>
              <ShadCard className="p-8 bg-gradient-to-br from-green-100 to-green-300 dark:from-green-900 dark:to-green-700 rounded-2xl shadow-lg">
                <div className="text-green-700 dark:text-green-200 text-sm font-semibold mb-2">Total Spent (INR)</div>
                <div className="text-4xl font-extrabold text-green-900 dark:text-green-100 mb-1">₹{summary.totalSpent?.toLocaleString()}</div>
                <div className="text-sm text-green-800 dark:text-green-300">All time</div>
              </ShadCard>
              <ShadCard className="p-8 bg-gradient-to-br from-yellow-100 to-yellow-300 dark:from-yellow-900 dark:to-yellow-700 rounded-2xl shadow-lg">
                <div className="text-yellow-700 dark:text-yellow-200 text-sm font-semibold mb-2">Last Order</div>
                <div className="text-4xl font-extrabold text-yellow-900 dark:text-yellow-100 mb-1">{summary.lastOrderDate ? new Date(summary.lastOrderDate).toLocaleDateString() : 'N/A'}</div>
                <div className="text-sm text-yellow-800 dark:text-yellow-300">Recent</div>
              </ShadCard>
              <ShadCard className="p-8 bg-gradient-to-br from-purple-100 to-purple-300 dark:from-purple-900 dark:to-purple-700 rounded-2xl shadow-lg">
                <div className="text-purple-700 dark:text-purple-200 text-sm font-semibold mb-2">Customer</div>
                <div className="text-4xl font-extrabold text-purple-900 dark:text-purple-100 mb-1">{summary.customer?.company || summary.customer?.name || '-'}</div>
                <div className="text-sm text-purple-800 dark:text-purple-300">{summary.customer?.email || ''}</div>
              </ShadCard>
            </div>
          )}
          {layout === 'detailed' && (
            <div className="bg-white dark:bg-gray-800 dark:border-gray-700 rounded-xl shadow p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Recent Shipments</h2>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <th className="text-left px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400">LR No</th>
                    <th className="text-left px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400">Date</th>
                    <th className="text-left px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400">Origin</th>
                    <th className="text-left px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400">Destination</th>
                    <th className="text-left px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(summary.lrs || []).slice(0, 10).map((lr: any) => (
                    <tr key={lr._id} className="border-b border-gray-50 dark:border-gray-800">
                      <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{lr.lrNumber}</td>
                      <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{new Date(lr.bookingDate).toLocaleDateString()}</td>
                      <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{lr.consignor?.city || '-'}</td>
                      <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{lr.consignee?.city || '-'}</td>
                      <td className="px-4 py-2 text-gray-900 dark:text-gray-100">₹{lr.charges?.total?.toLocaleString() || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {layout === 'finance' && (
            <div className="bg-white dark:bg-gray-800 dark:border-gray-700 rounded-xl shadow p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Financial Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-gray-500 dark:text-gray-400 text-sm mb-1">Total Spent</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">₹{summary.totalSpent?.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-gray-500 dark:text-gray-400 text-sm mb-1">Total Orders</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{summary.totalOrders}</div>
                </div>
                <div>
                  <div className="text-gray-500 dark:text-gray-400 text-sm mb-1">Last Order</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{summary.lastOrderDate ? new Date(summary.lastOrderDate).toLocaleDateString() : 'N/A'}</div>
                </div>
              </div>
            </div>
          )}
          {layout === 'shipments' && (
            <div className="bg-white dark:bg-gray-800 dark:border-gray-700 rounded-xl shadow p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">All Shipments</h2>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <th className="text-left px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400">LR No</th>
                    <th className="text-left px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400">Date</th>
                    <th className="text-left px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400">Origin</th>
                    <th className="text-left px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400">Destination</th>
                    <th className="text-left px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(summary.lrs || []).map((lr: any) => (
                    <tr key={lr._id} className="border-b border-gray-50 dark:border-gray-800">
                      <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{lr.lrNumber}</td>
                      <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{new Date(lr.bookingDate).toLocaleDateString()}</td>
                      <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{lr.consignor?.city || '-'}</td>
                      <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{lr.consignee?.city || '-'}</td>
                      <td className="px-4 py-2 text-gray-900 dark:text-gray-100">₹{lr.charges?.total?.toLocaleString() || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}
