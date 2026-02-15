"use client";
import React, { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Play,
  Heart,
  Star,
  Info,
  Clock,
  FolderPlus,
  CheckCircle2,
  Loader2,
  X,
  Edit3,
  Plus,
  ChevronDown
} from "lucide-react";

/* --- Image Proxy Cache --- */
const imageCache = new Map<string, string>();

async function getProxiedImage(url?: string | null) {
  if (!url) return null;
  if (imageCache.has(url)) return imageCache.get(url)!;
  try {
    const res = await (window as any)?.electron?.loadImage?.(url);
    if (!res || !res.buffer) return null;
    let bytes = new Uint8Array(res.buffer.data || res.buffer);
    const blob = new Blob([bytes], { type: res.contentType || "image/jpeg" });
    const blobUrl = URL.createObjectURL(blob);
    imageCache.set(url, blobUrl);
    return blobUrl;
  } catch (err) {
    console.error("getProxiedImage error:", err);
    return null;
  }
}

const ShowPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const showId = searchParams.get("id");

  // --- States ---
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showData, setShowData] = useState<any | null>(null);
  const [bannerSrc, setBannerSrc] = useState<string | null>(null);
  const [downloadRecords, setDownloadRecords] = useState<any[]>([]);
  
  // Favorites
  const [favRecord, setFavRecord] = useState<any | null>(null);
  const [favBusy, setFavBusy] = useState(false);

  // Collections
  const [collections, setCollections] = useState<any[]>([]);
  const [collectionsOpen, setCollectionsOpen] = useState(false);
  const [addingToCollectionId, setAddingToCollectionId] = useState<number | null>(null);
  const [collectionMsg, setCollectionMsg] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // --- Close Dropdown on Click Outside ---
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setCollectionsOpen(false);
      }
    };
    if (collectionsOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [collectionsOpen]);

  // --- Initial Data Load ---
  useEffect(() => {
    if (!showId) return;
    setLoading(true);

    (async () => {
      try {
        const res = await (window as any).electron.loadShowData(showId);
        const downloads = await (window as any).electron.getDownloadsByAnime(String(showId));
        
        if (!res) {
          setError("No data found.");
          setLoading(false);
          return;
        }

        const normalized = {
          id: res.id ?? showId,
          bannerImage: res.bannerImage ?? null,
          title: res.officialTitleEnglish ?? res.title ?? "Untitled",
          description: res.description ?? "",
          type: res.type ?? "TV",
          tags: Array.isArray(res.tags) ? res.tags : [],
          ratingValue: res.rating?.value ?? res.rating ?? "N/A",
          episodes: Array.isArray(res.episodes) ? res.episodes : [],
        };

        setShowData(normalized);
        setDownloadRecords(downloads || []);

        if (normalized.bannerImage) {
          const b = await getProxiedImage(normalized.bannerImage);
          setBannerSrc(b);
        }

        const fav = await (window as any).electron.favGetByAnime(String(normalized.id));
        setFavRecord(fav || null);

        setLoading(false);
      } catch (err) {
        setLoading(false);
      }
    })();
  }, [showId]);

  // --- Handlers ---
  const handleToggleFavourite = async () => {
    if (!showData || favBusy) return;
    setFavBusy(true);
    try {
      if (favRecord) {
        await (window as any).electron.favDelete(favRecord.id);
        setFavRecord(null);
      } else {
        await (window as any).electron.favAdd({ animeId: String(showData.id), title: showData.title, cover: showData.bannerImage });
        const fresh = await (window as any).electron.favGetByAnime(String(showData.id));
        setFavRecord(fresh);
      }
    } catch (err) { console.error(err); }
    finally { setFavBusy(false); }
  };

  const ensureCollectionsLoaded = async () => {
    setCollectionsOpen(!collectionsOpen);
    if (collections.length > 0) return;
    try {
      const list = await (window as any).electron.collectionList();
      setCollections(list || []);
    } catch (err) { console.error(err); }
  };

  const handleAddToCollection = async (colId: number) => {
    if (!showData) return;
    setAddingToCollectionId(colId);
    try {
      await (window as any).electron.collectionAddShow(colId, String(showData.id));
      setCollectionMsg("Added to collection!");
      setTimeout(() => {
        setCollectionMsg(null);
        setCollectionsOpen(false);
      }, 2000);
    } catch (err) {
      setCollectionMsg("Already in collection");
      setTimeout(() => setCollectionMsg(null), 2000);
    } finally {
      setAddingToCollectionId(null);
    }
  };

  const goToAddNew = () => {
    const payload = {
      title: showData.title,
      rating: showData.ratingValue,
      tags: showData.tags,
      coverUrl: showData.bannerImage,
      episodes: showData.episodes.map((ep: any) => ({ number: ep.number, title: ep.title })),
    };
    router.push(`/add-new?all-data-from-query=${encodeURIComponent(JSON.stringify(payload))}&animeId=${showId}`);
  };

  if (loading) return <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-purple-500" size={48} /></div>;
  if (!showData) return null;

  return (
    <div className="flex-1 -mt-6 -mx-6 bg-[#100e17] text-white min-h-screen">
      {/* Hero Section */}
      <div className="relative h-[65vh] w-full overflow-hidden">
        <img src={bannerSrc || ""} className="w-full h-full object-cover opacity-50 blur-sm scale-105 absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#100e17] via-[#100e17]/60 to-transparent" />
        
        <div className="absolute bottom-0 left-0 p-12 w-full max-w-6xl z-10 space-y-6">
          <div className="flex items-center gap-4">
             <span className="bg-purple-600 px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest">{showData.type}</span>
             <span className="flex items-center gap-1 text-yellow-400 font-bold"><Star size={16} fill="currentColor"/> {showData.ratingValue}</span>
          </div>
          <h1 className="text-6xl font-black tracking-tighter">{showData.title}</h1>
          <p className="text-gray-400 max-w-2xl text-lg line-clamp-3 leading-relaxed">{showData.description}</p>

          <div className="flex items-center gap-4 pt-4">
            <button 
              onClick={() => downloadRecords.length > 0 ? router.push(`/view?animeId=${showId}`) : goToAddNew()}
              className="flex items-center gap-3 bg-white text-black px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-purple-500 hover:text-white transition-all shadow-xl"
            >
              <Play size={20} fill="currentColor"/> {downloadRecords.length > 0 ? "Watch Now" : "Set Sources"}
            </button>

            <button 
              onClick={handleToggleFavourite} 
              className={`p-4 rounded-2xl border transition-all ${favRecord ? 'bg-red-500 border-red-500' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
            >
              {favBusy ? <Loader2 size={24} className="animate-spin" /> : <Heart size={24} fill={favRecord ? "white" : "none"} />}
            </button>

            {/* Restored Collection Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={ensureCollectionsLoaded}
                className="p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all flex items-center gap-2"
              >
                <FolderPlus size={24} />
                <ChevronDown size={16} className={`transition-transform ${collectionsOpen ? 'rotate-180' : ''}`} />
              </button>

              {collectionsOpen && (
                <div className="absolute bottom-full mb-4 left-0 w-64 bg-[#1a1821] border border-white/10 rounded-[24px] shadow-2xl p-4 z-[100] animate-in slide-in-from-bottom-2 duration-200">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-4 px-2">Add to Collection</h4>
                  <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                    {collections.length > 0 ? (
                      collections.map(col => (
                        <button 
                          key={col.id}
                          disabled={addingToCollectionId === col.id}
                          onClick={() => handleAddToCollection(col.id)}
                          className="w-full text-left px-4 py-3 rounded-xl hover:bg-white/5 transition-all text-sm font-medium flex justify-between items-center group"
                        >
                          {col.name}
                          {addingToCollectionId === col.id ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} className="opacity-0 group-hover:opacity-100" />}
                        </button>
                      ))
                    ) : (
                      <p className="text-[10px] text-center py-4 text-gray-600">No collections found</p>
                    )}
                  </div>
                  {collectionMsg && (
                    <div className="mt-4 px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded-xl text-[10px] font-bold text-purple-400 text-center animate-pulse">
                      {collectionMsg}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Episode List Section */}
      <div className="p-12 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-16">
        <div className="lg:col-span-2 space-y-8">
          <h2 className="text-3xl font-black tracking-tight flex items-center gap-4">
            Episodes <span className="text-purple-500 text-sm font-mono">{showData.episodes.length}</span>
          </h2>
          
          <div className="grid gap-4">
            {showData.episodes.map((ep: any) => {
              const record = downloadRecords.find(d => Number(d.episodeNumber) === Number(ep.number));
              const hasSource = !!record;
              const isDownloaded = record?.isDownloaded === 1;

              return (
                <div 
                  key={ep.number}
                  onClick={() => hasSource ? router.push(`/view?animeId=${showId}&ep=${ep.number}`) : goToAddNew()}
                  className="group flex items-center gap-6 p-6 bg-white/[0.02] border border-white/5 rounded-[32px] hover:bg-white/[0.05] transition-all cursor-pointer"
                >
                  <span className="text-3xl font-black text-gray-800 group-hover:text-purple-500 transition-colors w-12 text-center">{ep.number}</span>
                  <div className="flex-1">
                    <h4 className="text-lg font-bold text-gray-200 group-hover:text-white transition-colors">{ep.title}</h4>
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">{ep.airDate || "No Date"}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    {isDownloaded ? (
                      <CheckCircle2 className="text-green-500" size={24} />
                    ) : hasSource ? (
                      <Clock className="text-purple-500" size={24} />
                    ) : (
                      <button className="px-4 py-2 bg-purple-600/10 text-purple-400 text-[10px] font-black uppercase rounded-xl border border-purple-500/20 group-hover:bg-purple-600 group-hover:text-white transition-all">
                        Link
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-10">
           <div className="bg-[#1a1821] p-8 rounded-[40px] border border-white/5 space-y-6">
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-gray-500">Metadata</h3>
              <div className="flex flex-wrap gap-2">
                {showData.tags.map((tag: string) => (
                  <span key={tag} className="px-3 py-1 bg-white/5 rounded-lg text-[10px] font-bold text-gray-400 border border-white/5">{tag}</span>
                ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ShowPage;