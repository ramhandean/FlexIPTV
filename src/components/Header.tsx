import React from 'react';
import { Tv, Plus, Settings, Menu, X, Radio, ListVideo, Heart, LayoutGrid, List, AlignJustify, Maximize2, Minimize2 } from 'lucide-react';
import type { Playlist, PlayerSettings } from '../types/iptv';

interface HeaderProps {
  activePlaylist: Playlist | null;
  totalChannels: number;
  onOpenPlaylistModal: () => void;
  onOpenSettingsModal: () => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  showOnlyFavorites: boolean;
  onToggleFavorites: () => void;
  favoritesCount: number;
  settings: PlayerSettings;
  onUpdateSettings: (newSettings: Partial<PlayerSettings>) => void;
  isFullChannelView: boolean;
  onToggleFullChannelView: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activePlaylist,
  totalChannels,
  onOpenPlaylistModal,
  onOpenSettingsModal,
  isSidebarOpen,
  onToggleSidebar,
  showOnlyFavorites,
  onToggleFavorites,
  favoritesCount,
  settings,
  onUpdateSettings,
  isFullChannelView,
  onToggleFullChannelView,
}) => {
  return (
    <header className="sticky top-0 z-30 h-16 bg-slate-900/90 border-b border-slate-800/80 backdrop-blur-md px-3 sm:px-4 lg:px-6 flex items-center justify-between shadow-lg transition-all">
      {/* Left section: Mobile Toggle & Brand */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition focus:outline-none"
          title="Toggle Saluran"
        >
          {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-0.5 shadow-md shadow-indigo-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Tv className="w-5 h-5 text-indigo-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-100 tracking-tight leading-none">
                FlexIPTV
              </h1>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Radio className="w-3 h-3 mr-1 animate-pulse" /> LIVE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Modern Web Streaming Player
            </p>
          </div>
        </div>
      </div>

      {/* Middle section: Active Playlist Info */}
      <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 text-xs">
        <ListVideo className="w-4 h-4 text-indigo-400" />
        <span className="text-slate-300 font-medium max-w-[180px] truncate">
          {activePlaylist ? activePlaylist.name : 'Belum ada Playlist'}
        </span>
        <span className="text-slate-500">|</span>
        <span className="text-slate-400 font-mono">
          {totalChannels} Saluran
        </span>
      </div>

      {/* Right section: Controls & Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Full Grid / List View Toggle */}
        <button
          onClick={onToggleFullChannelView}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition border ${
            isFullChannelView
              ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
              : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 border-slate-700/50'
          }`}
          title={isFullChannelView ? 'Kembali ke Pemutar Video' : 'Lihat Semua Saluran (Full List Grid)'}
        >
          {isFullChannelView ? (
            <>
              <Minimize2 className="w-4 h-4" />
              <span className="hidden sm:inline">Pemutar</span>
            </>
          ) : (
            <>
              <Maximize2 className="w-4 h-4" />
              <span className="hidden sm:inline">Full List</span>
            </>
          )}
        </button>

        {/* View Mode Options (List / Grid / Compact) */}
        <div className="hidden sm:flex items-center bg-slate-950/80 p-0.5 rounded-lg border border-slate-800">
          <button
            onClick={() => onUpdateSettings({ channelViewMode: 'list' })}
            className={`p-1.5 rounded-md transition ${
              settings.channelViewMode === 'list'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Tampilan List Standard"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onUpdateSettings({ channelViewMode: 'grid' })}
            className={`p-1.5 rounded-md transition ${
              settings.channelViewMode === 'grid'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Tampilan Grid Kartu"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onUpdateSettings({ channelViewMode: 'compact' })}
            className={`p-1.5 rounded-md transition ${
              settings.channelViewMode === 'compact'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Tampilan List Ringkas (Compact)"
          >
            <AlignJustify className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Favorites Filter */}
        <button
          onClick={onToggleFavorites}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
            showOnlyFavorites
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 border border-slate-700/50'
          }`}
          title="Filter Favorit"
        >
          <Heart className={`w-4 h-4 ${showOnlyFavorites ? 'fill-amber-400 text-amber-400' : 'text-slate-400'}`} />
          <span className="hidden md:inline">Favorit</span>
          {favoritesCount > 0 && (
            <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-amber-400 text-slate-950">
              {favoritesCount}
            </span>
          )}
        </button>

        {/* Add Playlist */}
        <button
          onClick={onOpenPlaylistModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden lg:inline">Playlist</span>
        </button>

        {/* Settings */}
        <button
          onClick={onOpenSettingsModal}
          className="p-2 text-slate-400 hover:text-white rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 transition"
          title="Pengaturan"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
