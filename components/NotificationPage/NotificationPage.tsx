"use client";
import React, { useState, useEffect } from 'react';
import { 
  Bell, Check, Trash2, MailOpen, 
  Circle, Clock, Film, ChevronRight 
} from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  isRead: boolean;
  type: 'release' | 'system' | 'update';
  image?: string;
}

const NotificationPage = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Mock Data: New episode releases
    const mockData: Notification[] = [
      {
        id: '1',
        title: 'New Episode Released!',
        message: 'Midnight Mischief Squad: S1 Ep-4 is now available to watch.',
        time: '2 mins ago',
        isRead: false,
        type: 'release',
        image: 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?w=100'
      },
      {
        id: '2',
        title: 'Trending for you',
        message: 'Based on your interest in "The Silent Galaxy", we think you\'ll love "Starfall".',
        time: '1 hour ago',
        isRead: false,
        type: 'update'
      },
      {
        id: '3',
        title: 'System Update',
        message: 'Plugin "Default Scraper" was updated to version 2.1.0.',
        time: 'Yesterday',
        isRead: true,
        type: 'system'
      }
    ];
    setNotifications(mockData);
    setIsLoaded(true);
  }, []);

  // --- CRUD Operations ---
  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  if (!isLoaded) return null;

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="flex-1 max-w-4xl mx-auto space-y-8 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Bell className="text-purple-500" size={28} /> Notifications
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            You have {unreadCount} unread messages
          </p>
        </div>
        {unreadCount > 0 && (
          <button 
            onClick={markAllAsRead}
            className="flex items-center gap-2 text-xs font-medium text-purple-400 hover:text-purple-300 transition-colors bg-purple-500/10 px-4 py-2 rounded-xl border border-purple-500/20"
          >
            <MailOpen size={14} /> Mark all as read
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="space-y-4">
        {notifications.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-gray-500 border border-dashed border-white/10 rounded-3xl">
            <Bell size={40} className="opacity-20 mb-3" />
            <p>All caught up! No new notifications.</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div 
              key={n.id}
              className={`group relative flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${
                n.isRead 
                ? 'bg-white/5 border-white/5 opacity-70' 
                : 'bg-white/[0.08] border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.05)]'
              }`}
            >
              <div className="flex items-center gap-4 flex-1">
                {/* Status Indicator */}
                <div className="shrink-0">
                  {!n.isRead ? (
                    <div className="w-2.5 h-2.5 bg-purple-500 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.8)]" />
                  ) : (
                    <Circle size={10} className="text-gray-700" />
                  )}
                </div>

                {/* Content */}
                {n.image && (
                  <img src={n.image} alt="thumb" className="w-12 h-12 rounded-lg object-cover border border-white/10" />
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-sm font-semibold truncate ${n.isRead ? 'text-gray-400' : 'text-white'}`}>
                      {n.title}
                    </h3>
                    <span className="text-[10px] text-gray-600 flex items-center gap-1">
                      <Clock size={10} /> {n.time}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-1">{n.message}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 ml-4">
                {!n.isRead && (
                  <button 
                    onClick={() => markAsRead(n.id)}
                    className="p-2 text-gray-500 hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-all"
                    title="Mark as read"
                  >
                    <Check size={18} />
                  </button>
                )}
                <button 
                  onClick={() => deleteNotification(n.id)}
                  className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                  title="Delete"
                >
                  <Trash2 size={18} />
                </button>
                <button className="p-2 text-gray-500 hover:text-white transition-all">
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationPage;