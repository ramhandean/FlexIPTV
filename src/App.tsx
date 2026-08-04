import React, { useEffect, useState, useMemo } from 'react';
import { Header } from './components/Header';
import { Player } from './components/Player';
import { Sidebar } from './components/Sidebar';
import { PlaylistModal } from './components/PlaylistModal';
import { SettingsModal } from './components/SettingsModal';
import type { Playlist, PlayerSettings, Channel } from './types/iptv';
import { parseM3U, SAMPLE_M3U_PLAYLIST } from './utils/m3uParser';

const LOCAL_STORAGE_PLAYLISTS_KEY = 'flex_iptv_playlists_v1';
const LOCAL_STORAGE_SETTINGS_KEY = 'flex_iptv_settings_v1';

const DEFAULT_SETTINGS: PlayerSettings = {
  autoPlay: true,
  corsProxy: '/api/proxy?url=',
  proxyMode: 'auto',
  volume: 1,
  muted: false,
  selectedPlaylistId: null,
  selectedChannelId: null,
  favorites: [],
  aspectRatio: 'contain',
  channelViewMode: 'list',
};

const sanitizePlaylists = (pls: Playlist[]): Playlist[] => {
  return pls.map((pl) => {
    const seenIds = new Set<string>();
    const sanitizedChannels = pl.channels.map((c, index) => {
      let uniqueId = c.id || `ch_${index}_${Date.now()}`;
      if (seenIds.has(uniqueId) || uniqueId.length <= 16) {
        uniqueId = `ch_${index}_${(c.name || 'ch').toLowerCase().replace(/[^a-z0-9]/g, '')}_${Math.random().toString(36).substring(2, 6)}`;
      }
      seenIds.add(uniqueId);
      return { ...c, id: uniqueId };
    });
    return { ...pl, channels: sanitizedChannels };
  });
};

