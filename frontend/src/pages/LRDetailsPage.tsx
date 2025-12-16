import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { lrApi, customerApi } from '../lib/api'
import type { LR } from '../lib/api'

// Backend status values (authoritative)
const TRACKING_STEPS = ['Booked', 'In Transit', 'Out for Delivery', 'Delivered', 'Cancelled'];

function Stepper({ current }: { current: string }) {
  const idx = TRACKING_STEPS.indexOf(current);
  return (
    <div className="flex items-center justify-between w-full px-2 py-6">
      {TRACKING_STEPS.map((label, i) => {
        const isDone = i < idx;
        const isCurrent = i === idx;
        return (
          <div key={label} className="flex-1 flex flex-col items-center relative">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-200 ${isDone ? 'bg-red-600 text-white' : isCurrent ? 'bg-red-700 text-white scale-105 shadow-lg' : 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}
            >
              {i + 1}
            </div>
            <div className="mt-2 text-sm text-center text-gray-700 dark:text-gray-300">{label}</div>
            {i < TRACKING_STEPS.length - 1 && (
              <div className={`absolute top-5 right-0 w-full h-0.5 ${i < idx ? 'bg-red-400' : 'bg-gray-300 dark:bg-gray-700'}`} style={{ left: '50%', right: '-50%' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function LRDetailsPage() {
  const navigate = useNavigate()
  const { lrId } = useParams()
  const [lr, setLr] = useState<LR | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Update UI state for update status flow
  const [showStatusSelect, setShowStatusSelect] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (!lrId) return
    setLoading(true)
    lrApi
      .getById(lrId)
      .then(d => {
        setLr(d)
        setError(null)
      })
      .catch(() => setError('Failed to fetch LR details'))
      .finally(() => setLoading(false))
  }, [lrId])

  const currentStatus = useMemo(() => (lr?.status as string) || 'Booked', [lr])

  if (loading) return <div className="flex justify-center items-center h-96"><span className="text-lg">Loading...</span></div>
  if (error) return <div className="flex justify-center items-center h-96"><span className="text-lg text-red-500">{error}</span></div>
  if (!lr) return <div className="flex justify-center items-center h-96"><span className="text-lg text-gray-500">LR not found</span></div>

  async function handleSaveStatus(e?: React.FormEvent) {
    e?.preventDefault()
    if (!lr) {
      setShowStatusSelect(false)
      return
    }
    if (!selectedStatus || selectedStatus === (lr.status as string)) {
      setShowStatusSelect(false)
      return
    }
    setUpdating(true)

    // Build backend-shaped payload using only fields we have on the frontend LR object

    const payload: any = {
      status: selectedStatus, // backend enum string
      consignor: {
        name: lr.consignor?.name || '',
        address: lr.consignor?.address || '',
        city: lr.consignor?.city || '',
        state: lr.consignor?.state || '',
        pin: lr.consignor?.pin || '',
        phone: lr.consignor?.phone || '',
        email: lr.consignor?.email || '',
        gstin: lr.consignor?.gstin || '',
      },
      consignee: {
        name: lr.consignee?.name || '',
        address: lr.consignee?.address || '',
        city: lr.consignee?.city || '',
        state: lr.consignee?.state || '',
        pin: lr.consignee?.pin || '',
        phone: lr.consignee?.phone || '',
        email: lr.consignee?.email || '',
        gstin: lr.consignee?.gstin || '',
      },
      charges: lr.charges ? { ...lr.charges } : undefined,
    }

    // try to preserve customer if present; backend expects an ObjectId in `customer`
    if ((lr as any).customer) {
      payload.customer = (lr as any).customer
    } else if ((lr as any).customerCode) {
      // Attempt to resolve customerCode -> customer _id so backend validation passes
      try {
        const customers = await customerApi.getAll()
        const match = customers.find((c: any) => c.code === (lr as any).customerCode || c._id === (lr as any).customerCode)
        if (match) payload.customer = match._id
        else {
          // fallback: include customerCode so `customer` field is present (avoids missing-field validation)
          payload.customer = (lr as any).customerCode
          console.warn('Could not resolve customer for code, falling back to customerCode', (lr as any).customerCode)
        }
      } catch (err) {
        // network error resolving customers -> include customerCode as fallback
        payload.customer = (lr as any).customerCode
        console.warn('Failed to fetch customers to resolve customerCode, falling back to customerCode', err)
      }
    }
    // optimistic UI
    const prev = lr
    setLr({ ...lr, status: selectedStatus } as LR)
    try {
      await lrApi.update((lr as any)._id, payload)
      setShowStatusSelect(false)
    } catch (err) {
      // revert
      setLr(prev)
      // Keep message minimal but useful for debugging
      alert('Failed to update status. Please try again.')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="px-4 py-8 md:px-20 lg:px-40 xl:px-48 max-w-[1800px] mx-auto bg-gray-50 dark:bg-gray-950 min-h-full space-y-10 transition-colors">
      <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-base text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-white"
        >
          Back
        </button>
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white flex-1 text-center">LR Details · <span className="font-mono">{lr.lrNumber}</span></h1>
        <div className="flex gap-2">
          <button
            className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
            onClick={async () => {
              if (!lr) return;
              const token = localStorage.getItem('auth_token');
              try {
                const res = await fetch(`/api/lr/${lr._id}/download`, {
                  method: 'GET',
                  headers: {
                    'Authorization': `Bearer ${token}`
                  }
                });
                if (!res.ok) throw new Error('Failed to download LR');
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `LR_${lr.lrNumber || lr._id}.pdf`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
              } catch (err) {
                alert('Download failed. Please try again.');
              }
            }}
          >
            Download
          </button>
          <button
            className="px-4 py-2 rounded-lg bg-yellow-400 text-white font-semibold hover:bg-yellow-500 transition"
            onClick={() => lr && navigate(`/edit-lr/${lr._id}`)}
          >
            Edit
          </button>
          <button
            className="px-4 py-2 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 transition"
            onClick={async () => {
              if (!lr) return;
              if (!window.confirm('Are you sure you want to delete this LR?')) return;
              try {
                await lrApi.delete(lr._id);
                alert('LR deleted successfully.');
                navigate('/lrs');
              } catch (err) {
                alert('Failed to delete LR.');
              }
            }}
          >
            Delete
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow p-8 w-full transition-colors">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-base font-semibold text-gray-800 dark:text-gray-300">Tracking</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Status: <span className="font-bold text-blue-600 dark:text-blue-400">{(lr.status as string) || 'Booked'}</span></div>
        </div>
        <Stepper current={currentStatus} />
        <div className="mt-6 flex flex-col items-center">
          {!showStatusSelect && (
            <button
              className="px-6 py-2 rounded-lg bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 transition"
              onClick={() => {
                setSelectedStatus((lr.status as string) || TRACKING_STEPS[0])
                setShowStatusSelect(true)
              }}
            >
              Update Status
            </button>
          )}

          {showStatusSelect && (
            <form onSubmit={handleSaveStatus} className="flex flex-col sm:flex-row items-center gap-3 mt-2">
              <select
                className="border rounded-lg px-3 py-2 text-base dark:bg-gray-800 dark:text-white"
                value={selectedStatus || ''}
                onChange={e => setSelectedStatus(e.target.value)}
                disabled={updating}
              >
                {TRACKING_STEPS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <button type="submit" className="px-4 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 transition disabled:opacity-60" disabled={updating || !selectedStatus}>
                {updating ? 'Updating...' : 'Save'}
              </button>
              <button type="button" className="px-4 py-2 rounded-lg bg-gray-300 text-gray-800 font-semibold hover:bg-gray-400 transition dark:bg-gray-700 dark:text-white" onClick={() => setShowStatusSelect(false)} disabled={updating}>
                Cancel
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow p-8 w-full transition-colors">
        <div className="mb-4 text-lg font-semibold text-gray-800 dark:text-gray-200">Shipment Info</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">Booking Date</div>
            <div className="text-base font-semibold text-gray-900 dark:text-white mt-1">{lr.bookingDate ? new Date(lr.bookingDate).toLocaleDateString('en-IN') : 'N/A'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">Payment Type</div>
            <div className="text-base font-semibold text-gray-900 dark:text-white mt-1">{lr.charges?.paymentType || 'Billed'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">Dispatch Branch</div>
            <div className="text-base font-semibold text-gray-900 dark:text-white mt-1">{(lr as any).dispatchBranch || 'N/A'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">E-Way Bill No</div>
            <div className="text-base font-semibold text-blue-700 dark:text-blue-300 mt-1">{(lr as any).ewayBillNumber || 'N/A'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">Vehicle Number</div>
            <div className="text-base font-semibold text-gray-900 dark:text-white mt-1">{(lr as any).vehicleNumber || 'N/A'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">Driver Name</div>
            <div className="text-base font-semibold text-gray-900 dark:text-white mt-1">{(lr as any).driverName || 'N/A'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">No. of Packages</div>
            <div className="text-base font-bold text-blue-700 dark:text-blue-200 mt-1">{lr.shipmentDetails?.numberOfArticles ?? 'N/A'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">Actual Weight (Kg)</div>
            <div className="text-base font-bold text-blue-700 dark:text-blue-200 mt-1">{lr.shipmentDetails?.actualWeight ?? 'N/A'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">Charged Weight (Kg)</div>
            <div className="text-base font-bold text-blue-700 dark:text-blue-200 mt-1">{lr.shipmentDetails?.chargedWeight ?? 'N/A'}</div>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">Description of Goods</div>
            <div className="text-base font-semibold text-gray-900 dark:text-white mt-1">{lr.shipmentDetails?.descriptionOfGoods || 'Not specified'}</div>
          </div>
        </div>

        {/* Customer Invoice Details */}
        {((lr as any).customerInvoice?.number || (lr as any).customerInvoice?.value) && (
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Customer Invoice Details</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">Invoice Number</div>
                <div className="text-base font-semibold text-gray-900 dark:text-white mt-1">{(lr as any).customerInvoice?.number || 'N/A'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">Invoice Date</div>
                <div className="text-base font-semibold text-gray-900 dark:text-white mt-1">{(lr as any).customerInvoice?.date ? new Date((lr as any).customerInvoice.date).toLocaleDateString('en-IN') : 'N/A'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">Invoice Value</div>
                <div className="text-base font-bold text-green-600 dark:text-green-400 mt-1">₹ {(lr as any).customerInvoice?.value?.toLocaleString('en-IN') || 'N/A'}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow p-8 w-full transition-colors">
          <div className="mb-3 text-base font-semibold text-gray-800 dark:text-gray-300">Consignor (Sender)</div>
          <div className="space-y-2">
            <div className="text-lg font-bold text-gray-900 dark:text-white">{lr.consignor?.name || 'N/A'}</div>
            <div className="text-gray-600 dark:text-gray-400 text-sm whitespace-pre-line">
              {lr.consignor?.address || ''}
              {lr.consignor?.city ? `, ${lr.consignor.city}` : ''}
              {lr.consignor?.state ? `, ${lr.consignor.state}` : ''}
              {lr.consignor?.pin ? ` - ${lr.consignor.pin}` : ''}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mt-2">
              {lr.consignor?.phone && (
                <div><span className="text-gray-500 dark:text-gray-400">Phone:</span> <span className="text-gray-900 dark:text-white">{lr.consignor.phone}</span></div>
              )}
              {lr.consignor?.email && (
                <div><span className="text-gray-500 dark:text-gray-400">Email:</span> <span className="text-gray-900 dark:text-white">{lr.consignor.email}</span></div>
              )}
              {lr.consignor?.gstin && (
                <div><span className="text-gray-500 dark:text-gray-400">GSTIN:</span> <span className="text-blue-600 dark:text-blue-400 font-mono">{lr.consignor.gstin}</span></div>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow p-8 w-full transition-colors">
          <div className="mb-3 text-base font-semibold text-gray-800 dark:text-gray-300">Consignee (Receiver)</div>
          <div className="space-y-2">
            <div className="text-lg font-bold text-gray-900 dark:text-white">{lr.consignee?.name || 'N/A'}</div>
            <div className="text-gray-600 dark:text-gray-400 text-sm whitespace-pre-line">
              {lr.consignee?.address || ''}
              {lr.consignee?.city ? `, ${lr.consignee.city}` : ''}
              {lr.consignee?.state ? `, ${lr.consignee.state}` : ''}
              {lr.consignee?.pin ? ` - ${lr.consignee.pin}` : ''}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mt-2">
              {lr.consignee?.phone && (
                <div><span className="text-gray-500 dark:text-gray-400">Phone:</span> <span className="text-gray-900 dark:text-white">{lr.consignee.phone}</span></div>
              )}
              {lr.consignee?.email && (
                <div><span className="text-gray-500 dark:text-gray-400">Email:</span> <span className="text-gray-900 dark:text-white">{lr.consignee.email}</span></div>
              )}
              {lr.consignee?.gstin && (
                <div><span className="text-gray-500 dark:text-gray-400">GSTIN:</span> <span className="text-blue-600 dark:text-blue-400 font-mono">{lr.consignee.gstin}</span></div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow p-8 w-full max-w-3xl mx-auto transition-colors">
        <div className="mb-3 text-lg font-semibold text-gray-800 dark:text-gray-200">Freight Bill</div>
        <div className="flex flex-col gap-2">
          {lr.charges && (
            <>
              <div className="flex justify-between border-b border-gray-200 dark:border-gray-700 pb-2">
                <span className="text-gray-600 dark:text-gray-400">Base Freight</span>
                <span className="font-bold text-blue-700 dark:text-blue-200 text-lg">₹ {lr.charges.freight?.toLocaleString('en-IN') ?? '0'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 dark:border-gray-700 pb-2">
                <span className="text-gray-600 dark:text-gray-400">Docket Charge</span>
                <span className="font-semibold text-gray-700 dark:text-gray-300">₹ {lr.charges.docketCharge?.toLocaleString('en-IN') ?? '0'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 dark:border-gray-700 pb-2">
                <span className="text-gray-600 dark:text-gray-400">Pickup Charge</span>
                <span className="font-semibold text-gray-700 dark:text-gray-300">₹ {lr.charges.pickupCharge?.toLocaleString('en-IN') ?? '0'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 dark:border-gray-700 pb-2">
                <span className="text-gray-600 dark:text-gray-400">Door Delivery Charge</span>
                <span className="font-semibold text-gray-700 dark:text-gray-300">₹ {lr.charges.doorDeliveryCharge?.toLocaleString('en-IN') ?? '0'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 dark:border-gray-700 pb-2">
                <span className="text-gray-600 dark:text-gray-400">Handling Charge</span>
                <span className="font-semibold text-gray-700 dark:text-gray-300">₹ {lr.charges.handlingCharge?.toLocaleString('en-IN') ?? '0'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 dark:border-gray-700 pb-2">
                <span className="text-gray-600 dark:text-gray-400">Transhipment Charge</span>
                <span className="font-semibold text-gray-700 dark:text-gray-300">₹ {lr.charges.transhipmentCharge?.toLocaleString('en-IN') ?? '0'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 dark:border-gray-700 pb-2">
                <span className="text-gray-600 dark:text-gray-400">Insurance</span>
                <span className="font-semibold text-gray-700 dark:text-gray-300">₹ {(lr.charges as any).insurance?.toLocaleString('en-IN') ?? '0'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 dark:border-gray-700 pb-2">
                <span className="text-gray-600 dark:text-gray-400">Fuel Surcharge</span>
                <span className="font-semibold text-gray-700 dark:text-gray-300">₹ {(lr.charges as any).fuelSurcharge?.toLocaleString('en-IN') ?? '0'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 dark:border-gray-700 pb-2">
                <span className="text-gray-600 dark:text-gray-400">Carrier Risk</span>
                <span className="font-semibold text-gray-700 dark:text-gray-300">₹ {(lr.charges as any).carrierRisk?.toLocaleString('en-IN') ?? '0'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 dark:border-gray-700 pb-2">
                <span className="text-gray-600 dark:text-gray-400">Owner Risk</span>
                <span className="font-semibold text-gray-700 dark:text-gray-300">₹ {(lr.charges as any).ownerRisk?.toLocaleString('en-IN') ?? '0'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 dark:border-gray-700 pb-2">
                <span className="text-gray-600 dark:text-gray-400">Commission</span>
                <span className="font-semibold text-gray-700 dark:text-gray-300">₹ {(lr.charges as any).commission?.toLocaleString('en-IN') ?? '0'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 dark:border-gray-700 pb-2">
                <span className="text-gray-600 dark:text-gray-400">Other Charges</span>
                <span className="font-semibold text-gray-700 dark:text-gray-300">₹ {lr.charges.other?.toLocaleString('en-IN') ?? '0'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 dark:border-gray-700 pb-2 bg-gray-50 dark:bg-gray-800 px-2 -mx-2 rounded">
                <span className="text-gray-700 dark:text-gray-300 font-semibold">Subtotal (Pre-Tax)</span>
                <span className="font-bold text-gray-900 dark:text-white">₹ {(lr.charges as any).subTotal?.toLocaleString('en-IN') ?? ((lr.charges.freight || 0) + (lr.charges.docketCharge || 0) + (lr.charges.pickupCharge || 0) + (lr.charges.doorDeliveryCharge || 0) + (lr.charges.handlingCharge || 0) + (lr.charges.transhipmentCharge || 0) + ((lr.charges as any).insurance || 0) + ((lr.charges as any).fuelSurcharge || 0) + (lr.charges.other || 0)).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 dark:border-gray-700 pb-2">
                <span className="text-gray-600 dark:text-gray-400">GST</span>
                <span className="font-bold text-blue-700 dark:text-blue-200">₹ {lr.charges.gstCharge?.toLocaleString('en-IN') ?? '0'}</span>
              </div>
              <div className="flex justify-between pt-3 bg-blue-50 dark:bg-blue-900/30 px-3 -mx-2 py-2 rounded-lg">
                <span className="text-gray-900 dark:text-white font-bold text-lg">Grand Total</span>
                <span className="text-blue-700 dark:text-blue-300 font-extrabold text-xl">₹ {lr.charges.total?.toLocaleString('en-IN') ?? '0'}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}