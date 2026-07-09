import { useState, useEffect } from 'react';
import { customerApi } from '../lib/api';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import type { Customer } from '../lib/api';

export default function RateMapping() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [newLane, setNewLane] = useState<{ from: string; to: string; rate: string; rateType: 'perKg' | 'perPackage' }>({ from: '', to: '', rate: '', rateType: 'perKg' });
  const [defaultCharges, setDefaultCharges] = useState<any>({
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
    gstPercent: 0
  });
  const [, setLoading] = useState(false); // loading state not used but setLoading is called
  const [error, setError] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');

  useEffect(() => {
    async function fetchCustomers() {
      setLoading(true);
      try {
        const data = await customerApi.getAll();
        setCustomers(data);
      } catch (err: any) {
        setError('Failed to load customers');
      } finally {
        setLoading(false);
      }
    }
    fetchCustomers();
  }, []);

  const handleLaneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewLane(l => ({ ...l, [e.target.name]: e.target.value }));
  };

  const addLaneRate = async () => {
    if (!selectedCustomer || !newLane.from.trim() || !newLane.to.trim() || !newLane.rate.trim()) return;
    const laneKey = `${newLane.from.trim().toLowerCase()}-${newLane.to.trim().toLowerCase()}`;
    const updatedRate = {
      ...(selectedCustomer.rate || {}),
      [laneKey]: {
        from: newLane.from.trim(),
        to: newLane.to.trim(),
        rateType: newLane.rateType,
        rate: parseFloat(newLane.rate)
      }
    };
    // Always send all required fields for Customer
    // Ensure all required fields are present for Customer
    const updatedCustomer: Customer = {
      ...selectedCustomer,
      rate: updatedRate,
      _id: selectedCustomer._id,
      code: selectedCustomer.code,
      company: selectedCustomer.company,
      address: selectedCustomer.address ?? '',
      state: selectedCustomer.state ?? '',
      city: selectedCustomer.city ?? '',
      pin: selectedCustomer.pin ?? '',
      phone: selectedCustomer.phone ?? '',
      fax: selectedCustomer.fax ?? '',
      email: selectedCustomer.email ?? '',
      hsnCode: selectedCustomer.hsnCode ?? '',
      cftRatio: selectedCustomer.cftRatio ?? '',
      gst1: selectedCustomer.gst1 ?? '',
      gstin: selectedCustomer.gstin ?? '',
      pan: selectedCustomer.pan ?? '',
      bankName: selectedCustomer.bankName ?? '',
      accountNo: selectedCustomer.accountNo ?? '',
      micr: selectedCustomer.micr ?? '',
      ifsc: selectedCustomer.ifsc ?? '',
      createdBy: selectedCustomer.createdBy ?? '',
      createdAt: selectedCustomer.createdAt,
      updatedAt: selectedCustomer.updatedAt
    };
    try {
      await customerApi.update(selectedCustomer._id, updatedCustomer);
      setSelectedCustomer(updatedCustomer);
      setNewLane({ from: '', to: '', rate: '', rateType: 'perKg' });
      setError(null);
    } catch (err: any) {
      setError('Failed to add lane rate');
    }
  };

  const deleteLaneRate = async (laneKey: string) => {
    if (!selectedCustomer) return;
    const updatedRate = { ...(selectedCustomer.rate || {}) };
    delete updatedRate[laneKey];
    // Always send all required fields for Customer
    // Ensure all required fields are present for Customer
    const updatedCustomer: Customer = {
      ...selectedCustomer,
      rate: updatedRate,
      _id: selectedCustomer._id,
      code: selectedCustomer.code,
      company: selectedCustomer.company,
      address: selectedCustomer.address ?? '',
      state: selectedCustomer.state ?? '',
      city: selectedCustomer.city ?? '',
      pin: selectedCustomer.pin ?? '',
      phone: selectedCustomer.phone ?? '',
      fax: selectedCustomer.fax ?? '',
      email: selectedCustomer.email ?? '',
      hsnCode: selectedCustomer.hsnCode ?? '',
      cftRatio: selectedCustomer.cftRatio ?? '',
      gst1: selectedCustomer.gst1 ?? '',
      gstin: selectedCustomer.gstin ?? '',
      pan: selectedCustomer.pan ?? '',
      bankName: selectedCustomer.bankName ?? '',
      accountNo: selectedCustomer.accountNo ?? '',
      micr: selectedCustomer.micr ?? '',
      ifsc: selectedCustomer.ifsc ?? '',
      createdBy: selectedCustomer.createdBy ?? '',
      createdAt: selectedCustomer.createdAt,
      updatedAt: selectedCustomer.updatedAt
    };
    try {
      await customerApi.update(selectedCustomer._id, updatedCustomer);
      setSelectedCustomer(updatedCustomer);
      setError(null);
    } catch (err: any) {
      setError('Failed to delete lane rate');
    }
  };

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-slate-50 dark:bg-slate-950 flex flex-col items-center py-10 px-4 sm:px-8">
      <div className="w-full max-w-2xl">
        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100 text-center">Rate Mapping</h1>
        <div className="mb-8 p-6 rounded-xl bg-white dark:bg-slate-900 shadow">
          <Label className="mb-2 text-lg font-semibold block">Select Customer</Label>
          <div className="relative">
            <Input
              type="text"
              placeholder="Type customer code or name..."
              value={customerSearch}
              onChange={e => setCustomerSearch(e.target.value)}
              className="mb-2"
              autoComplete="off"
            />
            {customerSearch.trim() && (
              <div className="absolute left-0 right-0 top-full z-10 bg-white dark:bg-slate-950 border border-gray-200 dark:border-gray-700 rounded shadow mt-1 max-h-60 overflow-auto">
                {customers
                  .filter(c =>
                    c.code.toLowerCase().includes(customerSearch.toLowerCase()) ||
                    c.company.toLowerCase().includes(customerSearch.toLowerCase())
                  )
                  .slice(0, 10)
                  .map(c => (
                    <div
                      key={c._id}
                      className={`px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-900 ${selectedCustomer?._id === c._id ? 'bg-gray-100 dark:bg-slate-900' : ''}`}
                      onClick={() => {
                        setSelectedCustomer(c);
                        setCustomerSearch('');
                        if (c.defaultCharges) {
                          setDefaultCharges(c.defaultCharges);
                        } else {
                          // reset to 0 if no default charges
                          setDefaultCharges({
                            docketCharge: 0, doorDeliveryCharge: 0, handlingCharge: 0, pickupCharge: 0, transhipmentCharge: 0, insurance: 0, fuelSurcharge: 0, commission: 0, other: 0, carrierRisk: 0, ownerRisk: 0, gstPercent: 0
                          });
                        }
                      }}
                    >
                      <span className="font-medium">{c.code}</span> - {c.company}
                    </div>
                  ))}
                {customers.filter(c =>
                  c.code.toLowerCase().includes(customerSearch.toLowerCase()) ||
                  c.company.toLowerCase().includes(customerSearch.toLowerCase())
                ).length === 0 && (
                    <div className="px-4 py-2 text-gray-500">No matches found</div>
                  )}
              </div>
            )}
          </div>
          {selectedCustomer && (
            <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
              Selected: <span className="font-semibold">{selectedCustomer.code}</span> - {selectedCustomer.company}
            </div>
          )}
        </div>
        {selectedCustomer && (
          <Card className="mb-8 p-6">
            <Label className="text-lg font-semibold mb-6 block">Lane Rates (per kg)</Label>
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex flex-wrap gap-4 items-center">
                <Input
                  type="text"
                  name="from"
                  placeholder="From"
                  value={newLane.from}
                  onChange={handleLaneChange}
                  className="w-32"
                />
                <span className="text-muted-foreground">-</span>
                <Input
                  type="text"
                  name="to"
                  placeholder="To"
                  value={newLane.to}
                  onChange={handleLaneChange}
                  className="w-32"
                />
                <Input
                  type="number"
                  name="rate"
                  placeholder="Rate"
                  value={newLane.rate}
                  onChange={handleLaneChange}
                  className="w-32"
                  min="0"
                  step="0.01"
                />
                <select
                  name="rateType"
                  value={newLane.rateType}
                  onChange={(e) => setNewLane(l => ({ ...l, rateType: e.target.value as 'perKg' | 'perPackage' }))}
                  className="border rounded px-3 py-2 text-sm bg-white dark:bg-slate-950 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700"
                >
                  <option value="perKg">per Kg</option>
                  <option value="perPackage">per Pkg</option>
                </select>
                <Button type="button" variant="default" onClick={addLaneRate} className="h-10 px-6">
                  Add Lane
                </Button>
              </div>
            </div>
            {/* List existing lanes */}
            {selectedCustomer.rate && Object.keys(selectedCustomer.rate).length > 0 ? (
              <div className="space-y-3 mb-8">
                {Object.entries(selectedCustomer.rate).map(([laneKey, lane]) => {
                  const rateVal = lane.rate || lane.ratePerKg || lane.ratePerPackage || 0;
                  const rateType = lane.rateType || (lane.ratePerPackage ? 'perPackage' : 'perKg');
                  return (
                    <div key={laneKey} className="flex items-center gap-4 p-3 rounded-lg bg-gray-100 dark:bg-slate-950">
                      <span className="text-gray-900 dark:text-gray-100 font-medium w-40">{lane.from} - {lane.to}</span>
                      <span className="text-gray-700 dark:text-gray-200 w-40">@ ₹{rateVal} / {rateType === 'perKg' ? 'kg' : 'pkg'}</span>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="ml-2"
                        onClick={() => deleteLaneRate(laneKey)}
                      >
                        Delete
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-gray-500 dark:text-gray-400 mb-8">No lanes added.</div>
            )}

            {/* Default Charges Section */}
            <div className="border-t pt-6 mt-6">
              <Label className="text-lg font-semibold mb-4 block">Default Charges (Taxes & Duties)</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {Object.keys(defaultCharges).map((key) => (
                  <div key={key}>
                    <Label className="capitalize text-xs mb-1 block">{key.replace(/([A-Z])/g, ' $1').trim()}</Label>
                    <Input
                      type="number"
                      value={defaultCharges[key]}
                      onChange={(e) => setDefaultCharges({ ...defaultCharges, [key]: parseFloat(e.target.value) || 0 })}
                      className="h-8"
                      min="0"
                      step="0.01"
                    />
                  </div>
                ))}
              </div>
              <Button
                type="button"
                onClick={async () => {
                  if (!selectedCustomer) return;
                  try {
                    const updatedCustomer = { ...selectedCustomer, defaultCharges };
                    await customerApi.update(selectedCustomer._id, updatedCustomer);
                    setSelectedCustomer(updatedCustomer);
                    alert('Charges updated successfully');
                  } catch (e) {
                    setError('Failed to update charges');
                  }
                }}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Save Charges
              </Button>
            </div>
            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 dark:bg-red-950 dark:border-red-900">
                <div className="text-red-800 text-sm dark:text-red-300">{error}</div>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
