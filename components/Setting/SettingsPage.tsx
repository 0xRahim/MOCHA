"use client";
import React, { useState } from 'react';
import { 
  Settings, Plus, Trash2, Globe, Code2, 
  Power, Save, Search, Layout, Download, MonitorPlay, 
  ChevronRight, ExternalLink 
} from 'lucide-react';

interface Plugin {
  id: string;
  name: string;
  url?: string;
  active: boolean;
  sections: {
    search: string;
    browse: string;
    download: string;
    display: string;
  }
}

const INITIAL_PLUGINS: Plugin[] = [
  {
    id: '1',
    name: 'Default Scraper',
    active: true,
    sections: {
      search: `// JS Code for Search\nfunction search(query) {\n  return fetch(\`https://api.example.com/search?q=\${query}\`);\n}`,
      browse: `// JS Code for Browsing\nfunction browse() { return []; }`,
      download: `// JS Code for Downloading\nfunction getLink(id) { return ""; }`,
      display: `// JS Code for UI Rendering\nfunction render() { return "<div></div>"; }`,
    }
  }
];

const SettingsPage = () => {
  const [plugins, setPlugins] = useState<Plugin[]>(INITIAL_PLUGINS);
  const [activePluginId, setActivePluginId] = useState<string>(INITIAL_PLUGINS[0].id);
  const [activeTab, setActiveTab] = useState<'search' | 'browse' | 'download' | 'display'>('search');
  const [importUrl, setImportUrl] = useState('');

  const currentPlugin = plugins.find(p => p.id === activePluginId);

  // --- CRUD Operations ---
  const handleAddPlugin = () => {
    const newPlugin: Plugin = {
      id: Date.now().toString(),
      name: `New Plugin ${plugins.length + 1}`,
      active: false,
      sections: { search: '', browse: '', download: '', display: '' }
    };
    setPlugins([...plugins, newPlugin]);
    setActivePluginId(newPlugin.id);
  };

  const handleUpdateCode = (code: string) => {
    setPlugins(prev => prev.map(p => 
      p.id === activePluginId ? { ...p, sections: { ...p.sections, [activeTab]: code } } : p
    ));
  };

  const togglePlugin = (id: string) => {
    setPlugins(prev => prev.map(p => p.id === id ? { ...p, active: !p.active } : p));
  };

  const deletePlugin = (id: string) => {
    setPlugins(prev => prev.filter(p => p.id !== id));
    if (activePluginId === id && plugins.length > 1) setActivePluginId(plugins[0].id);
  };

  const handleImport = () => {
    if (!importUrl) return;
    const imported: Plugin = {
      id: Date.now().toString(),
      name: importUrl.split('/').pop() || 'Imported Plugin',
      url: importUrl,
      active: false,
      sections: { search: '// Loading...', browse: '', download: '', display: '' }
    };
    setPlugins([...plugins, imported]);
    setImportUrl('');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Settings className="text-purple-500" size={28} /> Settings
          </h1>
          <p className="text-gray-400 text-sm mt-1">Configure sources and JS plugins</p>
        </div>
        <div className="flex gap-3">
          <div className="flex bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <input 
              className="bg-transparent px-4 py-2 text-sm text-white outline-none w-64"
              placeholder="Import from URL..."
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
            />
            <button onClick={handleImport} className="bg-white/10 px-4 hover:bg-white/20 text-white transition-colors">
              <Globe size={18} />
            </button>
          </div>
          <button onClick={handleAddPlugin} className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl flex items-center gap-2">
            <Plus size={18} /> New Plugin
          </button>
        </div>
      </div>

      <div className="flex flex-1 gap-6 min-h-0">
        {/* Left Sidebar: Plugin List */}
        <div className="w-80 bg-white/5 border border-white/10 rounded-3xl p-4 space-y-2 overflow-y-auto no-scrollbar">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest px-2 mb-4">Your Plugins</h2>
          {plugins.map(plugin => (
            <div 
              key={plugin.id}
              onClick={() => setActivePluginId(plugin.id)}
              className={`group flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all ${
                activePluginId === plugin.id ? 'bg-purple-600/20 border border-purple-500/50' : 'hover:bg-white/5 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${plugin.active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                  <Power size={16} onClick={(e) => { e.stopPropagation(); togglePlugin(plugin.id); }} className="cursor-pointer" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{plugin.name}</p>
                  <p className="text-[10px] text-gray-500">{plugin.url ? 'Remote' : 'Local'} Source</p>
                </div>
              </div>
              <Trash2 
                size={14} 
                className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => { e.stopPropagation(); deletePlugin(plugin.id); }}
              />
            </div>
          ))}
        </div>

        {/* Right Content: Code Editor View */}
        <div className="flex-1 bg-white/5 border border-white/10 rounded-3xl flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-white/10 px-6 pt-4 gap-6">
            {(['search', 'browse', 'download', 'display'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-4 text-sm font-medium capitalize transition-all relative ${
                  activeTab === tab ? 'text-purple-400' : 'text-gray-500 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  {tab === 'search' && <Search size={14} />}
                  {tab === 'browse' && <Layout size={14} />}
                  {tab === 'download' && <Download size={14} />}
                  {tab === 'display' && <MonitorPlay size={14} />}
                  {tab}
                </div>
                {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]" />}
              </button>
            ))}
          </div>

          {/* Editor Area */}
          <div className="flex-1 p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-400">
                <Code2 size={16} />
                <span className="text-xs font-mono">index.{activeTab}.js</span>
              </div>
              <button className="flex items-center gap-2 px-3 py-1 bg-green-500/10 text-green-400 text-xs rounded-lg border border-green-500/20 hover:bg-green-500 hover:text-white transition-all">
                <Save size={14} /> Save Changes
              </button>
            </div>
            <textarea
              className="flex-1 bg-black/40 border border-white/5 rounded-2xl p-6 font-mono text-sm text-purple-300 outline-none resize-none focus:border-purple-500/30 transition-all"
              spellCheck={false}
              value={currentPlugin?.sections[activeTab] || ''}
              onChange={(e) => handleUpdateCode(e.target.value)}
              placeholder={`// Write your ${activeTab} JavaScript logic here...`}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;