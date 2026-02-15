"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Trash2, Heart, Film } from "lucide-react";

/* simple module-level cache so multiple mounts reuse blob URLs */
const imageCache = new Map<string, string>();

async function getProxiedImage(url?: string) {
  if (!url) return null;
  if (imageCache.has(url)) return imageCache.get(url)!;

  try {
    const res = await (window as any)?.electron?.loadImage?.(url);
    if (!res?.buffer) return null;

    // support Node Buffer serialized shape or ArrayBuffer / Uint8Array
    let bytes: Uint8Array;
    if (res.buffer && Array.isArray(res.buffer.data)) {
      bytes = Uint8Array.from(res.buffer.data);
    } else if (res.buffer instanceof ArrayBuffer) {
      bytes = new Uint8Array(res.buffer);
    } else if (ArrayBuffer.isView(res.buffer)) {
      const b = res.buffer;
      bytes = new Uint8Array(b.buffer, b.byteOffset, b.byteLength);
    } else {
      bytes = new Uint8Array(res.buffer);
    }

    const blob = new Blob([bytes], { type: res.contentType || "image/jpeg" });
    const blobUrl = URL.createObjectURL(blob);
    imageCache.set(url, blobUrl);
    return blobUrl;
  } catch (err) {
    console.error("getProxiedImage error:", err);
    return null;
  }
}

const FavouritesPage = () => {
  const router = useRouter();
  const [favourites, setFavourites] = useState<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [images, setImages] = useState<Record<string, string>>({});
  const [isClearing, setIsClearing] = useState(false);

  // load favourites from main process
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoaded(false);
      try {
        const list = await (window as any)?.electron?.favList?.();
        if (cancelled) return;
        const arr = Array.isArray(list) ? list : [];
        setFavourites(arr);

        // prefetch proxied images
        arr.forEach(async (item: any) => {
          if (!item.cover) return;
          // use cached blob if available
          if (images[item.cover] || imageCache.has(item.cover)) {
            const cached = images[item.cover] ?? imageCache.get(item.cover)!;
            setImages((p) => ({ ...p, [item.cover]: cached }));
            return;
          }
          const blobUrl = await getProxiedImage(item.cover);
          if (!cancelled && blobUrl) {
            setImages((p) => ({ ...p, [item.cover]: blobUrl }));
          }
        });
      } catch (err) {
        console.error("Failed to load favourites:", err);
        if (!cancelled) setFavourites([]);
      } finally {
        if (!cancelled) setIsLoaded(true);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // remove a favourite by DB id
  const handleUnfavourite = async (id: number, cover?: string, e?: React.MouseEvent) => {
    // stop click bubbling (if called from button)
    e?.stopPropagation?.();

    // optimistic update
    setFavourites((prev) => prev.filter((it) => it.id !== id));

    try {
      await (window as any)?.electron?.favDelete?.(id);
      // optionally revoke cached image object URL and remove from images map
      if (cover && imageCache.has(cover)) {
        try {
          const blobUrl = imageCache.get(cover)!;
          URL.revokeObjectURL(blobUrl);
        } catch (err) {
          /* ignore */
        }
        imageCache.delete(cover);
        setImages((p) => {
          const copy = { ...p };
          delete copy[cover];
          return copy;
        });
      }
    } catch (err) {
      console.error("Failed to delete favourite:", err);
      // on failure, reload list to be safe
      try {
        const list = await (window as any)?.electron?.favList?.();
        setFavourites(Array.isArray(list) ? list : []);
      } catch (e2) {
        // ignore
      }
    }
  };

  // clear all favourites
  const handleClearAll = async () => {
    if (!favourites.length) return;
    setIsClearing(true);

    try {
      // delete in parallel
      await Promise.all(
        favourites.map((f) => (window as any)?.electron?.favDelete?.(f.id))
      );
      // revoke blob URLs
      favourites.forEach((f) => {
        if (f.cover && imageCache.has(f.cover)) {
          try {
            const blobUrl = imageCache.get(f.cover)!;
            URL.revokeObjectURL(blobUrl);
          } catch (err) {
            /* ignore */
          }
          imageCache.delete(f.cover);
        }
      });
      setImages({});
      setFavourites([]);
    } catch (err) {
      console.error("Failed to clear favourites:", err);
      // reload if something fails
      try {
        const list = await (window as any)?.electron?.favList?.();
        setFavourites(Array.isArray(list) ? list : []);
      } catch (e2) {
        // ignore
      }
    } finally {
      setIsClearing(false);
    }
  };

  if (!isLoaded) return null;

  return (
    <div className="flex-1 space-y-8 pb-10">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Heart className="text-red-500 fill-red-500" size={28} />
            My Favourites
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            You have {favourites.length} items saved in your collection
          </p>
        </div>

        {favourites.length > 0 && (
          <button
            onClick={handleClearAll}
            disabled={isClearing}
            className="text-xs text-gray-500 hover:text-red-400 transition-colors disabled:opacity-50"
          >
            {isClearing ? "Clearing..." : "Clear All"}
          </button>
        )}
      </div>

      {/* Conditional Rendering: Empty State vs Grid */}
      {favourites.length === 0 ? (
        <div className="h-[60vh] flex flex-col items-center justify-center text-center space-y-4">
          <div className="p-6 bg-white/5 rounded-full border border-white/10 text-gray-600">
            <Film size={48} strokeWidth={1} />
          </div>
          <div>
            <h2 className="text-xl font-medium text-white">Your list is empty</h2>
            <p className="text-gray-500 text-sm mt-1 max-w-xs">
              Start exploring and add your favorite movies and shows to this list.
            </p>
          </div>
          <button
            onClick={() => router.push("/explore")}
            className="px-6 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-500 transition-all"
          >
            Browse Movies
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {favourites.map((movie) => (
            <div
              key={movie.id}
              onClick={() => router.push(`/show?id=${movie.animeId}`)}
              className="group relative flex flex-col space-y-2 animate-in fade-in zoom-in duration-300 cursor-pointer"
            >
              {/* Poster Container */}
              <div className="relative aspect-[2/3] rounded-2xl overflow-hidden border border-white/10 bg-slate-900 shadow-xl">
                {images[movie.cover] ? (
                  <img
                    src={images[movie.cover]}
                    alt={movie.title}
                    className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-all duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full bg-white/5 animate-pulse" />
                )}

                {/* Overlay with Actions */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-center items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/show?id=${movie.animeId}`);
                    }}
                    className="p-3 bg-purple-600 rounded-full text-white hover:scale-110 transition-transform"
                    title="Open"
                  >
                    <Play size={20} fill="white" />
                  </button>

                  {/* UNFAVOURITE BUTTON */}
                  <button
                    onClick={(e) => handleUnfavourite(movie.id, movie.cover, e)}
                    className="p-2 bg-red-500/20 backdrop-blur-md border border-red-500/50 rounded-full text-red-500 hover:bg-red-500 hover:text-white transition-all transform translate-y-2 group-hover:translate-y-0"
                    title="Remove from Favourites"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                {/* Rating Badge */}
                <div className="absolute top-2 right-2 px-2 py-1 bg-black/50 backdrop-blur-md rounded-lg border border-white/10 text-[10px] text-white font-bold">
                  {movie.rating ?? "N/A"}
                </div>
              </div>

              {/* Title & Info */}
              <div className="px-1">
                <h3 className="text-white font-medium text-sm truncate group-hover:text-purple-400 transition-colors">
                  {movie.title}
                </h3>
                <p className="text-gray-500 text-[11px]">{movie.year ?? "2024"} • Action</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FavouritesPage;
