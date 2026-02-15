"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, Compass, Layers, Bookmark, PlayCircle, 
  Clock, FolderHeart, Download, Settings, PlusIcon, Menu,
  Bell, User
} from 'lucide-react';

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  // Primary Navigation Mapping
  const primaryNav = [
    { icon: <Home size={20} />, label: 'Home', href: '/' },
    { icon: <Compass size={20} />, label: 'Explore', href: '/explore' },
    { icon: <Layers size={20} />, label: 'Genres', href: '/genre' },
    { icon: <Bookmark size={20} />, label: 'Favourites', href: '/favourite' },
  ];

  // Secondary Navigation Mapping
  const secondaryNav = [
    { icon: <PlayCircle size={20} />, label: 'Continue Watching', href: '/continue' },
    { icon: <Clock size={20} />, label: 'Recently Added', href: '/recent' },
    { icon: <FolderHeart size={20} />, label: 'My Collections', href: '/collection' },
    { icon: <Download size={20} />, label: 'Downloads', href: '/downloads' },
  ];

  // User Section Mapping
  const userNav = [
    { icon: <Settings size={20} />, label: 'Settings', href: '/settings' },
    { icon: <PlusIcon size={20} />, label: 'Add New', href: '/add-new' },
  ];

  // Helper to check if a route is active
  const isActive = (path: string) => pathname === path;

  return (
    <aside 
      className={`flex-shrink-0 flex flex-col h-screen ${isCollapsed ? 'w-20' : 'w-64'} 
      bg-[#1a1625]/80 backdrop-blur-xl border-r border-white/10 p-4 
      text-gray-400 transition-all duration-300 ease-in-out z-50`}
    >
      
      {/* Logo Section */}
      <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} mb-10 px-2`}>
        {!isCollapsed && (
          <Link href="/" className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
            <div className="bg-purple-500 p-1.5 rounded-lg shrink-0">
              <PlayCircle className="text-white fill-white" size={20} />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">MOCHA</span>
          </Link>
        )}
        <Menu 
          size={24} 
          className="cursor-pointer hover:text-white transition-colors shrink-0" 
          onClick={() => setIsCollapsed(!isCollapsed)}
        />
      </div>

      {/* Navigation Scroll Area */}
      <nav className="flex-1 space-y-6 overflow-y-auto overflow-x-hidden no-scrollbar">
        {/* Primary Group */}
        <ul className="space-y-2">
          {primaryNav.map((item) => (
            <li key={item.label}>
              <Link 
                href={item.href}
                className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all 
                hover:bg-white/5 hover:text-white group
                ${isActive(item.href) ? 'text-purple-400 bg-white/5 font-medium' : ''}`}
              >
                <div className={`shrink-0 transition-transform duration-200 ${isActive(item.href) ? 'scale-110' : 'group-hover:scale-110'}`}>
                  {item.icon}
                </div>
                {!isCollapsed && (
                  <span className="animate-in fade-in slide-in-from-left-2 duration-300">
                    {item.label}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>

        <div className="border-t border-white/5 my-4 mx-2" />

        {/* Secondary Group */}
        <ul className="space-y-2">
          {secondaryNav.map((item) => (
            <li key={item.label}>
              <Link 
                href={item.href}
                className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer hover:bg-white/5 hover:text-white transition-all group
                ${isActive(item.href) ? 'text-purple-400 bg-white/5 font-medium' : ''}`}
              >
                <div className={`shrink-0 transition-transform duration-200 ${isActive(item.href) ? 'scale-110' : 'group-hover:scale-110'}`}>
                  {item.icon}
                </div>
                {!isCollapsed && (
                  <span className="animate-in fade-in slide-in-from-left-2 duration-300">
                    {item.label}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom Section */}
      <div className="mt-auto pt-4 space-y-2 border-t border-white/5">
        {userNav.map((item) => (
          <Link 
            key={item.label}
            href={item.href}
            className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer hover:bg-white/5 hover:text-white transition-all group
            ${isActive(item.href) ? 'text-purple-400 bg-white/5 font-medium' : ''}`}
          >
            <div className={`shrink-0 transition-transform duration-200 ${item.label === 'Settings' ? 'group-hover:rotate-45' : 'group-hover:scale-110'}`}>
              {item.icon}
            </div>
            {!isCollapsed && <span className="animate-in fade-in slide-in-from-left-2 duration-300">{item.label}</span>}
          </Link>
        ))}
        

      </div>
    </aside>
  );
};

export default Sidebar;