import React, { useState, useEffect } from 'react'
import { Card as ShadCard, CardHeader, CardTitle, CardContent } from '../components/ui/card'
import { Input as ShadInput } from '../components/ui/input'
import { Button as ShadButton } from '../components/ui/button'
import { lrApi, API_BASE_URL } from '../lib/api'
import { motion } from 'framer-motion'


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
  'Cancelled',
];

type LRStatus = 'Booked' | 'In Transit' | 'Out for Delivery' | 'Delivered' | 'Cancelled';

export default function Tracking() {
  const [lrNumber, setLrNumber] = useState('')
  const [lr, setLr] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [status, setStatus] = useState<LRStatus>('Booked')
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    fetch(API_BASE_URL + '/auth/me', {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to load user');
        return res.json();
      })
      .then(setUser)
      .catch(() => setUser(null));
  }, [])

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    setLr(null)
    try {
      const all = await lrApi.getAll()
      const found = all.find((item: any) => item.lrNumber === lrNumber)
      if (!found) throw new Error('No LR found with that number')
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

  const handleStatusUpdate = async () => {
    if (!lr) return;
    setLoading(true);
    setError(null);
    try {
      // Compose the full update object with all required fields
      const updateObj = {
        ...lr,
        status,
        // If backend expects nested objects, map them here
        consignor: lr.consignor || {
          name: lr.senderName,
          address: lr.senderAddress,
          city: lr.senderCity,
          pin: lr.senderPin,
          phone: lr.senderPhone,
        },
        consignee: lr.consignee || {
          name: lr.receiverName,
          address: lr.receiverAddress,
          city: lr.receiverCity,
          pin: lr.receiverPin,
          phone: lr.receiverPhone,
        },
        customer: lr.customer || lr.customerCode, // try both
      };
      await lrApi.update(lr._id, updateObj);
      setLr({ ...lr, status });
      setEditMode(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update status');
    } finally {
      setLoading(false);
    }
  } 

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="p-4 sm:p-8 bg-slate-50 dark:bg-slate-950 min-h-[calc(100dvh-4rem)] font-publicsans"
    >
      <ShadCard className="max-w-2xl mx-auto bg-white dark:bg-slate-900 dark:border-gray-700 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Shipment Tracking</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleTrack} className="flex flex-col sm:flex-row gap-4 mb-6">
            <ShadInput
              placeholder="Enter LR Number"
              value={lrNumber}
              onChange={e => setLrNumber(e.target.value)}
              required
              className="max-w-xs bg-white dark:bg-slate-900 dark:text-gray-100 border-gray-300 dark:border-gray-700"
            />
            <ShadButton type="submit" className="bg-red-500 text-white">Track</ShadButton>
          </form>
          {error && <div className="text-red-600 dark:text-red-400 mb-2">{error}</div>}
          {loading && <div className="text-gray-500 dark:text-gray-400">Loading...</div>}
          {lr && (
            <div className="space-y-6">
              {/* Status Stepper */}
              {/* Stepper with Cancelled as separate bubble */}
              <div className="mb-4">
                <div className="flex items-center justify-between w-full px-2 py-2 max-w-lg mx-auto">
                  {STATUS_STEPS.filter(s => s !== 'Cancelled').map((label, i, arr) => {
                    const idx = STATUS_STEPS.indexOf(lr.status);
                    const isDone = i < idx && lr.status !== 'Cancelled';
                    const isCurrent = i === idx && lr.status !== 'Cancelled';
                    return (
                      <div key={label} className="flex-1 flex flex-col items-center relative">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-200 ${isDone ? 'bg-red-600 text-white' : isCurrent ? 'bg-red-700 text-white scale-105 shadow-lg' : 'bg-gray-200 text-gray-700 dark:bg-slate-900 dark:text-gray-300'}`}
                        >
                          {i + 1}
                        </div>
                        <div className="mt-2 text-xs text-center font-medium text-gray-700 dark:text-gray-300">{STATUS_LABELS[label]}</div>
                        {i < arr.length - 1 && (
                          <div className={`absolute top-5 right-0 w-full h-0.5 ${i < idx - (lr.status === 'Cancelled' ? 1 : 0) ? 'bg-red-400' : 'bg-gray-300 dark:bg-gray-700'}`} style={{ left: '50%', right: '-50%' }} />
                        )}
                      </div>
                    );
                  })}
                  {/* Cancelled bubble */}
                  <div className="flex flex-col items-center ml-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-200 border-2 ${lr.status === 'Cancelled' ? 'bg-red-900 border-red-700 text-white scale-105 shadow-lg' : 'bg-gray-200 border-gray-400 text-gray-400 dark:bg-slate-900 dark:border-gray-700 dark:text-gray-500'}`}>
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 6L14 14M14 6L6 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <div className="mt-2 text-xs text-center font-medium text-red-700 dark:text-red-300">Cancelled</div>
                  </div>
                </div>
              </div>

              {/* LR Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white dark:bg-slate-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow">
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">LR Number</div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">{lr.lrNumber}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Status</div>
                  {!editMode ? (
                    <span
                      className={`inline-block px-4 py-1 rounded-full font-bold mr-2 text-base shadow-sm
                        ${lr.status === 'Booked' ? 'bg-blue-100 text-blue-700' : ''}
                        ${lr.status === 'In Transit' ? 'bg-yellow-100 text-yellow-800' : ''}
                        ${lr.status === 'Out for Delivery' ? 'bg-yellow-200 text-yellow-900' : ''}
                        ${lr.status === 'Delivered' ? 'bg-green-100 text-green-700' : ''}
                        ${lr.status === 'Cancelled' ? 'bg-red-100 text-red-700' : ''}
                      `}
                    >
                      {STATUS_LABELS[lr.status as LRStatus] || lr.status}
                    </span>
                  ) : (
                    <select value={status} onChange={e => setStatus(e.target.value as LRStatus)} className="border rounded px-2 py-1 bg-white dark:bg-slate-900 dark:text-gray-100 border-gray-300 dark:border-gray-700">
                      {Object.keys(STATUS_LABELS).map(s => (
                        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                  )}
                  {user?.role === 'admin' && !editMode && (
                    <ShadButton
                      size="icon"
                      variant="outline"
                      className="ml-2 border-gray-200 dark:border-gray-600 text-gray-500 hover:text-blue-600 hover:border-blue-400 transition-colors"
                      aria-label="Edit Status"
                      onClick={() => setEditMode(true)}
                    >
                      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4 13.5V16h2.5l7.06-7.06-2.5-2.5L4 13.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M14.85 6.15a1.5 1.5 0 0 0 0-2.12l-1.88-1.88a1.5 1.5 0 0 0-2.12 0l-1.06 1.06 4 4 1.06-1.06z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </ShadButton>
                  )}
                  {editMode && (
                    <>
                      <ShadButton size="sm" className="ml-2 bg-red-500 text-white" onClick={handleStatusUpdate} disabled={loading}>Save</ShadButton>
                      <ShadButton size="sm" className="ml-2" variant="secondary" onClick={() => { setEditMode(false); setStatus(lr.status) }}>Cancel</ShadButton>
                    </>
                  )}
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Sender</div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">{lr.consignor?.name || lr.senderName}</div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">{lr.consignor?.address || lr.senderAddress}, {lr.consignor?.city || lr.senderCity} {lr.consignor?.pin || lr.senderPin}</div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">Phone: {lr.consignor?.phone || lr.senderPhone}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Receiver</div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">{lr.consignee?.name || lr.receiverName}</div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">{lr.consignee?.address || lr.receiverAddress}, {lr.consignee?.city || lr.receiverCity} {lr.consignee?.pin || lr.receiverPin}</div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">Phone: {lr.consignee?.phone || lr.receiverPhone}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Origin</div>
                  <div className="text-gray-900 dark:text-gray-100">{lr.origin}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Destination</div>
                  <div className="text-gray-900 dark:text-gray-100">{lr.destination}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Date</div>
                  <div className="text-gray-900 dark:text-gray-100">{lr.date ? new Date(lr.date).toLocaleDateString() : '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Vehicle No.</div>
                  <div className="text-gray-900 dark:text-gray-100">{lr.vehicleNumber || '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Packages</div>
                  <div className="text-gray-900 dark:text-gray-100">{lr.shipmentDetails?.noOfPackages || lr.noOfPackages || '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Weight</div>
                  <div className="text-gray-900 dark:text-gray-100">{lr.shipmentDetails?.weight || lr.weight || '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Goods Description</div>
                  <div className="text-gray-900 dark:text-gray-100">{lr.shipmentDetails?.description || lr.goodsDescription || '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Freight</div>
                    <div className="text-gray-900 dark:text-gray-100">₹{lr.charges?.freight ?? lr.charges?.freightCharges ?? lr.freight ?? '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Other Charges</div>
                    <div className="text-gray-900 dark:text-gray-100">₹{lr.charges?.other ?? lr.charges?.otherCharges ?? lr.otherCharges ?? '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total</div>
                    <div className="text-gray-900 dark:text-gray-100">₹{lr.charges?.total ?? lr.charges?.grandTotal ?? lr.total ?? '-'}</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </ShadCard>
    </motion.div>
  )
}
