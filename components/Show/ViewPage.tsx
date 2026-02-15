"use client";
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Play, Pause, SkipForward, SkipBack, Volume2, 
  Maximize, Settings, Download, Heart, List,
  Check, FolderHeart, Loader2, XCircle, AlertCircle
} from 'lucide-react';

const ViewPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // URL Params
  const animeId = searchParams.get("animeId");
  const targetEpisodeNum = searchParams.get("ep") || searchParams.get("episode");

  // --- States ---
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [activeEp, setActiveEp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Tracking downloads: { [dbId]: { progress: number, speed: string } }
  const [downloadingStatus, setDownloadingStatus] = useState<Record<number, any>>({});

  // --- 1. Initial Data Load ---
  const fetchEpisodeData = async () => {
    if (!animeId) return;
    try {
      const data = await (window as any).electron.getDownloadsByAnime(animeId);
      setEpisodes(data || []);
      
      // Select the active episode based on URL or first available
      if (targetEpisodeNum) {
        const found = data.find((e: any) => String(e.episodeNumber) === String(targetEpisodeNum));
        setActiveEp(found || data[0]);
      } else {
        setActiveEp(data[0]);
      }
    } catch (err) {
      console.error("Failed to load episodes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEpisodeData();
  }, [animeId, targetEpisodeNum]);

  // --- 2. Torrent Event Listeners ---
  useEffect(() => {
    // Progress Listener
    const removeProgressListener = (window as any).electron.onTorrentProgress((data: any) => {
      // data: { id, progress, downloadSpeed, ... }
      setDownloadingStatus(prev => ({
        ...prev,
        [data.id]: {
          progress: data.progress,
          speed: data.downloadSpeed
        }
      }));
    });

    // Completion Listener
    const removeDoneListener = (window as any).electron.onTorrentDone(async (payload: any) => {
      // payload: { id (torrentId), name, path }
      // We need to find which DB record this belongs to. 
      // Usually, we correlate this via the downloadingStatus map
      // or by re-fetching the list.
      
      // In this flow, we'll find the episode that was downloading and mark it
      const dbRecord = episodes.find(ep => downloadingStatus[ep.id]);
      
      if (dbRecord || payload.id) {
        await (window as any).electron.markDownload(dbRecord?.id || payload.id, payload.path);
        // Refresh local state
        fetchEpisodeData();
        // Clear downloading status for this ID
        setDownloadingStatus(prev => {
          const next = { ...prev };
          delete next[dbRecord?.id || payload.id];
          return next;
        });
      }
    });

    return () => {
      if (removeProgressListener) removeProgressListener();
      if (removeDoneListener) removeDoneListener();
    };
  }, [episodes, downloadingStatus]);

  // --- 3. Handlers ---
  const handleStartDownload = async (ep: any) => {
    try {
      await (window as any).electron.torrentStart({
        id: ep.id, // DB Primary Key
        magnetURI: ep.magnetLink,
        animeId: ep.animeId,
        episodeId: ep.episodeNumber
      });
      // Initial state to show progress bar immediately
      setDownloadingStatus(prev => ({
        ...prev,
        [ep.id]: { progress: 0, speed: '0 KB/s' }
      }));
    } catch (err) {
      console.error("Start torrent failed:", err);
    }
  };

  const handleCancelDownload = async (ep: any) => {
    try {
      // Note: Use the ID associated with the torrent engine
      await (window as any).electron.torrentStop(ep.id);
      setDownloadingStatus(prev => {
        const next = { ...prev };
        delete next[ep.id];
        return next;
      });
    } catch (err) {
      console.error("Stop torrent failed:", err);
    }
  };

  if (loading) return (
    <div className="flex-1 flex items-center justify-center h-[60vh]">
      <Loader2 className="animate-spin text-purple-500" size={48} />
    </div>
  );

  if (!activeEp) return (
    <div className="flex-1 flex flex-col items-center justify-center h-[60vh] text-gray-500">
      <AlertCircle size={48} className="mb-4 opacity-20" />
      <p>No episode sources found for this show.</p>
    </div>
  );

  const activeDl = downloadingStatus[activeEp.id];

  return (
    <div className="flex flex-col lg:flex-row gap-8 pb-10">
      
      {/* LEFT COLUMN: Player & Info */}
      <div className="flex-1 space-y-6">
        
        {/* Video Player Area */}
        <div className="relative group w-full aspect-video bg-black rounded-[40px] overflow-hidden shadow-2xl border border-white/5">
          {activeEp.isDownloaded ? (
            <video 
              src={`atom:///${activeEp.filePath}`} // Using a custom protocol or direct path if Electron allows
              controls
              className="w-full h-full"
              poster="https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?q=80&w=1200"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1a1821]">
              {activeDl ? (
                <div className="w-64 space-y-4 text-center">
                  <Loader2 className="animate-spin text-purple-500 mx-auto" size={40} />
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-500">
                      <span>Downloading</span>
                      <span>{(activeDl.progress * 100).toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)] transition-all duration-300" 
                        style={{ width: `${activeDl.progress * 100}%` }}
                      />
                    </div>
                    <p className="text-[10px] font-mono text-purple-400">{activeDl.speed}</p>
                  </div>
                  <button 
                    onClick={() => handleCancelDownload(activeEp)}
                    className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-400"
                  >
                    Cancel Download
                  </button>
                </div>
              ) : (
                <div className="text-center space-y-6">
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/10">
                    <Download className="text-gray-500" size={32} />
                  </div>
                  <div>
                    <h3 className="text-white font-bold">Episode Not Downloaded</h3>
                    <p className="text-xs text-gray-500 mt-1">Start the download to watch this episode</p>
                  </div>
                  <button 
                    onClick={() => handleStartDownload(activeEp)}
                    className="bg-purple-600 hover:bg-purple-500 text-white px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-xl shadow-purple-900/20"
                  >
                    Start Download
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Bar */}
        <div className="space-y-4">
          <div className="flex justify-between items-start">
            <h1 className="text-3xl font-black text-white tracking-tighter">
              Ep {activeEp.episodeNumber} — {activeEp.episodeTitle}
            </h1>
            {activeEp.isDownloaded && (
              <span className="px-3 py-1 bg-green-500/10 border border-green-500/20 text-green-500 text-[10px] font-black rounded-lg uppercase">
                Offline Available
              </span>
            )}
          </div>
          
          <div className="flex flex-wrap items-center justify-between gap-4 py-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-600 flex items-center justify-center font-black text-white shadow-lg">
                {activeEp.episodeNumber}
              </div>
              <div>
                <p className="text-sm font-bold text-white">Current Episode</p>
                <p className="text-[10px] text-gray-500 font-mono truncate max-w-[200px]">{activeEp.filePath || "No local path yet"}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white hover:bg-white/10 transition-all">
                <Heart size={16} /> Favorite
              </button>
              {!activeEp.isDownloaded && !activeDl && (
                 <button 
                  onClick={() => handleStartDownload(activeEp)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 rounded-xl text-xs font-bold text-white hover:bg-purple-500 transition-all shadow-lg shadow-purple-900/40"
                 >
                   <Download size={16} /> Download
                 </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Episode List */}
      <div className="w-full lg:w-[400px] space-y-6 shrink-0">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-white font-black text-xs uppercase tracking-[0.3em] flex items-center gap-2">
            <List size={16} className="text-purple-500" /> Episode List
          </h3>
          <span className="text-[10px] font-bold text-gray-600">{episodes.length} Parts</span>
        </div>

        <div className="flex flex-col gap-3 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
          {episodes.map((ep) => {
            const isCurrent = activeEp.id === ep.id;
            const dl = downloadingStatus[ep.id];

            return (
              <div 
                key={ep.id}
                onClick={() => !dl && router.push(`/view?animeId=${animeId}&ep=${ep.episodeNumber}`)}
                className={`group relative flex gap-4 p-4 rounded-[24px] transition-all cursor-pointer border ${
                  isCurrent 
                    ? 'bg-purple-600/10 border-purple-500/30' 
                    : 'bg-white/[0.02] border-white/5 hover:bg-white/5'
                }`}
              >
                <div className="relative w-24 aspect-video rounded-xl overflow-hidden bg-black shrink-0">
                  <div className="absolute inset-0 flex items-center justify-center bg-purple-900/20">
                    <span className="text-lg font-black text-white/40">{ep.episodeNumber}</span>
                  </div>
                  {ep.isDownloaded && (
                    <div className="absolute top-1 right-1 p-1 bg-green-500 rounded-lg shadow-lg">
                      <Check size={10} strokeWidth={4} className="text-white" />
                    </div>
                  )}
                </div>

                <div className="flex-1 flex flex-col justify-center min-w-0 pr-8">
                  <h4 className={`text-xs font-bold truncate ${isCurrent ? 'text-purple-400' : 'text-white'}`}>
                    {ep.episodeTitle}
                  </h4>
                  
                  {dl ? (
                    <div className="mt-2 space-y-1">
                      <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500" style={{ width: `${dl.progress * 100}%` }} />
                      </div>
                      <p className="text-[9px] font-mono text-purple-400">{dl.speed}</p>
                    </div>
                  ) : (
                    <p className="text-[10px] text-gray-500 mt-1 uppercase font-black tracking-widest">
                      {ep.isDownloaded ? 'Downloaded' : 'Available'}
                    </p>
                  )}
                </div>

                {/* Right Action Icon */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                   {dl ? (
                     <button 
                      onClick={(e) => { e.stopPropagation(); handleCancelDownload(ep); }}
                      className="p-2 text-gray-600 hover:text-red-500 transition-colors"
                     >
                        <XCircle size={18} />
                     </button>
                   ) : ep.isDownloaded ? (
                     <Play size={16} className={isCurrent ? "text-purple-500" : "text-gray-700"} fill="currentColor" />
                   ) : (
                     <button 
                        onClick={(e) => { e.stopPropagation(); handleStartDownload(ep); }}
                        className="p-2 bg-white/5 rounded-xl text-gray-500 hover:text-purple-500 hover:bg-purple-500/10 transition-all"
                     >
                       <Download size={16} />
                     </button>
                   )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default ViewPage;