import React, { useMemo, useState } from 'react';
import { Search, Heart, Tv, ChevronRight, X, Play, Filter, LayoutGrid, List, AlignJustify, Radio } from 'lucide-react';
import type { Channel, PlayerSettings } from '../types/iptv';

interface SidebarProps {
  channels: Channel[];
  selectedChannelId: string | null;
  onSelectChannel: (channel: Channel) => void;
  favorites: string[];
  onToggleFavorite: (channelId: string) => void;
  isOpen: boolean;
  onCloseMobileSidebar: () => void;
  showOnlyFavorites: boolean;
  settings: PlayerSettings;
  onUpdateSettings: (newSettings: Partial<PlayerSettings>) => void;
  isFullView?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  channels,
  selectedChannelId,
  onSelectChannel,
  favorites,
  onToggleFavorite,
  isOpen,
  onCloseMobileSidebar,
  showOnlyFavorites,
  settings,
  onUpdateSettings,
  isFullView = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');

  // Extract unique channel groups
  const groups = useMemo(() => {
    const groupSet = new Set<string>();
    channels.forEach((c) => {
      if (c.group) groupSet.add(c.group);
    });
    return Array.from(groupSet).sort();
  }, [channels]);

  // Optimized Search & Filter Logic (Smart Multi-term matching)
  const filteredChannels = useMemo(() => {
    const searchTerms = searchQuery
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter((term) => term.length > 0);

    return channels.filter((channel) => {
      // 1. Favorites filter
      if (showOnlyFavorites && !favorites.includes(channel.id)) {
        return false;
      }

      // 2. Group category filter
      if (selectedGroup !== 'ALL' && channel.group !== selectedGroup) {
        return false;
      }

      // 3. Smart Multi-term Search Match
      if (searchTerms.length > 0) {
        const channelName = channel.name.toLowerCase();
        const groupName = channel.group.toLowerCase();
        const tvgName = (channel.tvgName || '').toLowerCase();
        const tvgId = (channel.tvgId || '').toLowerCase();
        const urlStr = channel.url.toLowerCase();

        // Every search term must match at least one field (AND logic across search tokens)
        const allTermsMatch = searchTerms.every(
          (term) =>
            channelName.includes(term) ||
            groupName.includes(term) ||
            tvgName.includes(term) ||
            tvgId.includes(term) ||
            urlStr.includes(term)
        );

        if (!allTermsMatch) return false;
      }

      return true;
    });
  }, [channels, searchQuery, selectedGroup, showOnlyFavorites, favorites]);

  const viewMode = settings.channelViewMode || 'list';

