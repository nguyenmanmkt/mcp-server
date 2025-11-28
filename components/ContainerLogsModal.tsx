import React, { useState, useEffect, useRef } from 'react';
import { Terminal, X } from 'lucide-react';
import { User } from '../types';
import { API_URL } from '../constants';
import { getAuthHeaders } from '../utils/helpers';

interface ContainerLogsModalProps {
  containerId: string;
  containerName: string;
  onClose: () => void;
  currentUser: User;
}

const ContainerLogsModal: React.FC<ContainerLogsModalProps> = ({ containerId, containerName, onClose, currentUser }) => {
  const [logs, setLogs] = useState("Loading...");
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch(`${API_URL}/containers/${containerId}/logs`, {
          headers: getAuthHeaders() as any
        });
        if (!res.ok) throw new Error("Error fetching logs");
        setLogs(await res.text());
      } catch (e: any) {
        setLogs(e.message);
      }
    };
    
    fetchLogs();
    const i = setInterval(fetchLogs, 3000);
    return () => clearInterval(i);
  }, [containerId, currentUser]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-xl h-[80vh] flex flex-col shadow-2xl">
        <div className="flex justify-between p-4 border-b border-slate-800 bg-slate-900 rounded-t-xl">
          <h2 className="text-white font-bold flex items-center gap-2">
            <Terminal size={18} className="text-blue-400"/> Logs: {containerName}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20}/>
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4 bg-black font-mono text-xs text-slate-300 custom-scrollbar whitespace-pre-wrap rounded-b-xl">
          {logs}
          <div ref={logsEndRef}/>
        </div>
      </div>
    </div>
  );
};

export default ContainerLogsModal;