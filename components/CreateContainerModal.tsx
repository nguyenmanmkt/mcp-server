import React, { useState, useEffect, useCallback } from 'react';
import { Box, X, Layers, Lock, Info, CircuitBoard, Plus, AlertTriangle, Loader2 } from 'lucide-react';
import { Image, ImageMeta, EnvVar, User } from '../types';
import { CATEGORIES } from '../constants';
import { isSystemImage, canAccessImage, renderMarkdown } from '../utils/helpers';

interface CreateContainerModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: Image[];
  onCreate: (data: any) => void;
  userQuotaRemaining: number;
  isLoading: boolean;
  imageMeta: Record<string, ImageMeta>;
  userSavedVars: EnvVar[];
  currentUser: User;
}

const CreateContainerModal: React.FC<CreateContainerModalProps> = ({ 
  isOpen, onClose, images, onCreate, userQuotaRemaining, isLoading, imageMeta, userSavedVars, currentUser 
}) => {
  const [name, setName] = useState('');
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [activeTab, setActiveTab] = useState('ALL');

  const displayImages = images.filter(img => !isSystemImage(img.name));
  const filteredImages = activeTab === 'ALL' 
    ? displayImages 
    : displayImages.filter(img => imageMeta[`${img.name}:${img.tag}`]?.category === activeTab);

  const checkAccess = useCallback((img: Image) => {
    const meta = imageMeta[`${img.name}:${img.tag}`];
    return canAccessImage(currentUser.role, meta?.accessLevel);
  }, [currentUser.role, imageMeta]);

  const handleSelectImage = useCallback((img: Image) => {
    setSelectedImage(img);
    const key = `${img.name}:${img.tag}`;
    const meta = imageMeta[key];
    setEnvVars(meta?.defaultEnvs ? [...meta.defaultEnvs] : []);
  }, [imageMeta]);

  useEffect(() => {
    if (isOpen && displayImages.length && !selectedImage) {
      const validImg = displayImages.find(img => checkAccess(img));
      if (validImg) handleSelectImage(validImg);
      else handleSelectImage(displayImages[0]);
    }
  }, [isOpen, displayImages, selectedImage, handleSelectImage, checkAccess]);

  if (!isOpen) return null;

  const isSelectedImageAllowed = selectedImage ? checkAccess(selectedImage) : false;
  const hasMcpEndpoint = envVars.some(e => e.key === 'MCP_ENDPOINT' && e.value.trim() !== '');
  const isAdmin = ['admin', 'dev_user'].includes(currentUser.role);
  const showQuotaError = !isAdmin && userQuotaRemaining <= 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedImage || !isSelectedImageAllowed) return;
    if (!hasMcpEndpoint) return alert("MCP_ENDPOINT is required!");
    onCreate({ name, image: `${selectedImage.name}:${selectedImage.tag}`, env: envVars.filter(e => e.key) });
  };

  const injectUserVar = (v: EnvVar) => {
    const ex = envVars.find(e => e.key === v.key);
    if (ex) setEnvVars(envVars.map(e => e.key === v.key ? { ...e, value: v.value } : e));
    else setEnvVars([...envVars, { key: v.key, value: v.value }]);
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl rounded-xl shadow-2xl flex flex-col h-[90vh]">
        <div className="p-6 border-b border-slate-800">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-white font-bold text-2xl flex items-center gap-2">
              <Box className="text-blue-500"/> Launch New Container
            </h2>
            <button onClick={onClose}>
              <X className="text-slate-400 hover:text-white" size={28}/>
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            <button 
              onClick={() => setActiveTab('ALL')} 
              className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${activeTab === 'ALL' ? 'bg-white text-black' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
            >
              ALL
            </button>
            {CATEGORIES.map(cat => (
              <button 
                key={cat} 
                onClick={() => setActiveTab(cat)} 
                className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${activeTab === cat ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        
        {showQuotaError ? (
          <div className="p-10 text-center">
            <div className="bg-red-900/20 text-red-400 p-4 rounded border border-red-800 text-lg">
              Quota Limit Reached. Please upgrade or delete old containers.
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
            <div className="w-full md:w-1/2 border-r border-slate-800 overflow-y-auto p-4 custom-scrollbar">
              {filteredImages.length === 0 ? (
                <div className="text-center text-slate-500 py-20">No images found in this category.</div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {filteredImages.map(img => {
                    const isSelected = selectedImage?.id === img.id && selectedImage?.name === img.name;
                    const meta = imageMeta[`${img.name}:${img.tag}`];
                    const level = meta?.accessLevel || 'free';
                    const canAccess = canAccessImage(currentUser.role, level);
                    
                    return (
                      <div 
                        key={`${img.name}:${img.tag}`} 
                        onClick={() => handleSelectImage(img)} 
                        className={`p-4 rounded-lg flex items-center justify-between cursor-pointer transition-all border ${isSelected ? 'bg-blue-900/30 border-blue-500 ring-1 ring-blue-500' : 'bg-slate-800 border-slate-700 hover:border-slate-600'} ${!canAccess ? 'opacity-50 grayscale' : ''}`}
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className={`w-10 h-10 rounded flex items-center justify-center shrink-0 ${isSelected ? 'bg-blue-600' : 'bg-slate-700'}`}>
                            <Layers size={20} className="text-white"/>
                          </div>
                          <div className="overflow-hidden">
                            <div className="font-bold text-white truncate w-48 flex items-center gap-2">
                              {!canAccess && <Lock size={12} className="text-red-400"/>} 
                              {img.visibility === 'private' && canAccess && <Lock size={12} className="text-yellow-500"/>} 
                              {img.name}
                            </div>
                            <div className="text-xs text-slate-400">{img.tag} • {img.size}</div>
                          </div>
                        </div>
                        {level !== 'free' && (
                          <span className={`text-[10px] px-2 py-1 rounded uppercase font-bold ${level === 'vip' ? 'bg-yellow-500 text-black' : 'bg-blue-500 text-white'}`}>
                            {level}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            <div className="w-full md:w-1/2 p-6 overflow-y-auto custom-scrollbar">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="text-sm font-bold text-slate-300 uppercase mb-2 block">Container Name</label>
                  <input 
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none transition-colors" 
                    placeholder="e.g. my-worker-1" 
                    value={name} 
                    onChange={e => setName(e.target.value)}
                  />
                </div>
                
                <div className={`text-sm p-4 rounded-lg border leading-relaxed ${!isSelectedImageAllowed ? 'bg-red-900/10 border-red-900/30 text-slate-300' : 'bg-blue-900/10 border-blue-900/30 text-slate-400'}`}>
                  {!isSelectedImageAllowed && selectedImage && (
                    <div className="mb-2 text-red-400 font-bold flex items-center gap-1 border-b border-red-900/30 pb-2">
                      <Lock size={16}/> Access Denied ({imageMeta[`${selectedImage.name}:${selectedImage.tag}`]?.accessLevel?.toUpperCase()} Only)
                    </div>
                  )}
                  <div className="font-bold text-blue-400 mb-1 flex gap-2 items-center">
                    <Info size={16}/> Description
                  </div>
                  {renderMarkdown(selectedImage && imageMeta[`${selectedImage.name}:${selectedImage.tag}`]?.description) || "No description available."}
                  {selectedImage && imageMeta[`${selectedImage.name}:${selectedImage.tag}`]?.childImage && (
                    <div className="mt-3 pt-3 border-t border-blue-800/30 text-xs text-purple-400 flex items-center gap-1">
                      <CircuitBoard size={14}/> Includes Sidecar: {imageMeta[`${selectedImage.name}:${selectedImage.tag}`]?.childImage}
                      <span className="ml-1 text-[10px] text-slate-500 italic">(Shared Environment)</span>
                    </div>
                  )}
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-sm font-bold text-slate-300 uppercase">Environment Variables</label>
                    <button type="button" onClick={() => setEnvVars([...envVars, { key: '', value: '' }])} className="text-xs text-blue-400 hover:text-white font-bold">+ Add Custom</button>
                  </div>
                  
                  {userSavedVars?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4 p-3 bg-slate-800/50 rounded-lg border border-slate-800">
                      {userSavedVars.map((v, i) => (
                        <button key={i} type="button" onClick={() => injectUserVar(v)} className="text-xs bg-slate-700 hover:bg-purple-600 text-white px-3 py-1.5 rounded-full transition-colors flex items-center gap-1">
                          <Plus size={10}/> {v.label}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    {envVars.map((e, i) => (
                      <div key={i} className="flex gap-2 group">
                        <input 
                          className={`w-1/3 bg-slate-800 border ${e.key === 'MCP_ENDPOINT' ? 'border-purple-500' : 'border-slate-700'} rounded p-2 text-xs text-yellow-400 font-mono`} 
                          value={e.key} 
                          onChange={ev => { const n = [...envVars]; n[i].key = ev.target.value; setEnvVars(n); }} 
                          placeholder="KEY"
                        />
                        <div className="flex-1 relative">
                          <input 
                            type="password" 
                            className={`w-full bg-slate-800 border ${e.key === 'MCP_ENDPOINT' && !e.value ? 'border-red-500' : 'border-slate-700'} rounded p-2 text-xs text-blue-300 font-mono pr-8`} 
                            value={e.value} 
                            onChange={ev => { const n = [...envVars]; n[i].value = ev.target.value; setEnvVars(n); }} 
                            placeholder="VALUE"
                          />
                        </div>
                        <button type="button" onClick={() => setEnvVars(envVars.filter((_, idx) => idx !== i))} className="text-slate-600 hover:text-red-500 px-2">
                          <X size={16}/>
                        </button>
                      </div>
                    ))}
                    {!hasMcpEndpoint && (
                      <div className="text-red-400 text-xs mt-1 flex items-center gap-1">
                        <AlertTriangle size={12}/> MCP_ENDPOINT is required!
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="pt-4 mt-auto flex gap-4">
                  <button type="button" onClick={onClose} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors">
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isLoading || !selectedImage || !isSelectedImageAllowed || !hasMcpEndpoint} 
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                  >
                    {isLoading ? <Loader2 className="animate-spin" size={20}/> : isSelectedImageAllowed ? 'Launch Container' : 'Locked'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateContainerModal;