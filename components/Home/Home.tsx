"use client";

import React, { useEffect, useState, useRef } from "react";
import { Play, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

/* ---------------- Backend Item ---------------- */

type BackendItem = {
  animeId: string;
  title: string;
  cover: string;
  rating: number | null;
  ratingCount: number | null;
};

/* ---------------- UI Types ---------------- */

type HeroItem = {
  id: string;
  title: string;
  tags: string[];
  desc: string;
  img: string;
  color: string;
};

/* ---------------- Constants ---------------- */

const HERO_GRADIENTS = [
  "from-purple-900/80",
  "from-blue-900/80",
  "from-red-900/80",
  "from-emerald-900/80",
];

const FALLBACK_HEROES: HeroItem[] = [
  {
    id: "loading",
    title: "Loading latest releases…",
    tags: ["AniDB"],
    desc: "Fetching data using Chromium engine.",
    img: "/hero1.jpg",
    color: "from-purple-900/80",
  },
];

/* ---------------- Module-level cache ----------------
   Keeps proxied blob URLs across component mounts in the same session.
   Key: original remote URL, Value: blobUrl
*/
const proxiedUrlCache = new Map<string, string>();

/* ---------------- Helpers ---------------- */

function normalize(items: BackendItem[] = []): BackendItem[] {
  return items.map((i) => ({
    ...i,
    animeId: String(i.animeId),
  }));
}

function toHeroItems(items: BackendItem[]): HeroItem[] {
  return items.slice(0, 5).map((item, i) => ({
    id: item.animeId,
    title: item.title,
    tags: item.rating
      ? [`⭐ ${item.rating}`, `Votes: ${item.ratingCount ?? 0}`]
      : ["Unrated"],
    desc: "Latest anime release from AniDB.",
    img: item.cover,
    color: HERO_GRADIENTS[i % HERO_GRADIENTS.length],
  }));
}

/* Convert IPC image response to Blob URL (robust to serialized Buffer shapes) */
async function proxiedBlobUrlFor(remoteUrl: string): Promise<string | null> {
  if (!remoteUrl) return null;

  // Return cached blob url if available
  const cached = proxiedUrlCache.get(remoteUrl);
  if (cached) return cached;

  // Ensure preload exposes `loadImage`
  const electronApi = (window as any).electron;
  if (!electronApi || !electronApi.loadImage) return null;

  try {
    const res = await electronApi.loadImage(remoteUrl);
    if (!res || !res.buffer) return null;

    let uint8: Uint8Array | null = null;

    const buf = res.buffer;

    if (buf && Array.isArray(buf.data)) {
      // Node Buffer serialized shape
      uint8 = Uint8Array.from(buf.data);
    } else if (buf instanceof ArrayBuffer) {
      uint8 = new Uint8Array(buf);
    } else if (ArrayBuffer.isView(buf)) {
      uint8 = new Uint8Array(
        (buf as Uint8Array).buffer,
        (buf as Uint8Array).byteOffset,
        (buf as Uint8Array).byteLength
      );
    } else if (Array.isArray(buf)) {
      uint8 = Uint8Array.from(buf);
    } else {
      try {
        uint8 = new Uint8Array(buf);
      } catch (e) {
        console.error("Unable to convert proxied buffer to Uint8Array", e);
        return null;
      }
    }

    if (!uint8) return null;

    const contentType = res.contentType || "image/jpeg";
    const blob = new Blob([uint8], { type: contentType });
    const blobUrl = URL.createObjectURL(blob);

    // Cache for future reuse
    proxiedUrlCache.set(remoteUrl, blobUrl);

    return blobUrl;
  } catch (err) {
    console.error("proxiedBlobUrlFor failed:", err);
    return null;
  }
}

/* ---------------- Component ---------------- */

const Homepage = () => {
  const router = useRouter();

  const [heroItems, setHeroItems] = useState<HeroItem[]>(FALLBACK_HEROES);
  const [activeHero, setActiveHero] = useState(0);

  const [continueItems, setContinueItems] = useState<BackendItem[]>([]);
  const [youMayLikeItems, setYouMayLikeItems] = useState<BackendItem[]>([]);

  // local map of remoteUrl -> proxied blob url for this mount (so we can revoke on unmount)
  const createdBlobUrls = useRef(new Set<string>());

  // local state mapping original remote url -> proxied blob url (for re-render)
  const [proxiedMap, setProxiedMap] = useState<Record<string, string>>({});

  // track urls that failed to load so we keep showing skeletons instead of broken icons
  const [failedMap, setFailedMap] = useState<Record<string, boolean>>({});

  /* ---------------- Load Data ---------------- */

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        if (!window?.electron?.loadHome) return;

        const data: {
          hero?: BackendItem[];
          continue?: BackendItem[];
          youMayLike?: BackendItem[];
        } = await (window as any).electron.loadHome();

        if (!mounted) return;

        const hero = normalize(data?.hero ?? []);
        const cont = normalize(data?.continue ?? []);
        const like = normalize(data?.youMayLike ?? []);

        if (hero.length) {
          setHeroItems(toHeroItems(hero));
          setActiveHero(0);
        }

        setContinueItems(cont);
        setYouMayLikeItems(like);

        // Prefetch proxied images for first items (non-blocking)
        const allUrls = [
          ...hero.slice(0, 6).map((h) => h.cover),
          ...cont.slice(0, 8).map((c) => c.cover),
          ...like.slice(0, 12).map((l) => l.cover),
        ].filter(Boolean) as string[];

        // Kick off fetches in parallel but update state as they resolve
        await Promise.all(
          allUrls.map(async (url) => {
            if (!url) return;
            // skip if already in proxiedMap or cache
            if (proxiedMap[url] || proxiedUrlCache.has(url)) {
              const cached = proxiedMap[url] ?? proxiedUrlCache.get(url)!;
              if (cached && mounted) {
                setProxiedMap((p) => ({ ...p, [url]: cached }));
              }
              return;
            }

            const blobUrl = await proxiedBlobUrlFor(url);
            if (blobUrl && mounted) {
              createdBlobUrls.current.add(blobUrl);
              setProxiedMap((p) => ({ ...p, [url]: blobUrl }));
            }
          })
        );
      } catch (err) {
        console.error("Failed to load home data:", err);
      }
    }

    load();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- Auto Rotate Hero ---------------- */

  useEffect(() => {
    if (heroItems.length <= 1) return;

    const t = setInterval(
      () => setActiveHero((i) => (i + 1) % heroItems.length),
      3500
    );

    return () => clearInterval(t);
  }, [heroItems]);

  /* ---------------- Cleanup created blob urls on unmount ---------------- */
  useEffect(() => {
    return () => {
      // revoke blob urls created during this mount & remove from cache
      createdBlobUrls.current.forEach((blobUrl) => {
        try {
          URL.revokeObjectURL(blobUrl);
        } catch (e) {
          // ignore
        }
      });

      // remove revoked urls from module cache as well
      for (const [remote, blobUrl] of proxiedUrlCache.entries()) {
        if (createdBlobUrls.current.has(blobUrl)) {
          proxiedUrlCache.delete(remote);
        }
      }
    };
  }, []);

  const hero = heroItems[activeHero];

  /* ---------------- Helper to get the display src (proxied fallback original) ---------------- */
  function displaySrc(remoteUrl?: string) {
    if (!remoteUrl) return null;
    // only return a URL once we have a proxied blob (or cached blob) — this prevents the browser
    // from attempting to load the original remote url (which causes broken-image icons)
    return proxiedMap[remoteUrl] ?? proxiedUrlCache.get(remoteUrl) ?? null;
  }

  /* ---------------- Render ---------------- */

  return (
    <div className="flex-1 space-y-8 pb-10 overflow-y-auto no-scrollbar h-screen">
      {/* ================= HERO ================= */}
      <section className="relative w-full h-[400px] rounded-3xl overflow-hidden shadow-2xl">
        {/* Image */}
        {hero.img ? (
          <img
            key={hero.id}
            src={displaySrc(hero.img) ?? hero.img}
            alt={hero.title}
            className="absolute inset-0 w-full h-full object-cover animate-in fade-in duration-700"
            loading="eager"
          />
        ) : (
          <div className="absolute inset-0 bg-gray-800" />
        )}

        {/* Gradient */}
        <div
          className={`absolute inset-0 bg-gradient-to-r ${hero.color} via-black/40 to-transparent`}
        />

        {/* Content */}
        <div className="relative h-full flex flex-col justify-center px-12 space-y-4">
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md w-fit px-3 py-1 rounded-full border border-white/10 text-[10px] uppercase tracking-widest text-orange-400 font-bold">
            🔥 Latest Release
          </div>

          <div className="flex gap-3 text-xs">
            {hero.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-white/5 backdrop-blur-md rounded-full border border-white/10 text-gray-200"
              >
                {tag}
              </span>
            ))}
          </div>

          <h1 className="text-5xl font-bold text-white max-w-lg leading-tight">
            {hero.title}
          </h1>

          <p className="text-gray-300 max-w-md text-sm leading-relaxed line-clamp-2">
            {hero.desc}
          </p>

          <button
            onClick={() => router.push(`/show?id=${hero.id}`)}
            className="inline-flex w-fit items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-8 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-purple-500/20"
          >
            <Play size={20} fill="white" />
            View Details
          </button>

          {/* Indicators */}
          <div className="flex gap-2 pt-2">
            {heroItems.map((_, idx) => (
              <div
                key={idx}
                className={`h-1 rounded-full transition-all duration-300 ${
                  activeHero === idx ? "bg-purple-500 w-10" : "bg-white/20 w-6"
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ================= CONTINUE WATCHING ================= */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Continue Watching</h2>
          <button className="text-sm text-gray-400 hover:text-white flex items-center gap-1">
            See All <ChevronRight size={16} />
          </button>
        </div>

        <div className="flex gap-6 overflow-x-auto no-scrollbar pb-2">
          {continueItems.length ? (
            continueItems.map((it) => {
              const src = displaySrc(it.cover);
              const failed = !!failedMap[it.cover];

              return (
                <div
                  key={it.animeId}
                  className="shrink-0 w-[320px] h-[180px] rounded-2xl bg-white/5 border border-white/10 overflow-hidden cursor-pointer"
                  onClick={() => router.push(`/show?id=${it.animeId}`)}
                >
                  {src && !failed ? (
                    <img
                      src={src}
                      alt={it.title}
                      className="w-full h-full object-cover"
                      onError={() => setFailedMap((p) => ({ ...p, [it.cover]: true }))}
                    />
                  ) : (
                    // show the blank skeleton so the user doesn't see broken icon
                    <div className="w-full h-full bg-white/5" />
                  )}
                </div>
              );
            })
          ) : (
            [1, 2, 3].map((i) => (
              <div
                key={i}
                className="shrink-0 w-[320px] h-[180px] rounded-2xl bg-white/5 border border-white/10"
              />
            ))
          )}
        </div>
      </section>

      {/* ================= YOU MAY LIKE ================= */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">You Might Like</h2>

        <div className="flex gap-6 overflow-x-auto no-scrollbar pb-4">
          {youMayLikeItems.length ? (
            youMayLikeItems.map((it) => {
              const src = displaySrc(it.cover);
              const failed = !!failedMap[it.cover];

              return (
                <div
                  key={it.animeId}
                  onClick={() => router.push(`/show?id=${it.animeId}`)}
                  className="shrink-0 w-[200px] aspect-[2/3] rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/50 transition-all cursor-pointer overflow-hidden"
                >
                  {src && !failed ? (
                    <img
                      src={src}
                      alt={it.title}
                      className="w-full h-full object-cover"
                      onError={() => setFailedMap((p) => ({ ...p, [it.cover]: true }))}
                    />
                  ) : (
                    // keep it visually identical to the placeholder used before the data arrived
                    <div className="w-full h-full" />
                  )}
                </div>
              );
            })
          ) : (
            [1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="shrink-0 w-[200px] aspect-[2/3] rounded-2xl bg-white/5 border border-white/10"
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default Homepage;
