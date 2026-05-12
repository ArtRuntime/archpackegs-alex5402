'use client';

import { useState, useEffect } from 'react';
import { Package, Lock, User, ArrowRight, ShieldCheck } from 'lucide-react';

export default function Login() {
  const [isFirstUser, setIsFirstUser] = useState<boolean | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/auth/check')
      .then((res) => res.json())
      .then((data) => {
        setIsFirstUser(!data.hasAdmin);
      });
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const endpoint = isFirstUser ? '/api/auth/signup' : '/api/auth/login';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        window.location.href = '/dashboard';
      } else {
        setError(data.error || 'Authentication failed');
        setLoading(false);
      }
    } catch (err) {
      setError('A network error occurred.');
      setLoading(false);
    }
  };

  if (isFirstUser === null) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="min-h-screen bg-background text-slate-200 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex bg-accent/10 p-4 rounded-2xl mb-4 border border-accent/20 shadow-xl shadow-accent/10">
            {isFirstUser ? <ShieldCheck className="w-10 h-10 text-emerald-400" /> : <Package className="w-10 h-10 text-accent" />}
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
            {isFirstUser ? 'Setup Admin' : 'Alex5402-AUR'}
          </h1>
          <p className="text-slate-400">
            {isFirstUser ? 'Create the initial administrator account' : 'Arch Linux Repository Manager'}
          </p>
        </div>

        <div className="glass-panel rounded-3xl p-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150 fill-mode-both relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/20 rounded-full blur-3xl mix-blend-screen pointer-events-none"></div>
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-accent/20 rounded-full blur-3xl mix-blend-screen pointer-events-none"></div>

          <form onSubmit={handleAuth} className="relative z-10 space-y-5">
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm p-3 rounded-xl text-center">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-surface/50 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
                  placeholder="admin"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-surface/50 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
                  placeholder="••••••••"
                />
              </div>
              {isFirstUser && <p className="text-xs text-slate-400 mt-2 ml-1">Make sure to use a strong password.</p>}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className={`w-full text-white rounded-xl py-3 font-medium flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98] disabled:opacity-70 ${isFirstUser ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/25' : 'bg-accent hover:bg-accent/90 shadow-accent/25'}`}
              >
                {loading ? 'Processing...' : (isFirstUser ? 'Create Admin Account' : 'Sign In')}
                {!loading && <ArrowRight className="w-5 h-5" />}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
