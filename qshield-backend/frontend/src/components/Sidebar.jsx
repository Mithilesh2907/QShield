import { NavLink, useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const navItems = [
  { path: '/', icon: 'dashboard', label: 'Dashboard' },
  { path: '/assets', icon: 'inventory_2', label: 'Assets' },
  // { path: '/monitoring', icon: 'monitor_heart', label: 'Monitoring' },
  { path: '/security', icon: 'security', label: 'Security' },
  { path: '/analytics', icon: 'analytics', label: 'Analytics' },
  { path: '/reports', icon: 'description', label: 'Reports', fill: true },
];

export default function Sidebar() {
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex flex-col py-6 bg-gradient-to-b from-[#81001d] to-[#a51c30] docked left-0 h-full w-64 shadow-2xl shadow-[#1d1b19]/20">
      <div className="px-6 mb-10">
        <h1 className="text-xl font-bold text-white tracking-tighter uppercase">QShield</h1>
        <p className="text-[10px] text-white/50 font-medium tracking-[0.2em] uppercase mt-1">Ethereal Fortress v1.0</p>
      </div>
      <nav className="flex-1 space-y-1 px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              isActive
                ? "bg-[#964900] text-white rounded-xl mx-2 px-4 py-3 flex items-center gap-3 shadow-lg shadow-[#964900]/40 font-inter text-sm font-medium tracking-wide uppercase"
                : "text-white/70 hover:text-white mx-2 px-4 py-3 flex items-center gap-3 transition-all font-inter text-sm font-medium tracking-wide uppercase group"
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
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            isActive
              ? "bg-[#964900] text-white rounded-xl mx-2 px-4 py-3 flex items-center gap-3 shadow-lg shadow-[#964900]/40 font-inter text-sm font-medium tracking-wide uppercase"
              : "text-white/70 hover:text-white mx-2 px-4 py-3 flex items-center gap-3 transition-all font-inter text-sm font-medium tracking-wide uppercase"
          }
        >
          <span className="material-symbols-outlined">settings</span>
          <span>Settings</span>
        </NavLink>
        <button className="w-full mt-4 bg-gradient-to-r from-secondary to-secondary-container text-white py-3 px-4 rounded-xl font-bold uppercase text-xs tracking-widest shadow-xl shadow-secondary/20 active:scale-95 transition-all">
          Emergency Lockdown
        </button>
        <button
          onClick={handleLogout}
          className="w-full mt-2 bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-white py-3 px-4 rounded-xl font-bold uppercase text-xs tracking-widest shadow-xl transition-all flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">logout</span>
          Logout
        </button>
      </div>
    </aside>
  );
}
