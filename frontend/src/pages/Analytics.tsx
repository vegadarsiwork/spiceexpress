import { useEffect, useState } from 'react'
import { analyticsApi } from '../lib/api'
import type { ComparisonData } from '../lib/api'

export default function Analytics() {
  const [data, setData] = useState<ComparisonData | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        setError(null)
        const now = new Date()
        const startA = new Date(now)
        startA.setDate(startA.getDate() - 30)
        const endA = new Date(now)
        const startB = new Date(now)
        startB.setDate(startB.getDate() - 60)
        const endB = new Date(now)
        endB.setDate(endB.getDate() - 31)

        const params = {
          periodA_start: startA.toISOString(),
          periodA_end: endA.toISOString(),
          periodB_start: startB.toISOString(),
          periodB_end: endB.toISOString(),
        }
        const result = await analyticsApi.getBusinessComparison(params)
        setData(result)
      } catch (err: any) {
        setError(err.message ?? 'Failed to load analytics')
        console.error('Analytics load error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="p-8 bg-gray-50 min-h-[calc(100dvh-4rem)]">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Loading analytics...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 bg-gray-50 min-h-[calc(100dvh-4rem)]">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-800 font-medium">Error loading analytics</div>
          <div className="text-red-600 text-sm mt-1">{error}</div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-8 bg-gray-50 min-h-[calc(100dvh-4rem)]">
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">No analytics data available</div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 bg-gray-50 min-h-[calc(100dvh-4rem)]">
      <h2 className="text-3xl font-bold text-gray-900 mb-8">Business Comparison</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="text-gray-500 text-sm font-medium mb-2">Period A (Last 30 days)</div>
          <div className="text-3xl font-bold text-gray-900 mb-2">{data.periodA?.lrCount ?? 0}</div>
          <div className="text-sm text-gray-600">LR Count</div>
          <div className="text-2xl font-semibold text-gray-900 mt-2">₹{data.periodA?.revenue?.toLocaleString() ?? 0}</div>
          <div className="text-sm text-gray-600">Revenue</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="text-gray-500 text-sm font-medium mb-2">Period B (30-60 days ago)</div>
          <div className="text-3xl font-bold text-gray-900 mb-2">{data.periodB?.lrCount ?? 0}</div>
          <div className="text-sm text-gray-600">LR Count</div>
          <div className="text-2xl font-semibold text-gray-900 mt-2">₹{data.periodB?.revenue?.toLocaleString() ?? 0}</div>
          <div className="text-sm text-gray-600">Revenue</div>
        </div>
      </div>
      
      {/* Comparison Summary */}
      {data.periodA && data.periodB && (
        <div className="mt-8 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Comparison Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-sm text-gray-600 mb-2">LR Count Change</div>
              <div className={`text-lg font-semibold ${(data.periodA.lrCount - data.periodB.lrCount) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {data.periodA.lrCount >= data.periodB.lrCount ? '+' : ''}
                {data.periodA.lrCount - data.periodB.lrCount}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-2">Revenue Change</div>
              <div className={`text-lg font-semibold ${(data.periodA.revenue - data.periodB.revenue) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {data.periodA.revenue >= data.periodB.revenue ? '+' : ''}
                ₹{(data.periodA.revenue - data.periodB.revenue).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


