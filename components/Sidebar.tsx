import React from 'react';
import { Server, Hammer, Database, Users, Settings, LogOut, Cpu } from 'lucide-react';
import { User } from '../types';

interface SidebarProps {
  currentUser: User;
  viewMode: string;
  setViewMode: (mode: 'dashboard' | 'builder' | 'images' | 'users' | 'settings') => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (isOpen: boolean) => void;
  setDashboardFilter: (filter: 'mine' | 'all') => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  currentUser, viewMode, setViewMode, 
  isMobileMenuOpen, setIsMobileMenuOpen, setDashboardFilter, onLogout 
}) => {
  const isAdmin = ['admin', 'dev_user'].includes(currentUser.role);

  return (
    <div className={`${isMobileMenuOpen ? 'flex' : 'hidden'} md:flex w-full md:w-64 bg-slate-950 border-b md:border-b-0 md:border-r border-slate-800 flex-col shrink-0 h-auto md:h-full absolute md:relative z-40`}>
      <div className="p-6 hidden md:block cursor-pointer" onClick={() => setViewMode('dashboard')}>
        <div className="text-xl font-bold text-white flex gap-2 items-center">
          <Cpu className="text-blue-500"/> DockManager
        </div>
      </div>
      
      <nav className="flex-1 px-3 space-y-1 py-4 md:py-0">
        <button 
          onClick={() => { setViewMode('dashboard'); setDashboardFilter('mine'); setIsMobileMenuOpen(false); }} 
          className={`w-full text-left px-4 py-3 rounded flex gap-2 transition-colors ${viewMode === 'dashboard' ? 'bg-blue-900/30 text-blue-400' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}
        >
          <Server size={18}/> Dashboard
        </button>
        <button 
          onClick={() => { setViewMode('builder'); setIsMobileMenuOpen(false); }} 
          className={`w-full text-left px-4 py-3 rounded flex gap-2 transition-colors ${viewMode === 'builder' ? 'bg-blue-900/30 text-blue-400' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}
        >
          <Hammer size={18}/> Builder
        </button>
        <button 
          onClick={() => { setViewMode('images'); setIsMobileMenuOpen(false); }} 
          className={`w-full text-left px-4 py-3 rounded flex gap-2 transition-colors ${viewMode === 'images' ? 'bg-blue-900/30 text-blue-400' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}
        >
          <Database size={18}/> Registry
        </button>
        {isAdmin && (
          <button 
            onClick={() => { setViewMode('users'); setIsMobileMenuOpen(false); }} 
            className={`w-full text-left px-4 py-3 rounded flex gap-2 transition-colors ${viewMode === 'users' ? 'bg-blue-900/30 text-blue-400' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}
          >
            <Users size={18}/> Users
          </button>
        )}
        <button 
          onClick={() => { setViewMode('settings'); setIsMobileMenuOpen(false); }} 
          className={`w-full text-left px-4 py-3 rounded flex gap-2 transition-colors ${viewMode === 'settings' ? 'bg-blue-900/30 text-blue-400' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}
        >
          <Settings size={18}/> Settings
        </button>
      </nav>
      
      <div className="p-4 border-t border-slate-800">
        <div className="font-bold text-white">{currentUser.username}</div>
        <div className="text-xs text-slate-500 uppercase">{currentUser.role}</div>
        <button onClick={onLogout} className="mt-2 text-xs text-red-400 flex gap-1 items-center hover:text-red-300 transition-colors">
          <LogOut size={12}/> Sign Out
        </button>
      </div>
    </div>
  );
};

export default Sidebar;