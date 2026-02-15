"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Play, Plus, Star, Search, FilterX, Loader2 } from "lucide-react";

/* cache proxied images */
const imageCache = new Map<string, string>();

async function getProxiedImage(url?: string) {
  if (!url) return null;
  if (imageCache.has(url)) return imageCache.get(url)!;

  try {
    const res = await (window as any).electron.loadImage(url);
    if (!res?.buffer) return null;

    const bytes = Array.isArray(res.buffer?.data)
      ? Uint8Array.from(res.buffer.data)
      : new Uint8Array(res.buffer);

    const blob = new Blob([bytes], {
      type: res.contentType || "image/jpeg",
    });

    const blobUrl = URL.createObjectURL(blob);
    imageCache.set(url, blobUrl);
    return blobUrl;
  } catch {
    return null;
  }
}

const SearchResultsPage = () => {
  const router = useRouter(); // ✅ FIXED
  const searchParams = useSearchParams();

  const query = searchParams.get("q") || "";
  const typeFilter = searchParams.get("type"); // TV Series | Movie | OVA

  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [images, setImages] = useState<Record<string, string>>({});

  /* fetch search results whenever ?q changes */
  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    (async () => {
      try {
        const data = await (window as any).electron.loadSearch(query);
        if (cancelled) return;

        // ✅ APPLY TYPE FILTER
        const filtered = typeFilter
          ? data.filter(
              (item: any) =>
                item.type?.toLowerCase() === typeFilter.toLowerCase()
            )
          : data;

        setResults(filtered || []);
        setIsLoading(false);

        /* proxy covers */
        (filtered || []).forEach(async (item: any) => {
          if (!item.cover) return;
          const img = await getProxiedImage(item.cover);
          if (img && !cancelled) {
            setImages((p) => ({ ...p, [item.cover]: img }));
          }
        });
      } catch {
        if (!cancelled) {
          setResults([]);
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [query, typeFilter]);

  return (
    <div className="flex-1 space-y-8 pb-10">
      {/* Header */}
      <div className="border-b border-white/5 pb-6">
        <p className="text-purple-400 text-xs font-bold uppercase tracking-widest mb-1">
          Search Results
        </p>
        <h1 className="text-3xl font-bold text-white">
          {query ? (
            <>
              Showing results for{" "}
              <span className="text-purple-500">"{query}"</span>
            </>
          ) : (
            "Start searching..."
          )}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {results.length} items found
        </p>
      </div>

      {/* States */}
      {isLoading ? (
        <div className="h-[50vh] flex flex-col items-center justify-center gap-4 text-gray-500">
          <Loader2 className="animate-spin text-purple-500" size={40} />
          <p>Searching through plugins…</p>
        </div>
      ) : !query ? (
        <div className="h-[50vh] flex flex-col items-center justify-center text-gray-500">
          <Search size={48} className="opacity-10 mb-4" />
          <p>Type something in the search bar above.</p>
        </div>
      ) : results.length === 0 ? (
        <div className="h-[50vh] flex flex-col items-center justify-center text-center space-y-4">
          <div className="p-6 bg-white/5 rounded-full text-gray-600">
            <FilterX size={48} />
          </div>
          <h2 className="text-xl font-medium text-white">No results found</h2>
          <p className="text-gray-500 text-sm">
            Nothing matched "{query}"
          </p>
        </div>
      ) : (
        /* Results grid */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {results.map((item) => (
            <div
              key={item.animeId}
              onClick={() => router.push(`/show?id=${item.animeId}`)}
              className="group flex flex-col gap-2 cursor-pointer"
            >
              <div className="relative aspect-[2/3] rounded-2xl overflow-hidden border border-white/10 bg-slate-900">
                {images[item.cover] ? (
                  <img
                    src={images[item.cover]}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-white/5 animate-pulse" />
                )}

                {/* overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <div className="bg-purple-600 p-3 rounded-full text-white">
                    <Play size={20} fill="white" />
                  </div>
                  <button className="p-2 bg-white/10 rounded-full border border-white/20">
                    <Plus size={18} />
                  </button>
                </div>

                {/* rating */}
                <div className="absolute top-2 right-2 px-2 py-1 bg-black/50 rounded-lg text-[10px] text-yellow-400 font-bold flex items-center gap-1">
                  <Star size={10} fill="currentColor" />
                  {item.rating ?? "N/A"}
                </div>
              </div>

              <h3 className="text-white font-medium text-sm truncate group-hover:text-purple-400">
                {item.title}
              </h3>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchResultsPage;
