import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { invoiceApi } from '../lib/api';

export default function InvoiceDetailsPage() {
  const { invoiceId } = useParams();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!invoiceId) return;
    setLoading(true);
    setError(null);
    invoiceApi.getById(invoiceId)
      .then(setInvoice)
      .catch((err) => setError(err.message || 'Failed to load invoice'))
      .finally(() => setLoading(false));
  }, [invoiceId]);

  if (loading) return <div className="p-8">Loading invoice...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!invoice) return <div className="p-8">Invoice not found</div>;

  // Helper for customer display
  const customer = invoice.customer || invoice.customerInfo || {};
  const customerDisplay = customer.company ? `${customer.company} (${customer.code || invoice.customerCode})` : invoice.customerCode;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">Invoice Details</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <div className="mb-2 text-lg font-semibold text-blue-700 dark:text-blue-300">Invoice Info</div>
          <div className="mb-1">Invoice #: <span className="font-mono font-bold">{invoice.invoiceNumber}</span></div>
          <div className="mb-1">Date: {invoice.date ? new Date(invoice.date).toLocaleDateString() : '-'}</div>
          <div className="mb-1">Status: <span className="font-semibold">{invoice.status}</span></div>
          <div className="mb-1">Due Date: {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '-'}</div>
          <div className="mb-1">PO Number: {invoice.poNumber || '-'}</div>
          <div className="mb-1">HSN: {invoice.hsn || '-'}</div>
          <div className="mb-1">Billing OU: {invoice.billingOU || '-'}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <div className="mb-2 text-lg font-semibold text-blue-700 dark:text-blue-300">Customer Info</div>
          <div className="mb-1">Customer: <span className="font-semibold">{customerDisplay}</span></div>
          <div className="mb-1">GSTIN: {customer.gstin || invoice.supplierGstin || '-'}</div>
          <div className="mb-1">Address: {customer.address || invoice.billingAddress || '-'}</div>
          <div className="mb-1">Contact: {customer.phone || invoice.contactDetails || '-'}</div>
        </div>
      </div>
      <div className="mb-8 bg-white dark:bg-slate-900 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
        <div className="mb-2 text-lg font-semibold text-blue-700 dark:text-blue-300">Charges Breakdown</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>Freight: <span className="font-bold">₹{invoice.freightValue?.toLocaleString() ?? '-'}</span></div>
          <div>CGST: <span className="font-bold">₹{invoice.cgst?.toLocaleString() ?? '-'}</span></div>
          <div>SGST: <span className="font-bold">₹{invoice.sgst?.toLocaleString() ?? '-'}</span></div>
          <div>GST %: <span className="font-bold">{invoice.gstPercent ?? '-'}</span></div>
          <div>Total Amount: <span className="font-bold text-green-700 dark:text-green-300">₹{invoice.totalAmount?.toLocaleString()}</span></div>
        </div>
      </div>
      <div className="mb-8 bg-white dark:bg-slate-900 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
        <div className="mb-2 text-lg font-semibold text-blue-700 dark:text-blue-300">Linked LRs ({Array.isArray(invoice.lrList) ? invoice.lrList.length : 0})</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 text-gray-700 dark:text-gray-200">
                <th className="px-3 py-2">AWB No</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">From</th>
                <th className="px-3 py-2">To</th>
                <th className="px-3 py-2">Packages</th>
                <th className="px-3 py-2">Weight</th>
                <th className="px-3 py-2">Freight</th>
                <th className="px-3 py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(invoice.lrList) && invoice.lrList.length > 0 ? invoice.lrList.map((lr: any) => (
                <tr key={lr._id} className="border-t">
                  <td className="px-3 py-2">{lr.lrNumber}</td>
                  <td className="px-3 py-2">{lr.bookingDate ? new Date(lr.bookingDate).toLocaleDateString() : '-'}</td>
                  <td className="px-3 py-2">{lr.consignor?.city || '-'}</td>
                  <td className="px-3 py-2">{lr.consignee?.city || '-'}</td>
                  <td className="px-3 py-2">{lr.shipmentDetails?.numberOfArticles ?? '-'}</td>
                  <td className="px-3 py-2">{lr.shipmentDetails?.chargedWeight ?? '-'}</td>
                  <td className="px-3 py-2">₹{lr.charges?.freight ?? '-'}</td>
                  <td className="px-3 py-2">₹{lr.charges?.total ?? '-'}</td>
                </tr>
              )) : (
                <tr><td colSpan={8} className="p-4 text-gray-500">No LRs linked to this invoice.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex gap-4 mt-6">
        <a
          href={invoiceApi.download(invoice._id)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600 font-medium"
        >
          Download PDF
        </a>
        <Link to="/invoices" className="inline-flex items-center px-4 py-2 rounded bg-gray-200 dark:bg-gray-700 text-blue-700 dark:text-blue-300 font-medium hover:bg-gray-300 dark:hover:bg-gray-600">Back to Invoices</Link>
      </div>
    </div>
  );
}
