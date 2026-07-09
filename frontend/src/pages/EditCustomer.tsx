import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { customerApi } from '../lib/api';

const indianStates = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

interface LaneRate {
  from: string;
  to: string;
  rateType: 'perKg' | 'perPackage';
  rate: number;
}

interface DefaultCharges {
  docketCharge: number;
  doorDeliveryCharge: number;
  handlingCharge: number;
  pickupCharge: number;
  transhipmentCharge: number;
  insurance: number;
  fuelSurcharge: number;
  commission: number;
  other: number;
  carrierRisk: number;
  ownerRisk: number;
  gstPercent: number;
}

interface CustomerForm {
  code: string;
  name: string;
  company: string;
  address: string;
  state: string;
  city: string;
  pin: string;
  phone: string;
  fax: string;
  email: string;
  hsnCode: string;
  cftRatio: string;
  gst1: string;
  gstin: string;
  pan: string;
  bankName: string;
  accountNo: string;
  micr: string;
  ifsc: string;
  rate: Record<string, LaneRate>;
  defaultCharges: DefaultCharges;
}

const initialForm: CustomerForm = {
  code: '',
  name: '',
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
  ifsc: '',
  rate: {},
  defaultCharges: {
    docketCharge: 0,
    doorDeliveryCharge: 0,
    handlingCharge: 0,
    pickupCharge: 0,
    transhipmentCharge: 0,
    insurance: 0,
    fuelSurcharge: 0,
    commission: 0,
    other: 0,
    carrierRisk: 0,
    ownerRisk: 0,
    gstPercent: 0,
  },
};

