import React, { useState, useEffect } from 'react';
import { Users, Search, RefreshCw, Lock, Trash2, X } from 'lucide-react';
import { User, Container } from '../types';
import { API_URL } from '../constants';
import { getAuthHeaders } from '../utils/helpers';
import ContainerCard from './ContainerCard';

interface UserManagementProps {
  currentUser: User;
  allContainers: Container[];
  onAction: (id: string, action: 'start' | 'stop' | 'delete') => void;
  onViewLogs: (container: Container) => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ currentUser, allContainers, onAction, onViewLogs }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/users`, { headers: getAuthHeaders() as any });
      if (res.ok) setUsers(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleUpdateField = async (id: string, field: string, value: any) => {
    await fetch(`${API_URL}/admin/users/${id}/update`, {
      method: 'POST',
      headers: getAuthHeaders() as any,
      body: JSON.stringify({ [field]: value })
    });
    fetchUsers();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete user and all their data?')) return;
    await fetch(`${API_URL}/admin/users/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders() as any
    });
    fetchUsers();
  };

  const filteredUsers = users.filter(u => u.username.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <>
      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-700 bg-slate-900/50 flex flex-col sm:flex-row justify-between items-center gap-3">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Users size={18}/> User Management
          </h3>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
              <input 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                placeholder="Search users..." 
                className="w-full bg-slate-800 border border-slate-600 rounded pl-8 pr-3 py-1.5 text-xs text-white outline-none focus:border-blue-500"
              />
            </div>
            <button onClick={fetchUsers} className="text-slate-400 hover:text-white p-1.5 rounded hover:bg-slate-700 transition-colors">
              <RefreshCw size={14} className={loading ? "animate-spin" : ""}/>
            </button>
          </div>
        </div>
        
        <div className="overflow-y-auto max-h-[calc(100vh-200px)] custom-scrollbar">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900 text-slate-400 uppercase text-xs font-bold sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3">User</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Containers</th>
                <th className="px-6 py-3">Image Limit</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-slate-700/30 transition-colors">
                  <td className="px-6 py-3 font-medium text-white">
                    <button onClick={() => setSelectedUser(u)} className="hover:underline text-blue-400">
                      {u.username}
                    </button>
                  </td>
                  <td className="px-6 py-3">
                    <select 
                      className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white outline-none uppercase" 
                      value={u.role} 
                      onChange={(e) => handleUpdateField(u.id, 'role', e.target.value)} 
                      disabled={u.id === currentUser.id}
                    >
                      <option value="free">FREE</option>
                      <option value="vip">VIP</option>
                      <option value="dev_user">DEV</option>
                      <option value="admin">ADMIN</option>
                    </select>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-white">{allContainers.filter(c => c.ownerId === u.id).length}</span>/
                      <input 
                        type="number" 
                        className="w-12 bg-slate-900 border border-slate-600 rounded px-1 text-center text-white text-xs" 
                        defaultValue={u.containerLimit} 
                        onBlur={(e) => handleUpdateField(u.id, 'containerLimit', e.target.value)}
                      />
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <input 
                      type="number" 
                      className="w-16 bg-slate-900 border border-slate-600 rounded px-1 py-0.5 text-center text-yellow-400 text-xs" 
                      defaultValue={u.imageLimit || 1} 
                      onBlur={(e) => handleUpdateField(u.id, 'imageLimit', e.target.value)}
                    />
                  </td>
                  <td className="px-6 py-3">
                    {u.isBlocked ? <span className="text-red-400 text-xs">Blocked</span> : <span className="text-green-400 text-xs">Active</span>}
                  </td>
                  <td className="px-6 py-3 text-right">
                    {u.id !== currentUser.id && (
                      <>
                        <button onClick={() => handleUpdateField(u.id, 'isBlocked', !u.isBlocked)} className="text-yellow-400 hover:text-yellow-300 p-1 mr-2 transition-colors">
                          <Lock size={14}/>
                        </button>
                        <button onClick={() => handleDelete(u.id)} className="text-red-400 hover:text-red-300 p-1 transition-colors">
                          <Trash2 size={14}/>
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {selectedUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-slate-800 border border-slate-700 w-full max-w-4xl rounded-xl p-6 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white text-lg">
                  {selectedUser.username[0].toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedUser.username}'s Containers</h2>
                  <p className="text-sm text-slate-400">{allContainers.filter(c => c.ownerId === selectedUser.id).length} containers deployed</p>
                </div>
              </div>
              <button onClick={() => setSelectedUser(null)} className="text-slate-400 hover:text-white transition-colors">
                <X size={24}/>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {allContainers.filter(c => c.ownerId === selectedUser.id).length === 0 ? (
                <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-700 rounded-lg">No containers found.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {allContainers.filter(c => c.ownerId === selectedUser.id).map(c => (
                    <ContainerCard key={c.id} container={c} onAction={onAction} onViewLogs={onViewLogs} ownerName={null}/>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UserManagement;