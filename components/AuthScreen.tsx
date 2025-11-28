import React, { useState } from 'react';
import { Cpu, AlertCircle, Loader2, UserPlus, LogIn } from 'lucide-react';

interface AuthScreenProps {
  onLogin: (u: string, p: string) => void;
  onRegister: (u: string, p: string) => void;
  isLoading: boolean;
  error?: string;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin, onRegister, isLoading, error }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegistering) onRegister(formData.username, formData.password);
    else onLogin(formData.username, formData.password);
  };

  return (
    <div className="h-screen bg-slate-950 flex items-center justify-center p-4 overflow-hidden">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-xl shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-blue-600/20 rounded-full">
              <Cpu size={48} className="text-blue-500" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">DockManager</h1>
          <p className="text-slate-400 text-sm mt-2">Container Orchestration System</p>
        </div>
        
        {error && (
          <div className="bg-red-900/20 border border-red-800/50 text-red-400 p-3 rounded mb-4 text-sm flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Username</label>
            <input 
              type="text" 
              required 
              className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-white focus:border-blue-600 outline-none transition-colors" 
              value={formData.username} 
              onChange={e => setFormData({...formData, username: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Password</label>
            <input 
              type="password" 
              required 
              className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-white focus:border-blue-600 outline-none transition-colors" 
              value={formData.password} 
              onChange={e => setFormData({...formData, password: e.target.value})}
            />
          </div>
          <button 
            type="submit" 
            disabled={isLoading} 
            className="w-full bg-blue-600 hover:bg-blue-500 text-white p-3 rounded font-bold flex justify-center items-center gap-2 mt-6 transition-colors"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20}/> : (isRegistering ? <UserPlus size={20}/> : <LogIn size={20}/>)}
            {isRegistering ? 'Create Account' : 'Sign In'}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <button onClick={() => setIsRegistering(!isRegistering)} className="text-slate-500 hover:text-blue-400 text-sm font-medium transition-colors">
            {isRegistering ? 'Sign In' : 'Register'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;