import React from 'react';
import { Activity, Layers, Users, HardDrive, ArrowRight } from 'lucide-react';
import { SystemStats } from '../types';
import { formatBytes } from '../utils/helpers';

interface SystemOverviewProps {
  stats: SystemStats | null;
  totalUsers: number;
  onFilterClick: (filter: 'all') => void;
  onManageImages: () => void;
}

const SystemOverview: React.FC<SystemOverviewProps> = ({ stats, totalUsers, onFilterClick, onManageImages }) => {
  if (!stats) return null;
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <div onClick={() => onFilterClick('all')} className="bg-slate-800 border border-slate-700 p-4 rounded-lg flex flex-col cursor-pointer hover:bg-slate-700/50 hover:border-blue-500/50 transition-all group">
        <span className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-2 group-hover:text-blue-400">
          <Activity size={14}/> Containers
        </span>
        <div className="flex items-baseline gap-2 mt-auto">
          <span className="text-2xl font-bold text-white">{stats.containers}</span>
          <span className="text-xs text-green-400">({stats.running} running)</span>
        </div>
        <div className="w-full bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
          <div className="bg-green-500 h-1.5 rounded-full" style={{width: `${(stats.running/Math.max(stats.containers,1))*100}%`}}></div>
        </div>
        <div className="mt-2 text-[10px] text-slate-500 group-hover:text-blue-300 flex items-center gap-1">
          Click to manage all <ArrowRight size={10}/>
        </div>
      </div>

      <div onClick={onManageImages} className="bg-slate-800 border border-slate-700 p-4 rounded-lg flex flex-col cursor-pointer hover:bg-slate-700/50 hover:border-blue-500/50 transition-all group">
        <span className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-2 group-hover:text-blue-400">
          <Layers size={14}/> Images
        </span>
        <div className="text-2xl font-bold text-white mt-auto">{stats.images}</div>
        <div className="mt-2 text-[10px] text-slate-500 group-hover:text-blue-300 flex items-center gap-1">
          Manage Registry <ArrowRight size={10}/>
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg flex flex-col">
        <span className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-2">
          <Users size={14}/> Users
        </span>
        <div className="text-2xl font-bold text-white mt-auto">{totalUsers}</div>
      </div>

      <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg flex flex-col">
        <span className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-2">
          <HardDrive size={14}/> System Resources
        </span>
        <div className="mt-auto space-y-1">
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>CPU Cores</span>
            <span className="text-white font-mono">{stats.cpus}</span>
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 pt-1">
            <span>Total RAM</span>
            <span className="text-white font-mono">{formatBytes(stats.memory)}</span>
          </div>
          <div className="text-[9px] text-slate-500 mt-1 text-right">Docker v{stats.dockerVersion}</div>
        </div>
      </div>
    </div>
  );
};

export default SystemOverview;