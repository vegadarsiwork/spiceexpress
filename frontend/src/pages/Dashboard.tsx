import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertCircle,
  ArrowUpRight,
  CalendarDays,
  Clock3,
  FileText,
  IndianRupee,
  PackageCheck,
  Route,
  Truck,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { invoiceApi, lrApi } from '../lib/api'
import type { Invoice, LR } from '../lib/api'

const money = (value = 0) =>
  `Rs. ${Number(value || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  })}`

const dateKey = (value?: string | null) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString().slice(0, 10)
}

const shortDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  })

const statusColor = (status?: string) => {
  const value = String(status || '').toLowerCase()
  if (value.includes('deliver')) return 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-900'
  if (value.includes('transit')) return 'text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-950/40 dark:border-blue-900'
  if (value.includes('cancel')) return 'text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-950/40 dark:border-red-900'
  return 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/40 dark:border-amber-900'
}

export default function Dashboard() {
  const [lrs, setLrs] = useState<LR[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [lrsRes, invRes] = await Promise.all([lrApi.getAll(), invoiceApi.getAll()])
        setLrs(lrsRes || [])
        setInvoices(invRes || [])
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const todayKey = new Date().toISOString().slice(0, 10)

  const days = useMemo(() => {
    return Array.from({ length: 8 }, (_, index) => {
      const date = new Date()
      date.setDate(date.getDate() - (7 - index))
      return date.toISOString().slice(0, 10)
    })
  }, [])

  const metrics = useMemo(() => {
    const todayLRs = lrs.filter((lr) => dateKey(lr.bookingDate) === todayKey)
    const todayInvoices = invoices.filter((invoice) => dateKey(invoice.invoiceDate || invoice.date || invoice.createdAt) === todayKey)
    const pendingLRs = lrs.filter((lr) => !String(lr.status || '').toLowerCase().includes('deliver') && !String(lr.status || '').toLowerCase().includes('cancel'))
    const unpaidInvoices = invoices.filter((invoice) => String(invoice.status || '').toLowerCase() !== 'paid')
    const todayBooking = todayLRs.reduce((sum, lr) => sum + Number(lr.charges?.total || lr.charges?.grandTotal || 0), 0)
    const invoiceOutstanding = unpaidInvoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount || 0), 0)

    return {
      todayLRs,
      todayInvoices,
      pendingLRs,
      unpaidInvoices,
      todayBooking,
      invoiceOutstanding,
      totalLRs: lrs.length,
      totalInvoices: invoices.length,
    }
  }, [invoices, lrs, todayKey])

  const chartData = useMemo(() => {
    return days.map((day) => {
      const dayLRs = lrs.filter((lr) => dateKey(lr.bookingDate) === day)
      const amount = dayLRs.reduce((sum, lr) => sum + Number(lr.charges?.total || lr.charges?.grandTotal || 0), 0)
      return {
        key: day,
        date: shortDate(day),
        amount,
        count: dayLRs.length,
      }
    })
  }, [days, lrs])

  const recentLRs = useMemo(() => {
    return [...lrs]
      .sort((a, b) => new Date(b.bookingDate || 0).getTime() - new Date(a.bookingDate || 0).getTime())
      .slice(0, 6)
  }, [lrs])

  const laneData = useMemo(() => {
    const lanes = new Map<string, { lane: string; count: number; amount: number }>()
    for (const lr of lrs) {
      const lane = `${lr.consignor?.city || 'Unknown'} to ${lr.consignee?.city || 'Unknown'}`
      const current = lanes.get(lane) || { lane, count: 0, amount: 0 }
      current.count += 1
      current.amount += Number(lr.charges?.total || lr.charges?.grandTotal || 0)
      lanes.set(lane, current)
    }
    return [...lanes.values()].sort((a, b) => b.count - a.count).slice(0, 5)
  }, [lrs])

  if (loading) {
    return (
      <div className="min-h-[calc(100dvh-4rem)] bg-slate-50 p-6 dark:bg-slate-950">
        <div className="h-64 rounded-lg border border-slate-200 bg-white p-6 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          Loading dashboard...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-[calc(100dvh-4rem)] bg-slate-50 p-6 dark:bg-slate-950">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          <div className="flex items-center gap-2 font-semibold"><AlertCircle className="h-4 w-4" /> Error loading dashboard</div>
          <div className="mt-1 text-sm">{error}</div>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="min-h-[calc(100dvh-4rem)] bg-slate-50 p-4 text-slate-950 dark:bg-slate-950 dark:text-slate-100 sm:p-6"
    >
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Booking, invoice, and delivery activity from the connected SQL Server database.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          <CalendarDays className="h-4 w-4" />
          {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={IndianRupee} label="Today's booking" value={money(metrics.todayBooking)} note={`${metrics.todayLRs.length} LRs booked today`} />
        <MetricCard icon={Truck} label="Open shipments" value={String(metrics.pendingLRs.length)} note={`${metrics.totalLRs} total LRs`} />
        <MetricCard icon={FileText} label="Invoice outstanding" value={money(metrics.invoiceOutstanding)} note={`${metrics.unpaidInvoices.length} unpaid invoices`} />
        <MetricCard icon={PackageCheck} label="Invoices today" value={String(metrics.todayInvoices.length)} note={`${metrics.totalInvoices} total invoices`} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.8fr)]">
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Last 8 Days Booking</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Based on LR booking date and LR total amount.</p>
            </div>
            <Route className="h-5 w-5 text-red-700 dark:text-red-400" />
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-800" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(value) => Number(value).toLocaleString('en-IN')} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={72} />
                <Tooltip
                  formatter={(value, name) => name === 'amount' ? [money(Number(value)), 'Booking'] : [value, 'LRs']}
                  labelClassName="text-slate-900"
                  contentStyle={{ borderRadius: 8, borderColor: '#e2e8f0' }}
                />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry) => (
                    <Cell key={entry.key} fill={entry.key === todayKey ? '#b91c1c' : '#334155'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Top Lanes</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Most frequently booked routes.</p>
            </div>
            <ArrowUpRight className="h-5 w-5 text-red-700 dark:text-red-400" />
          </div>
          <div className="space-y-3">
            {laneData.length ? laneData.map((lane) => (
              <div key={lane.lane} className="rounded-md border border-slate-100 p-3 dark:border-slate-800">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 truncate text-sm font-semibold">{lane.lane}</div>
                  <div className="shrink-0 text-sm text-slate-500">{lane.count} LRs</div>
                </div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">{money(lane.amount)}</div>
              </div>
            )) : (
              <div className="rounded-md border border-dashed border-slate-200 p-4 text-sm text-slate-500 dark:border-slate-800">No lane data yet.</div>
            )}
          </div>
        </section>
      </div>

      <section className="mt-4 rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <h2 className="text-base font-semibold">Recent LRs</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">LR</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Lane</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentLRs.map((lr) => (
                <tr key={lr._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <td className="px-4 py-3 font-semibold text-red-700 dark:text-red-400">{lr.lrNumber || lr._id}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    <span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4 text-slate-400" />{lr.bookingDate ? new Date(lr.bookingDate).toLocaleDateString('en-IN') : '-'}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{lr.consignor?.city || '-'} to {lr.consignee?.city || '-'}</td>
                  <td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${statusColor(lr.status)}`}>{lr.status || 'Booked'}</span></td>
                  <td className="px-4 py-3 text-right font-semibold">{money(lr.charges?.total || lr.charges?.grandTotal || 0)}</td>
                </tr>
              ))}
              {!recentLRs.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">No LR records loaded.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </motion.div>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  note,
}: {
  icon: typeof IndianRupee
  label: string
  value: string
  note: string
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</div>
          <div className="mt-2 text-2xl font-semibold text-slate-950 dark:text-slate-50">{value}</div>
        </div>
        <div className="rounded-md bg-red-50 p-2 text-red-700 dark:bg-red-950/50 dark:text-red-300">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-3 text-sm text-slate-500 dark:text-slate-400">{note}</div>
    </section>
  )
}
