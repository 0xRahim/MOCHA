"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Play, Plus, Star } from "lucide-react";

/* constants */
const FILTERS = ["All", "Movies", "TV Shows", "OVA"];
const PAGE_SIZE = 18; // expected page size (used to detect likely end)

/* Module-level cache for proxied blob urls (shared within renderer session) */
const proxiedUrlCache = new Map();

/* Convert IPC image response to Blob URL (robust to serialized Buffer shapes) */
async function proxiedBlobUrlFor(remoteUrl) {
  if (!remoteUrl) return null;
  const cached = proxiedUrlCache.get(remoteUrl);
  if (cached) return cached;

  const electronApi = window?.electron;
  if (!electronApi || !electronApi.loadImage) return null;

  try {
    const res = await electronApi.loadImage(remoteUrl);
    if (!res || !res.buffer) return null;

    let uint8 = null;
    const buf = res.buffer;

    if (buf && Array.isArray(buf.data)) {
      uint8 = Uint8Array.from(buf.data);
    } else if (buf instanceof ArrayBuffer) {
      uint8 = new Uint8Array(buf);
    } else if (ArrayBuffer.isView(buf)) {
      uint8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    } else if (Array.isArray(buf)) {
      uint8 = Uint8Array.from(buf);
    } else {
      try {
        uint8 = new Uint8Array(buf);
      } catch (e) {
        console.error("Unable to coerce buffer to Uint8Array", e);
        return null;
      }
    }

    if (!uint8) return null;

    const contentType = res.contentType || "image/jpeg";
    const blob = new Blob([uint8], { type: contentType });
    const blobUrl = URL.createObjectURL(blob);
    proxiedUrlCache.set(remoteUrl, blobUrl);
    return blobUrl;
  } catch (err) {
    console.error("proxiedBlobUrlFor failed:", err);
    return null;
  }
}

