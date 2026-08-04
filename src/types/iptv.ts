export interface Channel {
  id: string;
  name: string;
  logo?: string;
  group: string;
  url: string;
  tvgId?: string;
  tvgName?: string;
  userAgent?: string;
  referer?: string;
  drmType?: string;
  drmKey?: string;
  rawAttributes?: Record<string, string>;
}

export interface Playlist {
  id: string;
  name: string;
  sourceType: 'url' | 'file' | 'text';
  sourceUrl?: string;
  channels: Channel[];
  createdAt: number;
  updatedAt: number;
  corsProxy?: string;
}

export interface PlayerSettings {
  autoPlay: boolean;
  corsProxy: string;
  proxyMode: 'auto' | 'direct' | 'proxy';
  volume: number;
  muted: boolean;
  selectedPlaylistId: string | null;
  selectedChannelId: string | null;
  favorites: string[]; // channel URLs or IDs
  aspectRatio: 'contain' | 'cover' | 'fill';
  channelViewMode: 'list' | 'grid' | 'compact';
}

export interface ChannelGroup {
  name: string;
  count: number;
}
