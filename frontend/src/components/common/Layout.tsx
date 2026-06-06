import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard, Users, Calendar, Brain,
  BarChart3, Bell, MessageSquare, LogOut,
  Activity, ChevronRight, Menu, X, Settings,
  Shield
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

const navItems = [
  { to: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/patients',     label: 'Patients',     icon: Users           },
  { to: '/appointments', label: 'Appointments', icon: Calendar        },
  { to: '/diagnostics',  label: 'Diagnostics',  icon: Brain           },
  { to: '/analytics',    label: 'Analytics',    icon: BarChart3       },
  { to: '/ai-chat',      label: 'AI Assistant', icon: MessageSquare   },
];

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <div className="layout-root">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={clsx('sidebar', { collapsed, 'mobile-open': mobileOpen })}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="logo-icon">
            <Activity size={20} />
          </div>
          {!collapsed && (
            <div className="logo-text">
              <span className="logo-name">HealthOS</span>
              <span className="logo-tagline">Clinical Platform</span>
            </div>
          )}
          <button
            className="collapse-btn"
            onClick={() => setCollapsed(!collapsed)}
          >
            <ChevronRight
              size={16}
              style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.3s' }}
            />
          </button>
        </div>

        {/* User info */}
        <div className="sidebar-user">
          <div className="user-avatar">
            {user?.role?.[0]?.toUpperCase() ?? 'U'}
          </div>
          {!collapsed && (
            <div className="user-info">
              <span className="user-name">{user?.role === 'admin' ? 'Administrator' : user?.role === 'doctor' ? 'Dr. Smith' : 'User'}</span>
              <span className="user-role badge badge-info">{user?.role}</span>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx('nav-item', { 'nav-item-active': isActive })
              }
              onClick={() => setMobileOpen(false)}
            >
              <Icon size={18} className="nav-icon" />
              {!collapsed && <span className="nav-label">{label}</span>}
              {to === '/ai-chat' && !collapsed && (
                <span className="nav-badge">AI</span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom items */}
        <div className="sidebar-bottom">
          <button className="nav-item nav-item-ghost">
            <Settings size={18} className="nav-icon" />
            {!collapsed && <span className="nav-label">Settings</span>}
          </button>
          <button className="nav-item nav-item-ghost nav-item-danger" onClick={handleLogout}>
            <LogOut size={18} className="nav-icon" />
            {!collapsed && <span className="nav-label">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="main-area">
        {/* Header */}
        <header className="topbar">
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className="topbar-breadcrumb">
            <Shield size={14} style={{ color: 'var(--accent-teal)' }} />
            <span>Secure Session</span>
          </div>

          <div className="topbar-actions">
            <div className="status-indicator">
              <span className="status-dot" />
              <span>All systems operational</span>
            </div>
            <button className="topbar-notif-btn">
              <Bell size={18} />
              <span className="notif-badge">3</span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="page-content">
          <Outlet />
        </main>
      </div>

      <style>{`
        .layout-root {
          display: flex;
          height: 100vh;
          overflow: hidden;
          background: var(--bg-void);
        }

        /* Sidebar */
        .sidebar {
          width: var(--sidebar-width);
          background: var(--bg-base);
          border-right: 1px solid var(--border-subtle);
          display: flex;
          flex-direction: column;
          transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          flex-shrink: 0;
          position: relative;
          z-index: 100;
          overflow: hidden;
        }
        .sidebar.collapsed { width: 72px; }

        .mobile-overlay {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.6);
          z-index: 99;
        }

        @media (max-width: 768px) {
          .sidebar {
            position: fixed;
            left: -100%;
            height: 100vh;
            top: 0;
            width: var(--sidebar-width) !important;
            transition: left 0.3s ease;
          }
          .sidebar.mobile-open { left: 0; }
          .mobile-overlay { display: block; }
          .collapse-btn { display: none; }
        }

        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 20px 16px;
          border-bottom: 1px solid var(--border-subtle);
          min-height: 70px;
        }

        .logo-icon {
          width: 40px;
          height: 40px;
          background: var(--gradient-brand);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
          box-shadow: 0 4px 16px rgba(79, 142, 247, 0.35);
        }

        .logo-text {
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        .logo-name {
          font-family: var(--font-display);
          font-weight: 800;
          font-size: 18px;
          color: var(--text-primary);
          letter-spacing: -0.02em;
        }
        .logo-tagline {
          font-size: 10px;
          color: var(--text-muted);
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .collapse-btn {
          background: transparent;
          border: 1px solid var(--border-subtle);
          color: var(--text-muted);
          border-radius: 6px;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.2s;
        }
        .collapse-btn:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
          border-color: var(--border-strong);
        }

        .sidebar-user {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 16px;
          border-bottom: 1px solid var(--border-subtle);
        }

        .user-avatar {
          width: 36px;
          height: 36px;
          background: var(--gradient-brand);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 700;
          color: white;
          flex-shrink: 0;
        }

        .user-info {
          display: flex;
          flex-direction: column;
          gap: 3px;
          overflow: hidden;
        }
        .user-name {
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Nav items */
        .sidebar-nav {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 12px 8px;
          overflow-y: auto;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 10px;
          color: var(--text-secondary);
          font-size: 13.5px;
          font-weight: 500;
          transition: all 0.2s ease;
          background: transparent;
          border: none;
          cursor: pointer;
          width: 100%;
          text-align: left;
          text-decoration: none;
          white-space: nowrap;
          position: relative;
        }
        .nav-item:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }
        .nav-item-active {
          background: rgba(79, 142, 247, 0.12);
          color: var(--accent-primary);
          border: 1px solid rgba(79, 142, 247, 0.2);
        }
        .nav-item-active:hover { background: rgba(79, 142, 247, 0.18); }
        .nav-item-active .nav-icon { color: var(--accent-primary); }
        .nav-item-ghost { color: var(--text-muted); }
        .nav-item-danger:hover { color: var(--danger); background: rgba(244, 63, 94, 0.1); }

        .nav-icon { flex-shrink: 0; }
        .nav-label { flex: 1; }
        .nav-badge {
          font-size: 9px;
          font-weight: 700;
          padding: 2px 6px;
          background: var(--gradient-brand);
          border-radius: 100px;
          color: white;
          letter-spacing: 0.05em;
        }

        .sidebar-bottom {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 8px;
          border-top: 1px solid var(--border-subtle);
        }

        /* Topbar */
        .main-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
          overflow: hidden;
        }

        .topbar {
          height: var(--header-height);
          background: var(--bg-base);
          border-bottom: 1px solid var(--border-subtle);
          display: flex;
          align-items: center;
          padding: 0 24px;
          gap: 16px;
          flex-shrink: 0;
        }

        .mobile-menu-btn {
          display: none;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          padding: 8px;
        }
        @media (max-width: 768px) {
          .mobile-menu-btn { display: flex; }
        }

        .topbar-breadcrumb {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--text-muted);
        }

        .topbar-actions {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--success);
        }
        .status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--success);
          animation: pulse-glow 2s ease-in-out infinite;
        }

        .topbar-notif-btn {
          position: relative;
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          color: var(--text-secondary);
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .topbar-notif-btn:hover {
          color: var(--text-primary);
          border-color: var(--border-strong);
          background: var(--bg-hover);
        }
        .notif-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          width: 16px;
          height: 16px;
          background: var(--danger);
          color: white;
          border-radius: 50%;
          font-size: 9px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .page-content {
          flex: 1;
          overflow-y: auto;
          padding: 28px;
          background: var(--bg-void);
        }
        @media (max-width: 768px) {
          .page-content { padding: 16px; }
        }
      `}</style>
    </div>
  );
}
