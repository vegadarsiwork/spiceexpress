import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { customerApi } from '../lib/api';

interface Customer {
  _id: string;
  code: string;
  company: string;
  address?: string;
  state?: string;
  city?: string;
  pin?: string;
  phone?: string;
  fax?: string;
  email?: string;
  hsnCode?: string;
  cftRatio?: string;
  gst1?: string;
  gstin?: string;
  pan?: string;
  bankName?: string;
  accountNo?: string;
  micr?: string;
  ifsc?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export default function CustomerList() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filtered, setFiltered] = useState<Customer[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);

  // Delete handler
  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this customer?')) return;
    setDeleteLoadingId(id);
    try {
      await customerApi.delete(id);
      setCustomers(cs => cs.filter(c => c._id !== id));
      setFiltered(fs => fs.filter(c => c._id !== id));
    } catch (err) {
      alert('Failed to delete customer');
    } finally {
      setDeleteLoadingId(null);
    }
  };

  useEffect(() => {
    async function fetchCustomers() {
      setLoading(true);
      setError(null);
      try {
        const data = await customerApi.getAll();
        setCustomers(data);
        setFiltered(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch customers');
      } finally {
        setLoading(false);
      }
    }
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (!filter.trim()) {
      setFiltered(customers);
    } else {
      const q = filter.toLowerCase();
      setFiltered(
        customers.filter(
          c =>
            c.code.toLowerCase().includes(q) ||
            c.company.toLowerCase().includes(q) ||
            (c.state?.toLowerCase() || '').includes(q) ||
            (c.createdBy?.toLowerCase() || '').includes(q)
        )
      );
    }
    setPage(1);
  }, [filter, customers]);

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  return (
    <div className="p-8 bg-slate-50 dark:bg-slate-950 min-h-[calc(100dvh-4rem)]">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">List of Customers</h1>
        <button
          className="px-5 py-2 bg-red-500 text-white rounded hover:bg-red-600 font-semibold"
          onClick={() => navigate('/admin/add-customer')}
        >
          Add New Customer
        </button>
      </div>
      <div className="mb-4 flex justify-between items-center">
        <input
          type="text"
          placeholder="Filter customers..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="border rounded px-3 py-2 w-64 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700"
        />
      </div>
      <div className="overflow-x-auto bg-white dark:bg-slate-900 rounded-xl shadow border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Customer Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Company Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">State</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created By</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-500 dark:text-gray-400">Loading...</td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-red-600 dark:text-red-400">{error}</td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-500 dark:text-gray-400">No customers found.</td>
              </tr>
            ) : (
              paginated.map(c => (
                <tr key={c._id} className="hover:bg-gray-50 dark:hover:bg-gray-900 transition">
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-100">{c.code}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-100">{c.company}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-100">{c.state}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-100">{c.createdBy}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-100">{new Date(c.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap flex gap-2">
                    <button
                      className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs"
                      onClick={() => navigate(`/admin/edit-customer/${c._id}`)}
                      type="button"
                    >Edit</button>
                    <button
                      className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs disabled:opacity-50"
                      onClick={() => handleDelete(c._id)}
                      type="button"
                      disabled={deleteLoadingId === c._id}
                    >{deleteLoadingId === c._id ? 'Deleting...' : 'Delete'}</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {/* Pagination */}
      <div className="flex justify-end items-center gap-2 mt-6">
        <button
          className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-50"
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          Prev
        </button>
        <span className="text-gray-700 dark:text-gray-200">Page {page} of {totalPages || 1}</span>
        <button
          className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-50"
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page === totalPages || totalPages === 0}
        >
          Next
        </button>
      </div>
    </div>
  );
}
