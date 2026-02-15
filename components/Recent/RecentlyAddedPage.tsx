"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Clock, Sparkles, Loader2, PlayCircle } from 'lucide-react';

/* simple module-level cache for proxied images */
const imageCache = new Map<string, string>();

async function getProxiedImage(url?: string | null) {
  if (!url) return null;
  if (imageCache.has(url)) return imageCache.get(url)!;

  try {
    const res = await (window as any)?.electron?.loadImage?.(url);
    if (!res || !res.buffer) return null;

    let bytes: Uint8Array;
    if (res.buffer && Array.isArray((res.buffer as any).data)) {
      bytes = Uint8Array.from((res.buffer as any).data);
    } else if (res.buffer instanceof ArrayBuffer) {
      bytes = new Uint8Array(res.buffer);
    } else if (ArrayBuffer.isView(res.buffer)) {
      const b = res.buffer as Uint8Array;
      bytes = new Uint8Array(b.buffer, b.byteOffset, b.byteLength);
    } else {
      bytes = new Uint8Array(res.buffer);
    }

    const blob = new Blob([bytes], { type: (res as any).contentType || "image/jpeg" });
    const blobUrl = URL.createObjectURL(blob);
    imageCache.set(url, blobUrl);
    return blobUrl;
  } catch (err) {
    console.error("getProxiedImage error:", err);
    return null;
  }
}

const RecentlyAddedPage = () => {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchRecentlyAdded = async () => {
      try {
        // 1. Fetch all rows from the downloads table
        const allDownloads = await (window as any).electron.getAllDownloads();
        
        if (!allDownloads || allDownloads.length === 0) {
          if (isMounted) {
            setItems([]);
            setLoading(false);
          }
          return;
        }

        // 2. Group by animeId and keep the most recent entries at the top
        // We reverse the array first so that the latest database insertions appear first in the Set
        const uniqueAnimeIds = Array.from(new Set(allDownloads.reverse().map((d: any) => d.animeId)));

        // 3. Fetch metadata for each show found in downloads
        const showDataList = await Promise.all(
          uniqueAnimeIds.map(async (animeId: any) => {
            try {
              const res = await (window as any).electron.loadShowData(String(animeId));
              if (!res) return null;

              // Extract counts for status info
              const epsForThisShow = allDownloads.filter((d: any) => d.animeId === animeId);
              const downloadCount = epsForThisShow.filter((d: any) => d.isDownloaded === 1).length;

              const bannerUrl = res.bannerImage || res.coverUrl;
              const proxiedCover = await getProxiedImage(bannerUrl);

              return {
                id: animeId,
                title: res.officialTitleEnglish || res.title || "Untitled",
                rating: res.rating?.value || "N/A",
                image: proxiedCover || bannerUrl,
                epCount: epsForThisShow.length,
                downloadCount: downloadCount,
                type: res.type || "TV"
              };
            } catch (e) {
              return null;
            }
          })
        );

        if (isMounted) {
          setItems(showDataList.filter(i => i !== null));
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to fetch recently added:", err);
        if (isMounted) setLoading(false);
      }
    };

    fetchRecentlyAdded();
    return () => { isMounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="animate-spin text-purple-500" size={48} />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3 text-purple-400">
          <Sparkles size={20} className="fill-current" />
          <span className="text-xs font-black uppercase tracking-[0.3em]">Your Library</span>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-black text-white tracking-tighter">Recently Added</h1>
          <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-2xl text-xs font-bold text-gray-400 flex items-center gap-2">
            <Clock size={14} />
            {items.length} Series Total
          </div>
        </div>
      </div>

      {/* Grid */}
      {items.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-12">
          {items.map((item) => (
            <div 
              key={item.id} 
              className="group cursor-pointer space-y-4"
              onClick={() => router.push(`/show?id=${item.id}`)}
            >
              {/* Poster Container */}
              <div className="relative aspect-[2/3] rounded-[32px] overflow-hidden border border-white/5 bg-[#1a1821] shadow-2xl transition-all duration-500 group-hover:shadow-purple-500/20 group-hover:-translate-y-2">
                <img 
                  src={item.image} 
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100"
                />

                {/* Overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                
                {/* Rating Badge */}
                <div className="absolute top-4 right-4 px-2 py-1 bg-black/60 backdrop-blur-md rounded-xl border border-white/10 text-[10px] font-black text-yellow-400 flex items-center gap-1">
                  ★ {item.rating}
                </div>

                {/* Play Button on Hover */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <div className="p-4 bg-purple-600 rounded-full text-white shadow-2xl shadow-purple-600/50 scale-75 group-hover:scale-100 transition-transform">
                    <Play size={24} fill="currentColor" />
                  </div>
                </div>

                {/* Episode Progress Bar (Visual only) */}
                <div className="absolute bottom-0 left-0 w-full h-1.5 bg-white/10">
                   <div 
                    className="h-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)]" 
                    style={{ width: `${(item.downloadCount / item.epCount) * 100}%` }}
                   />
                </div>
              </div>

              {/* Text Info */}
              <div className="px-2 space-y-1">
                <h3 className="text-white font-bold text-sm line-clamp-1 group-hover:text-purple-400 transition-colors">
                  {item.title}
                </h3>
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-500">
                  <span>{item.type}</span>
                  <span className="text-purple-500/60">{item.epCount} Episodes</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-32 flex flex-col items-center justify-center bg-white/[0.02] rounded-[50px] border border-dashed border-white/10">
          <PlayCircle size={48} className="text-gray-800 mb-4" />
          <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Your collection is empty</p>
          <button 
            onClick={() => router.push('/')}
            className="mt-6 text-purple-500 text-xs font-black uppercase hover:underline"
          >
            Go discover something new
          </button>
        </div>
      )}
    </div>
  );
};

export default RecentlyAddedPage;