"use client";
import React, { useState, useEffect } from 'react';
import { Play, Trash2, Clock, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

const ContinueWatchingPage = () => {
  const [list, setList] = useState<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Mocking the unfinished episodes data
    const mockData = [
      { 
        id: 1,
        title: "Midnight Mischief Squad", 
        episode: "S1, Ep-3", 
        timeLeft: "30min 55sec", 
        progress: "65%", 
        thumb: "https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?q=80&w=800" 
      },
      { 
        id: 2,
        title: "Legends of the Emerald Mist", 
        episode: "S2, Ep-1", 
        timeLeft: "12min 20sec", 
        progress: "40%", 
        thumb: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=800" 
      },
      { 
        id: 3,
        title: "Rise of the Last Guardian", 
        episode: "S1, Ep-8", 
        timeLeft: "45min 10sec", 
        progress: "90%", 
        thumb: "https://images.unsplash.com/photo-1594908122396-2550adbc4467?q=80&w=800" 
      },
      { 
        id: 4,
        title: "The Silent Galaxy", 
        episode: "S3, Ep-4", 
        timeLeft: "05min 12sec", 
        progress: "15%", 
        thumb: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=800" 
      }
    ];
    setList(mockData);
    setIsLoaded(true);
  }, []);

  const handleRemove = (id: number) => {
    setList(prev => prev.filter(item => item.id !== id));
  };

  if (!isLoaded) return null;

  return (
    <div className="flex-1 space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors w-fit group">
           <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
           <span className="text-sm">Back to Home</span>
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white tracking-tight">Continue Watching</h1>
          <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-gray-400">
            {list.length} Episodes remaining
          </span>
        </div>
      </div>

      {/* Grid Layout for unfinished episodes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {list.map((item) => (
          <div key={item.id} className="group flex flex-col space-y-3 cursor-pointer">
            
            {/* 16:9 Banner Image Container */}
            <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 bg-slate-900 shadow-xl">
              <img 
                src={item.thumb} 
                alt={item.title} 
                className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105 opacity-80 group-hover:opacity-100" 
              />
              
              {/* Play Button Overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="bg-purple-600 p-4 rounded-full shadow-2xl shadow-purple-500/40">
                  <Play size={24} className="text-white fill-white" />
                </div>
              </div>

              {/* Top Actions (Remove) */}
              <button 
                onClick={(e) => { e.stopPropagation(); handleRemove(item.id); }}
                className="absolute top-3 right-3 p-2 bg-black/40 backdrop-blur-md border border-white/10 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:border-red-500"
              >
                <Trash2 size={16} />
              </button>

              {/* Progress Bar (Glassy style) */}
              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/60 backdrop-blur-md">
                <div 
                  className="h-full bg-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.8)] transition-all duration-700" 
                  style={{ width: item.progress }} 
                />
              </div>
            </div>

            {/* Info Section */}
            <div className="px-1 flex flex-col gap-1">
              <div className="flex justify-between items-start">
                <h3 className="text-white font-semibold text-base truncate group-hover:text-purple-400 transition-colors">
                  {item.title}
                </h3>
                <span className="text-[10px] text-purple-400 font-bold bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 whitespace-nowrap">
                    {item.progress} DONE
                </span>
              </div>
              
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span className="font-medium text-gray-400">{item.episode}</span>
                <div className="flex items-center gap-1.5">
                    <Clock size={12} />
                    <span>{item.timeLeft} left</span>
                </div>
              </div>
            </div>

          </div>
        ))}
      </div>

      {/* Empty State */}
      {list.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500 space-y-4 border border-dashed border-white/10 rounded-3xl">
          <p>You've caught up on all your shows!</p>
          <Link href="/explore" className="text-purple-400 hover:underline">Explore new episodes</Link>
        </div>
      )}
    </div>
  );
};

export default ContinueWatchingPage;