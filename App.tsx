
import React, { useState, useEffect, useCallback } from 'react';
import { Menu, AlertTriangle, Plus, Server, Cpu } from 'lucide-react';
import { User, Container, Image, ImageMeta, EnvVar, SystemStats } from './types';
import { API_URL } from './constants';
import { getAuthHeaders } from './utils/helpers';
import AuthScreen from './components/AuthScreen';
import Sidebar from './components/Sidebar';
import SystemOverview from './components/SystemOverview';
import ContainerCard from './components/ContainerCard';
import ImageBuilder from './components/ImageBuilder';
import ImageRegistryManager from './components/ImageRegistryManager';
import UserSettings from './components/UserSettings';
import UserManagement from './components/UserManagement';
import CreateContainerModal from './components/CreateContainerModal';
import ContainerLogsModal from './components/ContainerLogsModal';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [containers, setContainers] = useState<Container[]>([]);
  const [images, setImages] = useState<Image[]>([]);
  const [imageMeta, setImageMeta] = useState<Record<string, ImageMeta>>({});
  const [userSavedVars, setUserSavedVars] = useState<EnvVar[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  
  const [viewMode, setViewMode] = useState<'dashboard' | 'builder' | 'images' | 'users' | 'settings'>('dashboard');
  const [dashboardFilter, setDashboardFilter] = useState<'mine' | 'all'>('mine');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [fetchError, setFetchError] = useState(false);
  const [logsContainer, setLogsContainer] = useState<Container | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Failed to parse saved user", e);
      }
    }
  }, []);

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
  }, []);

  const fetchContainers = useCallback(async () => {
    if (!currentUser) return;
    try {
      const headers = getAuthHeaders() as any;
      const contRes = await fetch(`${API_URL}/containers`, { headers });
      
      if (contRes.status === 401 || contRes.status === 403) {
        handleLogout();
        return;
      }

      if (contRes.ok) {
        setContainers(await contRes.json());
        setFetchError(false);
      } else {
        // Silently handle rate limits or other temporary issues to avoid UI flickering
        if (contRes.status !== 429) {
           console.warn(`Fetch failed: ${contRes.statusText}`);
           throw new Error("Fetch failed");
        }
      }
    } catch (e) {
      console.error(e);
      setFetchError(true);
    }
  }, [currentUser, handleLogout]);

  const fetchSystemData = useCallback(async () => {
    if (!currentUser) return;
    try {
      const headers = getAuthHeaders() as any;
      const [imgRes, metaRes, confRes] = await Promise.all([
        fetch(`${API_URL}/images`, { headers }),
        fetch(`${API_URL}/meta`, { headers }),
        fetch(`${API_URL}/configs`, { headers })
      ]);
      
      if (imgRes.status === 401) { handleLogout(); return; }

      if (imgRes.ok) setImages(await imgRes.json());
      if (metaRes.ok) setImageMeta(await metaRes.json());
      if (confRes.ok) setUserSavedVars((await confRes.json()).savedVars || []);
      
      if (['admin', 'dev_user'].includes(currentUser.role)) {
        const sysRes = await fetch(`${API_URL}/system`, { headers });
        const userRes = await fetch(`${API_URL}/admin/users`, { headers });
        if (sysRes.ok) setSystemStats(await sysRes.json());
        if (userRes.ok) setAllUsers(await userRes.json());
      }
    } catch (e) {
      console.error(e);
    }
  }, [currentUser, handleLogout]);

  const fetchData = useCallback(() => {
    fetchContainers();
    fetchSystemData();
  }, [fetchContainers, fetchSystemData]);

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser, fetchData]);

  useEffect(() => {
    if (currentUser) {
      // Increased to 15s to respect rate limiting (100 req / 15 min)
      const i = setInterval(fetchContainers, 15000);
      return () => clearInterval(i);
    }
  }, [fetchContainers, currentUser]);

  const handleAuth = async (type: 'login' | 'register', u: string, p: string) => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await fetch(`${API_URL}/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, password: p })
      });
      
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          setCurrentUser(data);
          localStorage.setItem('currentUser', JSON.stringify(data));
      } else {
          const text = await res.text();
          throw new Error(text || `Request failed with status ${res.status}`);
      }
    } catch (e: any) {
      setAuthError(e.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSaveMeta = async (id: string, meta: ImageMeta) => {
    if (!currentUser) return;
    await fetch(`${API_URL}/meta`, {
      method: 'POST',
      headers: getAuthHeaders() as any,
      body: JSON.stringify({ id, meta })
    });
    setImageMeta(prev => ({ ...prev, [id]: meta }));
  };

  const handleSaveVars = async (vars: EnvVar[]) => {
    if (!currentUser) return;
    await fetch(`${API_URL}/configs`, {
      method: 'POST',
      headers: getAuthHeaders() as any,
      body: JSON.stringify({ savedVars: vars })
    });
    setUserSavedVars(vars);
  };

  const handleAction = async (id: string, action: 'start' | 'stop' | 'delete') => {
    if (!currentUser) return;
    if (action === 'delete' && !confirm('Are you sure you want to delete this container?')) return;
    
    setContainers(prev => prev.map(c => c.id === id ? { ...c, status: 'processing' } : c));
    try {
      await fetch(`${API_URL}/containers/${id}/${action}`, {
        method: 'POST',
        headers: getAuthHeaders() as any
      });
      setTimeout(fetchContainers, 500);
    } catch {
      alert('Action failed');
      fetchData();
    }
  };

  const handleCreate = async (data: any) => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/containers`, {
        method: 'POST',
        headers: getAuthHeaders() as any,
        body: JSON.stringify(data)
      });
      const contentType = r.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
          const resData = await r.json();
          if (!r.ok) throw new Error(resData.error);
      } else {
          const text = await r.text();
          throw new Error(text || "Failed to create container");
      }
      
      fetchData();
      setIsModalOpen(false);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteImage = async (name: string, tag: string) => {
    if (!currentUser) return;
    if (confirm('Delete this image?')) {
      await fetch(`${API_URL}/images/${encodeURIComponent(name + ':' + tag)}`, {
        method: 'DELETE',
        headers: getAuthHeaders() as any
      });
      fetchData();
    }
  };

  const handlePruneImages = async () => {
    if (!currentUser) return;
    if (confirm('Delete all <none> images?')) {
      await fetch(`${API_URL}/images/prune`, {
        method: 'POST',
        headers: getAuthHeaders() as any
      });
      fetchData();
    }
  };

  if (!currentUser) {
    return (
      <AuthScreen 
        onLogin={(u, p) => handleAuth('login', u, p)} 
        onRegister={(u, p) => handleAuth('register', u, p)} 
        isLoading={authLoading} 
        error={authError} 
      />
    );
  }

  const isAdmin = ['admin', 'dev_user'].includes(currentUser.role);
  const displayedContainers = dashboardFilter === 'all' && isAdmin 
    ? containers 
    : containers.filter(c => c.ownerId === currentUser.id && c.role !== 'child');
  
  const myContainersCount = containers.filter(c => c.ownerId === currentUser.id).length;
  const myImagesCount = images.filter(i => i.ownerId === currentUser.id).length;
  const quotaUsed = myContainersCount;

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-900 text-slate-200 font-sans overflow-hidden">
      <Sidebar 
        currentUser={currentUser} 
        viewMode={viewMode} 
        setViewMode={setViewMode} 
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        setDashboardFilter={setDashboardFilter}
        onLogout={handleLogout}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Mobile Header */}
        <div className="md:hidden bg-slate-950 border-b border-slate-800 p-4 flex justify-between items-center shrink-0">
          <div className="font-bold text-white flex gap-2 items-center cursor-pointer" onClick={() => setViewMode('dashboard')}>
            <Cpu className="text-blue-500" /> DockManager
          </div>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            <Menu className="text-white" />
          </button>
        </div>

        {fetchError && (
          <div className="absolute top-0 w-full bg-red-600 text-white text-xs py-1 text-center flex items-center justify-center gap-2 z-50">
            <AlertTriangle size={12} /> Connection Error. 
            <button onClick={() => fetchData()} className="underline hover:text-red-100">Retry</button>
          </div>
        )}

        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-4 md:px-8 shrink-0 bg-slate-900">
          <h2 className="text-lg font-bold capitalize flex items-center gap-2">
            {viewMode} 
            {dashboardFilter === 'all' && viewMode === 'dashboard' && (
              <span className="text-xs bg-blue-600 px-2 py-0.5 rounded text-white">ALL VIEW</span>
            )}
          </h2>
          {viewMode === 'dashboard' && (
            <div className="flex items-center gap-6">
              <div className="flex flex-col items-end text-xs">
                <span className="text-slate-500 font-bold uppercase">My Quota</span>
                <span className={`${quotaUsed >= currentUser.containerLimit ? 'text-red-400' : 'text-blue-400'} font-mono`}>
                  {quotaUsed} / {currentUser.containerLimit}
                </span>
              </div>
              <button 
                onClick={() => setIsModalOpen(true)} 
                className="bg-blue-600 text-white px-4 py-2 rounded font-bold flex gap-2 items-center shadow-lg shadow-blue-900/20 ml-4 transition-all hover:bg-blue-500"
              >
                <Plus size={18} /> New
              </button>
            </div>
          )}
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col custom-scrollbar min-h-0 bg-slate-900">
          {viewMode === 'dashboard' && (
            <>
              {isAdmin && systemStats && (
                <div className="mb-8">
                  <SystemOverview 
                    stats={systemStats} 
                    totalUsers={allUsers.length} 
                    onFilterClick={(f) => setDashboardFilter(f === dashboardFilter ? 'mine' : f)} 
                    onManageImages={() => setViewMode('images')} 
                  />
                </div>
              )}
              
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-400 font-bold uppercase text-xs flex gap-2 items-center">
                  <Server size={14} /> {dashboardFilter === 'all' ? 'All System Containers' : 'My Containers'}
                </h3>
                {dashboardFilter === 'all' && (
                  <button onClick={() => setDashboardFilter('mine')} className="text-blue-400 text-[10px] hover:underline">
                    Show Only Mine
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayedContainers.length ? (
                  displayedContainers.map(c => (
                    <ContainerCard 
                      key={c.id} 
                      container={c} 
                      onAction={handleAction} 
                      onViewLogs={setLogsContainer} 
                      ownerName={isAdmin && dashboardFilter === 'all' ? (allUsers.find(u => u.id === c.ownerId)?.username || c.ownerId) : null}
                    />
                  ))
                ) : (
                  <div className="col-span-full h-32 flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-xl">
                    <p>No containers found.</p>
                  </div>
                )}
              </div>
            </>
          )}

          {viewMode === 'builder' && (
            <ImageBuilder currentUser={currentUser} myImagesCount={myImagesCount} />
          )}

          {viewMode === 'images' && (
            <ImageRegistryManager 
              images={images} 
              meta={imageMeta} 
              onSaveMeta={handleSaveMeta} 
              onDeleteImage={handleDeleteImage} 
              currentUser={currentUser} 
              allUsers={allUsers} 
            />
          )}

          {viewMode === 'settings' && (
            <UserSettings savedVars={userSavedVars} onSave={handleSaveVars} currentUser={currentUser} />
          )}

          {viewMode === 'users' && isAdmin && (
            <UserManagement 
              currentUser={currentUser} 
              allContainers={containers} 
              onAction={handleAction} 
              onViewLogs={setLogsContainer} 
            />
          )}
          
          <footer className="p-4 text-center text-xs text-slate-600 border-t border-slate-800 mt-auto pt-8">
            <p>Created by Gemini 3Pro</p>
            <p>Developer: <a href="https://github.com/nguyenmanmkt" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">https://github.com/nguyenmanmkt</a></p>
          </footer>
        </main>
      </div>

      <CreateContainerModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        images={images} 
        onCreate={handleCreate} 
        imageMeta={imageMeta} 
        userSavedVars={userSavedVars} 
        userQuotaRemaining={currentUser.containerLimit - quotaUsed} 
        isLoading={loading} 
        currentUser={currentUser} 
      />

      {logsContainer && (
        <ContainerLogsModal 
          containerId={logsContainer.id} 
          containerName={logsContainer.name} 
          onClose={() => setLogsContainer(null)} 
          currentUser={currentUser} 
        />
      )}
    </div>
  );
}
