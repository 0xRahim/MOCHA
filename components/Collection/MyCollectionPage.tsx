"use client";
import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { FolderHeart, Plus, Trash2, ChevronLeft, Play, Film, Loader2 } from "lucide-react";

const MyCollectionPage = () => {
  const [collections, setCollections] = useState<any[]>([]);
  const [activeCollectionData, setActiveCollectionData] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);

  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace, push } = useRouter();

  const activeId = searchParams.get("id");

  // 1. Initial Load: Get all collection folders
  useEffect(() => {
    async function loadCollections() {
      try {
        const res = await (window as any)?.electron?.collectionList?.();
        setCollections(Array.isArray(res) ? res : []);
        setIsLoaded(true);
      } catch (err) {
        console.error("Failed to load collections:", err);
        setIsLoaded(true);
      }
    }
    loadCollections();
  }, []);

  // 2. Open Collection Logic: Fetch items via the preload bridge
  useEffect(() => {
    if (activeId) {
      loadActiveCollection(activeId);
    } else {
      setActiveCollectionData(null);
    }
  }, [activeId]);

  async function loadActiveCollection(id: string) {
    setLoadingItems(true);
    try {
      /** * UPDATED: Using collectionItemList from your preload
       * Backend returns: { id, name, description, items: [...] }
       */
      const data = await (window as any)?.electron?.collectionItemList?.(Number(id));
      
      if (data && data.items) {
        // Handle image proxying for the items using the existing buffer-to-blob logic if needed
        const proxiedItems = await Promise.all(
          data.items.map(async (item: any) => {
            // If you have a proxy logic helper, call it here. Otherwise, use cover.
            const proxied = await (window as any)?.electron?.loadImage?.(item.cover);
            
            // Logic for blob URL conversion (minimal version)
            let displayImg = item.cover;
            if (proxied?.buffer) {
               const bytes = new Uint8Array(proxied.buffer.data || proxied.buffer);
               const blob = new Blob([bytes], { type: proxied.contentType || "image/jpeg" });
               displayImg = URL.createObjectURL(blob);
            }

            return { ...item, displayImg }; 
          })
        );
        setActiveCollectionData({ ...data, items: proxiedItems });
      }
    } catch (err) {
      console.error("Failed to load items via collectionItemList:", err);
    } finally {
      setLoadingItems(false);
    }
  }

  // 3. Remove Item Logic using your specific delete bridge
  const handleRemoveItem = async (itemDbId: number) => {
    try {
      // Correct IPC name from your previous snippet
      await (window as any)?.electron?.["collection:item:delete"]?.(itemDbId);
      
      // Update local UI immediately for a snappy feel
      setActiveCollectionData((prev: any) => ({
        ...prev,
        items: prev.items.filter((it: any) => it.id !== itemDbId),
      }));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const openCollection = (id: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (id) params.set("id", id); else params.delete("id");
    replace(`${pathname}?${params.toString()}`);
  };

  if (!isLoaded) return <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-purple-500" size={48} /></div>;

  return (
    <div className="flex-1 space-y-8 pb-10">
      {/* Header */}
      <div className="flex items-center gap-4">
        {activeId && (
          <button onClick={() => openCollection(null)} className="p-2 bg-white/5 rounded-xl hover:bg-white/10 text-gray-400">
            <ChevronLeft size={20} />
          </button>
        )}
        <h1 className="text-3xl font-bold text-white tracking-tight">
          {activeId ? activeCollectionData?.name : "My Collections"}
        </h1>
      </div>

      {!activeId ? (
        /* GRID: Folders */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {collections.map((col) => (
            <div 
              key={col.id} 
              onClick={() => openCollection(String(col.id))} 
              className="group bg-white/5 border border-white/10 p-6 rounded-3xl cursor-pointer hover:bg-white/10 transition-all border-b-4 border-b-transparent hover:border-b-purple-500"
            >
              <div className="bg-purple-500/20 p-4 rounded-2xl w-fit mb-4 text-purple-400">
                <FolderHeart size={32} />
              </div>
              <h3 className="text-white font-semibold text-lg">{col.name}</h3>
              <p className="text-gray-500 text-sm">Open Collection</p>
            </div>
          ))}
        </div>
      ) : (
        /* GRID: Items */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6">
          {loadingItems ? (
            <div className="col-span-full py-20 flex justify-center"><Loader2 className="animate-spin text-purple-500" size={32} /></div>
          ) : activeCollectionData?.items.length > 0 ? (
            activeCollectionData.items.map((item: any) => (
              <div key={item.id} className="group relative flex flex-col gap-2">
                <div className="relative aspect-[2/3] rounded-2xl overflow-hidden border border-white/10 bg-slate-900 shadow-xl">
                  <img src={item.displayImg} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                    <button 
                       onClick={() => push(`/show?id=${item.animeId}`)}
                       className="bg-purple-600 p-3 rounded-full hover:scale-110 transition-transform shadow-lg shadow-purple-500/20">
                      <Play size={20} fill="white" className="text-white" />
                    </button>
                    <button 
                      onClick={() => handleRemoveItem(item.id)}
                      className="bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white p-2 rounded-lg transition-all"
                      title="Remove from collection"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <p className="text-white text-xs font-medium truncate px-1">{item.title}</p>
              </div>
            ))
          ) : (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-500 gap-4">
              <Film size={48} className="opacity-20" />
              <p className="italic">This collection is empty.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MyCollectionPage;