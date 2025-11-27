import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Box, Server, Play, Square, Trash2, Plus, Users, Cpu, 
  AlertCircle, Shield, Loader2, WifiOff, RefreshCw, Info, 
  Link, Database, Settings, Save, Edit, X, LogOut, UserPlus, LogIn,
  Eye, EyeOff, Lock, UserCheck, UserX, Ban, Activity, Layers, HardDrive, AlertTriangle,
  Star, Code, Unlock, Hammer, Terminal, Github, GitBranch, Filter, FileText, Globe, Crown,
  Clock, RefreshCcw
} from 'lucide-react';

const API_URL = 'https://apidocker.cybersma.com/api';
const SYSTEM_IMAGES = ['python', 'alpine', 'node', 'ubuntu', 'debian', 'busybox', 'golang', 'postgres', 'mysql', 'redis', 'mongo'];

// --- HELPERS ---
const isSystemImage = (imageName) => SYSTEM_IMAGES.some(sys => imageName === sys || imageName.startsWith(sys));

const canAccessImage = (userRole, imageAccessLevel) => {
  const level = imageAccessLevel || 'free';
  if (level === 'free') return true;
  if (['admin', 'dev_user'].includes(userRole)) return true; 
  if (level === 'vip' && userRole === 'vip') return true;
  return false;
};

const formatDate = (timestamp) => {
  if (!timestamp) return '';
  // Docker thường trả về timestamp dạng unix seconds
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
};

// --- AUTH SCREEN ---
const AuthScreen = ({ onLogin, onRegister, isLoading, error }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '' });
  const handleSubmit = (e) => { e.preventDefault(); if (isRegistering) onRegister(formData.username, formData.password); else onLogin(formData.username, formData.password); };

  return (
    <div className="h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-xl shadow-2xl w-full max-w-md">
        <div className="text-center mb-8"><div className="flex justify-center mb-4"><div className="p-4 bg-blue-600/20 rounded-full"><Cpu size={48} className="text-blue-500" /></div></div><h1 className="text-2xl font-bold text-white">DockManager</h1><p className="text-slate-400 text-sm mt-2">Container Orchestration System</p></div>
        {error && <div className="bg-red-900/20 border border-red-800/50 text-red-400 p-3 rounded mb-4 text-sm flex items-center gap-2"><AlertCircle size={16} /> {error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">Username</label><input type="text" required className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-white focus:border-blue-600 outline-none" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})}/></div>
          <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">Password</label><input type="password" required className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-white focus:border-blue-600 outline-none" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}/></div>
          <button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-500 text-white p-3 rounded font-bold flex justify-center items-center gap-2 mt-6">{isLoading ? <Loader2 className="animate-spin" size={20}/> : (isRegistering ? <UserPlus size={20}/> : <LogIn size={20}/>)}{isRegistering ? 'Create Account' : 'Sign In'}</button>
        </form>
        <div className="mt-6 text-center"><button onClick={() => setIsRegistering(!isRegistering)} className="text-slate-500 hover:text-blue-400 text-sm font-medium">{isRegistering ? 'Sign In' : 'Register'}</button></div>
      </div>
    </div>
  );
};

// --- SYSTEM OVERVIEW ---
const SystemOverview = ({ stats, totalUsers }) => {
  if (!stats) return null;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg flex flex-col"><span className="text-xs font-bold text-slate-400 uppercase mb-1 flex items-center gap-2"><Activity size={14}/> Containers</span><div className="flex items-baseline gap-2 mt-auto"><span className="text-2xl font-bold text-white">{stats.containers}</span><span className="text-xs text-green-400">({stats.running} running)</span></div></div>
      <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg flex flex-col"><span className="text-xs font-bold text-slate-400 uppercase mb-1 flex items-center gap-2"><Layers size={14}/> Images</span><div className="text-2xl font-bold text-white mt-auto">{stats.images}</div></div>
      <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg flex flex-col"><span className="text-xs font-bold text-slate-400 uppercase mb-1 flex items-center gap-2"><Users size={14}/> Users</span><div className="text-2xl font-bold text-white mt-auto">{totalUsers}</div></div>
      <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg flex flex-col"><span className="text-xs font-bold text-slate-400 uppercase mb-1 flex items-center gap-2"><HardDrive size={14}/> System</span><div className="mt-auto"><div className="text-sm text-white font-medium">{stats.os}</div><div className="text-xs text-slate-500">Docker v{stats.dockerVersion} • {stats.cpus} CPU</div></div></div>
    </div>
  );
};

