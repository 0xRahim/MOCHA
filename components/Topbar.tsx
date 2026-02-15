"use client";
import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, Bell, User } from 'lucide-react';

export default function Topbar() {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    // Get the current search query from URL if it exists
    const [searchValue, setSearchValue] = useState(searchParams.get('q') || '');

    // Handle Search Submission
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchValue.trim()) {
            // Push to /search?q=value
            router.push(`/search?q=${encodeURIComponent(searchValue.trim())}`);
        }
    };

    // Update local state if URL parameter changes externally
    useEffect(() => {
        setSearchValue(searchParams.get('q') || '');
    }, [searchParams]);

    return (
        <div id="topbar" className="h-20 w-full flex items-center justify-between px-8 bg-transparent" >
            
            {/* Search Bar with Submit Logic */}
            <form 
                onSubmit={handleSearch}
                id="search" 
                className="flex items-center bg-white/5 border border-white/10 rounded-xl px-4 py-2 w-96 focus-within:border-purple-500/50 transition-all shadow-lg shadow-black/20"
            >
                <Search size={18} className="text-gray-400 mr-2" />
                <input 
                    type="text" 
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    placeholder="Search for films, directors, or actors..." 
                    className="bg-transparent outline-none text-sm text-white w-full"
                />
                {searchValue && (
                    <button 
                        type="button" 
                        onClick={() => setSearchValue('')}
                        className="text-gray-500 hover:text-white text-xs"
                    >
                        Clear
                    </button>
                )}
            </form>

            {/* Profile & Notifications */}
            <div id="p-widget" className="flex items-center gap-6">
                
                {/* Notification Link */}
                <Link 
                    href="/notifications" 
                    id="notification" 
                    className="relative cursor-pointer text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg"
                >
                    <Bell size={22} />
                    <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full border-2 border-[#100e17]"></span>
                </Link>

                {/* Profile Link */}
                <Link href="/profile" id="profile" className="flex items-center gap-3 cursor-pointer group">
                    <div className="flex flex-col items-end mr-1 hidden sm:flex">
                        <span className="text-xs font-bold text-white leading-none">Alex Rivera</span>
                        <span className="text-[10px] text-purple-400">Pro Member</span>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-purple-500 to-pink-500 overflow-hidden border border-white/20 group-hover:border-purple-500/50 transition-all group-hover:scale-105">
                         {/* Replace with actual image if available */}
                         <img 
                            src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100" 
                            alt="Profile" 
                            className="w-full h-full object-cover"
                         />
                    </div>
                </Link>
            </div>

        </div>
    );
}