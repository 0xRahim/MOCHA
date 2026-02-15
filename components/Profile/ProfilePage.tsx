"use client";
import React, { useState } from 'react';
import { 
  User, Mail, ShieldCheck, LogOut, 
  Plus, Trash2, ExternalLink, Google
} from 'lucide-react';

interface GoogleAccount {
  id: string;
  email: string;
  name: string;
  avatar: string;
  connectedAt: string;
  status: 'connected' | 'disconnected';
}

const ProfilePage = () => {
  const [accounts, setAccounts] = useState<GoogleAccount[]>([
    {
      id: '1',
      email: 'alex.dev@gmail.com',
      name: 'Alex Rivera',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
      connectedAt: 'Jan 2024',
      status: 'connected'
    }
  ]);

  const removeAccount = (id: string) => {
    setAccounts(prev => prev.filter(acc => acc.id !== id));
  };

  const toggleStatus = (id: string) => {
    setAccounts(prev => prev.map(acc => 
      acc.id === id 
        ? { ...acc, status: acc.status === 'connected' ? 'disconnected' : 'connected' } 
        : acc
    ));
  };

  const addAccount = () => {
    // Mocking the OAuth popup result
    const newAcc: GoogleAccount = {
      id: Date.now().toString(),
      email: `user${accounts.length + 1}@gmail.com`,
      name: 'New Google User',
      avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100',
      connectedAt: 'Just now',
      status: 'connected'
    };
    setAccounts([...accounts, newAcc]);
  };

  return (
    <div className="flex-1 max-w-4xl mx-auto space-y-8 pb-10">
      {/* Profile Header */}
      <div className="flex items-center gap-6 p-8 bg-white/5 border border-white/10 rounded-[2rem]">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center text-3xl font-bold text-white shadow-xl">
            {accounts[0]?.name.charAt(0) || 'U'}
          </div>
          <div className="absolute bottom-0 right-0 w-6 h-6 bg-green-500 border-4 border-[#100e17] rounded-full" />
        </div>
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-white">Account Settings</h1>
          <p className="text-gray-400">Manage your connected social accounts and security</p>
        </div>
      </div>

      {/* Google Accounts Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <ShieldCheck className="text-purple-500" size={22} /> Connected Accounts
          </h2>
          <button 
            onClick={addAccount}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-white transition-all"
          >
            <Plus size={18} /> Add Google Account
          </button>
        </div>

        <div className="grid gap-4">
          {accounts.length === 0 ? (
            <div className="py-12 text-center border-2 border-dashed border-white/5 rounded-3xl">
              <p className="text-gray-500">No Google accounts connected.</p>
            </div>
          ) : (
            accounts.map((acc) => (
              <div 
                key={acc.id}
                className="group flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-3xl hover:border-purple-500/30 transition-all"
              >
                <div className="flex items-center gap-4">
                  <img src={acc.avatar} alt="avatar" className="w-12 h-12 rounded-full border border-white/10" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-medium">{acc.name}</h3>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                        acc.status === 'connected' 
                        ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
                        : 'bg-red-500/10 text-red-500 border border-red-500/20'
                      }`}>
                        {acc.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{acc.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Action Toggle */}
                  <button 
                    onClick={() => toggleStatus(acc.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                      acc.status === 'connected'
                      ? 'bg-white/5 text-gray-400 hover:text-red-400 hover:bg-red-400/10'
                      : 'bg-purple-600 text-white hover:bg-purple-500'
                    }`}
                  >
                    {acc.status === 'connected' ? 'Disconnect' : 'Reconnect'}
                  </button>

                  {/* Remove Button */}
                  <button 
                    onClick={() => removeAccount(acc.id)}
                    className="p-2.5 text-gray-600 hover:text-red-500 bg-white/5 hover:bg-red-500/10 rounded-xl transition-all"
                    title="Remove Account"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Security Info Card */}
      <div className="p-6 bg-gradient-to-br from-purple-600/10 to-transparent border border-purple-500/20 rounded-3xl">
        <div className="flex gap-4">
          <div className="p-3 bg-purple-600 rounded-2xl h-fit">
            <ShieldCheck size={24} className="text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold">Security Note</h3>
            <p className="text-sm text-gray-400 mt-1">
              Your data is encrypted and synced only with the accounts you choose to connect. 
              Disconnecting an account will stop real-time syncing immediately.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;