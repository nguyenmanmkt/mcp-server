import React, { useState, useEffect } from 'react';
import { Settings, Save, Trash2, EyeOff, Eye, Lock } from 'lucide-react';
import { EnvVar, User } from '../types';
import { API_URL } from '../constants';
import { getAuthHeaders } from '../utils/helpers';

interface UserSettingsProps {
  savedVars: EnvVar[];
  onSave: (vars: EnvVar[]) => void;
  currentUser: User;
}

const UserSettings: React.FC<UserSettingsProps> = ({ savedVars, onSave, currentUser }) => {
  const [vars, setVars] = useState(savedVars || []);
  const [pass, setPass] = useState('');
  const [msg, setMsg] = useState('');
  const [visible, setVisible] = useState<Record<number, boolean>>({});

  useEffect(() => { 
    if (JSON.stringify(savedVars) !== JSON.stringify(vars)) {
      setVars(savedVars || []);
    }
  }, [savedVars]);

  const handleChangePass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/change-password`, {
        method: 'POST',
        headers: getAuthHeaders() as any,
        body: JSON.stringify({ newPassword: pass })
      });
      if (res.ok) {
        setMsg('Success!');
        setPass('');
      } else {
        setMsg('Failed.');
      }
    } catch {
      setMsg('Error.');
    }
  };

  const updateVar = (idx: number, field: 'key' | 'value' | 'label', val: string) => {
    const n = [...vars];
    n[idx][field] = val;
    setVars(n);
  };

  const removeVar = (idx: number) => {
    const n = vars.filter((_, i) => i !== idx);
    setVars(n);
    onSave(n);
  };

  const addVar = () => setVars([...vars, { key: 'NEW_VAR', value: '', label: 'Variable' }]);
  
  const toggleVisible = (idx: number) => setVisible(p => ({ ...p, [idx]: !p[idx] }));

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <div className="flex justify-between mb-4">
          <h2 className="font-bold text-white text-lg sm:text-xl flex gap-2 items-center">
            <Settings className="text-purple-400"/> Variables
          </h2>
          <button onClick={() => onSave(vars)} className="bg-purple-600 text-white px-3 py-1 rounded flex gap-2 items-center text-sm hover:bg-purple-500 transition-colors">
            <Save size={14}/> Save
          </button>
        </div>
        
        <div className="space-y-2">
          {vars.map((v, i) => (
            <div key={i} className="flex flex-col sm:flex-row gap-2 bg-slate-900 p-2 rounded items-start sm:items-center group">
              <input 
                value={v.label} 
                onChange={e => updateVar(i, 'label', e.target.value)} 
                className="w-full sm:w-1/4 bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm" 
                placeholder="Label"
              />
              <input 
                value={v.key} 
                onChange={e => updateVar(i, 'key', e.target.value)} 
                className="w-full sm:w-1/4 bg-slate-800 border border-slate-700 rounded p-2 text-yellow-400 text-sm" 
                placeholder="KEY"
              />
              <div className="flex-1 relative w-full">
                <input 
                  type={visible[i] ? "text" : "password"} 
                  value={v.value} 
                  onChange={e => updateVar(i, 'value', e.target.value)} 
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-blue-300 text-sm pr-8" 
                  placeholder="VAL"
                />
                <button 
                  onClick={() => toggleVisible(i)} 
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  {visible[i] ? <EyeOff size={14}/> : <Eye size={14}/>}
                </button>
              </div>
              <button 
                onClick={() => removeVar(i)} 
                className="text-red-400 p-2 w-full sm:w-auto flex justify-center hover:bg-red-900/20 rounded transition-colors"
              >
                <Trash2 size={18}/>
              </button>
            </div>
          ))}
        </div>
        <button onClick={addVar} className="w-full mt-4 border border-dashed border-slate-600 text-slate-400 py-2 rounded hover:text-white text-sm transition-colors">
          + Add Variable
        </button>
      </div>
      
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <h2 className="font-bold text-white text-lg sm:text-xl mb-4 flex gap-2 items-center">
          <Lock className="text-red-400"/> Security
        </h2>
        <form onSubmit={handleChangePass} className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="text-xs font-bold text-slate-400 block mb-1">New Password</label>
            <input 
              type="password" 
              required 
              value={pass} 
              onChange={e => setPass(e.target.value)} 
              className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white"
            />
          </div>
          <button className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded font-bold w-full sm:w-auto transition-colors">
            Update Password
          </button>
        </form>
        {msg && <p className="mt-2 text-green-400 text-sm">{msg}</p>}
      </div>
    </div>
  );
};

export default UserSettings;