import React, { useState } from 'react'
import { lrApi } from '../lib/api'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'

const STATUS_LABELS: Record<string, string> = {
  'Booked': 'Booked',
  'In Transit': 'In Transit',
  'Out for Delivery': 'Out for Delivery',
  'Delivered': 'Delivered',
  'Cancelled': 'Cancelled',
};

const STATUS_STEPS: LRStatus[] = [
  'Booked',
  'In Transit',
  'Out for Delivery',
  'Delivered',
];

type LRStatus = 'Booked' | 'In Transit' | 'Out for Delivery' | 'Delivered' | 'Cancelled';

export default function TrackingLight() {
  const [lrNumber, setLrNumber] = useState('')
  const [lr, setLr] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<LRStatus>('Booked')

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    setLr(null)
    try {
      const found = await lrApi.track(lrNumber.trim())
      setLr(found)
      // Map legacy status values to backend values if needed
      let backendStatus: string = found.status;
      if (backendStatus === 'pending') backendStatus = 'Booked';
      if (backendStatus === 'in-transit') backendStatus = 'In Transit';
      if (backendStatus === 'delivered') backendStatus = 'Delivered';
      if (backendStatus === 'cancelled') backendStatus = 'Cancelled';
      setStatus(backendStatus as LRStatus);
    } catch (err: any) {
      setError(err.message || 'Failed to track LR')
    } finally {
      setLoading(false)
    }
  }

  const getStatusIndex = (currentStatus: LRStatus): number => {
    const idx = STATUS_STEPS.indexOf(currentStatus);
    return idx >= 0 ? idx : 0;
  };

  const currentStepIndex = getStatusIndex(status);

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Track Your Shipment</h2>
          <p className="text-gray-600">Enter your LR number to track your shipment status</p>
        </div>

        <form onSubmit={handleTrack} className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={lrNumber}
              onChange={(e) => setLrNumber(e.target.value)}
              placeholder="Enter LR Number"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Tracking...' : 'Track'}
            </button>
          </div>
        </form>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        )}

        {lr && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* LR Details Card */}
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Shipment Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">LR Number</p>
                  <p className="font-semibold text-gray-900">{lr.lrNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="font-semibold text-blue-600">{STATUS_LABELS[status]}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">From</p>
                  <p className="font-semibold text-gray-900">{lr.consignor?.city || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">To</p>
                  <p className="font-semibold text-gray-900">{lr.consignee?.city || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Consignor</p>
                  <p className="font-semibold text-gray-900">{lr.consignor?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Consignee</p>
                  <p className="font-semibold text-gray-900">{lr.consignee?.name || '-'}</p>
                </div>
                {lr.shipmentDetails?.actualWeight && (
                  <div>
                    <p className="text-sm text-gray-600">Weight</p>
                    <p className="font-semibold text-gray-900">{lr.shipmentDetails.actualWeight} kg</p>
                  </div>
                )}
                {lr.bookingDate && (
                  <div>
                    <p className="text-sm text-gray-600">Booking Date</p>
                    <p className="font-semibold text-gray-900">{new Date(lr.bookingDate).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Timeline Progress */}
            {status !== 'Cancelled' && (
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-6">Tracking Timeline</h3>
                <div className="relative">
                  {/* Progress Line */}
                  <div className="absolute top-5 left-0 w-full h-1 bg-gray-200">
                    <div
                      className="h-full bg-blue-600 transition-all duration-500"
                      style={{ width: `${(currentStepIndex / (STATUS_STEPS.length - 1)) * 100}%` }}
                    />
                  </div>

                  {/* Steps */}
                  <div className="relative flex justify-between">
                    {STATUS_STEPS.map((step, idx) => (
                      <div key={step} className="flex flex-col items-center">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors z-10 ${
                            idx <= currentStepIndex
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 text-gray-400'
                          }`}
                        >
                          {idx < currentStepIndex ? <Check className="h-4 w-4" /> : idx + 1}
                        </div>
                        <div className="mt-2 text-center">
                          <p
                            className={`text-xs font-semibold ${
                              idx <= currentStepIndex ? 'text-gray-900' : 'text-gray-400'
                            }`}
                          >
                            {STATUS_LABELS[step]}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {status === 'Cancelled' && (
              <div className="bg-red-50 rounded-lg p-6 border border-red-200">
                <h3 className="text-lg font-bold text-red-700 mb-2">Shipment Cancelled</h3>
                <p className="text-red-600">This shipment has been cancelled.</p>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}