  // Dynamic grid class based on whether it is full page view or narrow sidebar view
  const gridContainerClass = isFullView
    ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3 sm:gap-4'
    : 'grid grid-cols-2 gap-2.5';

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && !isFullView && (
        <div
          onClick={onCloseMobileSidebar}
          className="lg:hidden fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Sidebar / Full View Container */}
      <aside
        className={`${
          isFullView
            ? 'w-full h-full bg-slate-950 flex flex-col'
            : `fixed lg:static top-16 bottom-0 left-0 z-40 w-80 sm:w-88 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out ${
                isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
              }`
        }`}
      >
        {/* Search & Layout Header */}
        <div className="p-3.5 border-b border-slate-800/80 flex flex-col gap-2.5 bg-slate-900/90 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                {isFullView ? 'Katalog Semua Saluran' : 'Daftar Saluran'}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-mono font-bold border border-indigo-500/20">
                {filteredChannels.length}
              </span>
            </div>

            {/* Layout View Mode Switcher */}
            <div className="flex items-center bg-slate-950/90 p-1 rounded-xl border border-slate-800 text-xs shadow-inner">
              <button
                onClick={() => onUpdateSettings({ channelViewMode: 'list' })}
                className={`p-1.5 rounded-lg transition ${
                  viewMode === 'list' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
                title="Tampilan List Standard"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onUpdateSettings({ channelViewMode: 'grid' })}
                className={`p-1.5 rounded-lg transition ${
                  viewMode === 'grid' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
                title="Tampilan Grid Kartu"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onUpdateSettings({ channelViewMode: 'compact' })}
                className={`p-1.5 rounded-lg transition ${
                  viewMode === 'compact' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
                title="Tampilan Compact Ringkas"
              >
                <AlignJustify className="w-3.5 h-3.5" />
              </button>

              {!isFullView && (
                <button
                  onClick={onCloseMobileSidebar}
                  className="lg:hidden ml-2 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari saluran, kategori, atau kata kunci..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/90 text-slate-100 placeholder-slate-500 text-xs pl-9 pr-8 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 transition shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                title="Bersihkan Pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Group Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            <button
              onClick={() => setSelectedGroup('ALL')}
              className={`px-3 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition ${
                selectedGroup === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-700/40'
              }`}
            >
              Semua ({channels.length})
            </button>
            {groups.map((group) => {
              const groupCount = channels.filter((c) => c.group === group).length;
              return (
                <button
                  key={group}
                  onClick={() => setSelectedGroup(group)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition ${
                    selectedGroup === group
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                      : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-700/40'
                  }`}
                >
                  {group} ({groupCount})
                </button>
              );
            })}
          </div>
        </div>

        {/* Channel Counter & Status Filter Bar */}
        <div className="px-3.5 py-2 bg-slate-950/60 border-b border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3 h-3 text-indigo-400" />
            <span>Hasil: <strong className="text-slate-200 font-semibold">{filteredChannels.length} saluran</strong></span>
          </div>
          {showOnlyFavorites && (
            <span className="text-amber-400 font-semibold flex items-center gap-1">
              <Heart className="w-3 h-3 fill-amber-400 text-amber-400" /> Mode Favorit
            </span>
          )}
        </div>

        {/* Channel Items List / Grid Container */}
        <div className="flex-1 overflow-y-auto p-3">
          {filteredChannels.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs flex flex-col items-center justify-center min-h-[220px]">
              <Tv className="w-10 h-10 mb-3 opacity-40 text-indigo-400" />
              <p className="font-semibold text-slate-300 mb-1">Saluran Tidak Ditemukan</p>
              <p className="text-[11px] max-w-xs text-slate-500">
                Tidak ada siaran yang cocok dengan pencarian <strong>"{searchQuery}"</strong> atau filter grup saat ini.
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-3 px-3 py-1.5 bg-indigo-600/20 text-indigo-300 rounded-lg text-xs hover:bg-indigo-600/30 transition border border-indigo-500/30"
                >
                  Bersihkan Kata Kunci
                </button>
              )}
            </div>
          ) : (
            /* VIEW MODE RENDERING */
            <div
              className={`${
                viewMode === 'grid'
                  ? gridContainerClass
                  : viewMode === 'compact'
                  ? 'space-y-1'
                  : 'space-y-1.5'
              }`}
            >
              {filteredChannels.map((channel) => {
                const isSelected = channel.id === selectedChannelId;
                const isFav = favorites.includes(channel.id);

                /* MODE 1: GRID CARDS (Proportional & Non-squished) */
                if (viewMode === 'grid') {
                  return (
                    <div
                      key={channel.id}
                      onClick={() => {
                        onSelectChannel(channel);
                        if (!isFullView) onCloseMobileSidebar();
                      }}
                      className={`group relative flex flex-col p-2.5 rounded-2xl cursor-pointer transition-all duration-200 border text-left overflow-hidden ${
                        isSelected
                          ? 'bg-indigo-950/80 border-indigo-500 text-indigo-200 shadow-xl shadow-indigo-950/60 ring-1 ring-indigo-500/50'
                          : 'bg-slate-900/80 border-slate-800/80 hover:bg-slate-800 hover:border-slate-700 text-slate-300 hover:shadow-lg'
                      }`}
                    >
                      {/* Favorite Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(channel.id);
                        }}
                        className={`absolute top-2 right-2 z-10 p-1.5 rounded-lg transition ${
                          isFav
                            ? 'text-amber-400 bg-slate-950/80 border border-amber-400/30 shadow-xs'
                            : 'text-slate-400 bg-slate-950/60 opacity-0 group-hover:opacity-100 hover:text-white hover:bg-slate-900 border border-slate-800'
                        }`}
                        title={isFav ? 'Hapus dari Favorit' : 'Tambah ke Favorit'}
                      >
                        <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-amber-400 text-amber-400' : ''}`} />
                      </button>

                      {/* Logo Frame Box with 16:9 Aspect Ratio to Prevent Distortion */}
                      <div className="w-full aspect-video rounded-xl bg-slate-950/90 border border-slate-800/80 flex items-center justify-center p-2 mb-2 overflow-hidden relative group-hover:border-slate-700 transition">
                        {channel.logo ? (
                          <img
                            src={channel.logo}
                            alt={channel.name}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            className="max-w-full max-h-full object-contain filter drop-shadow"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              const fallback = e.currentTarget.parentElement?.querySelector('.logo-fallback');
                              if (fallback) fallback.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div
                          className={`logo-fallback text-xs font-bold text-slate-300 uppercase tracking-widest ${
                            channel.logo ? 'hidden' : ''
                          }`}
                        >
                          {channel.name.substring(0, 3)}
                        </div>

                        {isSelected && (
                          <div className="absolute inset-0 bg-indigo-600/40 backdrop-blur-xs flex items-center justify-center">
                            <span className="p-2 rounded-full bg-indigo-600 text-white shadow-lg">
                              <Play className="w-4 h-4 fill-white" />
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Channel Info */}
                      <div className="min-w-0 flex-1 flex flex-col justify-between">
                        <h4 className="text-xs font-bold truncate leading-tight text-slate-100 group-hover:text-indigo-300 mb-1">
                          {channel.name}
                        </h4>
                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span className="truncate px-1.5 py-0.5 rounded bg-slate-950/60 border border-slate-800/60 max-w-[80%]">
                            {channel.group}
                          </span>
                          {isSelected && (
                            <span className="text-indigo-400 font-bold flex items-center gap-0.5">
                              <Radio className="w-2.5 h-2.5 animate-pulse" /> LIVE
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }

                /* MODE 2: COMPACT LIST */
                if (viewMode === 'compact') {
                  return (
                    <div
                      key={channel.id}
                      onClick={() => {
                        onSelectChannel(channel);
                        if (!isFullView) onCloseMobileSidebar();
                      }}
                      className={`group flex items-center justify-between px-3 py-1.5 rounded-lg cursor-pointer transition text-xs border ${
                        isSelected
                          ? 'bg-indigo-950/80 border-indigo-500/60 text-indigo-200 font-semibold shadow-xs'
                          : 'bg-slate-900/40 border-slate-800/40 hover:bg-slate-800/60 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? 'bg-indigo-400 animate-pulse' : 'bg-slate-700'}`} />
                        <span className="truncate">{channel.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">{channel.group}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite(channel.id);
                          }}
                          className={`p-1 rounded transition ${isFav ? 'text-amber-400' : 'text-slate-600 opacity-40 group-hover:opacity-100 hover:text-slate-300'}`}
                        >
                          <Heart className={`w-3 h-3 ${isFav ? 'fill-amber-400 text-amber-400' : ''}`} />
                        </button>
                      </div>
                    </div>
                  );
                }

                /* MODE 3: STANDARD DETAILED LIST */
                return (
                  <div
                    key={channel.id}
                    onClick={() => {
                      onSelectChannel(channel);
                      if (!isFullView) onCloseMobileSidebar();
                    }}
                    className={`group relative flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition duration-150 border ${
                      isSelected
                        ? 'bg-indigo-950/60 border-indigo-500/50 text-indigo-200 shadow-md shadow-indigo-950/40'
                        : 'bg-slate-900/60 border-slate-800/40 hover:bg-slate-800/60 hover:border-slate-700/50 text-slate-300'
                    }`}
                  >
                    {/* Left: Logo & Channel Name */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="relative shrink-0 w-9 h-9 rounded-lg bg-slate-950/80 p-1 border border-slate-800/80 flex items-center justify-center overflow-hidden">
                        {channel.logo ? (
                          <img
                            src={channel.logo}
                            alt={channel.name}
                            className="max-w-full max-h-full object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              const fallback = e.currentTarget.parentElement?.querySelector('.logo-fallback');
                              if (fallback) fallback.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div
                          className={`logo-fallback text-[10px] font-bold text-slate-300 uppercase shrink-0 ${
                            channel.logo ? 'hidden' : ''
                          }`}
                        >
                          {channel.name.substring(0, 2)}
                        </div>
                        {isSelected && (
                          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-indigo-500 border-2 border-slate-900 rounded-full flex items-center justify-center">
                            <Play className="w-2 h-2 fill-white text-white" />
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h4
                          className={`text-xs font-semibold truncate leading-snug ${
                            isSelected ? 'text-indigo-200' : 'text-slate-200 group-hover:text-white'
                          }`}
                        >
                          {channel.name}
                        </h4>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">
                          {channel.group}
                        </p>
                      </div>
                    </div>

                    {/* Right: Favorite Button & Arrow */}
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(channel.id);
                        }}
                        className={`p-1.5 rounded-lg transition ${
                          isFav
                            ? 'text-amber-400 hover:bg-amber-400/10'
                            : 'text-slate-600 opacity-40 group-hover:opacity-100 hover:text-slate-300 hover:bg-slate-800'
                        }`}
                        title={isFav ? 'Hapus dari Favorit' : 'Tambah ke Favorit'}
                      >
                        <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-amber-400 text-amber-400' : ''}`} />
                      </button>
                      <ChevronRight className={`w-3.5 h-3.5 text-slate-600 transition-transform ${isSelected ? 'text-indigo-400 translate-x-0.5' : ''}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
