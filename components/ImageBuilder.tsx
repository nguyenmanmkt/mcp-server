import React, { useState, useRef } from 'react';
import { Github, AlertTriangle, Link, Layers, Loader2, Play, Terminal } from 'lucide-react';
import { User } from '../types';
import { API_URL } from '../constants';
import { getAuthHeaders } from '../utils/helpers';

interface ImageBuilderProps {
  currentUser: User;
  myImagesCount: number;
}

const ImageBuilder: React.FC<ImageBuilderProps> = ({ currentUser, myImagesCount }) => {
  const [imageName, setImageName] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [buildLogs, setBuildLogs] = useState<string[]>([]);
  const [isBuilding, setIsBuilding] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);
  
  const isAdmin = ['admin', 'dev_user'].includes(currentUser.role);
  const canBuild = isAdmin || myImagesCount < (currentUser.imageLimit || 1);

  const handleBuild = async () => {
    if (!imageName || !repoUrl) return alert("Please enter details");
    
    setIsBuilding(true);
    setBuildLogs(["Initializing...", `Cloning ${repoUrl}...`]);
    
    try {
      const response = await fetch(`${API_URL}/build`, {
        method: 'POST',
        headers: getAuthHeaders() as any,
        body: JSON.stringify({ imageName, repoUrl })
      });
      
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim() !== '');
        
        lines.forEach(line => {
          try {
            const json = JSON.parse(line);
            if (json.stream) setBuildLogs(p => [...p, json.stream.trim()]);
            else if (json.error) setBuildLogs(p => [...p, `ERROR: ${json.error}`]);
          } catch {
            setBuildLogs(p => [...p, line]);
          }
        });
        
        if (logEndRef.current) logEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
      setBuildLogs(prev => [...prev, "--- BUILD FINISHED ---"]);
    } catch (err: any) {
      setBuildLogs(prev => [...prev, `FATAL: ${err.message}`]);
    } finally {
      setIsBuilding(false);
    }
  };

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="bg-slate-800 border border-slate-700 p-6 rounded-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
          <div className="flex items-center gap-2 text-white text-lg font-bold">
            <Github size={24} className="text-purple-400"/> Build from Git
          </div>
          <div className="text-xs text-slate-400 bg-slate-900 px-3 py-1 rounded border border-slate-600">
            Quota: <span className={canBuild ? 'text-green-400' : 'text-red-400'}>{isAdmin ? 'Unlimited' : `${myImagesCount} / ${currentUser.imageLimit}`}</span> Images
          </div>
        </div>
        
        {!canBuild && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded text-red-400 text-sm flex items-center gap-2">
            <AlertTriangle size={16}/> Limit Reached. Upgrade to VIP.
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Repo URL (HTTPS)</label>
            <div className="flex items-center bg-slate-900 border border-slate-600 rounded px-3 py-2">
              <Link size={16} className="text-slate-500 mr-2"/>
              <input 
                value={repoUrl} 
                onChange={e => setRepoUrl(e.target.value)} 
                disabled={!canBuild} 
                placeholder="https://github.com/user/repo.git" 
                className="bg-transparent border-none text-white w-full focus:outline-none text-sm font-mono"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Image Tag</label>
            <div className="flex items-center bg-slate-900 border border-slate-600 rounded px-3 py-2">
              <Layers size={16} className="text-slate-500 mr-2"/>
              <input 
                value={imageName} 
                onChange={e => setImageName(e.target.value)} 
                disabled={!canBuild} 
                placeholder="my-app:v1" 
                className="bg-transparent border-none text-white w-full focus:outline-none text-sm font-mono"
              />
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button 
            onClick={handleBuild} 
            disabled={isBuilding || !canBuild} 
            className="w-full sm:w-auto px-6 py-3 rounded-lg font-bold flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white shadow-lg disabled:opacity-50 transition-colors"
          >
            {isBuilding ? <Loader2 className="animate-spin" size={20}/> : <Play size={20}/>}
            {isBuilding ? 'Building...' : 'Start Build'}
          </button>
        </div>
      </div>
      
      <div className="flex-1 bg-black border border-slate-700 rounded-lg flex flex-col overflow-hidden shadow-2xl min-h-[300px]">
        <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
          <span className="text-xs font-bold text-slate-400 flex items-center gap-2">
            <Terminal size={12}/> Build Output
          </span>
          {isBuilding && (
            <div className="flex items-center gap-2 text-[10px] text-green-400">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/> Live
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-4 font-mono text-xs text-green-400 space-y-1 custom-scrollbar">
          {buildLogs.map((log, i) => <div key={i} className="break-all whitespace-pre-wrap pl-1">{log}</div>)}
          <div ref={logEndRef} />
        </div>
      </div>
    </div>
  );
};

export default ImageBuilder;