import { NavLink } from 'react-router-dom'
import { cn } from '../lib/utils'
import { getUserFromStorage } from '../lib/auth'
import {
  User,
  MapPin,
  FileText,
  BarChart3,
  Truck,
  FileSpreadsheet,
  Home,
  ArrowLeft,
  LogOut
} from 'lucide-react'

const navItems = [
  { label: 'Dashboard', to: '/dashboard', icon: Home, roles: ['admin', 'user'] },
  { label: 'Tracking', to: '/tracking', icon: MapPin, roles: ['admin', 'user'] },
  { label: 'LRs', to: '/lrs', icon: Truck, roles: ['admin', 'user'] },
  { label: 'Invoices', to: '/invoices', icon: FileText, roles: ['admin', 'user'] },
  { label: 'Customer List', to: '/admin/customer-list', icon: User, roles: ['admin'] },
  { label: 'Add Customer', to: '/admin/add-customer', icon: User, roles: ['admin'] },
  { label: 'MIS', to: '/mis', icon: BarChart3, roles: ['admin'] },
  { label: 'Create LR', to: '/create-lr', icon: FileSpreadsheet, roles: ['admin'] },
]

export default function Sidebar() {
  const user = getUserFromStorage();
  // If user is not authenticated, show a compact sidebar with only a Login link
  if (!user) {
    return (
      <aside className="h-screen w-64 flex flex-col border-r bg-white dark:bg-slate-950 dark:border-slate-800 fixed top-0 left-0 z-30">
        <div className="flex h-16 items-center border-b px-6 dark:border-slate-800 shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Navigation</h2>
        </div>
        <nav className="flex-1 p-4">
          <NavLink to="/login" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900">
            <User className="h-5 w-5" />
            <span>Login</span>
          </NavLink>
        </nav>
      </aside>
    )
  }

  return (
    <aside className="h-screen w-64 flex flex-col border-r bg-white dark:bg-slate-950 dark:border-slate-800 fixed top-0 left-0 z-30">
      {/* Sidebar Header */}
      <div className="flex h-16 items-center border-b px-6 dark:border-slate-800 shrink-0">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Navigation</h2>
      </div>
      {/* Navigation Items */}
      <nav className="flex-1 space-y-1 p-4 overflow-visible">
        {navItems.filter(item => !item.roles || (user && item.roles.includes(user.role))).map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.label}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-900 dark:hover:text-slate-100",
                  isActive
                    ? "bg-slate-100 text-slate-900 dark:bg-slate-900 dark:text-slate-100"
                    : "text-slate-600 dark:text-slate-400"
                )
              }
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>
      {/* Sidebar Footer (Logout + User details) */}
      <div className="border-t p-4 dark:border-slate-800 shrink-0 flex flex-col gap-3">
        <NavLink
          to="/"
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Landing Page
        </NavLink>
        <button
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-slate-900 transition"
          onClick={() => {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user');

            // Trigger auth state change event
            window.dispatchEvent(new CustomEvent('authStateChanged'));

            window.location.href = '/login';
          }}
        >
          <LogOut className="h-5 w-5" />
          Logout
        </button>
        {user && (
          <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400">
            <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-900 flex items-center justify-center overflow-hidden">
              {user.avatar ? (
                <img src={user.avatar} alt="avatar" className="object-cover w-8 h-8 rounded-full" />
              ) : (
                <User className="h-4 w-4" />
              )}
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">{user.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}

