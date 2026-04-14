import { NavLink, useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const navItems = [
  { path: '/', icon: 'dashboard', label: 'Dashboard' },
  { path: '/assets', icon: 'inventory_2', label: 'Assets' },
  { path: '/asset-inventory', icon: 'account_tree', label: 'Asset Inventory' },
  { path: '/security', icon: 'security', label: 'Security' },
  { path: '/vulnerability-scan', icon: 'bug_report', label: 'Vulnerability Scan' },
  { path: '/threat-surface', icon: 'travel_explore', label: 'Threat Surface' },
  { path: '/cbom', icon: 'inventory', label: 'CBOM' },
  { path: '/cyber-rating', icon: 'grade', label: 'Cyber Rating' },
  { path: '/analytics', icon: 'policy', label: 'Posture of PQC' },
  { path: '/reports', icon: 'description', label: 'Reports', fill: true },
];

export default function Sidebar() {
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const NavItem = ({ item }) => (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      className={({ isActive }) =>
        [
          'relative flex items-center gap-3 px-5 py-[11px] group z-10',
          'font-inter text-[11px] font-bold tracking-[0.13em] uppercase',
          'transition-all duration-300 ease-out',
          isActive
            ? 'text-secondary border-l-[3px] border-secondary nav-active-pulse'
            : 'text-white/55 border-l-[3px] border-transparent hover:text-white/90 hover:border-l-[3px] hover:border-white/25',
        ].join(' ')
      }
    >
      {({ isActive }) => (
        <>
          {/* Active background wash */}
          {isActive && (
            <span
              className="absolute inset-0 z-0 pointer-events-none"
              style={{
                background: 'linear-gradient(90deg, rgba(250,188,10,0.18) 0%, rgba(250,188,10,0.07) 50%, transparent 100%)',
              }}
            />
          )}
          {/* Hover wash */}
          {!isActive && (
            <span className="absolute inset-0 z-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.06) 0%, transparent 80%)' }}
            />
          )}

          {/* Icon */}
          <span
            className={[
              'material-symbols-outlined text-[20px] shrink-0 relative z-10 transition-all duration-300',
              isActive ? 'drop-shadow-[0_0_6px_rgba(250,188,10,0.7)]' : 'group-hover:scale-110',
            ].join(' ')}
            style={{
              fontVariationSettings: isActive || item.fill ? "'FILL' 1, 'wght' 500" : "'FILL' 0, 'wght' 300",
            }}
          >
            {item.icon}
          </span>

          {/* Label */}
          <span className="relative z-10 leading-tight truncate">{item.label}</span>

          {/* Active indicator dot with ping */}
          {isActive && (
            <span className="ml-auto relative z-10 shrink-0">
              <span className="absolute inline-flex h-2 w-2 rounded-full bg-secondary ping-gold" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-secondary shadow-[0_0_8px_3px_rgba(250,188,10,0.6)]" />
            </span>
          )}
        </>
      )}
    </NavLink>
  );

  return (
    <aside
      className="sidebar-noise fixed inset-y-0 left-0 z-50 flex flex-col w-64 overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, #C0122F 0%, #9A0820 40%, #7A0518 100%)',
        boxShadow: '4px 0 40px rgba(120,4,16,0.45), 2px 0 8px rgba(0,0,0,0.2)',
        borderRight: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {/* Ambient glow orbs */}
      <div className="sidebar-glow-top" />
      <div className="sidebar-glow-bottom" />

      {/* Top highlight edge */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none z-10" />

      {/* Brand */}
      <div className="relative z-10 px-6 pt-7 pb-8">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #FABC0A 0%, #D49D00 100%)', boxShadow: '0 2px 8px rgba(250,188,10,0.4)' }}
          >
            <span className="material-symbols-outlined text-[15px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
          </div>
          <h1 className="text-[17px] font-black text-white tracking-tight uppercase leading-none">Requiem</h1>
        </div>
        {/* Brand underline shimmer */}
        <div
          className="mt-4 h-px"
          style={{ background: 'linear-gradient(90deg, rgba(250,188,10,0.5) 0%, rgba(255,255,255,0.08) 60%, transparent 100%)' }}
        />
      </div>

      {/* Nav section label */}
      <div className="relative z-10 px-6 mb-2">
        <span className="text-[9px] font-bold tracking-[0.25em] uppercase text-white/30">Navigation</span>
      </div>

      {/* Nav items */}
      <nav className="relative z-10 flex-1 overflow-y-auto space-y-0 scrollbar-none">
        {navItems.map((item) => (
          <NavItem key={item.path} item={item} />
        ))}
      </nav>

      {/* Footer separator */}
      <div className="relative z-10 mx-5 my-3">
        <div
          className="h-px"
          style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.08) 0%, rgba(250,188,10,0.25) 50%, rgba(255,255,255,0.04) 100%)' }}
        />
      </div>

      {/* Settings */}
      <div className="relative z-10">
        <NavItem item={{ path: '/settings', icon: 'settings', label: 'Settings' }} />
      </div>

      {/* Logout */}
      <div className="relative z-10 px-5 pt-3 pb-6">
        <button
          onClick={handleLogout}
          className="group w-full flex items-center justify-center gap-2 py-2.5 px-4 text-white/60 hover:text-white text-[11px] font-bold uppercase tracking-widest transition-all duration-300 relative overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.09)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
          }}
        >
          <span className="material-symbols-outlined text-[16px] transition-transform duration-200 group-hover:translate-x-0.5">logout</span>
          Logout
        </button>
      </div>

      {/* Bottom edge highlight */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none z-10" />
    </aside>
  );
}