const ExplorePage = () => {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const activeFilter = searchParams.get("filter") || "All";

  // raw items loaded from main process (unfiltered)
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1); // current loaded page (1-based)
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // mapping remoteUrl -> proxied blob url (string) for rendering
  const [proxiedMap, setProxiedMap] = useState({});
  // mapping remoteUrl -> true for images that failed proxying, so we keep skeletons
  const [failedMap, setFailedMap] = useState({});

  // sentinel ref for infinite scroll
  const sentinelRef = useRef(null);
  const observerRef = useRef(null);

  // Helper: check whether an item matches the active filter
  function matchesFilter(item, filter) {
    if (!filter || filter === "All") return true;
    const type = (item?.type || "").toString().toLowerCase();
    if (filter === "Movies") return type.includes("movie");
    if (filter === "TV Shows") return type.includes("tv");
    if (filter === "OVA") return type.includes("ova");
    return true;
  }

  // Derived filtered items (memoized)
  const filteredItems = useMemo(
    () => items.filter((it) => matchesFilter(it, activeFilter)),
    [items, activeFilter]
  );

  // helper: load a page via electron.loadExplore
  async function loadExplorePage(p) {
    if (isLoading || !window?.electron?.loadExplore) return;
    setIsLoading(true);
    try {
      const res = await window.electron.loadExplore(String(p));
      const normalized = Array.isArray(res)
        ? res.map((it) => ({
            ...it,
            animeId: String(it.animeId),
            cover: it.cover || undefined,
          }))
        : [];

      setItems((prev) => [...prev, ...normalized]);

      // detect likely end of results
      if (!Array.isArray(res) || normalized.length < PAGE_SIZE) {
        setHasMore(false);
      }

      // proxied prefetch for covers (non-blocking)
      normalized
        .map((i) => i.cover)
        .filter(Boolean)
        .forEach(async (url) => {
          if (!url) return;
          if (proxiedMap[url] || proxiedUrlCache.has(url) || failedMap[url]) {
            const cached = proxiedMap[url] ?? proxiedUrlCache.get(url);
            if (cached) setProxiedMap((p) => ({ ...p, [url]: cached }));
            return;
          }

          const blob = await proxiedBlobUrlFor(url);
          if (blob) {
            setProxiedMap((p) => ({ ...p, [url]: blob }));
          } else {
            setFailedMap((p) => ({ ...p, [url]: true }));
          }
        });
    } catch (err) {
      console.error("loadExplorePage failed:", err);
      // keep hasMore true so user can retry by scrolling
    } finally {
      setIsLoading(false);
    }
  }

  // Load initial page and reset items on filter change
  useEffect(() => {
    setItems([]);
    setPage(1);
    setHasMore(true);
    setProxiedMap({});
    setFailedMap({});
    loadExplorePage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter]);

  // intersection observer for infinite scroll
  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && hasMore && !isLoading) {
            const next = page + 1;
            setPage(next);
            loadExplorePage(next);
          }
        });
      },
      {
        root: null,
        rootMargin: "400px",
        threshold: 0.1,
      }
    );

    const el = sentinelRef.current;
    if (el) observerRef.current.observe(el);

    return () => {
      if (observerRef.current && el) observerRef.current.unobserve(el);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, hasMore, isLoading]);

  // helper to compute display src (only proxied blob or cached blob; otherwise null)
  function displaySrc(remoteUrl) {
    if (!remoteUrl) return null;
    return proxiedMap[remoteUrl] ?? proxiedUrlCache.get(remoteUrl) ?? null;
  }

  return (
    <div className="flex-1 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Explore</h1>
          <p className="text-gray-400 text-sm mt-1">
            Showing{" "}
            <span className="text-purple-400 font-medium">
              {activeFilter}
            </span>{" "}
            items ({filteredItems.length})
          </p>
        </div>

        <div className="flex gap-3 bg-white/5 p-1 rounded-2xl border border-white/5">
          {FILTERS.map((filter) => (
            <button
              key={filter}
              onClick={() => {
                const params = new URLSearchParams(searchParams);
                if (filter === "All") params.delete("filter");
                else params.set("filter", filter);
                router.replace(`${pathname}?${params.toString()}`);
              }}
              className={`px-5 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                activeFilter === filter
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
        {filteredItems.length > 0
          ? filteredItems.map((movie, idx) => {
              const src = displaySrc(movie.cover);
              const failed = !!failedMap[movie.cover];
              return (
                <div
                  key={`${movie.animeId}-${idx}`}
                  className="group relative flex flex-col space-y-2 cursor-pointer"
                  onClick={() => router.push(`/show?id=${movie.animeId}`)}
                >
                  <div className="relative aspect-[2/3] rounded-2xl overflow-hidden border border-white/10 bg-slate-900 shadow-xl">
                    {src && !failed ? (
                      <img
                        src={src}
                        alt={movie.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-90 group-hover:opacity-100"
                        onError={() =>
                          setFailedMap((p) => ({ ...p, [movie.cover]: true }))
                        }
                      />
                    ) : (
                      <div className="w-full h-full bg-white/5" />
                    )}

                    {/* Hover actions */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-center items-center gap-3">
                      <button className="p-3 bg-purple-600 rounded-full text-white transform translate-y-4 group-hover:translate-y-0 transition-transform">
                        <Play size={20} fill="white" />
                      </button>
                      <button className="p-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white transform translate-y-4 group-hover:translate-y-0 transition-transform delay-75">
                        <Plus size={18} />
                      </button>
                    </div>

                    {/* Rating */}
                    <div className="absolute top-2 right-2 px-2 py-1 bg-black/50 backdrop-blur-md rounded-lg border border-white/10 flex items-center gap-1 text-[10px] text-yellow-400 font-bold">
                      <Star size={10} fill="currentColor" />
                      {movie.rating ?? "N/A"}
                    </div>
                  </div>

                  <div className="px-1">
                    <h3 className="text-white font-medium text-sm truncate group-hover:text-purple-400 transition-colors">
                      {movie.title}
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] text-gray-500">
                      <span>{movie.year ?? "2024"}</span>
                      <span className="w-1 h-1 rounded-full bg-gray-700" />
                      <span>{movie.type ?? movie.category ?? "Unknown"}</span>
                    </div>
                  </div>
                </div>
              );
            })
          : // skeletons when filtered list empty
            Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <div
                key={`skeleton-${i}`}
                className="group relative flex flex-col space-y-2 cursor-pointer"
              >
                <div className="relative aspect-[2/3] rounded-2xl overflow-hidden border border-white/10 bg-white/5" />
                <div className="px-1">
                  <div className="h-3 bg-white/5 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-white/5 rounded w-1/3" />
                </div>
              </div>
            ))}
      </div>

      {/* sentinel for infinite scroll */}
      <div ref={sentinelRef} />

      {/* loading indicator */}
      {isLoading && (
        <div className="py-10 flex justify-center">
          <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};

export default ExplorePage;