export const App: React.FC = () => {
  const [playlists, setPlaylists] = useState<Playlist[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_PLAYLISTS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return sanitizePlaylists(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to parse saved playlists:', e);
    }
    // Initial demo playlist
    const initialChannels = parseM3U(SAMPLE_M3U_PLAYLIST);
    const demoPlaylist: Playlist = {
      id: 'pl-demo-default',
      name: 'Demo Public Legal Streams',
      sourceType: 'text',
      channels: initialChannels,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    return sanitizePlaylists([demoPlaylist]);
  });

  const [settings, setSettings] = useState<PlayerSettings>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_SETTINGS_KEY);
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error('Failed to parse saved settings:', e);
    }
    return DEFAULT_SETTINGS;
  });

  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(() => {
    if (settings.selectedPlaylistId && playlists.some((p) => p.id === settings.selectedPlaylistId)) {
      return settings.selectedPlaylistId;
    }
    return playlists[0]?.id || null;
  });

  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(() => settings.selectedChannelId || null);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isFullChannelView, setIsFullChannelView] = useState<boolean>(false);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState<boolean>(false);

  // Sync playlists to localStorage
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_PLAYLISTS_KEY, JSON.stringify(playlists));
  }, [playlists]);

  // Sync settings & current play state to localStorage
  useEffect(() => {
    localStorage.setItem(
      LOCAL_STORAGE_SETTINGS_KEY,
      JSON.stringify({
        ...settings,
        selectedPlaylistId: activePlaylistId,
        selectedChannelId: selectedChannelId,
      })
    );
  }, [settings, activePlaylistId, selectedChannelId]);

  // Active playlist reference (supports ALL_COMBINED virtual playlist)
  const activePlaylist = useMemo(() => {
    if (activePlaylistId === 'ALL_COMBINED') {
      const combinedChannels: Channel[] = playlists.flatMap((p) => p.channels);
      return {
        id: 'ALL_COMBINED',
        name: 'Semua Playlist (Gabungan)',
        sourceType: 'text' as const,
        channels: combinedChannels,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    }
    return playlists.find((p) => p.id === activePlaylistId) || playlists[0] || null;
  }, [playlists, activePlaylistId]);

  // Channels array of active playlist
  const activeChannels = useMemo(() => {
    return activePlaylist ? activePlaylist.channels : [];
  }, [activePlaylist]);

  // Currently selected channel object
  const currentChannel = useMemo(() => {
    if (!selectedChannelId) {
      return activeChannels[0] || null;
    }
    const matchActive = activeChannels.find((c) => c.id === selectedChannelId);
    if (matchActive) return matchActive;

    const matchAll = playlists.flatMap((p) => p.channels).find((c) => c.id === selectedChannelId);
    if (matchAll) return matchAll;

    return activeChannels[0] || null;
  }, [activeChannels, selectedChannelId, playlists]);

  // Handlers
  const handleSelectChannel = (channel: Channel) => {
    setSelectedChannelId(channel.id);
    setSettings((prev) => ({
      ...prev,
      selectedChannelId: channel.id,
      selectedPlaylistId: activePlaylistId,
    }));
    if (isFullChannelView) {
      setIsFullChannelView(false);
    }
  };

  const handleToggleFavorite = (channelId: string) => {
    setSettings((prev) => {
      const isFav = prev.favorites.includes(channelId);
      const newFavs = isFav
        ? prev.favorites.filter((id) => id !== channelId)
        : [...prev.favorites, channelId];
      return { ...prev, favorites: newFavs };
    });
  };

  const handleAddPlaylist = (newPlaylist: Playlist) => {
    const sanitized = sanitizePlaylists([newPlaylist])[0];
    setPlaylists((prev) => [sanitized, ...prev]);
    setActivePlaylistId(sanitized.id);
    if (sanitized.channels.length > 0) {
      setSelectedChannelId(sanitized.channels[0].id);
    }
  };

  const handleDeletePlaylist = (playlistId: string) => {
    setPlaylists((prev) => {
      const filtered = prev.filter((p) => p.id !== playlistId);
      if (activePlaylistId === playlistId) {
        setActivePlaylistId(filtered[0]?.id || null);
        setSelectedChannelId(filtered[0]?.channels[0]?.id || null);
      }
      return filtered;
    });
  };

  const handleSelectPlaylist = (playlistId: string) => {
    setActivePlaylistId(playlistId);
    if (playlistId === 'ALL_COMBINED') {
      const allChs = playlists.flatMap((p) => p.channels);
      if (allChs.length > 0) setSelectedChannelId(allChs[0].id);
      return;
    }
    const target = playlists.find((p) => p.id === playlistId);
    if (target && target.channels.length > 0) {
      setSelectedChannelId(target.channels[0].id);
    }
  };

  const handleRefreshPlaylist = async (playlistId: string) => {
    const target = playlists.find((p) => p.id === playlistId);
    if (!target || !target.sourceUrl) return;

    try {
      const res = await fetch(target.sourceUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const content = await res.text();
      const updatedChannels = parseM3U(content);
      if (updatedChannels.length > 0) {
        setPlaylists((prev) =>
          prev.map((p) =>
            p.id === playlistId
              ? { ...p, channels: updatedChannels, updatedAt: Date.now() }
              : p
          )
        );
        alert(`Berhasil memperbarui playlist "${target.name}" (${updatedChannels.length} saluran)!`);
      }
    } catch (e: any) {
      alert(`Gagal memperbarui playlist dari URL: ${e?.message || e}`);
    }
  };

  const handleUpdateSettings = (newSettings: Partial<PlayerSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const handleResetAllData = () => {
    localStorage.removeItem(LOCAL_STORAGE_PLAYLISTS_KEY);
    localStorage.removeItem(LOCAL_STORAGE_SETTINGS_KEY);
    const initialChannels = parseM3U(SAMPLE_M3U_PLAYLIST);
    const demoPlaylist: Playlist = {
      id: 'pl-demo-default',
      name: 'Demo Public Legal Streams',
      sourceType: 'text',
      channels: initialChannels,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setPlaylists([demoPlaylist]);
    setActivePlaylistId(demoPlaylist.id);
    setSelectedChannelId(demoPlaylist.channels[0]?.id || null);
    setSettings(DEFAULT_SETTINGS);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* Top Header */}
      <Header
        activePlaylist={activePlaylist}
        totalChannels={activeChannels.length}
        onOpenPlaylistModal={() => setIsPlaylistModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        showOnlyFavorites={showOnlyFavorites}
        onToggleFavorites={() => setShowOnlyFavorites(!showOnlyFavorites)}
        favoritesCount={settings.favorites.length}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        isFullChannelView={isFullChannelView}
        onToggleFullChannelView={() => setIsFullChannelView(!isFullChannelView)}
      />

      {/* Main Container Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Full Channel List Grid View Mode */}
        {isFullChannelView ? (
          <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
            <Sidebar
              channels={activeChannels}
              selectedChannelId={currentChannel?.id || null}
              onSelectChannel={handleSelectChannel}
              favorites={settings.favorites}
              onToggleFavorite={handleToggleFavorite}
              isOpen={true}
              onCloseMobileSidebar={() => {}}
              showOnlyFavorites={showOnlyFavorites}
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              isFullView={true}
            />
          </div>
        ) : (
          /* Split View Mode (Sidebar + Video Player) */
          <>
            <Sidebar
              channels={activeChannels}
              selectedChannelId={currentChannel?.id || null}
              onSelectChannel={handleSelectChannel}
              favorites={settings.favorites}
              onToggleFavorite={handleToggleFavorite}
              isOpen={isSidebarOpen}
              onCloseMobileSidebar={() => setIsSidebarOpen(false)}
              showOnlyFavorites={showOnlyFavorites}
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              isFullView={false}
            />

            <main className="flex-1 bg-slate-950 flex flex-col justify-center items-center relative overflow-hidden">
              <Player
                channel={currentChannel}
                settings={settings}
                onUpdateSettings={handleUpdateSettings}
              />
            </main>
          </>
        )}
      </div>

      {/* Modals */}
      <PlaylistModal
        isOpen={isPlaylistModalOpen}
        onClose={() => setIsPlaylistModalOpen(false)}
        playlists={playlists}
        activePlaylistId={activePlaylistId}
        onSelectPlaylist={handleSelectPlaylist}
        onAddPlaylist={handleAddPlaylist}
        onDeletePlaylist={handleDeletePlaylist}
        onRefreshPlaylist={handleRefreshPlaylist}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onResetAllData={handleResetAllData}
      />
    </div>
  );
};

export default App;
