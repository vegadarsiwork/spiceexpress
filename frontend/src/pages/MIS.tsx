import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  BarChart3,
  Building2,
  Download,
  FileSpreadsheet,
  FileText,
  MapPin,
  Package,
  Receipt,
  Search,
  Truck,
} from 'lucide-react'
import { customerApi, invoiceApi, lrApi, misApi } from '../lib/api'
import type { Customer, Invoice, LR } from '../lib/api'

type Customer360 = {
  customer: Customer
  totalOrders: number
  totalSpent: number
  lastOrderDate?: string | null
  delivered: number
  pending: number
  inTransit: number
  cancelled: number
  lrs: LR[]
  invoices: Invoice[]
}

const tabs = ['Overview', 'LRs', 'Invoices', 'Rates'] as const
type Tab = typeof tabs[number]

const money = (value?: number | null) => `Rs. ${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
const date = (value?: string | null) => value ? new Date(value).toLocaleDateString('en-IN') : '-'
const daysBetween = (value?: string | null) => {
  if (!value) return null
  return Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86400000))
}

async function downloadFile(url: string, filename: string) {
  const token = localStorage.getItem('auth_token')
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
  const res = await fetch(url, { headers, credentials: 'omit' })
  if (!res.ok) throw new Error(`Download failed with ${res.status}`)
  const blob = await res.blob()
  const objectUrl = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(objectUrl)
}

export default function MIS() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [summary, setSummary] = useState<Customer360 | null>(null)
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<Tab>('Overview')
  const [lrFilter, setLrFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [recentIds, setRecentIds] = useState<string[]>([])
  const [lookupOpen, setLookupOpen] = useState(false)
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lookupRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setLoadingCustomers(true)
    customerApi.getAll()
      .then(setCustomers)
      .catch((err) => setError(err.message || 'Failed to load customers'))
      .finally(() => setLoadingCustomers(false))
    try {
      setRecentIds(JSON.parse(localStorage.getItem('recent_customers') || '[]'))
    } catch {
      setRecentIds([])
    }
  }, [])

  useEffect(() => {
    if (!selectedId) return
    setLoadingSummary(true)
    setError(null)
    misApi.getCustomerMIS(selectedId)
      .then((data) => setSummary(data))
      .catch((err) => setError(err.message || 'Failed to load customer 360'))
      .finally(() => setLoadingSummary(false))
  }, [selectedId])

  useEffect(() => {
    const closeLookup = (event: MouseEvent) => {
      if (!lookupRef.current?.contains(event.target as Node)) setLookupOpen(false)
    }
    document.addEventListener('mousedown', closeLookup)
    return () => document.removeEventListener('mousedown', closeLookup)
  }, [])

  const selectCustomer = (id: string) => {
    setSelectedId(id)
    setQuery('')
    setLookupOpen(false)
    setTab('Overview')
    const next = [id, ...recentIds.filter((item) => item !== id)].slice(0, 6)
    setRecentIds(next)
    localStorage.setItem('recent_customers', JSON.stringify(next))
  }

  const selectedCustomer = summary?.customer || customers.find((c) => c._id === selectedId)
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base = q
      ? customers.filter((c) => [c.code, c.company, c.name, c.gstin, c.city, c.phone, c.email]
          .some((v) => String(v || '').toLowerCase().includes(q)))
      : customers.filter((c) => recentIds.includes(c._id))
    return base.slice(0, 10)
  }, [customers, query, recentIds])

  const analytics = useMemo(() => {
    const lrs = summary?.lrs || []
    const invoices = summary?.invoices || []
    const invoiceLrIds = new Set(invoices.flatMap((inv) => inv.lrList?.map((lr) => lr._id) || []))
    const unpaid = invoices.filter((inv) => inv.status !== 'paid')
    const uninvoiced = lrs.filter((lr) => !invoiceLrIds.has(lr._id))
    const last30 = lrs.filter((lr) => daysBetween(lr.bookingDate) !== null && daysBetween(lr.bookingDate)! <= 30)
    const lanes = Object.values(lrs.reduce<Record<string, { lane: string; count: number; amount: number; weight: number }>>((acc, lr) => {
      const from = lr.consignor?.city || 'Unknown'
      const to = lr.consignee?.city || 'Unknown'
      const key = `${from} to ${to}`
      acc[key] ||= { lane: key, count: 0, amount: 0, weight: 0 }
      acc[key].count += 1
      acc[key].amount += Number(lr.charges?.total || 0)
      acc[key].weight += Number(lr.shipmentDetails?.chargedWeight || lr.shipmentDetails?.actualWeight || 0)
      return acc
    }, {})).sort((a, b) => b.amount - a.amount).slice(0, 5)
    const monthly = lrs.reduce<Record<string, { label: string; amount: number; count: number }>>((acc, lr) => {
      const d = lr.bookingDate ? new Date(lr.bookingDate) : null
      if (!d || Number.isNaN(d.getTime())) return acc
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      acc[key] ||= { label: key, amount: 0, count: 0 }
      acc[key].amount += Number(lr.charges?.total || 0)
      acc[key].count += 1
      return acc
    }, {})
    const quality = [
      !summary?.customer.gstin && 'GSTIN missing',
      !summary?.customer.pan && 'PAN missing',
      !summary?.customer.phone && 'Phone missing',
      !summary?.customer.email && 'Email missing',
      !summary?.customer.city && 'City missing',
      lrs.length === 0 && 'No linked LRs',
    ].filter(Boolean) as string[]
    return {
      unpaid,
      unpaidAmount: unpaid.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0),
      oldestUnpaid: unpaid.sort((a, b) => new Date(a.dueDate || a.invoiceDate || a.date || a.createdAt).getTime() - new Date(b.dueDate || b.invoiceDate || b.date || b.createdAt).getTime())[0],
      uninvoiced,
      uninvoicedAmount: uninvoiced.reduce((sum, lr) => sum + Number(lr.charges?.total || 0), 0),
      last30Amount: last30.reduce((sum, lr) => sum + Number(lr.charges?.total || 0), 0),
      lanes,
      monthly: Object.values(monthly).sort((a, b) => a.label.localeCompare(b.label)).slice(-6),
      quality,
    }
  }, [summary])

  const filteredLrs = useMemo(() => {
    const q = lrFilter.trim().toLowerCase()
    return (summary?.lrs || []).filter((lr) => {
      const matchesStatus = statusFilter === 'All' || lr.status === statusFilter
      const matchesQuery = !q || [lr.lrNumber, lr.consignor?.name, lr.consignee?.name, lr.consignor?.city, lr.consignee?.city]
        .some((v) => String(v || '').toLowerCase().includes(q))
      return matchesStatus && matchesQuery
    })
  }, [summary, lrFilter, statusFilter])

  const maxMonthAmount = Math.max(...analytics.monthly.map((item) => item.amount), 1)

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="min-h-[calc(100dvh-4rem)] bg-slate-50 p-4 font-publicsans text-slate-950 dark:bg-slate-950 dark:text-gray-100 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-sm font-semibold uppercase tracking-wide text-red-600">Admin Customer360</div>
              <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{selectedCustomer?.company || 'Select a customer'}</h1>
              <p className="mt-1 text-sm text-slate-500">Search by code, company, GSTIN, city, phone, or email.</p>
            </div>
            <div ref={lookupRef} className="relative w-full lg:max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setLookupOpen(true)
                }}
                onFocus={() => setLookupOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setLookupOpen(false)
                }}
                placeholder={loadingCustomers ? 'Loading customers...' : 'Search customer'}
                className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 dark:border-gray-700 dark:bg-slate-950"
              />
              {lookupOpen && (query || searchResults.length > 0) && (
                <div className="absolute right-0 top-12 z-30 max-h-96 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-xl dark:border-gray-700 dark:bg-slate-950">
                  {searchResults.length === 0 ? (
                    <div className="p-4 text-sm text-slate-500">No customer found.</div>
                  ) : searchResults.map((c) => (
                    <button key={c._id} onClick={() => selectCustomer(c._id)} className="block w-full border-b border-slate-100 p-3 text-left transition hover:bg-slate-50 active:translate-y-px dark:border-slate-800 dark:hover:bg-slate-900">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">{c.code} - {c.company || c.name || 'Unnamed customer'}</div>
                          <div className="truncate text-xs text-slate-500">{[c.city, c.state, c.gstin].filter(Boolean).join(' | ') || 'No location or GSTIN captured'}</div>
                        </div>
                        <span className="rounded-full border border-slate-200 px-2 py-1 text-xs text-slate-600 dark:border-gray-700 dark:text-gray-300">Open</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        {!selectedId && (
          <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 dark:border-gray-700 dark:bg-slate-950">
              <Building2 className="h-8 w-8 text-red-600" />
              <h2 className="mt-4 text-xl font-semibold">Start with customer lookup</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Use the search bar instead of scrolling through hundreds of customer names. Recently opened customers appear before typing.</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Recent customers</h3>
              <div className="mt-3 space-y-2">
                {recentIds.length ? customers.filter((c) => recentIds.includes(c._id)).slice(0, 6).map((c) => (
                  <button key={c._id} onClick={() => selectCustomer(c._id)} className="w-full rounded-lg border border-slate-200 p-3 text-left text-sm hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900">{c.code} - {c.company || c.name}</button>
                )) : <div className="text-sm text-slate-500">No recent customers yet.</div>}
              </div>
            </div>
          </section>
        )}

        {selectedId && loadingSummary && <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950">Loading customer account data...</div>}

        {summary && (
          <div className="space-y-6">
            <section className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
              <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{summary.customer.code}</div>
                    <h2 className="mt-1 text-2xl font-bold">{summary.customer.company || summary.customer.name}</h2>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                      <span>{summary.customer.gstin || 'GSTIN missing'}</span>
                      <span>{summary.customer.city || 'City missing'}</span>
                      <span>{summary.customer.phone || 'Phone missing'}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link to={`/admin/edit-customer/${summary.customer._id}`} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50 dark:border-gray-700 dark:hover:bg-slate-900">Edit customer</Link>
                    <button onClick={() => downloadFile(misApi.downloadExcel(summary.customer._id), `MIS_${summary.customer.code}.xlsx`)} className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"><FileSpreadsheet className="h-4 w-4" />MIS Excel</button>
                    <button onClick={() => downloadFile(misApi.downloadPdf(summary.customer._id), `MIS_${summary.customer.code}.pdf`)} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"><Download className="h-4 w-4" />MIS PDF</button>
                  </div>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Metric label="Total LRs" value={summary.totalOrders.toLocaleString('en-IN')} icon={Truck} />
                  <Metric label="Total billed" value={money(summary.totalSpent)} icon={Receipt} />
                  <Metric label="Outstanding" value={money(analytics.unpaidAmount)} icon={AlertTriangle} tone={analytics.unpaidAmount > 0 ? 'red' : 'slate'} />
                  <Metric label="Uninvoiced LR value" value={money(analytics.uninvoicedAmount)} icon={Package} tone={analytics.uninvoiced.length ? 'amber' : 'slate'} />
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Admin alerts</h3>
                <div className="mt-4 space-y-3">
                  <AlertRow label="Unpaid invoices" value={analytics.unpaid.length} active={analytics.unpaid.length > 0} />
                  <AlertRow label="LRs not invoiced" value={analytics.uninvoiced.length} active={analytics.uninvoiced.length > 0} />
                  <AlertRow label="Cancelled LRs" value={summary.cancelled} active={summary.cancelled > 0} />
                  <AlertRow label="Data quality issues" value={analytics.quality.length} active={analytics.quality.length > 0} />
                </div>
              </div>
            </section>

            <div className="flex flex-wrap gap-2">
              {tabs.map((item) => (
                <button key={item} onClick={() => setTab(item)} className={`rounded-lg border px-4 py-2 text-sm font-semibold transition active:translate-y-px ${tab === item ? 'border-red-600 bg-red-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-gray-700 dark:bg-slate-950 dark:text-gray-200'}`}>{item}</button>
              ))}
            </div>

            {tab === 'Overview' && (
              <section className="grid gap-4 xl:grid-cols-[1fr_1fr_0.85fr]">
                <Panel title="Monthly movement" icon={BarChart3}>
                  <div className="space-y-3">
                    {analytics.monthly.map((item) => (
                      <div key={item.label}>
                        <div className="mb-1 flex justify-between text-xs"><span>{item.label}</span><span>{item.count} LRs | {money(item.amount)}</span></div>
                        <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-900"><div className="h-2 rounded-full bg-red-600" style={{ width: `${Math.max(6, (item.amount / maxMonthAmount) * 100)}%` }} /></div>
                      </div>
                    ))}
                  </div>
                </Panel>
                <Panel title="Top lanes" icon={MapPin}>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {analytics.lanes.map((lane) => (
                      <div key={lane.lane} className="py-3">
                        <div className="text-sm font-semibold">{lane.lane}</div>
                        <div className="mt-1 text-xs text-slate-500">{lane.count} LRs | {money(lane.amount)} | {lane.weight.toLocaleString('en-IN')} kg</div>
                      </div>
                    ))}
                  </div>
                </Panel>
                <Panel title="Data quality" icon={AlertTriangle}>
                  {analytics.quality.length ? (
                    <div className="space-y-2">{analytics.quality.map((item) => <div key={item} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{item}</div>)}</div>
                  ) : <div className="text-sm text-slate-500">No obvious profile gaps.</div>}
                </Panel>
                <RecentLrs lrs={summary.lrs.slice(0, 6)} />
                <RecentInvoices invoices={summary.invoices.slice(0, 6)} />
                <Panel title="Account timing" icon={Receipt}>
                  <Info label="Last shipment" value={date(summary.lastOrderDate)} />
                  <Info label="Last 30 day booking" value={money(analytics.last30Amount)} />
                  <Info label="Oldest unpaid" value={analytics.oldestUnpaid ? `${analytics.oldestUnpaid.invoiceNumber} (${date(analytics.oldestUnpaid.dueDate || analytics.oldestUnpaid.invoiceDate || analytics.oldestUnpaid.date)})` : '-'} />
                </Panel>
              </section>
            )}

            {tab === 'LRs' && (
              <Panel title="LR history" icon={Truck}>
                <div className="mb-4 grid gap-3 md:grid-cols-[1fr_220px]">
                  <input value={lrFilter} onChange={(e) => setLrFilter(e.target.value)} placeholder="Search LR, consignor, consignee, city" className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-red-500 dark:border-gray-700 dark:bg-slate-950" />
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-slate-950">
                    {['All', 'Booked', 'In Transit', 'Out for Delivery', 'Delivered', 'Cancelled'].map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <DataTable headers={['LR', 'Date', 'Lane', 'Status', 'Amount', 'Actions']}>
                  {filteredLrs.slice(0, 80).map((lr) => (
                    <tr key={lr._id} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-3 py-3 font-semibold"><Link to={`/lrs/${lr._id}`} className="text-red-700 hover:underline">{lr.lrNumber}</Link></td>
                      <td className="px-3 py-3 text-slate-600 dark:text-slate-300">{date(lr.bookingDate)}</td>
                      <td className="px-3 py-3">{lr.consignor?.city || '-'} to {lr.consignee?.city || '-'}</td>
                      <td className="px-3 py-3">{lr.status}</td>
                      <td className="px-3 py-3">{money(lr.charges?.total)}</td>
                      <td className="px-3 py-3"><button onClick={() => downloadFile(lrApi.download(lr._id), `LR_${lr.lrNumber}.pdf`)} className="text-sm font-semibold text-red-700 hover:underline">PDF</button></td>
                    </tr>
                  ))}
                </DataTable>
              </Panel>
            )}

            {tab === 'Invoices' && (
              <Panel title="Invoices and documents" icon={FileText}>
                <DataTable headers={['Invoice', 'Date', 'Due', 'Status', 'LRs', 'Amount', 'Actions']}>
                  {summary.invoices.map((inv) => (
                    <tr key={inv._id} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-3 py-3 font-semibold"><Link to={`/invoices/${inv._id}`} className="text-red-700 hover:underline">{inv.invoiceNumber || inv.invoiceNo}</Link></td>
                      <td className="px-3 py-3">{date(inv.invoiceDate || inv.date)}</td>
                      <td className="px-3 py-3">{date(inv.dueDate)}</td>
                      <td className="px-3 py-3">{inv.status}</td>
                      <td className="px-3 py-3">{inv.lrList?.length || 0}</td>
                      <td className="px-3 py-3">{money(inv.totalAmount)}</td>
                      <td className="px-3 py-3"><div className="flex gap-3"><button onClick={() => downloadFile(invoiceApi.download(inv._id), `Invoice_${inv.invoiceNumber || inv._id}.pdf`)} className="text-sm font-semibold text-red-700 hover:underline">PDF</button><button onClick={() => downloadFile(invoiceApi.annexure(inv._id), `Annexure_${inv.invoiceNumber || inv._id}.xlsx`)} className="text-sm font-semibold text-slate-700 hover:underline">Annexure</button></div></td>
                    </tr>
                  ))}
                </DataTable>
              </Panel>
            )}

            {tab === 'Rates' && (
              <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
                <Panel title="Default charges" icon={Receipt}>
                  <div className="grid gap-3 sm:grid-cols-2">{Object.entries(summary.customer.defaultCharges || {}).map(([key, value]) => <Info key={key} label={key} value={String(value)} />)}</div>
                </Panel>
                <Panel title="Lane rates" icon={MapPin}>
                  <div className="space-y-2">{Object.entries(summary.customer.rate || {}).map(([key, lane]) => <div key={key} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800"><div className="font-semibold">{lane.from} to {lane.to}</div><div className="text-slate-500">Rs. {lane.rate} / {lane.rateType === 'perKg' ? 'kg' : 'package'}</div></div>)}</div>
                </Panel>
              </section>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

function Metric({ label, value, icon: Icon, tone = 'slate' }: { label: string; value: string; icon: typeof Truck; tone?: 'slate' | 'red' | 'amber' }) {
  const color = tone === 'red' ? 'text-red-700 bg-red-50 border-red-100' : tone === 'amber' ? 'text-amber-700 bg-amber-50 border-amber-100' : 'text-slate-700 bg-slate-50 border-slate-100'
  return <div className={`rounded-lg border p-4 ${color}`}><Icon className="h-5 w-5" /><div className="mt-3 text-xs font-semibold uppercase tracking-wide opacity-70">{label}</div><div className="mt-1 text-xl font-bold">{value}</div></div>
}

function AlertRow({ label, value, active }: { label: string; value: number; active: boolean }) {
  return <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800"><span className="text-sm">{label}</span><span className={`rounded-full px-2 py-1 text-xs font-bold ${active ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>{value}</span></div>
}

