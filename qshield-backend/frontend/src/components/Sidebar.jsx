import { NavLink, useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { canAccess } from '../utils/roleAccess';

const navItems = [
  { path: '/',                  icon: 'dashboard',    label: 'Dashboard',          feature: 'dashboard' },
  { path: '/assets',            icon: 'inventory_2',  label: 'Assets',             feature: 'assets' },
  { path: '/asset-inventory',   icon: 'account_tree', label: 'Asset Inventory',    feature: 'asset-inventory' },
  { path: '/security',          icon: 'security',     label: 'Security',           feature: 'security' },
  { path: '/vulnerability-scan',icon: 'bug_report',   label: 'Vulnerability Scan', feature: 'vulnerability-scan' },
  { path: '/threat-surface',    icon: 'travel_explore',label: 'Threat Surface',      feature: 'threat-surface' },
  { path: '/cbom',              icon: 'inventory',    label: 'CBOM',               feature: 'cbom' },
  { path: '/cyber-rating',      icon: 'grade',        label: 'Cyber Rating',       feature: 'cyber-rating' },
  { path: '/analytics',         icon: 'policy',       label: 'Posture of PQC',     feature: 'analytics' },
  { path: '/reports',           icon: 'description',  label: 'Reports',            feature: 'reports', fill: true },

];

export default function Sidebar() {
  const { logout, user } = useContext(AuthContext);
  const navigate = useNavigate();

  const role = user?.role || 'viewer';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const visibleNavItems = navItems.filter((item) => canAccess(role, item.feature));

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex flex-col py-6 bg-primary docked left-0 h-full w-64 shadow-[4px_0_24px_rgba(181,10,46,0.15)] border-r border-primary-variant/30">
      <div className="px-6 mb-6">
        <h1 className="text-xl font-bold text-white tracking-tighter uppercase">Requiem</h1>
      </div>

      {/* Role badge */}
      <nav className="flex-1 space-y-1 px-2 overflow-y-auto">
        {visibleNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              isActive
                ? "bg-secondary text-on-secondary rounded-xl mx-2 px-4 py-3 flex items-center gap-3 shadow-[0_4px_12px_rgba(250,188,10,0.3)] font-inter text-sm font-bold tracking-wide uppercase transition-all"
                : "text-white/80 hover:text-white mx-2 px-4 py-3 flex items-center gap-3 transition-all font-inter text-sm font-medium tracking-wide uppercase group hover:bg-white/5 rounded-xl"
            }
          >
            <span
              className="material-symbols-outlined"
              style={item.fill ? { fontVariationSettings: "'FILL' 1" } : {}}
            >
              {item.icon}
            </span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto px-4 space-y-1">
        {canAccess(role, 'settings') && (
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              isActive
                ? "bg-secondary text-on-secondary rounded-xl mx-2 px-4 py-3 flex items-center gap-3 shadow-[0_4px_12px_rgba(250,188,10,0.3)] font-inter text-sm font-bold tracking-wide uppercase transition-all"
                : "text-white/80 hover:text-white mx-2 px-4 py-3 flex items-center gap-3 transition-all font-inter text-sm font-medium tracking-wide uppercase hover:bg-white/5 rounded-xl"
            }
          >
            <span className="material-symbols-outlined">settings</span>
            <span>Settings</span>
          </NavLink>
        )}
        <button
          onClick={handleLogout}
          className="w-full mt-2 bg-white/5 hover:bg-white/20 border border-white/10 rounded-2xl px-4 py-3 text-left transition-all"
        >
          <div className="flex items-center gap-3">
            <span
              className="material-symbols-outlined text-white/60"
              aria-hidden
            >
              login
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] uppercase tracking-[0.4em] text-white/40">Logged in as</p>
              <p className="text-sm font-semibold text-white truncate">{user?.sub || 'User'}</p>
            </div>
          </div>
          <p className="mt-2 text-[10px] uppercase tracking-[0.3em] text-white/50">
            Tap to log out
          </p>
        </button>
      </div>
    </aside>
  );
}
