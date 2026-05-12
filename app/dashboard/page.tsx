'use client';

import { useState, useEffect } from 'react';
import { Package, Plus, Activity, Github, Settings, LogOut, CheckCircle2, Clock, Lock, User, RefreshCw, Key, Copy, AlertTriangle, XCircle } from 'lucide-react';

type Pkg = {
  _id: string;
  name: string;
  githubRepo: string;
  status: string;
  version: string;
  lastBuilt: string;
};

export default function Dashboard() {
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPkgName, setNewPkgName] = useState('');
  const [newPkgRepo, setNewPkgRepo] = useState('');
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // Custom Modals State
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; title: string; message: string; type: 'error' | 'success' } | null>(null);

  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [settingsSuccess, setSettingsSuccess] = useState('');

  // API Key State
  const [apiKeyData, setApiKeyData] = useState<{hasKey: boolean, maskedKey: string | null, fullKey: string | null}>({hasKey: false, maskedKey: null, fullKey: null});
  const [showFullApiKey, setShowFullApiKey] = useState<string | null>(null);
  const [apiKeyLoading, setApiKeyLoading] = useState(false);

  const openSettings = async () => {
    setIsSettingsOpen(true);
    try {
      const res = await fetch('/api/auth/apikey');
      const data = await res.json();
      if (data.success) {
        setApiKeyData({ hasKey: data.hasKey, maskedKey: data.maskedKey, fullKey: data.fullKey });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleGenerateApiKeyRequest = () => {
    if (apiKeyData.hasKey) {
      setConfirmModal({
        isOpen: true,
        title: 'Revoke Existing API Key?',
        message: 'Generating a new API key will instantly invalidate the old one! Make sure to update your GitHub Action secrets. Continue?',
        onConfirm: () => {
          setConfirmModal(null);
          executeGenerateApiKey();
        }
      });
    } else {
      executeGenerateApiKey();
    }
  };

  const executeGenerateApiKey = async () => {
    setApiKeyLoading(true);
    try {
      const res = await fetch('/api/auth/apikey', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setShowFullApiKey(data.apiKey);
        setApiKeyData({ hasKey: true, maskedKey: `************************${data.apiKey.slice(-8)}`, fullKey: data.apiKey });
      } else {
        setAlertModal({ isOpen: true, title: 'Action Failed', message: data.error || 'Failed to generate API Key', type: 'error' });
      }
    } catch (e) {
      setAlertModal({ isOpen: true, title: 'Network Error', message: 'A network error occurred while generating the API Key.', type: 'error' });
    } finally {
      setApiKeyLoading(false);
    }
  };

  useEffect(() => {
    fetch('/api/packages')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setPackages(data.data);
        }
      });
  }, []);

  const handleAddPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/packages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newPkgName, githubRepo: newPkgRepo }),
    });
    const data = await res.json();
    if (data.success) {
      setPackages([...packages, data.data]);
      setIsModalOpen(false);
      setNewPkgName('');
      setNewPkgRepo('');
      setAlertModal({ isOpen: true, title: 'Success', message: 'Package added successfully!', type: 'success' });
    } else {
      setAlertModal({ isOpen: true, title: 'Error', message: data.error || 'Failed to add package.', type: 'error' });
    }
  };

  const handleSync = async (pkgId: string) => {
    setSyncingId(pkgId);
    try {
      const res = await fetch('/api/packages/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId: pkgId }),
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        setPackages(packages.map(p => 
          p._id === pkgId 
            ? { ...p, version: data.data.version, status: data.data.status, lastBuilt: data.data.lastBuilt } 
            : p
        ));
      } else {
        setAlertModal({ isOpen: true, title: 'Sync Failed', message: data.error || 'Failed to sync with GitHub.', type: 'error' });
      }
    } catch (err) {
      setAlertModal({ isOpen: true, title: 'Network Error', message: 'A network error occurred while syncing.', type: 'error' });
    } finally {
      setSyncingId(null);
    }
  };

  const handleUpdateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsLoading(true);
    setSettingsError('');
    setSettingsSuccess('');

    try {
      const res = await fetch('/api/auth/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newUsername, newPassword }),
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        setSettingsSuccess(data.message);
        setCurrentPassword('');
        setNewUsername('');
        setNewPassword('');
        setTimeout(() => {
          setIsSettingsOpen(false);
          setSettingsSuccess('');
        }, 2000);
      } else {
        setSettingsError(data.error || 'Failed to update credentials');
      }
    } catch (err) {
      setSettingsError('A network error occurred.');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-background text-slate-200">
      {/* Custom Alert Modal */}
      {alertModal?.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-surface border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 flex flex-col items-center text-center">
              {alertModal.type === 'error' ? (
                <XCircle className="w-12 h-12 text-rose-500 mb-4" />
              ) : (
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-4" />
              )}
              <h3 className="text-xl font-semibold text-white mb-2">{alertModal.title}</h3>
              <p className="text-slate-400 text-sm mb-6">{alertModal.message}</p>
              <button
                onClick={() => setAlertModal(null)}
                className="w-full bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-lg font-medium transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirm Modal */}
      {confirmModal?.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-surface border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-rose-500/20 p-2 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-rose-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">{confirmModal.title}</h3>
              </div>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                {confirmModal.message}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmModal(null)}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white px-4 py-2.5 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  className="flex-1 bg-rose-500 hover:bg-rose-600 text-white px-4 py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-rose-500/25"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <nav className="border-b border-white/10 bg-surface/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <div className="bg-accent/20 p-2 rounded-lg">
                <Package className="w-6 h-6 text-accent" />
              </div>
              <span className="font-semibold text-xl tracking-tight">Custom Arch Linux Mirror</span>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={openSettings} className="text-slate-400 hover:text-white transition-colors">
                <Settings className="w-5 h-5" />
              </button>
              <div className="h-8 w-px bg-white/10"></div>
              <button onClick={handleLogout} className="text-slate-400 hover:text-rose-400 transition-colors flex items-center gap-2 text-sm font-medium">
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="glass-panel rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <div className="bg-primary/20 p-3 rounded-xl">
                <Package className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400">Tracked Packages</p>
                <p className="text-3xl font-bold mt-1">{packages.length}</p>
              </div>
            </div>
          </div>
          <div className="glass-panel rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <div className="bg-emerald-500/20 p-3 rounded-xl">
                <Activity className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400">Active Mirrors</p>
                <p className="text-3xl font-bold mt-1">{packages.filter(p => p.status === 'active').length}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-white/5 flex justify-between items-center bg-surface/30">
            <h2 className="text-lg font-semibold">Repository Packages</h2>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-accent hover:bg-accent/90 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Add Package
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface/50 text-sm font-medium text-slate-400">
                  <th className="px-6 py-4">Package Name</th>
                  <th className="px-6 py-4">Version</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">GitHub Repo</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {packages.map((pkg) => (
                  <tr key={pkg._id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-surface border border-white/10 flex items-center justify-center">
                        <Package className="w-4 h-4 text-slate-400" />
                      </div>
                      {pkg.name}
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-300">{pkg.version}</td>
                    <td className="px-6 py-4">
                      {pkg.status === 'active' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <Clock className="w-3.5 h-3.5" /> Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-400">{pkg.githubRepo || 'N/A'}</td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleSync(pkg._id)}
                        disabled={syncingId === pkg._id}
                        className="text-primary hover:text-primary/80 font-medium transition-colors flex items-center gap-2 ml-auto disabled:opacity-50"
                      >
                        {syncingId === pkg._id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                        Sync Now
                      </button>
                    </td>
                  </tr>
                ))}
                {packages.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      No packages tracked yet. Click "Add Package" to start.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Add Package Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-white/5">
              <h3 className="text-xl font-semibold">Track New Package</h3>
              <p className="text-sm text-slate-400 mt-1">Add an AUR package to your custom mirror.</p>
            </div>
            <form onSubmit={handleAddPackage} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">AUR Package Name</label>
                <input
                  type="text"
                  required
                  value={newPkgName}
                  onChange={(e) => setNewPkgName(e.target.value)}
                  placeholder="e.g., google-chrome"
                  className="w-full bg-background border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Target GitHub Repo</label>
                <input
                  type="text"
                  required
                  value={newPkgRepo}
                  onChange={(e) => setNewPkgRepo(e.target.value)}
                  placeholder="honeypie112/android-studio-alex"
                  className="w-full bg-background border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white px-4 py-2.5 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-accent hover:bg-accent/90 text-white px-4 py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-accent/25"
                >
                  Track Package
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="bg-surface border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-white/5">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <Settings className="w-5 h-5 text-slate-400" />
                Security Settings
              </h3>
              <p className="text-sm text-slate-400 mt-1">Update your admin username and password.</p>
            </div>
            <form onSubmit={handleUpdateCredentials} className="p-6 space-y-4">
              {settingsError && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm p-3 rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {settingsError}
                </div>
              )}
              {settingsSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm p-3 rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  {settingsSuccess}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-slate-500" />
                  Current Password (Required)
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-background border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  placeholder="Enter current password to authorize changes"
                />
              </div>

              <div className="pt-2 border-t border-white/5"></div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-slate-500" />
                  Webhook API Key (For GitHub Actions)
                </label>
                <div className="bg-background border border-white/10 rounded-lg p-3">
                  {showFullApiKey ? (
                    <div className="flex flex-col gap-2">
                      <div className="text-xs text-amber-400 font-medium bg-amber-500/10 p-2 rounded border border-amber-500/20">
                        Please copy this key immediately! It will not be shown again.
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="text-xs text-white bg-[#1e1e2e] p-2 rounded flex-1 overflow-x-auto select-all">
                          {showFullApiKey}
                        </code>
                        <button 
                          type="button" 
                          onClick={() => {
                            navigator.clipboard.writeText(showFullApiKey);
                            setAlertModal({ isOpen: true, title: 'Copied', message: 'API Key copied to clipboard!', type: 'success' });
                          }}
                          className="bg-white/10 hover:bg-white/20 p-2 rounded text-white transition-colors"
                          title="Copy to clipboard"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : apiKeyData.hasKey ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <code className="text-xs text-slate-400 font-mono tracking-widest">{apiKeyData.maskedKey}</code>
                        <button 
                          type="button" 
                          onClick={() => {
                            if (apiKeyData.fullKey) {
                              navigator.clipboard.writeText(apiKeyData.fullKey);
                              setAlertModal({ isOpen: true, title: 'Copied', message: 'API Key copied to clipboard!', type: 'success' });
                            }
                          }}
                          className="text-slate-400 hover:text-white transition-colors p-1 rounded hover:bg-white/10"
                          title="Copy existing key to clipboard"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <button 
                        type="button" 
                        onClick={handleGenerateApiKeyRequest}
                        disabled={apiKeyLoading}
                        className="text-xs text-rose-400 hover:text-rose-300 transition-colors disabled:opacity-50"
                      >
                        {apiKeyLoading ? 'Generating...' : 'Revoke & Replace'}
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-2 text-center">
                      <p className="text-xs text-slate-400 mb-3">No API Key generated yet.</p>
                      <button 
                        type="button"
                        onClick={handleGenerateApiKeyRequest}
                        disabled={apiKeyLoading}
                        className="bg-accent/20 hover:bg-accent/30 text-accent px-3 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        {apiKeyLoading ? 'Generating...' : 'Generate API Key'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-white/5"></div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-slate-500" />
                  New Username (Optional)
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full bg-background border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
                  placeholder="Leave blank to keep current"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-slate-500" />
                  New Password (Optional)
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-background border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
                  placeholder="Leave blank to keep current"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsSettingsOpen(false);
                    setSettingsError('');
                    setSettingsSuccess('');
                    setCurrentPassword('');
                    setNewUsername('');
                    setNewPassword('');
                    setShowFullApiKey(null);
                  }}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white px-4 py-2.5 rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={settingsLoading || !currentPassword}
                  className="flex-1 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-primary/25"
                >
                  {settingsLoading ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
