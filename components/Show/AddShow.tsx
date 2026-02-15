"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  Save, 
  Plus, 
  Trash2, 
  Link as LinkIcon, 
  Type, 
  Star, 
  Tag, 
  Film, 
  Calendar, 
  X,
  CheckCircle2,
  Loader2,
  ExternalLink,
  ChevronRight,
  Search,
  Image as ImageIcon,
  Database
} from "lucide-react";

// --- Types ---
interface SourceItem {
  title: string;
  episode: number;
  totalSize: string;
  magnets: string[]; 
  torrents?: any[];
  pubDateISO: string;
  source?: any;
}

interface Episode {
  number: number;
  title: string;
  airDate?: string;
  sourceUrl?: string; // Magnet link
}

const AddShowPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  // --- Form State ---
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [bannerImage, setBannerImage] = useState("");
  const [type, setType] = useState("TV");
  const [year, setYear] = useState("");
  const [rating, setRating] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [episodes, setEpisodes] = useState<Episode[]>([]);

  // --- UI/Source Management State ---
  const [isSaving, setIsSaving] = useState(false);
  const [sourceModalOpen, setSourceModalOpen] = useState(false);
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [loadingSources, setLoadingSources] = useState(false);
  const [activeEpisodeIndex, setActiveEpisodeIndex] = useState<number | null>(null);
  const [sourceSearchQuery, setSourceSearchQuery] = useState("");

  // --- Initial Load: Autofill from URL ---
  useEffect(() => {
    const rawData = searchParams.get("all-data-from-query");
    if (rawData) {
      try {
        const parsed = JSON.parse(decodeURIComponent(rawData));
        setTitle(parsed.title || "");
        setDescription(parsed.description || "");
        setBannerImage(parsed.coverUrl || parsed.bannerImage || "");
        setType(parsed.type || "TV");
        setYear(parsed.year?.toString() || "");
        setRating(parsed.rating?.toString() || "");
        setTags(Array.isArray(parsed.tags) ? parsed.tags : []);
        setEpisodes(Array.isArray(parsed.episodes) ? parsed.episodes : []);
      } catch (err) {
        console.error("Failed to parse initial show data", err);
      }
    }
  }, [searchParams]);

  const filteredSources = useMemo(() => {
    return sources.filter(s => 
      s.title.toLowerCase().includes(sourceSearchQuery.toLowerCase())
    );
  }, [sources, sourceSearchQuery]);

  // --- Handlers ---
  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput("");
    }
  };

  const removeTag = (index: number) => setTags(tags.filter((_, i) => i !== index));

  const addEpisode = () => {
    const nextNum = episodes.length > 0 ? episodes[episodes.length - 1].number + 1 : 1;
    setEpisodes([...episodes, { number: nextNum, title: `Episode ${nextNum}` }]);
  };

  const fetchSourcesFromElectron = async () => {
    setLoadingSources(true);
    try {
      const animeIdFromUrl = searchParams.get("animeId");
      const identifier = animeIdFromUrl || title;

      if (!identifier) {
        setLoadingSources(false);
        return;
      }

      const response: SourceItem[][] = await (window as any).electron.loadDownloadSource(identifier, "1");
      const flattened = response.flat();
      setSources(flattened);
    } catch (err) {
      console.error("Electron Source Fetch Error:", err);
    } finally {
      setLoadingSources(false);
    }
  };

  const openSourcePicker = (index: number) => {
    setActiveEpisodeIndex(index);
    setSourceModalOpen(true);
    if (sources.length === 0) {
      fetchSourcesFromElectron();
    }
  };

  const mapSourceToEpisode = (source: SourceItem) => {
    if (activeEpisodeIndex !== null) {
      const newEps = [...episodes];
      newEps[activeEpisodeIndex].sourceUrl = source.magnets?.[0] || "";
      setEpisodes(newEps);
      setSourceModalOpen(false);
      setSourceSearchQuery("");
    }
  };

  // --- Save Logic using addDownload bridge ---
  const handleSave = async () => {
    const animeId = searchParams.get("animeId");
    
    if (!animeId) {
      alert("Anime ID missing. Cannot save downloads.");
      return;
    }

    const linkedEpisodes = episodes.filter(ep => !!ep.sourceUrl);

    if (linkedEpisodes.length === 0) {
      alert("Please link at least one episode to a magnet source.");
      return;
    }

    setIsSaving(true);

    try {
      // Iterate through linked episodes and invoke the Electron bridge
      await Promise.all(
        linkedEpisodes.map(async (ep) => {
          const downloadData = {
            animeId: animeId,
            episodeNumber: ep.number,
            episodeTitle: ep.title,
            magnetLink: ep.sourceUrl,
            torrentUrl: "", 
            isDownloaded: false,
            filePath: ""
          };

          // Matches the console.log pattern requested for main.js
          console.log(`[main] adding to downloads: ID ${downloadData.animeId}, Ep ${downloadData.episodeNumber}`);
          return (window as any).electron.addDownload(downloadData);
        })
      );

      alert(`Successfully added ${linkedEpisodes.length} episodes to your download queue!`);
    } catch (err) {
      console.error("Failed to save downloads:", err);
      alert("Error saving show data to Electron main process.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 -mt-6 -mx-6 min-h-screen bg-[#100e17] text-gray-200 font-sans selection:bg-purple-500/30">
      
      {/* Header */}
      <div className="relative h-[35vh] w-full overflow-hidden bg-black flex items-end">
        {bannerImage ? (
           <img src={bannerImage} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-30 blur-md scale-110" />
        ) : (
           <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-transparent to-transparent" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#100e17] via-[#100e17]/40 to-transparent" />
        
        <div className="relative z-10 p-12 w-full max-w-7xl mx-auto">
          <span className="px-3 py-1 bg-purple-600 text-white text-[10px] font-black rounded-md tracking-widest uppercase mb-4 inline-block shadow-lg shadow-purple-900/40">
            Show Editor
          </span>
          <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter drop-shadow-2xl">
            {title || "Untitled Entry"}
          </h1>
        </div>
      </div>

      <div className="p-12 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-12 -mt-16 relative z-20">
        
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-12">
          
          <section className="bg-[#1a1821]/80 border border-white/5 rounded-[40px] p-10 backdrop-blur-xl shadow-2xl space-y-8">
            <h3 className="text-white font-bold flex items-center gap-3 text-xl">
              <Type className="text-purple-500" size={22} /> Metadata
            </h3>
            
            <div className="grid gap-6">
              <div className="group">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1 group-focus-within:text-purple-400 transition-colors">Series Title</label>
                <input 
                  value={title} onChange={e => setTitle(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 mt-2 focus:border-purple-500 focus:bg-white/[0.06] outline-none transition-all text-lg text-white font-medium"
                />
              </div>

              <div className="group">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1 group-focus-within:text-purple-400 transition-colors">Synopsis</label>
                <textarea 
                  value={description} onChange={e => setDescription(e.target.value)}
                  rows={4}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 mt-2 focus:border-purple-500 focus:bg-white/[0.06] outline-none transition-all resize-none text-gray-400 leading-relaxed"
                />
              </div>
            </div>
          </section>

          {/* Episode List */}
          <section className="space-y-8">
            <div className="flex justify-between items-center px-4">
              <h3 className="text-white font-black flex items-center gap-3 text-2xl tracking-tight">
                <Film className="text-purple-500" size={26} /> Episode Mapping
              </h3>
              <button onClick={addEpisode} className="flex items-center gap-3 text-xs font-black tracking-widest uppercase bg-white text-black hover:bg-purple-500 hover:text-white px-8 py-4 rounded-2xl transition-all shadow-xl">
                <Plus size={16} strokeWidth={3} /> Add Ep
              </button>
            </div>

            <div className="grid gap-4">
              {episodes.map((ep, idx) => (
                <div key={idx} className="group flex items-center gap-8 p-6 bg-white/[0.02] border border-white/5 rounded-[32px] hover:bg-white/[0.05] transition-all">
                  <span className="text-3xl font-black text-gray-800 group-hover:text-purple-500 transition-colors min-w-[40px] text-center">{ep.number}</span>
                  
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <input 
                      value={ep.title} 
                      onChange={(e) => {
                        const n = [...episodes];
                        n[idx].title = e.target.value;
                        setEpisodes(n);
                      }}
                      className="bg-transparent border-b border-white/5 focus:border-purple-500 outline-none text-base font-bold py-2 text-white"
                    />
                    <div className="flex items-center gap-4">
                       <button 
                        onClick={() => openSourcePicker(idx)}
                        className={`flex-1 flex items-center justify-between px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          ep.sourceUrl 
                            ? "bg-green-500/10 text-green-400 border border-green-500/20" 
                            : "bg-white/5 text-gray-500 border border-white/10 hover:border-purple-500/40 hover:text-white"
                        }`}
                       >
                         {ep.sourceUrl ? "Linked" : "Link File"}
                         {ep.sourceUrl ? <CheckCircle2 size={16}/> : <ChevronRight size={16}/>}
                       </button>
                       <button onClick={() => setEpisodes(episodes.filter((_, i) => i !== idx))} className="text-gray-700 hover:text-red-500 p-2 hover:bg-red-500/10 rounded-xl transition-all">
                        <Trash2 size={20} />
                       </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-10">
          <section className="bg-[#1a1821]/80 border border-white/5 rounded-[40px] p-8 shadow-2xl backdrop-blur-xl space-y-6">
            <h3 className="text-white font-black text-xs uppercase tracking-[0.3em] opacity-50">Cover Image</h3>
            <div className="aspect-[2/3] w-full rounded-[32px] bg-black/40 border border-white/5 overflow-hidden relative group shadow-inner">
              {bannerImage ? (
                <img src={bannerImage} className="w-full h-full object-cover" alt="Cover" />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-800">
                  <ImageIcon size={64} strokeWidth={1} className="opacity-10" />
                </div>
              )}
            </div>
            <input 
              value={bannerImage} onChange={e => setBannerImage(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-4 text-xs outline-none focus:border-purple-500 text-gray-400 font-mono"
              placeholder="Paste Image URL..."
            />
          </section>

          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-6 bg-purple-600 text-white font-black rounded-[32px] flex items-center justify-center gap-4 hover:bg-purple-500 transition-all shadow-2xl disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="animate-spin" /> : <Save size={24} />}
            <span className="tracking-widest uppercase">Save Show</span>
          </button>
        </div>
      </div>

      {/* --- Source Selector Modal --- */}
      {sourceModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-8 backdrop-blur-2xl">
          <div className="absolute inset-0 bg-black/90" onClick={() => setSourceModalOpen(false)} />
          
          <div className="relative w-full max-w-4xl bg-[#14121a] border border-white/10 rounded-[50px] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            
            <div className="p-10 border-b border-white/5">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-black text-white tracking-tighter">Select Source File</h2>
                  <p className="text-[10px] font-black text-purple-500 uppercase tracking-[0.4em] mt-2">
                    Finding files for: Ep. {activeEpisodeIndex !== null ? episodes[activeEpisodeIndex].number : ""}
                  </p>
                </div>
                <button onClick={() => setSourceModalOpen(false)} className="p-4 bg-white/5 hover:bg-red-500/20 hover:text-red-500 rounded-3xl transition-all">
                  <X size={24} />
                </button>
              </div>

              <div className="relative">
                <Search size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-700" />
                <input 
                  placeholder="Filter local results..."
                  value={sourceSearchQuery}
                  onChange={(e) => setSourceSearchQuery(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-[24px] pl-16 pr-6 py-5 text-white outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-10 space-y-4 custom-scrollbar">
              {loadingSources ? (
                <div className="py-20 flex flex-col items-center gap-4">
                  <Loader2 className="animate-spin text-purple-500" size={40} />
                  <span className="text-xs font-black uppercase tracking-widest text-gray-500">Scanning System Sources...</span>
                </div>
              ) : filteredSources.length > 0 ? (
                filteredSources.map((source, i) => (
                  <button
                    key={i}
                    onClick={() => mapSourceToEpisode(source)}
                    className="w-full text-left p-6 bg-white/[0.02] hover:bg-purple-600/10 border border-white/5 hover:border-purple-500/40 rounded-[28px] transition-all group flex items-center justify-between"
                  >
                    <div className="flex flex-col gap-2 overflow-hidden pr-6">
                      <div className="flex items-center gap-2">
                         <span className="bg-purple-500/20 text-purple-400 text-[9px] font-black px-2 py-1 rounded">EP {source.episode}</span>
                         <span className="text-base font-bold text-gray-300 group-hover:text-white truncate">{source.title}</span>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] text-gray-600 font-mono">
                        <span className="flex items-center gap-1"><Database size={12}/> {source.totalSize}</span>
                        <span className="flex items-center gap-1"><Calendar size={12}/> {new Date(source.pubDateISO).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="p-3 bg-white/5 rounded-2xl group-hover:bg-purple-600 group-hover:text-white transition-all transform group-hover:translate-x-1">
                      <ChevronRight size={20} />
                    </div>
                  </button>
                ))
              ) : (
                <div className="py-24 text-center text-gray-500">
                  <p className="font-bold uppercase tracking-widest text-xs">No files found for this query</p>
                </div>
              )}
              
              <button 
                onClick={fetchSourcesFromElectron}
                className="w-full py-6 mt-4 text-[10px] font-black uppercase tracking-[0.5em] text-gray-600 hover:text-purple-400 border-t border-white/5 transition-all"
              >
                Refresh Results
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default AddShowPage;