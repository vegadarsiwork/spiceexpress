import { useMemo, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Card from '../components/Card'
import Badge from '../components/Badge'
import Input from '../components/Input'
import { lrApi } from '../lib/api'
import type { LR } from '../lib/api'

const TAB_OPTIONS = ['All', 'Booked', 'In Transit', 'Delivered', 'Out for Delivery', 'Cancelled'] as const;
type Tab = typeof TAB_OPTIONS[number];

export default function LRsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('All')
  const [query, setQuery] = useState('')
  const [lrs, setLrs] = useState<LR[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadLRs() {
      setLoading(true)
      setError(null)
      try {
        const data = await lrApi.getAll()
        setLrs(data)
      } catch (err: any) {
        setError(err.message || 'Failed to load LRs')
        console.error('LR load error:', err)
      } finally {
        setLoading(false)
      }
    }
    loadLRs()
  }, [])

  const filtered = useMemo(() => {
    let items = lrs
    if (activeTab !== 'All') {
      items = items.filter((x) => x.status === activeTab);
    }
    if (query.trim()) {
      const q = query.toLowerCase()
      items = items.filter(
        (x) =>
          x.lrNumber.toLowerCase().includes(q) ||
          (x.consignor?.name?.toLowerCase() || '').includes(q) ||
          (x.consignee?.name?.toLowerCase() || '').includes(q)
      )
    }
    return items
  }, [activeTab, query, lrs])

  const statusColor = (status: LR['status']) => {
    switch (status) {
      case 'Delivered':
        return 'green';
      case 'In Transit':
        return 'blue';
      case 'Booked':
        return 'gray';
      case 'Out for Delivery':
        return 'orange';
      case 'Cancelled':
        return 'red';
      default:
        return 'gray';
    }
  };

  // Billing type badge colors
  const billingTypeColor = (type: string) => {
    switch (type) {
      case 'TBB':
        return 'purple';
      case 'PAID':
        return 'green';
      case 'TOPAY':
        return 'orange';
      case 'FOC':
        return 'gray';
      default:
        return 'gray';
    }
  };

  if (loading) {
    return (
      <div className="p-8 bg-slate-50 dark:bg-slate-950 min-h-[calc(100dvh-4rem)]">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600 dark:text-gray-300">Loading LRs...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 bg-slate-50 dark:bg-slate-950 min-h-[calc(100dvh-4rem)]">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 dark:bg-red-950 dark:border-red-900">
          <div className="text-red-800 font-medium dark:text-red-300">Error loading LRs</div>
          <div className="text-red-600 text-sm mt-1 dark:text-red-400">{error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 bg-slate-50 dark:bg-slate-950 min-h-[calc(100dvh-4rem)]">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8">Lorry Receipts</h1>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6">
        {TAB_OPTIONS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={
              `px-4 py-2 rounded-lg text-sm border font-medium ` +
              (activeTab === tab
                ? 'bg-red-500 text-white border-red-600'
                : 'bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-100 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700')
            }
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-8">
        <div className="flex-1">
          <Input placeholder="Search LR number, consignor, consignee" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <button className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium">Date Range</button>
      </div>

      {/* LR list */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg dark:text-gray-400">No LRs found</div>
          <div className="text-gray-400 text-sm mt-2">
            {query.trim() ? 'Try adjusting your search terms' : 'No LRs available'}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((lr) => (
            <Card key={lr._id} className="bg-white dark:bg-slate-900 dark:border-gray-700">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{lr.bookingDate ? new Date(lr.bookingDate).toLocaleDateString() : '-'}</div>
                  <div className="text-lg font-medium text-gray-900 dark:text-gray-100">{lr.lrNumber}</div>
                </div>
                <div className="flex gap-2">
                  <Badge text={lr.charges?.paymentType || 'TBB'} color={billingTypeColor(lr.charges?.paymentType || 'TBB') as any} />
                  <Badge text={lr.status} color={statusColor(lr.status) as any} />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Consignor</div>
                  <div className="text-gray-900 dark:text-gray-100">{lr.consignor?.name}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Consignee</div>
                  <div className="text-gray-900 dark:text-gray-100">{lr.consignee?.name}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Total Cost</div>
                  <div className="text-gray-900 dark:text-gray-100 font-semibold">₹ {lr.charges?.total ? lr.charges.total.toLocaleString() : 'N/A'}</div>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <Link to={`/lrs/${lr._id}`} className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 font-medium">View Details</Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}