export default function EditCustomer() {
  const { id } = useParams();
  const [form, setForm] = useState<CustomerForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // New lane input state
  const [newLane, setNewLane] = useState({ from: '', to: '', rateType: 'perKg' as 'perKg' | 'perPackage', rate: '' });

  useEffect(() => {
    async function fetchCustomer() {
      setLoading(true);
      setError(null);
      try {
        const data = await customerApi.getById(id!);
        setForm({
          ...initialForm,
          ...data,
          rate: data.rate || {},
          defaultCharges: { ...initialForm.defaultCharges, ...(data.defaultCharges || {}) }
        });
      } catch (err: any) {
        setError(err.message || 'Failed to fetch customer');
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchCustomer();
  }, [id]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleChargeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      defaultCharges: {
        ...prev.defaultCharges,
        [name]: parseFloat(value) || 0
      }
    }));
  }

  function addLaneRate() {
    if (!newLane.from.trim() || !newLane.to.trim() || !newLane.rate) return;
    const laneKey = `${newLane.from.trim().toLowerCase()}-${newLane.to.trim().toLowerCase()}`;
    setForm(prev => ({
      ...prev,
      rate: {
        ...prev.rate,
        [laneKey]: {
          from: newLane.from.trim(),
          to: newLane.to.trim(),
          rateType: newLane.rateType,
          rate: parseFloat(newLane.rate) || 0
        }
      }
    }));
    setNewLane({ from: '', to: '', rateType: 'perKg', rate: '' });
  }

  function removeLaneRate(laneKey: string) {
    setForm(prev => {
      const newRate = { ...prev.rate };
      delete newRate[laneKey];
      return { ...prev, rate: newRate };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await customerApi.update(id!, form);
      navigate('/admin/customer-list');
    } catch (err: any) {
      setError(err.message || 'Failed to update customer');
    } finally {
      setLoading(false);
    }
  }

  if (loading && !form.code) {
    return (
      <div className="p-8 bg-slate-50 dark:bg-slate-950 min-h-[calc(100dvh-4rem)]">
        <div className="text-gray-600 dark:text-gray-300">Loading customer...</div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-slate-50 dark:bg-slate-950 min-h-[calc(100dvh-4rem)]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Edit Customer</h1>
      </div>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-xl shadow p-8 max-w-4xl mx-auto space-y-8 border border-gray-200 dark:border-gray-700">
        {/* Customer Information */}
        <div>
          <h2 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-100">Customer Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Customer Code</label>
              <input name="code" value={form.code} onChange={handleChange} className="border rounded px-3 py-2 w-full bg-gray-50 dark:bg-[#181C23] text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Customer Name</label>
              <input name="name" value={form.name} onChange={handleChange} className="border rounded px-3 py-2 w-full bg-gray-50 dark:bg-[#181C23] text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Company Name</label>
              <input name="company" value={form.company} onChange={handleChange} className="border rounded px-3 py-2 w-full bg-gray-50 dark:bg-[#181C23] text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600" />
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div>
          <h2 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-100">Address Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Address</label>
              <input name="address" value={form.address} onChange={handleChange} className="border rounded px-3 py-2 w-full bg-gray-50 dark:bg-[#181C23] text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">State</label>
              <select name="state" value={form.state} onChange={handleChange} className="border rounded px-3 py-2 w-full bg-gray-50 dark:bg-[#181C23] text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600">
                <option value="">-- Select State --</option>
                {indianStates.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">City</label>
              <input name="city" value={form.city} onChange={handleChange} className="border rounded px-3 py-2 w-full bg-gray-50 dark:bg-[#181C23] text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Pin Code</label>
              <input name="pin" value={form.pin} onChange={handleChange} className="border rounded px-3 py-2 w-full bg-gray-50 dark:bg-[#181C23] text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Phone</label>
              <input name="phone" value={form.phone} onChange={handleChange} className="border rounded px-3 py-2 w-full bg-gray-50 dark:bg-[#181C23] text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Email</label>
              <input name="email" value={form.email} onChange={handleChange} className="border rounded px-3 py-2 w-full bg-gray-50 dark:bg-[#181C23] text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">GSTIN</label>
              <input name="gstin" value={form.gstin} onChange={handleChange} className="border rounded px-3 py-2 w-full bg-gray-50 dark:bg-[#181C23] text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">PAN</label>
              <input name="pan" value={form.pan} onChange={handleChange} className="border rounded px-3 py-2 w-full bg-gray-50 dark:bg-[#181C23] text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600" />
            </div>
          </div>
        </div>

        {/* Bank Information */}
        <div>
          <h2 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-100">Bank Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Bank Name</label>
              <input name="bankName" value={form.bankName} onChange={handleChange} className="border rounded px-3 py-2 w-full bg-gray-50 dark:bg-[#181C23] text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Account No</label>
              <input name="accountNo" value={form.accountNo} onChange={handleChange} className="border rounded px-3 py-2 w-full bg-gray-50 dark:bg-[#181C23] text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">MICR</label>
              <input name="micr" value={form.micr} onChange={handleChange} className="border rounded px-3 py-2 w-full bg-gray-50 dark:bg-[#181C23] text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">IFSC</label>
              <input name="ifsc" value={form.ifsc} onChange={handleChange} className="border rounded px-3 py-2 w-full bg-gray-50 dark:bg-[#181C23] text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600" />
            </div>
          </div>
        </div>

        {/* Lane Rate Mapping */}
        <div>
          <h2 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-100">Lane Rate Mapping</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Set shipping rates for specific routes. Freight will be calculated based on rate type.</p>
          <div className="flex flex-wrap gap-4 items-end mb-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">From City</label>
              <input
                type="text"
                value={newLane.from}
                onChange={e => setNewLane(l => ({ ...l, from: e.target.value }))}
                className="border rounded px-3 py-2 w-32 bg-gray-50 dark:bg-[#181C23] text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                placeholder="e.g. Nagpur"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">To City</label>
              <input
                type="text"
                value={newLane.to}
                onChange={e => setNewLane(l => ({ ...l, to: e.target.value }))}
                className="border rounded px-3 py-2 w-32 bg-gray-50 dark:bg-[#181C23] text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                placeholder="e.g. Mumbai"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Rate Type</label>
              <select
                value={newLane.rateType}
                onChange={e => setNewLane(l => ({ ...l, rateType: e.target.value as 'perKg' | 'perPackage' }))}
                className="border rounded px-3 py-2 w-36 bg-gray-50 dark:bg-[#181C23] text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
              >
                <option value="perKg">Per Kg</option>
                <option value="perPackage">Per Package</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Rate (₹)</label>
              <input
                type="number"
                value={newLane.rate}
                onChange={e => setNewLane(l => ({ ...l, rate: e.target.value }))}
                className="border rounded px-3 py-2 w-28 bg-gray-50 dark:bg-[#181C23] text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                placeholder="15.00"
                min="0"
                step="0.01"
              />
            </div>
            <button
              type="button"
              onClick={addLaneRate}
              className="px-4 py-2 rounded font-medium bg-green-500 text-white hover:bg-green-600"
            >
              Add Lane
            </button>
          </div>
          {/* Display existing lane rates */}
          {Object.keys(form.rate).length > 0 && (
            <div className="space-y-2">
              {Object.entries(form.rate).map(([laneKey, lane]) => (
                <div key={laneKey} className="flex items-center gap-4 p-3 rounded-lg bg-gray-100 dark:bg-slate-950">
                  <span className="text-gray-900 dark:text-gray-100 font-medium">{lane.from} → {lane.to}</span>
                  <span className="text-gray-700 dark:text-gray-200">
                    ₹{lane.rate} / {lane.rateType === 'perKg' ? 'kg' : 'package'}
                  </span>
                  <button
                    type="button"
                    className="ml-auto px-3 py-1 rounded text-sm font-medium bg-red-500 text-white hover:bg-red-600"
                    onClick={() => removeLaneRate(laneKey)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Default Charges (Taxes & Duties) */}
        <div>
          <h2 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-100">Default Charges (Taxes & Duties)</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">These values will be auto-filled when creating LRs for this customer.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Docket Charge</label>
              <input type="number" name="docketCharge" value={form.defaultCharges.docketCharge} onChange={handleChargeChange} className="border rounded px-3 py-2 w-full bg-gray-50 dark:bg-[#181C23] text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600" min="0" step="0.01" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Door Delivery</label>
              <input type="number" name="doorDeliveryCharge" value={form.defaultCharges.doorDeliveryCharge} onChange={handleChargeChange} className="border rounded px-3 py-2 w-full bg-gray-50 dark:bg-[#181C23] text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600" min="0" step="0.01" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Handling Charge</label>
              <input type="number" name="handlingCharge" value={form.defaultCharges.handlingCharge} onChange={handleChargeChange} className="border rounded px-3 py-2 w-full bg-gray-50 dark:bg-[#181C23] text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600" min="0" step="0.01" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Pickup Charge</label>
              <input type="number" name="pickupCharge" value={form.defaultCharges.pickupCharge} onChange={handleChargeChange} className="border rounded px-3 py-2 w-full bg-gray-50 dark:bg-[#181C23] text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600" min="0" step="0.01" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Transhipment</label>
              <input type="number" name="transhipmentCharge" value={form.defaultCharges.transhipmentCharge} onChange={handleChargeChange} className="border rounded px-3 py-2 w-full bg-gray-50 dark:bg-[#181C23] text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600" min="0" step="0.01" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Insurance</label>
              <input type="number" name="insurance" value={form.defaultCharges.insurance} onChange={handleChargeChange} className="border rounded px-3 py-2 w-full bg-gray-50 dark:bg-[#181C23] text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600" min="0" step="0.01" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Fuel Surcharge</label>
              <input type="number" name="fuelSurcharge" value={form.defaultCharges.fuelSurcharge} onChange={handleChargeChange} className="border rounded px-3 py-2 w-full bg-gray-50 dark:bg-[#181C23] text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600" min="0" step="0.01" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Commission</label>
              <input type="number" name="commission" value={form.defaultCharges.commission} onChange={handleChargeChange} className="border rounded px-3 py-2 w-full bg-gray-50 dark:bg-[#181C23] text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600" min="0" step="0.01" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Other</label>
              <input type="number" name="other" value={form.defaultCharges.other} onChange={handleChargeChange} className="border rounded px-3 py-2 w-full bg-gray-50 dark:bg-[#181C23] text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600" min="0" step="0.01" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Carrier Risk</label>
              <input type="number" name="carrierRisk" value={form.defaultCharges.carrierRisk} onChange={handleChargeChange} className="border rounded px-3 py-2 w-full bg-gray-50 dark:bg-[#181C23] text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600" min="0" step="0.01" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Owner Risk</label>
              <input type="number" name="ownerRisk" value={form.defaultCharges.ownerRisk} onChange={handleChargeChange} className="border rounded px-3 py-2 w-full bg-gray-50 dark:bg-[#181C23] text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600" min="0" step="0.01" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">GST %</label>
              <input type="number" name="gstPercent" value={form.defaultCharges.gstPercent} onChange={handleChargeChange} className="border rounded px-3 py-2 w-full bg-gray-50 dark:bg-[#181C23] text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600" min="0" max="100" step="0.01" placeholder="e.g. 18" />
            </div>
          </div>
        </div>

        {error && <div className="text-red-600 text-sm">{error}</div>}
        <div className="flex justify-end gap-4 mt-8">
          <button
            type="submit"
            className="px-6 py-2 rounded font-medium bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            type="button"
            className="px-6 py-2 rounded font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100"
            onClick={() => navigate('/admin/customer-list')}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