function Panel({ title, icon: Icon, children }: { title: string; icon: typeof Truck; children: React.ReactNode }) {
  return <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950"><div className="mb-4 flex items-center gap-2"><Icon className="h-5 w-5 text-red-600" /><h3 className="text-base font-bold">{title}</h3></div>{children}</section>
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800"><div className="text-xs uppercase tracking-wide text-slate-500">{label}</div><div className="mt-1 text-sm font-semibold">{value || '-'}</div></div>
}

function DataTable({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return <div className="overflow-auto rounded-lg border border-slate-200 dark:border-slate-800"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950">{headers.map((h) => <th key={h} className="px-3 py-3 font-semibold">{h}</th>)}</thead><tbody>{children}</tbody></table></div>
}

function RecentLrs({ lrs }: { lrs: LR[] }) {
  return <Panel title="Recent LRs" icon={Truck}><div className="divide-y divide-slate-100 dark:divide-slate-800">{lrs.map((lr) => <div key={lr._id} className="flex items-center justify-between gap-3 py-3"><div><Link to={`/lrs/${lr._id}`} className="font-semibold text-red-700 hover:underline">{lr.lrNumber}</Link><div className="text-xs text-slate-500">{lr.consignor?.city || '-'} to {lr.consignee?.city || '-'} | {date(lr.bookingDate)}</div></div><div className="text-sm font-semibold">{money(lr.charges?.total)}</div></div>)}</div></Panel>
}

function RecentInvoices({ invoices }: { invoices: Invoice[] }) {
  return <Panel title="Recent invoices" icon={FileText}><div className="divide-y divide-slate-100 dark:divide-slate-800">{invoices.map((inv) => <div key={inv._id} className="flex items-center justify-between gap-3 py-3"><div><Link to={`/invoices/${inv._id}`} className="font-semibold text-red-700 hover:underline">{inv.invoiceNumber || inv.invoiceNo}</Link><div className="text-xs text-slate-500">{date(inv.invoiceDate || inv.date)} | {inv.status}</div></div><div className="text-sm font-semibold">{money(inv.totalAmount)}</div></div>)}</div></Panel>
}
