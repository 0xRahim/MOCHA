"use client";
import React, { useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { 
  Download, Trash2, CheckCircle2, Play, 
  ChevronLeft, ArrowDownCircle, HardDrive 
} from 'lucide-react';

// Mock Data: Shows that have at least one downloaded episode
const DOWNLOADED_SHOWS = [
  {
    id: '1',
    title: 'Midnight Mischief Squad',
    totalEpisodes: 12,
    thumb: 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?w=500',
    episodes: [
      { id: 101, title: 'The Awakening', season: 1, ep: 1, isDownloaded: true, size: '420MB' },
      { id: 102, title: 'Shadow Realm', season: 1, ep: 2, isDownloaded: true, size: '380MB' },
      { id: 103, title: 'The Silent Key', season: 1, ep: 3, isDownloaded: false, size: '410MB' },
    ]
  },
  {
    id: '2',
    title: 'The Silent Galaxy',
    totalEpisodes: 8,
    thumb: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=500',
    episodes: [
      { id: 201, title: 'First Contact', season: 1, ep: 1, isDownloaded: true, size: '550MB' },
    ]
  }
];

const DownloadsPage = () => {
  const [shows, setShows] = useState(DOWNLOADED_SHOWS);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const activeShowId = searchParams.get('showId');
  const activeShow = shows.find(s => s.id === activeShowId);

  // URL State Management
  const toggleView = (id: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (id) params.set('showId', id);
    else params.delete('showId');
    replace(`${pathname}?${params.toString()}`);
  };

  // Logic: Toggle Download Status
  const handleDownloadAction = (showId: string, episodeId: number, action: 'add' | 'remove') => {
    setShows(prev => prev.map(show => {
      if (show.id === showId) {
        return {
          ...show,
          episodes: show.episodes.map(ep => 
            ep.id === episodeId ? { ...ep, isDownloaded: action === 'add' } : ep
          )
        };
      }
      return show;
    }));
  };

  return (
    <div className="flex-1 space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-4">
        {activeShowId && (
          <button onClick={() => toggleView(null)} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors w-fit">
            <ChevronLeft size={20} /> <span className="text-sm">Back to Downloads</span>
          </button>
        )}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              {activeShowId ? activeShow?.title : 'Offline Downloads'}
            </h1>
            <p className="text-gray-500 text-sm mt-1">Manage your offline viewing library</p>
          </div>
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-2xl text-xs text-gray-400">
            <HardDrive size={14} /> 24.5 GB Available
          </div>
        </div>
      </div>

      {!activeShowId ? (
        /* --- 1. SHOWS GRID VIEW --- */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {shows.map(show => {
            const downloadCount = show.episodes.filter(e => e.isDownloaded).length;
            return (
              <div key={show.id} onClick={() => toggleView(show.id)} className="group cursor-pointer space-y-3">
                <div className="relative aspect-[2/3] rounded-2xl overflow-hidden border border-white/10 bg-slate-900 shadow-xl">
                  <img src={show.thumb} alt={show.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
                  <div className="absolute top-3 right-3 bg-purple-600 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-lg">
                    {downloadCount} EPISODES
                  </div>
                </div>
                <div className="px-1">
                  <h3 className="text-white text-sm font-medium truncate group-hover:text-purple-400 transition-colors">{show.title}</h3>
                  <p className="text-gray-500 text-[11px] mt-0.5">{show.totalEpisodes} Total Episodes</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* --- 2. EPISODES LIST VIEW --- */
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {activeShow?.episodes.map((ep) => (
            <div 
              key={ep.id} 
              className="flex items-center justify-between bg-white/5 border border-white/10 p-4 rounded-2xl hover:bg-white/10 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="relative w-32 aspect-video rounded-lg overflow-hidden bg-slate-800 shrink-0">
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play size={20} fill="white" className="text-white" />
                  </div>
                  {/* Progress bar placeholder if it was partially watched */}
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-white/10">
                    <div className="h-full bg-purple-500 w-1/3" />
                  </div>
                </div>
                <div>
                  <h4 className="text-white font-medium text-sm">
                    S{ep.season} E{ep.ep} - {ep.title}
                  </h4>
                  <p className="text-gray-500 text-xs mt-1">{ep.size} • 1080p Full HD</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {ep.isDownloaded ? (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-green-500 text-xs font-medium bg-green-500/10 px-3 py-1.5 rounded-full border border-green-500/20">
                      <CheckCircle2 size={14} /> Downloaded
                    </div>
                    <button 
                      onClick={() => handleDownloadAction(activeShow.id, ep.id, 'remove')}
                      className="p-2.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                      title="Delete Download"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => handleDownloadAction(activeShow.id, ep.id, 'add')}
                    className="flex items-center gap-2 text-purple-400 hover:text-white bg-purple-500/10 hover:bg-purple-500 px-4 py-2 rounded-xl border border-purple-500/30 transition-all text-sm font-medium"
                  >
                    <Download size={16} /> Download
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DownloadsPage;