
"use client";

import React from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { SlidersHorizontal, AlertTriangle } from "lucide-react";

const GENRES = [
  "All",
  "Action",
  "Drama",
  "Fantasy",
  "Sci-Fi",
  "Thriller",
  "Comedy",
  "Horror",
];

const GenrePage = () => {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const currentGenre = searchParams.get("genre") || "All";

  const handleGenreChange = (genre: string) => {
    const params = new URLSearchParams(searchParams);
    if (genre === "All") params.delete("genre");
    else params.set("genre", genre);
    replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex-1 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Browse by{" "}
            <span className="text-purple-500">{currentGenre}</span>
          </h1>

          <button
            disabled
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-gray-500 cursor-not-allowed"
          >
            <SlidersHorizontal size={18} />
            <span className="text-sm">Filters</span>
          </button>
        </div>

        {/* Genre Pills (still clickable, but feature disabled) */}
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
          {GENRES.map((genre) => (
            <button
              key={genre}
              onClick={() => handleGenreChange(genre)}
              className={`px-6 py-2 rounded-2xl whitespace-nowrap border transition-all duration-300 ${
                currentGenre === genre
                  ? "bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-500/20"
                  : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20 hover:text-white"
              }`}
            >
              {genre}
            </button>
          ))}
        </div>
      </div>

      {/* Disabled / Maintenance Message */}
      <div className="h-[50vh] flex flex-col items-center justify-center text-center gap-4">
        <div className="p-4 rounded-full bg-yellow-500/10 border border-yellow-500/20">
          <AlertTriangle className="text-yellow-400" size={36} />
        </div>

        <h2 className="text-xl font-semibold text-white">
          Genre browsing is currently unavailable
        </h2>

        <p className="text-gray-400 max-w-md">
          This section is temporarily disabled and will be fixed in the{" "}
          <span className="text-purple-400 font-medium">next release</span>.
          <br />
          Thanks for your patience.
        </p>
      </div>
    </div>
  );
};

export default GenrePage;