// --- SETTINGS ---
const UserSettings = ({ savedVars, onSave, currentUser }) => {
  const [vars, setVars] = useState(savedVars || []);
  const [pass, setPass] = useState('');
  const [msg, setMsg] = useState('');
  const [visible, setVisible] = useState({});
  
  useEffect(() => { if(JSON.stringify(savedVars) !== JSON.stringify(vars)) setVars(savedVars || []); }, [savedVars]);

  const handleChangePass = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/change-password`, { method:'POST', headers:{'Content-Type':'application/json', 'x-user-id':currentUser.id}, body:JSON.stringify({newPassword:pass})});
      if(res.ok) { setMsg('Success!'); setPass(''); } else setMsg('Failed.');
    } catch { setMsg('Error.'); }
  };
  
  const updateVar = (idx, field, val) => { const n=[...vars]; n[idx][field]=val; setVars(n); };
  const removeVar = (idx) => { const n=vars.filter((_,i)=>i!==idx); setVars(n); onSave(n); };
  const addVar = () => setVars([...vars, { key: 'NEW_VAR', value: '', label: 'Variable' }]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <div className="flex justify-between mb-4"><h2 className="font-bold text-white text-xl flex gap-2 items-center"><Settings className="text-purple-400"/> Variables</h2><button onClick={()=>onSave(vars)} className="bg-purple-600 text-white px-3 py-1 rounded flex gap-2 items-center text-sm"><Save size={14}/> Save</button></div>
        <div className="space-y-2">
          {vars.map((v, i) => (
            <div key={i} className="flex gap-2 bg-slate-900 p-2 rounded items-center">
              <input value={v.label} onChange={e=>updateVar(i, 'label', e.target.value)} className="w-1/4 bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm" placeholder="Label"/>
              <input value={v.key} onChange={e=>updateVar(i, 'key', e.target.value)} className="w-1/4 bg-slate-800 border border-slate-700 rounded p-2 text-yellow-400 text-sm" placeholder="KEY"/>
              <div className="flex-1 relative">
                <input type={visible[i]?"text":"password"} value={v.value} onChange={e=>updateVar(i, 'value', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-blue-300 text-sm pr-8" placeholder="VAL"/>
                <button onClick={()=>setVisible(p=>({...p, [i]:!p[i]}))} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">{visible[i]?<EyeOff size={14}/>:<Eye size={14}/>}</button>
              </div>
              <button onClick={()=>removeVar(i)} className="text-red-400 p-2"><Trash2 size={16}/></button>
            </div>
          ))}
        </div>
        <button onClick={addVar} className="w-full mt-4 border border-dashed border-slate-600 text-slate-400 py-2 rounded hover:text-white text-sm">+ Add Variable</button>
      </div>
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <h2 className="font-bold text-white text-xl mb-4 flex gap-2 items-center"><Lock className="text-red-400"/> Security</h2>
        <form onSubmit={handleChangePass} className="flex gap-4 items-end">
          <div className="flex-1"><label className="text-xs font-bold text-slate-400 block mb-1">New Password</label><input type="password" required value={pass} onChange={e=>setPass(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white"/></div>
          <button className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded font-bold">Update Password</button>
        </form>
        {msg && <p className="mt-2 text-green-400 text-sm">{msg}</p>}
      </div>
    </div>
  );
};

// --- IMAGE BUILDER ---
const ImageBuilder = ({ currentUser, myImagesCount }) => {
  const [imageName, setImageName] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [buildLogs, setBuildLogs] = useState([]);
  const [isBuilding, setIsBuilding] = useState(false);
  const logEndRef = useRef(null);
  
  const isAdmin = ['admin', 'dev_user'].includes(currentUser.role);
  const canBuild = isAdmin || myImagesCount < (currentUser.imageLimit || 1);

  const handleBuild = async () => {
    if (!imageName || !repoUrl) return alert("Please enter details");
    setIsBuilding(true);
    setBuildLogs(["Initializing...", `Cloning ${repoUrl}...`]);
    try {
      const response = await fetch(`${API_URL}/build`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id },
        body: JSON.stringify({ imageName, repoUrl })
      });
      const reader = response.body.getReader();
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
            } catch { setBuildLogs(p => [...p, line]); }
        });
        if (logEndRef.current) logEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
      setBuildLogs(prev => [...prev, "--- BUILD FINISHED ---"]);
    } catch (err) { setBuildLogs(prev => [...prev, `FATAL: ${err.message}`]); } 
    finally { setIsBuilding(false); }
  };

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="bg-slate-800 border border-slate-700 p-6 rounded-lg">
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-white text-lg font-bold"><Github size={24} className="text-purple-400"/> Build from Git</div>
            <div className="text-xs text-slate-400 bg-slate-900 px-3 py-1 rounded border border-slate-600">
               Quota: <span className={canBuild ? 'text-green-400' : 'text-red-400'}>{isAdmin ? 'Unlimited' : `${myImagesCount} / ${currentUser.imageLimit}`}</span> Images
            </div>
        </div>
        {!canBuild && <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded text-red-400 text-sm flex items-center gap-2"><AlertTriangle size={16}/> Limit Reached. Upgrade to VIP.</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div><label className="text-xs font-bold text-slate-400 uppercase block mb-1">Repo URL</label><div className="flex items-center bg-slate-900 border border-slate-600 rounded px-3 py-2"><Link size={16} className="text-slate-500 mr-2"/><input value={repoUrl} onChange={e => setRepoUrl(e.target.value)} disabled={!canBuild} placeholder="https://github.com/user/repo.git" className="bg-transparent border-none text-white w-full focus:outline-none text-sm font-mono"/></div></div>
          <div><label className="text-xs font-bold text-slate-400 uppercase block mb-1">Image Tag</label><div className="flex items-center bg-slate-900 border border-slate-600 rounded px-3 py-2"><Layers size={16} className="text-slate-500 mr-2"/><input value={imageName} onChange={e => setImageName(e.target.value)} disabled={!canBuild} placeholder="my-app:v1" className="bg-transparent border-none text-white w-full focus:outline-none text-sm font-mono"/></div></div>
        </div>
        <div className="mt-6 flex justify-end">
          <button onClick={handleBuild} disabled={isBuilding || !canBuild} className="px-6 py-3 rounded-lg font-bold flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white shadow-lg disabled:opacity-50">
            {isBuilding ? <Loader2 className="animate-spin" size={20}/> : <Play size={20}/>} {isBuilding ? 'Building...' : 'Start Build'}
          </button>
        </div>
      </div>
      <div className="flex-1 bg-black border border-slate-700 rounded-lg flex flex-col overflow-hidden shadow-2xl">
        <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex justify-between items-center"><span className="text-xs font-bold text-slate-400 flex items-center gap-2"><Terminal size={12}/> Build Output</span>{isBuilding && <div className="flex items-center gap-2 text-[10px] text-green-400"><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/> Live</div>}</div>
        <div className="flex-1 overflow-y-auto p-4 font-mono text-xs text-green-400 space-y-1 custom-scrollbar">
          {buildLogs.map((log, i) => <div key={i} className="break-all whitespace-pre-wrap pl-1">{log}</div>)}<div ref={logEndRef} />
        </div>
      </div>
    </div>
  );
};

// --- CREATE MODAL ---
const CreateContainerModal = ({ isOpen, onClose, images, onCreate, userQuotaRemaining, isLoading, imageMeta, userSavedVars, currentUser }) => {
  const [name, setName] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [envVars, setEnvVars] = useState([]);

  const displayImages = images.filter(img => !isSystemImage(img.name));

  const checkAccess = (img) => {
    const meta = imageMeta[`${img.name}:${img.tag}`];
    return canAccessImage(currentUser.role, meta?.accessLevel);
  };

  const handleSelectImage = useCallback((img) => {
    setSelectedImage(img);
    const key = `${img.name}:${img.tag}`;
    const meta = imageMeta[key];
    setEnvVars(meta?.defaultEnvs ? [...meta.defaultEnvs] : []);
  }, [imageMeta]);

  useEffect(() => {
    if(isOpen && displayImages.length && !selectedImage) {
       const validImg = displayImages.find(img => checkAccess(img));
       if(validImg) handleSelectImage(validImg);
       else handleSelectImage(displayImages[0]);
    }
  }, [isOpen, displayImages, selectedImage, handleSelectImage]);

  if(!isOpen) return null;

  const isSelectedImageAllowed = selectedImage ? checkAccess(selectedImage) : false;

  const handleSubmit = (e) => { 
      e.preventDefault(); 
      if(!selectedImage || !isSelectedImageAllowed) return; 
      onCreate({ name, image: `${selectedImage.name}:${selectedImage.tag}`, env: envVars.filter(e=>e.key) }); 
  };
  const injectUserVar = (v) => { const ex=envVars.find(e=>e.key===v.key); if(ex) setEnvVars(envVars.map(e=>e.key===v.key?{...e,value:v.value}:e)); else setEnvVars([...envVars, {key:v.key,value:v.value}]); };
  const isPrivate = selectedImage?.visibility === 'private';
  const isAdmin = ['admin', 'dev_user'].includes(currentUser.role);
  const showQuotaError = !isAdmin && userQuotaRemaining <= 0;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 w-full max-w-2xl rounded-xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-4"><h2 className="text-white font-bold text-xl">Launch Container</h2><button onClick={onClose}><X className="text-slate-400 hover:text-white"/></button></div>
        {showQuotaError ? <div className="bg-red-900/20 text-red-400 p-3 rounded border border-red-800">Quota Limit Reached</div> : (
          <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
            <div className="grid grid-cols-2 gap-4">
              <div className="h-60 overflow-y-auto border border-slate-700 rounded p-2 bg-slate-900/50">
                {displayImages.length === 0 ? <div className="text-center text-slate-500 text-xs py-4">No images.</div> : displayImages.map(img => {
                  const isSelected = selectedImage?.id===img.id && selectedImage?.name===img.name;
                  const meta = imageMeta[`${img.name}:${img.tag}`];
                  const level = meta?.accessLevel || 'free';
                  const canAccess = canAccessImage(currentUser.role, level);
                  
                  return (
                    <div 
                        key={`${img.name}:${img.tag}`} 
                        onClick={() => handleSelectImage(img)} 
                        className={`p-2 rounded mb-1 flex justify-between items-center cursor-pointer transition-colors ${isSelected ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'} ${!canAccess ? 'opacity-50 grayscale' : ''}`}
                    >
                      <div className="overflow-hidden">
                          <div className="font-bold text-sm truncate w-32 flex items-center gap-1">
                              {!canAccess && <Lock size={10} className="text-red-400"/>} 
                              {img.visibility === 'private' && canAccess && <Lock size={10} className="text-yellow-500"/>}
                              {img.name}
                          </div>
                          <div className="text-xs opacity-70">{img.tag} • {img.created ? formatDate(img.created) : ''}</div>
                      </div>
                      {level !== 'free' && <span className={`text-[9px] px-1 rounded uppercase font-bold flex items-center gap-1 ${level==='vip'?'bg-yellow-500 text-black': 'bg-blue-400 text-black'}`}>{level==='vip' && <Crown size={8}/>}{level}</span>}
                    </div>
                  );
                })}
              </div>
              <div className="space-y-3">
                <input className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" placeholder="Name (Optional)" value={name} onChange={e=>setName(e.target.value)}/>
                
                <div className={`text-xs p-3 rounded border h-36 overflow-y-auto leading-relaxed ${!isSelectedImageAllowed ? 'bg-red-900/10 border-red-900/30 text-slate-300' : 'bg-blue-900/20 border-blue-800/50 text-slate-400'}`}>
                   {!isSelectedImageAllowed && selectedImage && <div className="mb-2 text-red-400 font-bold flex items-center gap-1 border-b border-red-900/30 pb-1"><Lock size={12}/> Access Denied ({imageMeta[`${selectedImage.name}:${selectedImage.tag}`]?.accessLevel?.toUpperCase()} Only)</div>}
                   <div className="font-bold text-blue-300 mb-1 flex gap-1 items-center"><Info size={12}/> Info</div>
                   {selectedImage && imageMeta[`${selectedImage.name}:${selectedImage.tag}`]?.description || "No description."}
                </div>
                
                {userSavedVars?.length > 0 && <div><label className="text-xs font-bold text-purple-400 block mb-1">Quick Vars</label><div className="flex flex-wrap gap-1">{userSavedVars.map((v, i) => <button key={i} type="button" onClick={()=>injectUserVar(v)} className="text-[10px] bg-slate-700 text-white px-2 py-1 rounded">{v.label}</button>)}</div></div>}
              </div>
            </div>
            <div className="border-t border-slate-700 pt-3">
               <div className="flex justify-between mb-2"><label className="text-xs text-slate-400 font-bold">Env Vars</label><button type="button" onClick={()=>setEnvVars([...envVars, {key:'', value:''}])} className="text-blue-400 text-xs">+ Add</button></div>
               <div className="max-h-40 overflow-y-auto space-y-2">{envVars.map((e, i) => (<div key={i} className="flex gap-2"><input className="w-1/3 bg-slate-900 border border-slate-700 rounded p-2 text-xs text-yellow-400" value={e.key} onChange={ev=>{const n=[...envVars];n[i].key=ev.target.value;setEnvVars(n)}} placeholder="KEY"/><input className="flex-1 bg-slate-900 border border-slate-700 rounded p-2 text-xs text-blue-300" value={e.value} onChange={ev=>{const n=[...envVars];n[i].value=ev.target.value;setEnvVars(n)}} placeholder="VALUE"/><button type="button" onClick={()=>setEnvVars(envVars.filter((_,idx)=>idx!==i))} className="text-red-500 px-2">x</button></div>))}</div>
            </div>
            <div className="flex gap-3 pt-2"><button type="button" onClick={onClose} className="flex-1 py-2 bg-slate-700 text-white rounded">Cancel</button><button type="submit" disabled={isLoading || !selectedImage || !isSelectedImageAllowed} className="flex-1 py-2 bg-blue-600 text-white rounded font-bold disabled:opacity-50 disabled:cursor-not-allowed">{isLoading ? <Loader2 className="animate-spin inline"/> : isSelectedImageAllowed ? 'Launch' : 'Locked'}</button></div>
          </form>
        )}
      </div>
    </div>
  );
};

