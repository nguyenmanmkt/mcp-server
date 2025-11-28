import React, { useState } from 'react';
import { Database, Filter, Server, Lock, Globe, Crown, Edit, Trash2, X, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { Image, ImageMeta, User } from '../types';
import { CATEGORIES } from '../constants';
import { isSystemImage, formatDate, renderMarkdown } from '../utils/helpers';

interface ImageRegistryManagerProps {
  images: Image[];
  meta: Record<string, ImageMeta>;
  onSaveMeta: (id: string, meta: ImageMeta) => void;
  onDeleteImage: (name: string, tag: string) => void;
  currentUser: User;
  allUsers: User[];
}

const ImageRegistryManager: React.FC<ImageRegistryManagerProps> = ({ 
  images, meta, onSaveMeta, onDeleteImage, currentUser, allUsers 
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editForm, setEditForm] = useState<ImageMeta>({ 
    description: '', defaultEnvs: [], visibility: 'public', 
    accessLevel: 'free', category: 'Uncategorized', childImage: '' 
  });
  const [showSystem, setShowSystem] = useState(false);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});
  
  const filteredImages = images.filter(img => {
    const isSystem = isSystemImage(img.name);
    if (!showSystem && isSystem) return false;
    const matchesSearch = img.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (img.tag && img.tag.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  const isAdmin = ['admin', 'dev_user'].includes(currentUser.role);
  
  const getOwnerName = (id: string) => {
    if (id === 'system') return 'System';
    if (id === currentUser.id) return 'You';
    const u = allUsers.find(x => x.id === id);
    return u ? u.username : id.substring(0, 8);
  };

  const handleEdit = (img: Image) => {
    const key = `${img.name}:${img.tag}`;
    setEditingId(key);
    const m = meta[key] || {};
    setEditForm({ 
      description: m.description || '', 
      defaultEnvs: m.defaultEnvs || [], 
      visibility: m.visibility || 'public', 
      accessLevel: m.accessLevel || 'free', 
      category: m.category || 'Uncategorized', 
      childImage: m.childImage || '' 
    });
  };

  const handleSave = () => {
    if (editingId) {
      onSaveMeta(editingId, editForm);
      setEditingId(null);
    }
  };

  const toggleDescription = (key: string) => {
    setExpandedDescriptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const addEnv = () => setEditForm(p => ({ ...p, defaultEnvs: [...(p.defaultEnvs || []), { key: '', value: '' }] }));
  
  const changeEnv = (idx: number, field: 'key' | 'value', val: string) => {
    const n = [...(editForm.defaultEnvs || [])];
    n[idx][field] = val;
    setEditForm({ ...editForm, defaultEnvs: n });
  };
  
  const removeEnv = (idx: number) => {
    setEditForm(p => ({ ...p, defaultEnvs: (p.defaultEnvs || []).filter((_, i) => i !== idx) }));
  };

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-slate-700 bg-slate-900/50 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
        <h3 className="font-bold text-white flex gap-2 items-center">
          <Database size={18}/> Image Registry
        </h3>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
             <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
             <input 
               value={searchTerm} 
               onChange={e => setSearchTerm(e.target.value)} 
               placeholder="Search images..." 
               className="w-full sm:w-48 bg-slate-900 border border-slate-600 rounded pl-8 pr-3 py-1.5 text-xs text-white outline-none focus:border-blue-500 transition-colors"
             />
          </div>
          <button 
            onClick={() => setShowSystem(!showSystem)} 
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold border whitespace-nowrap transition-colors ${showSystem ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-600 text-slate-400'}`}
          >
            <Filter size={12}/> <span className="hidden sm:inline">System</span>
          </button>
        </div>
      </div>
      
      <div className="overflow-y-auto custom-scrollbar max-h-[calc(100vh-220px)] flex-1">
        <div className="divide-y divide-slate-700">
          {filteredImages.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No images found matching your search.</div>
          ) : (
            filteredImages.map(img => {
              const key = `${img.name}:${img.tag}`;
              const isEditing = editingId === key;
              const currentMeta = meta[key] || {};
              const isOwner = img.ownerId === currentUser.id;
              const isPrivate = img.visibility === 'private';
              const ownerName = getOwnerName(img.ownerId);
              const level = currentMeta.accessLevel || 'free';
              
              const description = currentMeta?.description || '';
              const isDescExpanded = expandedDescriptions[key];
              const isLongDescription = description.length > 150 || (description.match(/\n/g) || []).length > 2;

              return (
                <div key={key} className="p-4 hover:bg-slate-700/30 transition-colors">
                  <div className="flex flex-col sm:flex-row justify-between mb-2">
                    <div className="flex gap-3 items-center mb-2 sm:mb-0">
                      <Server className="text-blue-500" size={20}/>
                      <div>
                        <div className="font-mono font-bold text-white flex items-center gap-2 flex-wrap">
                          {img.name}:{img.tag}
                          {isPrivate ? <Lock size={12} className="text-yellow-400"/> : <Globe size={12} className="text-green-400"/>}
                          {isOwner && <span className="bg-blue-900/50 text-blue-300 text-[9px] px-1.5 py-0.5 rounded border border-blue-800">MINE</span>}
                          {level !== 'free' && (
                            <span className={`text-[9px] px-1 rounded uppercase font-bold flex items-center gap-1 ${level === 'vip' ? 'bg-yellow-500 text-black' : 'bg-blue-400 text-black'}`}>
                              {level === 'vip' && <Crown size={8}/>}{level}
                            </span>
                          )}
                          <span className="text-[9px] px-1.5 py-0.5 bg-slate-700 rounded text-slate-300">
                            {currentMeta.category || 'Uncategorized'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">
                          {img.size} • {formatDate(img.created)} • Owner: {ownerName} {currentMeta.childImage && ` • +Child: ${currentMeta.childImage}`}
                        </div>
                      </div>
                    </div>
                    
                    {(isAdmin || isOwner) && !isEditing && (
                      <div className="flex gap-2">
                        <button onClick={() => handleEdit(img)} className="text-blue-400 hover:text-white p-1 transition-colors">
                          <Edit size={16}/>
                        </button>
                        <button onClick={() => onDeleteImage(img.name, img.tag)} className="text-red-400 hover:text-red-200 p-1 transition-colors">
                          <Trash2 size={16}/>
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {isEditing ? (
                    <div className="bg-slate-900 p-4 rounded space-y-3 border border-blue-500/50">
                      <div className="flex flex-col md:flex-row gap-3">
                        <div className="flex-1 space-y-3">
                          <div>
                            <label className="text-xs text-slate-400 uppercase font-bold block mb-1">Description (Markdown Supported)</label>
                            <textarea 
                              className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm h-20" 
                              value={editForm.description} 
                              onChange={e => setEditForm({...editForm, description: e.target.value})}
                            />
                          </div>
                          {isAdmin && (
                            <div>
                              <label className="text-xs text-slate-400 uppercase font-bold block mb-1">Child Container Image (Sidecar)</label>
                              <input 
                                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm font-mono" 
                                placeholder="e.g. redis:alpine" 
                                value={editForm.childImage} 
                                onChange={e => setEditForm({...editForm, childImage: e.target.value})}
                              />
                            </div>
                          )}
                        </div>
                        <div className="w-full md:w-1/3 space-y-3">
                          <div>
                            <label className="text-xs text-slate-400 uppercase font-bold block mb-1">Category</label>
                            <select 
                              className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm" 
                              value={editForm.category} 
                              onChange={e => setEditForm({...editForm, category: e.target.value})}
                            >
                              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-slate-400 uppercase font-bold block mb-1">Visibility</label>
                            <select 
                              className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm" 
                              value={editForm.visibility} 
                              onChange={e => setEditForm({...editForm, visibility: e.target.value})}
                            >
                              <option value="public">Public</option>
                              <option value="private">Private</option>
                            </select>
                          </div>
                          {isAdmin && (
                            <div>
                              <label className="text-xs text-slate-400 uppercase font-bold block mb-1">Access Level</label>
                              <select 
                                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm font-bold text-yellow-400" 
                                value={editForm.accessLevel} 
                                onChange={e => setEditForm({...editForm, accessLevel: e.target.value})}
                              >
                                <option value="free">Free</option>
                                <option value="vip">VIP</option>
                                <option value="dev">Dev</option>
                              </select>
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <label className="text-xs text-slate-400 uppercase font-bold">Fixed Variables</label>
                          <button onClick={addEnv} className="text-xs text-blue-400 hover:text-blue-300">+ Add</button>
                        </div>
                        {(editForm.defaultEnvs || []).map((e, i) => (
                          <div key={i} className="flex gap-2 mb-1">
                            <input 
                              value={e.key} 
                              onChange={ev => changeEnv(i, 'key', ev.target.value)} 
                              className="w-1/3 bg-slate-800 border border-slate-700 rounded p-1 text-xs text-white" 
                              placeholder="KEY"
                            />
                            <input 
                              value={e.value} 
                              onChange={ev => changeEnv(i, 'value', ev.target.value)} 
                              className="flex-1 bg-slate-800 border border-slate-700 rounded p-1 text-xs text-white" 
                              placeholder="VAL"
                            />
                            <button onClick={() => removeEnv(i)} className="text-red-500 px-1 hover:bg-red-900/20 rounded transition-colors">
                              <X size={14}/>
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setEditingId(null)} className="text-slate-400 text-sm hover:text-white transition-colors">Cancel</button>
                        <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-sm transition-colors">Save Changes</button>
                      </div>
                    </div>
                  ) : (
                    <div className="pl-8 mt-2">
                      <div className={`text-sm text-slate-400 ${!isDescExpanded && isLongDescription ? 'max-h-20 overflow-hidden relative' : ''}`}>
                        {renderMarkdown(description) || 'No description'}
                        {!isDescExpanded && isLongDescription && (
                          <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-slate-800 to-transparent pointer-events-none"/>
                        )}
                      </div>
                      {isLongDescription && (
                        <button 
                          onClick={() => toggleDescription(key)} 
                          className="text-xs text-blue-400 mt-1 hover:text-blue-300 font-medium focus:outline-none flex items-center gap-1"
                        >
                          {isDescExpanded ? <><ChevronUp size={12}/> Show Less</> : <><ChevronDown size={12}/> Show More</>}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageRegistryManager;