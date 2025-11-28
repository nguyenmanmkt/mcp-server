import React from 'react';
import { Box, Loader2, Play, Square, FileText, Trash2, Users } from 'lucide-react';
import { Container } from '../types';

interface ContainerCardProps {
  container: Container;
  onAction: (id: string, action: 'start' | 'stop' | 'delete') => void;
  onViewLogs?: (container: Container) => void;
  ownerName?: string | null;
}

const ContainerCard: React.FC<ContainerCardProps> = ({ container, onAction, onViewLogs, ownerName }) => {
  const isRunning = container.status === 'running';
  const isProcessing = container.status === 'processing';
  const isChild = container.role === 'child';
  
  return (
    <div className={`bg-slate-800 border ${isChild ? 'border-blue-900/50 ml-6' : 'border-slate-700'} rounded-lg p-4 shadow-sm hover:border-blue-500 transition-colors relative`}>
      {isChild && (
        <>
          <div className="absolute -left-4 top-6 w-4 h-px bg-blue-700"></div>
          <div className="absolute -left-4 top-0 h-6 w-px bg-blue-700"></div>
        </>
      )}
      
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-md ${isRunning ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
            {isProcessing ? <Loader2 className="animate-spin" size={20}/> : <Box size={20}/>}
          </div>
          <div className="overflow-hidden">
            <div className="font-semibold text-white truncate w-40 flex items-center gap-2">
              {container.name} 
              {isChild && <span className="text-[9px] bg-blue-900 text-blue-300 px-1 rounded">CHILD</span>}
            </div>
            <div className="text-xs text-slate-400 font-mono truncate w-40" title={container.image}>
              {container.image}
            </div>
          </div>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${isRunning ? 'text-green-400 bg-green-900/20' : 'text-red-400 bg-red-900/20'}`}>
          {container.status}
        </span>
      </div>
      
      {ownerName && (
        <div className="mb-3 text-xs bg-slate-900 rounded px-2 py-1 border border-slate-700 inline-flex items-center gap-1 text-slate-400">
          <Users size={10}/> <span className="font-medium text-blue-300">{ownerName}</span>
        </div>
      )}
      
      <div className="flex gap-2 mt-auto">
        {isProcessing ? (
          <button disabled className="flex-1 bg-slate-700 text-slate-400 py-1.5 rounded text-xs flex justify-center gap-1 cursor-not-allowed">
            <Loader2 className="animate-spin" size={14}/> Processing...
          </button>
        ) : (
          <>
            {!isRunning ? 
              <button onClick={() => onAction(container.id, 'start')} className="flex-1 bg-green-600 hover:bg-green-500 text-white py-1.5 rounded text-xs flex items-center justify-center gap-1 font-medium transition-colors">
                <Play size={14}/> Start
              </button> :
              <button onClick={() => onAction(container.id, 'stop')} className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white py-1.5 rounded text-xs flex items-center justify-center gap-1 font-medium transition-colors">
                <Square size={14}/> Stop
              </button>
            }
            {onViewLogs && (
              <button onClick={() => onViewLogs(container)} className="bg-slate-700 hover:bg-slate-600 text-slate-300 p-1.5 rounded transition-colors" title="View Logs">
                <FileText size={16}/>
              </button>
            )}
            <button onClick={() => onAction(container.id, 'delete')} className="bg-red-900/30 hover:bg-red-900/50 text-red-400 p-1.5 rounded transition-colors">
              <Trash2 size={16}/>
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ContainerCard;