// --- REGISTRY MANAGER ---
const ImageRegistryManager = ({ images, meta, onSaveMeta, onDeleteImage, currentUser, allUsers }) => {
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ description: '', defaultEnvs: [], visibility: 'public', accessLevel: 'free' });
  const [showSystem, setShowSystem] = useState(false);
  
  const filteredImages = showSystem ? images : images.filter(img => !isSystemImage(img.name));
  const isAdmin = ['admin', 'dev_user'].includes(currentUser.role);

  const getOwnerName = (id) => {
    if (id === 'system') return 'System';
    if (id === currentUser.id) return 'You';
    const u = allUsers.find(x => x.id === id);
    return u ? u.username : id.substring(0, 8);
  };

  const handleEdit = (img) => { 
      const key = `${img.name}:${img.tag}`; 
      setEditingId(key); 
      const m = meta[key] || {}; 
      setEditForm({ description: m.description||'', defaultEnvs: m.defaultEnvs||[], visibility: m.visibility||'public', accessLevel: m.accessLevel || 'free' }); 
  };
  const handleSave = () => { onSaveMeta(editingId, editForm); setEditingId(null); };
  const addEnv = () => setEditForm(p => ({ ...p, defaultEnvs: [...p.defaultEnvs, { key: '', value: '' }] }));
  const changeEnv = (idx, field, val) => { const n = [...editForm.defaultEnvs]; n[idx][field] = val; setEditForm({ ...editForm, defaultEnvs: n }); };

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
      <div className="p-4 border-b border-slate-700 bg-slate-900/50 flex justify-between items-center">
        <h3 className="font-bold text-white flex gap-2 items-center"><Database size={18}/> Image Registry</h3>
        <button onClick={() => setShowSystem(!showSystem)} className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold border ${showSystem ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-600 text-slate-400'}`}><Filter size={12}/> System Images</button>
      </div>
      <div className="divide-y divide-slate-700">
        {filteredImages.map(img => {
          const key = `${img.name}:${img.tag}`;
          const isEditing = editingId === key;
          const currentMeta = meta[key] || {};
          const isOwner = img.ownerId === currentUser.id;
          const isPrivate = img.visibility === 'private';
          const ownerName = getOwnerName(img.ownerId);
          const level = currentMeta.accessLevel || 'free';

          return (
            <div key={key} className="p-4 hover:bg-slate-700/30 transition-colors">
              <div className="flex justify-between mb-2">
                <div className="flex gap-3 items-center">
                    <Server className="text-blue-500" size={20}/>
                    <div>
                        <div className="font-mono font-bold text-white flex items-center gap-2">
                            {img.name}:{img.tag}
                            {isPrivate ? <Lock size={12} className="text-yellow-400"/> : <Globe size={12} className="text-green-400"/>}
                            {isOwner && <span className="bg-blue-900/50 text-blue-300 text-[9px] px-1.5 py-0.5 rounded border border-blue-800">MINE</span>}
                            {level !== 'free' && <span className={`text-[9px] px-1 rounded uppercase font-bold flex items-center gap-1 ${level==='vip'?'bg-yellow-500 text-black': 'bg-blue-400 text-black'}`}>{level==='vip' && <Crown size={8}/>}{level}</span>}
                        </div>
                        <div className="text-xs text-slate-500">{img.size} • {formatDate(img.created)} • Owner: {ownerName}</div>
                    </div>
                </div>
                {(isAdmin || isOwner) && !isEditing && <div className="flex gap-2"><button onClick={()=>handleEdit(img)} className="text-blue-400 hover:text-white p-1"><Edit size={16}/></button><button onClick={()=>onDeleteImage(img.name, img.tag)} className="text-red-400 hover:text-red-200 p-1"><Trash2 size={16}/></button></div>}
              </div>
              {isEditing ? (
                <div className="bg-slate-900 p-4 rounded space-y-3 border border-blue-500/50">
                  <div className="flex gap-3">
                      <div className="flex-1">
                          <label className="text-xs text-slate-400 uppercase font-bold block mb-1">Description</label>
                          <textarea className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm h-20" value={editForm.description} onChange={e=>setEditForm({...editForm, description:e.target.value})}/>
                      </div>
                      <div className="w-1/3 space-y-3">
                          <div>
                              <label className="text-xs text-slate-400 uppercase font-bold block mb-1">Visibility</label>
                              <select className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm" value={editForm.visibility} onChange={e=>setEditForm({...editForm, visibility:e.target.value})}><option value="public">Public</option><option value="private">Private</option></select>
                          </div>
                          <div>
                              <label className="text-xs text-slate-400 uppercase font-bold block mb-1">Access Level</label>
                              <select className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm font-bold text-yellow-400" value={editForm.accessLevel} onChange={e=>setEditForm({...editForm, accessLevel:e.target.value})}>
                                  <option value="free">Free (All)</option>
                                  <option value="vip">VIP (Vip/Dev/Admin)</option>
                                  <option value="dev">Dev (Dev/Admin)</option>
                              </select>
                          </div>
                      </div>
                  </div>
                  <div><div className="flex justify-between mb-1"><label className="text-xs text-slate-400 uppercase font-bold">Fixed Variables</label><button onClick={addEnv} className="text-xs text-blue-400">+ Add</button></div>{editForm.defaultEnvs.map((e, i) => (<div key={i} className="flex gap-2 mb-1"><input value={e.key} onChange={ev=>changeEnv(i, 'key', ev.target.value)} className="w-1/3 bg-slate-800 border border-slate-700 rounded p-1 text-xs text-white" placeholder="KEY"/><input value={e.value} onChange={ev=>changeEnv(i, 'value', ev.target.value)} className="flex-1 bg-slate-800 border border-slate-700 rounded p-1 text-xs text-white" placeholder="VAL"/></div>))}</div>
                  <div className="flex justify-end gap-2"><button onClick={()=>setEditingId(null)} className="text-slate-400 text-sm">Cancel</button><button onClick={handleSave} className="bg-blue-600 text-white px-3 py-1 rounded text-sm">Save Changes</button></div>
                </div>
              ) : <div className="text-sm text-slate-400 pl-8">{currentMeta?.description || 'No description'}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --- USER MANAGEMENT ---
const UserManagement = ({ currentUser, allContainers, onAction, onViewLogs }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const fetchUsers = async () => { setLoading(true); try { const res = await fetch(`${API_URL}/admin/users`, { headers: { 'x-user-id': currentUser.id } }); if(res.ok) setUsers(await res.json()); } catch(e) { console.error(e); } finally { setLoading(false); } };
  useEffect(() => { fetchUsers(); }, []);
  const handleUpdateField = async (id, field, value) => { await fetch(`${API_URL}/admin/users/${id}/update`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id }, body: JSON.stringify({ [field]: value }) }); fetchUsers(); };
  const handleDelete = async (id) => { if(!confirm('Delete?')) return; await fetch(`${API_URL}/admin/users/${id}`, { method: 'DELETE', headers: { 'x-user-id': currentUser.id } }); fetchUsers(); };

  return (
    <>
      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-700 bg-slate-900/50 flex justify-between items-center"><h3 className="font-bold text-white flex items-center gap-2"><Users size={18}/> User Management</h3><button onClick={fetchUsers}><RefreshCw size={14} className="text-slate-400 hover:text-white"/></button></div>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-900 text-slate-400 uppercase text-xs font-bold"><tr><th className="px-6 py-3">User</th><th className="px-6 py-3">Role</th><th className="px-6 py-3">Containers</th><th className="px-6 py-3">Image Limit</th><th className="px-6 py-3">Status</th><th className="px-6 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-700">{users.map(u => (<tr key={u.id} className="hover:bg-slate-700/30"><td className="px-6 py-3 font-medium text-white"><button onClick={()=>setSelectedUser(u)} className="hover:underline text-blue-400">{u.username}</button></td><td className="px-6 py-3"><select className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white outline-none uppercase" value={u.role} onChange={(e) => handleUpdateField(u.id, 'role', e.target.value)} disabled={u.id === currentUser.id}><option value="free">FREE</option><option value="vip">VIP</option><option value="dev_user">DEV</option><option value="admin">ADMIN</option></select></td><td className="px-6 py-3"><div className="flex items-center gap-2"><span className="text-white">{allContainers.filter(c => c.ownerId === u.id).length}</span>/<input type="number" className="w-12 bg-slate-900 border border-slate-600 rounded px-1 text-center text-white text-xs" defaultValue={u.containerLimit} onBlur={(e) => handleUpdateField(u.id, 'containerLimit', e.target.value)}/></div></td><td className="px-6 py-3"><input type="number" className="w-16 bg-slate-900 border border-slate-600 rounded px-1 py-0.5 text-center text-yellow-400 text-xs" defaultValue={u.imageLimit || 1} onBlur={(e) => handleUpdateField(u.id, 'imageLimit', e.target.value)}/></td><td className="px-6 py-3">{u.isBlocked ? <span className="text-red-400 text-xs">Blocked</span> : <span className="text-green-400 text-xs">Active</span>}</td><td className="px-6 py-3 text-right">{u.id !== currentUser.id && <><button onClick={() => handleUpdateField(u.id, 'isBlocked', !u.isBlocked)} className="text-yellow-400 hover:text-yellow-300 p-1"><Lock size={14}/></button><button onClick={() => handleDelete(u.id)} className="text-red-400 hover:text-red-300 p-1"><Trash2 size={14}/></button></>}</td></tr>))}</tbody></table></div>
      </div>
      {selectedUser && <UserDetailModal user={selectedUser} containers={allContainers} onClose={() => setSelectedUser(null)} onAction={onAction} onViewLogs={onViewLogs} />}
    </>
  );
};

const UserDetailModal = ({ user, containers, onClose, onAction, onViewLogs }) => {
  if (!user) return null;
  const userContainers = containers.filter(c => c.ownerId === user.id);
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 w-full max-w-4xl rounded-xl p-6 shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white text-lg">{user.username[0].toUpperCase()}</div><div><h2 className="text-xl font-bold text-white">{user.username}'s Containers</h2><p className="text-sm text-slate-400">{userContainers.length} containers deployed</p></div></div><button onClick={onClose} className="text-slate-400 hover:text-white"><X size={24}/></button></div>
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">{userContainers.length === 0 ? <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-700 rounded-lg">No containers found.</div> : <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{userContainers.map(c => <ContainerCard key={c.id} container={c} onAction={onAction} onViewLogs={onViewLogs} ownerName={null}/>)}</div>}</div>
      </div>
    </div>
  );
};

const ContainerLogsModal = ({ containerId, containerName, onClose, currentUser }) => {
  const [logs, setLogs] = useState("Loading...");
  const logsEndRef = useRef(null);
  useEffect(() => {
    const fetchLogs = async () => { try { const res = await fetch(`${API_URL}/containers/${containerId}/logs`, { headers: { 'x-user-id': currentUser.id } }); if (!res.ok) throw new Error("Error"); setLogs(await res.text()); } catch (e) { setLogs(e.message); } };
    fetchLogs(); const i = setInterval(fetchLogs, 3000); return () => clearInterval(i);
  }, [containerId, currentUser]);
  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-xl h-[80vh] flex flex-col">
        <div className="flex justify-between p-4 border-b border-slate-800"><h2 className="text-white font-bold flex items-center gap-2"><Terminal size={18} className="text-blue-400"/> Logs: {containerName}</h2><button onClick={onClose} className="text-slate-400 hover:text-white"><X/></button></div>
        <div className="flex-1 overflow-auto p-4 bg-black font-mono text-xs text-slate-300 custom-scrollbar whitespace-pre-wrap">{logs}<div ref={logsEndRef}/></div>
      </div>
    </div>
  );
};

// --- CONTAINER CARD ---
const ContainerCard = ({ container, onAction, onViewLogs, ownerName }) => {
  const isRunning = container.status === 'running';
  const isProcessing = container.status === 'processing';
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 shadow-sm hover:border-blue-500 transition-colors">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-md ${isRunning?'bg-green-500/20 text-green-400':'bg-slate-700 text-slate-400'}`}>{isProcessing ? <Loader2 className="animate-spin" size={20}/> : <Box size={20}/>}</div>
          <div className="overflow-hidden"><div className="font-semibold text-white truncate w-40" title={container.name}>{container.name}</div><div className="text-xs text-slate-400 font-mono truncate w-40" title={container.image}>{container.image}</div></div>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${isRunning?'text-green-400 bg-green-900/20':'text-red-400 bg-red-900/20'}`}>{container.status}</span>
      </div>
      {ownerName && <div className="mb-3 text-xs bg-slate-900 rounded px-2 py-1 border border-slate-700 inline-flex items-center gap-1 text-slate-400"><Users size={10}/> <span className="font-medium text-blue-300">{ownerName}</span></div>}
      <div className="flex gap-2 mt-auto">
        {isProcessing ? <button disabled className="flex-1 bg-slate-700 text-slate-400 py-1.5 rounded text-xs flex justify-center gap-1 cursor-not-allowed"><Loader2 className="animate-spin" size={14}/> Processing...</button> : (
          <>
            {!isRunning ? 
              <button onClick={()=>onAction(container.id, 'start')} className="flex-1 bg-green-600 hover:bg-green-500 text-white py-1.5 rounded text-xs flex items-center justify-center gap-1 font-medium transition-colors"><Play size={14}/> Start</button> :
              <button onClick={()=>onAction(container.id, 'stop')} className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white py-1.5 rounded text-xs flex items-center justify-center gap-1 font-medium transition-colors"><Square size={14}/> Stop</button>
            }
            {onViewLogs && <button onClick={()=>onViewLogs(container)} className="bg-slate-700 hover:bg-slate-600 text-slate-300 p-1.5 rounded" title="View Logs"><FileText size={16}/></button>}
            <button onClick={()=>onAction(container.id, 'delete')} className="bg-red-900/30 hover:bg-red-900/50 text-red-400 p-1.5 rounded transition-colors"><Trash2 size={16}/></button>
          </>
        )}
      </div>
    </div>
  );
};

// --- MAIN APP ---
export default function DockerManager() {
  const [currentUser, setCurrentUser] = useState(null);
  const [containers, setContainers] = useState([]);
  const [images, setImages] = useState([]);
  const [imageMeta, setImageMeta] = useState({});
  const [userSavedVars, setUserSavedVars] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [systemStats, setSystemStats] = useState(null);
  const [viewMode, setViewMode] = useState('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [fetchError, setFetchError] = useState(false);
  const [logsContainer, setLogsContainer] = useState(null);

  useEffect(() => { const u = localStorage.getItem('currentUser'); if(u) setCurrentUser(JSON.parse(u)); }, []);

  const fetchData = useCallback(async () => {
    if(!currentUser) return;
    try {
      const headers = {'x-user-id': currentUser.id};
      const [imgRes, contRes, metaRes, confRes] = await Promise.all([
        fetch(`${API_URL}/images`, {headers}), fetch(`${API_URL}/containers`, {headers}), fetch(`${API_URL}/meta`, {headers}), fetch(`${API_URL}/configs`, {headers})
      ]);
      if(imgRes.ok) setImages(await imgRes.json());
      if(contRes.ok) setContainers(await contRes.json());
      if(metaRes.ok) setImageMeta(await metaRes.json());
      if(confRes.ok) setUserSavedVars((await confRes.json()).savedVars || []);
      if (['admin', 'dev_user'].includes(currentUser.role)) {
         const sysRes = await fetch(`${API_URL}/system`, {headers});
         const userRes = await fetch(`${API_URL}/admin/users`, {headers});
         if (sysRes.ok) setSystemStats(await sysRes.json());
         if (userRes.ok) setAllUsers(await userRes.json());
      }
    } catch(e) { console.error(e); setFetchError(true); }
  }, [currentUser]);

  useEffect(() => { if(currentUser) { fetchData(); const i = setInterval(fetchData, 3000); return ()=>clearInterval(i); } }, [fetchData, currentUser]);

  const handleAuth = async (type, u, p) => { setAuthLoading(true); setAuthError(''); try { const res = await fetch(`${API_URL}/${type}`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({username:u, password:p}) }); const data = await res.json(); if(!res.ok) throw new Error(data.error); setCurrentUser(data); localStorage.setItem('currentUser', JSON.stringify(data)); } catch(e) { setAuthError(e.message); } finally { setAuthLoading(false); } };
  const handleSaveMeta = async (id, meta) => { await fetch(`${API_URL}/meta`, {method:'POST', headers:{'Content-Type':'application/json', 'x-user-id':currentUser.id}, body:JSON.stringify({id, meta})}); setImageMeta(prev => ({...prev, [id]: meta})); };
  const handleSaveVars = async (vars) => { await fetch(`${API_URL}/configs`, {method:'POST', headers:{'Content-Type':'application/json', 'x-user-id':currentUser.id}, body:JSON.stringify({savedVars: vars})}); setUserSavedVars(vars); };
  const handleAction = async (id, action) => { if(action==='delete'&&!confirm('Sure?'))return; setContainers(prev=>prev.map(c=>c.id===id?{...c,status:'processing'}:c)); try{await fetch(`${API_URL}/containers/${id}/${action}`, {method:'POST', headers:{'x-user-id':currentUser.id}}); setTimeout(fetchData,500);}catch{alert('Failed'); fetchData();} };
  const handleCreate = async (data) => { setLoading(true); try{const r=await fetch(`${API_URL}/containers`, {method:'POST', headers:{'Content-Type':'application/json', 'x-user-id':currentUser.id}, body:JSON.stringify(data)}); if(!r.ok) throw new Error((await r.json()).error); fetchData(); setIsModalOpen(false); }catch(e){alert(e.message);}finally{setLoading(false);} };
  const handleDeleteImage = async (n, t) => { if(confirm('Delete?')) { await fetch(`${API_URL}/images/${encodeURIComponent(n+':'+t)}`, {method:'DELETE', headers:{'x-user-id':currentUser.id}}); fetchData(); } };

  if(!currentUser) return <AuthScreen onLogin={(u,p)=>handleAuth('login',u,p)} onRegister={(u,p)=>handleAuth('register',u,p)} isLoading={authLoading} error={authError}/>;

  const isAdmin = ['admin', 'dev_user'].includes(currentUser.role);
  const myContainers = containers.filter(c => c.ownerId === currentUser.id);
  const myImagesCount = images.filter(i => i.ownerId === currentUser.id).length;
  const quotaUsed = myContainers.length;

  return (
    <div className="flex h-screen bg-slate-900 text-slate-200 font-sans">
      <div className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col">
        <div className="p-6"><div className="text-xl font-bold text-white flex gap-2 items-center"><Cpu className="text-blue-500"/> DockManager</div></div>
        <nav className="flex-1 px-3 space-y-1">
          <button onClick={()=>setViewMode('dashboard')} className={`w-full text-left px-4 py-3 rounded flex gap-2 ${viewMode==='dashboard'?'bg-blue-900/30 text-blue-400':''}`}><Server size={18}/> Dashboard</button>
          <button onClick={()=>setViewMode('builder')} className={`w-full text-left px-4 py-3 rounded flex gap-2 ${viewMode==='builder'?'bg-blue-900/30 text-blue-400':''}`}><Hammer size={18}/> Builder</button>
          <button onClick={()=>setViewMode('images')} className={`w-full text-left px-4 py-3 rounded flex gap-2 ${viewMode==='images'?'bg-blue-900/30 text-blue-400':''}`}><Database size={18}/> Registry</button>
          {isAdmin && <button onClick={()=>setViewMode('users')} className={`w-full text-left px-4 py-3 rounded flex gap-2 ${viewMode==='users'?'bg-blue-900/30 text-blue-400':''}`}><Users size={18}/> Users</button>}
          <button onClick={()=>setViewMode('settings')} className={`w-full text-left px-4 py-3 rounded flex gap-2 ${viewMode==='settings'?'bg-blue-900/30 text-blue-400':''}`}><Settings size={18}/> Settings</button>
        </nav>
        <div className="p-4 border-t border-slate-800"><div className="font-bold text-white">{currentUser.username}</div><div className="text-xs text-slate-500 uppercase">{currentUser.role}</div><button onClick={()=>{setCurrentUser(null); localStorage.removeItem('currentUser')}} className="mt-2 text-xs text-red-400 flex gap-1 items-center"><LogOut size={12}/> Sign Out</button></div>
      </div>
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {fetchError && <div className="absolute top-0 w-full bg-red-600 text-white text-xs py-1 text-center flex items-center justify-center gap-2"><AlertTriangle size={12}/> Connection Error. <button onClick={()=>fetchData()} className="underline hover:text-red-100">Retry</button></div>}
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-8"><h2 className="text-lg font-bold capitalize">{viewMode}</h2>{viewMode==='dashboard' && <button onClick={()=>setIsModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded font-bold flex gap-2 items-center"><Plus size={18}/> New</button>}</header>
        <main className="flex-1 overflow-y-auto p-8">
          {viewMode==='dashboard' && <>{isAdmin && <div className="mb-8"><SystemOverview stats={systemStats} totalUsers={allUsers.length}/></div>}<div className="grid grid-cols-3 gap-6">{myContainers.map(c=><ContainerCard key={c.id} container={c} onAction={handleAction} onViewLogs={setLogsContainer}/>)}</div></>}
          {viewMode==='builder' && <ImageBuilder currentUser={currentUser} myImagesCount={myImagesCount}/>}
          {viewMode==='images' && <ImageRegistryManager images={images} meta={imageMeta} onSaveMeta={handleSaveMeta} onDeleteImage={handleDeleteImage} currentUser={currentUser} allUsers={allUsers}/>}
          {viewMode==='settings' && <UserSettings savedVars={userSavedVars} onSave={handleSaveVars} currentUser={currentUser}/>}
          {viewMode==='users' && isAdmin && <UserManagement currentUser={currentUser} allContainers={containers} onAction={handleAction} onViewLogs={setLogsContainer}/>}
          <footer className="p-4 text-center text-xs text-slate-600 border-t border-slate-800 mt-auto">
            Được tạo bởi Gemini 3Pro, phát triển: <a href="https://github.com/nguyenmanmkt" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">https://github.com/nguyenmanmkt</a>
          </footer>
        </main>
      </div>
      <CreateContainerModal isOpen={isModalOpen} onClose={()=>setIsModalOpen(false)} images={images} onCreate={handleCreate} imageMeta={imageMeta} userSavedVars={userSavedVars} userQuotaRemaining={currentUser.containerLimit-myContainers.length} isLoading={loading} currentUser={currentUser}/>
      {logsContainer && <ContainerLogsModal containerId={logsContainer.id} containerName={logsContainer.name} onClose={()=>setLogsContainer(null)} currentUser={currentUser}/>}
    </div>
  );
}
