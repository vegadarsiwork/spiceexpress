import { useEffect, useState, useRef } from 'react'
import { toast } from '../lib/toast'
import { API_BASE_URL } from '../lib/api'

const DEFAULT_AVATAR = 'https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png'

export default function Profile() {
  const [user, setUser] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState({
    avatar: '',
    name: '',
    role: '',
    phone: '',
    company: '',
    address: ''
  })

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    fetch(API_BASE_URL + '/auth/me', {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to load profile');
        return res.json();
      })
      .then(data => {
        setUser(data);
        setForm({
          avatar: data.avatar || '',
          name: data.name || '',
          role: data.role || '',
          phone: data.phone || '',
          company: data.company || '',
          address: data.address || '',
        });
      })
      .catch(() => setError('Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleEdit = () => setEditMode(true)
  const handleCancel = () => {
    setEditMode(false)
    setForm({
      avatar: user?.avatar || '',
      name: user?.name || '',
      role: user?.role || '',
      phone: user?.phone || '',
      company: user?.company || '',
      address: user?.address || '',
    })
  }
  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Name is required.');
      return;
    }
    try {
      const token = localStorage.getItem('auth_token');
      // Only send editable fields (not role if not changed)
      const payload: any = {
        avatar: form.avatar,
        name: form.name,
        phone: form.phone,
        company: form.company,
        address: form.address,
      };
      if (form.role && form.role !== user?.role) payload.role = form.role;
      const res = await fetch(API_BASE_URL + '/auth/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        let msg = 'Failed to update profile';
        try {
          const errJson = await res.json();
          msg = errJson.error || msg;
        } catch {}
        toast.error(msg);
        setError(msg);
        return;
      }
      const updated = await res.json();
      setUser(updated);
      setEditMode(false);
      toast.success('Profile updated successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
      toast.error(err.message || 'Failed to update profile');
    }
  }

  if (loading) return (
    <div className="p-8 bg-slate-50 dark:bg-slate-950 min-h-[calc(100dvh-4rem)] flex items-center justify-center">
      <div className="w-full max-w-4xl mx-auto animate-pulse space-y-8">
        <div className="h-10 bg-gray-300 dark:bg-gray-700 rounded w-1/3 mx-auto mb-6" />
        <div className="flex flex-col md:flex-row gap-10">
          <div className="flex flex-col items-center md:items-start bg-[#F5F5F5] dark:bg-slate-900 rounded-xl p-8 w-full md:w-80 mb-8 md:mb-0">
            <div className="w-28 h-28 rounded-full bg-gray-200 dark:bg-gray-700 mb-4" />
            <div className="h-6 bg-gray-200 dark:bg-slate-900 rounded w-2/3 mb-2" />
            <div className="h-4 bg-gray-200 dark:bg-slate-900 rounded w-1/2 mb-1" />
            <div className="h-4 bg-gray-200 dark:bg-slate-900 rounded w-1/3" />
          </div>
          <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl shadow p-8">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="h-6 bg-gray-200 dark:bg-slate-900 rounded mb-4" />
                <div className="h-6 bg-gray-200 dark:bg-slate-900 rounded mb-4" />
              </div>
              <div className="h-6 bg-gray-200 dark:bg-slate-900 rounded mb-4" />
              <div className="flex gap-4 mt-2">
                <div className="h-10 w-24 bg-gray-300 dark:bg-gray-700 rounded" />
                <div className="h-10 w-24 bg-gray-300 dark:bg-gray-700 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
  if (error) return <div className="p-8 bg-slate-50 dark:bg-slate-950 min-h-[calc(100dvh-4rem)] text-red-600 dark:text-red-400">{error}</div>
  if (!user) return <div className="p-8 bg-slate-50 dark:bg-slate-950 min-h-[calc(100dvh-4rem)] text-gray-600 dark:text-gray-300">No profile data.</div>

  return (
    <div className="p-8 bg-slate-50 dark:bg-slate-950 min-h-[calc(100dvh-4rem)]">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-extrabold mb-8 text-gray-900 dark:text-gray-100">Profile</h1>
        <div className="flex flex-col md:flex-row gap-10">
          {/* Sidebar Card */}
          <div className="flex flex-col items-center md:items-start bg-[#F5F5F5] dark:bg-slate-900 rounded-xl p-8 w-full md:w-80 mb-8 md:mb-0">
            <div className="w-28 h-28 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex items-center justify-center mb-4 shadow-lg">
              <img src={form.avatar || DEFAULT_AVATAR} alt="avatar" className="object-cover w-full h-full transition-all duration-200 group-hover:opacity-80" />
            </div>
            {editMode && (
              <div className="flex flex-col gap-2 w-full mb-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full shadow hover:bg-blue-700 border-2 border-white"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <span className="font-semibold">Upload</span>
                  </button>
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const formData = new FormData();
                      formData.append('avatar', file);
                      const token = localStorage.getItem('auth_token');
                      try {
                        const res = await fetch(API_BASE_URL + '/auth/upload-avatar', {
                          method: 'POST',
                          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                          body: formData,
                        });
                        if (!res.ok) throw new Error('Upload failed');
                        const data = await res.json();
                        setForm(f => ({ ...f, avatar: data.url }));
                        toast.success('Profile picture uploaded!');
                      } catch {
                        toast.error('Failed to upload image');
                      }
                    }}
                  />
                  <input
                    type="text"
                    name="avatar"
                    value={form.avatar}
                    onChange={handleChange}
                    placeholder="Paste image URL"
                    className="px-2 py-1 text-xs bg-white/90 dark:bg-slate-950/90 border border-gray-300 dark:border-gray-700 focus:outline-none rounded-lg flex-1"
                  />
                </div>
              </div>
            )}
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
              {editMode ? (
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="border rounded-lg px-2 py-1 w-full bg-gray-100 dark:bg-gray-700 focus:bg-white dark:focus:bg-gray-800 focus:outline-none text-gray-900 dark:text-gray-100 text-xl font-bold"
                  placeholder="Name"
                />
              ) : (
                user?.name || <span className="text-gray-400">No Name</span>
              )}
            </div>
            <div className="text-gray-500 dark:text-gray-400 text-base mb-1">
              {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : <span className="text-gray-400">No Role</span>}
              {user?.company ? `, ${user.company}` : ''}
            </div>
            <div className="text-gray-400 text-sm mb-2">
              {user?.email || <span className="text-gray-500">No Email</span>}
            </div>
          </div>

          {/* Main Form Card */}
          <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl shadow p-8">
            <form className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-base font-medium mb-2 text-gray-900 dark:text-gray-100">Phone number</label>
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    className="border rounded-lg px-4 py-3 w-full bg-gray-100 dark:bg-gray-700 focus:bg-white dark:focus:bg-gray-800 focus:outline-none text-gray-900 dark:text-gray-100"
                    disabled={!editMode}
                  />
                </div>
                <div>
                  <label className="block text-base font-medium mb-2 text-gray-900 dark:text-gray-100">Company</label>
                  <input
                    name="company"
                    value={form.company}
                    onChange={handleChange}
                    className="border rounded-lg px-4 py-3 w-full bg-gray-100 dark:bg-gray-700 focus:bg-white dark:focus:bg-gray-800 focus:outline-none text-gray-900 dark:text-gray-100"
                    disabled={!editMode}
                  />
                </div>
              </div>
              <div>
                <label className="block text-base font-medium mb-2 text-gray-900 dark:text-gray-100">Address</label>
                <textarea
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  className="border rounded-lg px-4 py-3 w-full bg-gray-100 dark:bg-gray-700 focus:bg-white dark:focus:bg-gray-800 focus:outline-none min-h-[100px] text-gray-900 dark:text-gray-100"
                  disabled={!editMode}
                />
              </div>
              <div className="flex gap-4 mt-2">
                {!editMode && (
                  <button
                    type="button"
                    className="px-6 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-semibold hover:bg-gray-300 dark:hover:bg-gray-600"
                    onClick={handleEdit}
                  >
                    Edit
                  </button>
                )}
                {editMode && (
                  <>
                    <button
                      type="button"
                      className="px-6 py-2 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600"
                      onClick={handleSave}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="px-6 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-semibold hover:bg-gray-300 dark:hover:bg-gray-600"
                      onClick={handleCancel}
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
