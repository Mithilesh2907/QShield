import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function Layout({ onScan }) {
  return (
    <>
      <Sidebar />
      <main className="fixed top-0 right-0 left-64 bottom-0 flex flex-col overflow-y-auto bg-surface tech-pattern">
        <TopBar onScan={onScan} />
        <div className="mt-16 p-8 space-y-8 max-w-[1600px]">
          <Outlet />
        </div>
        <footer className="mt-auto p-8 border-t border-outline-variant/10 text-on-surface-variant/40 text-[10px] font-bold uppercase tracking-widest flex justify-between items-center">
          <span>© 2024 Luminous Guardian Security Services</span>
          <div className="flex gap-4">
            <a className="hover:text-secondary transition-colors" href="#">Privacy</a>
            <a className="hover:text-secondary transition-colors" href="#">Compliance</a>
            <a className="hover:text-secondary transition-colors" href="#">Support</a>
          </div>
        </footer>
      </main>
    </>
  );
}
