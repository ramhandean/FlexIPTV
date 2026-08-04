import type { Channel } from '../types/iptv';

/**
 * Parses an M3U or M3U8 file content string into an array of Channel objects.
 * Supports #EXTINF, #EXTGRP, #EXTVLCOPT (http-user-agent, http-referrer),
 * and pipe parameters (stream_url|user-agent=...|referer=...).
 */
export function parseM3U(content: string): Channel[] {
  const lines = content.split(/\r?\n/);
  const channels: Channel[] = [];

  let currentChannel: Partial<Channel> = {};
  let currentGroupFromExtgrp = '';
  let currentVlcUserAgent = '';
  let currentVlcReferer = '';
  let currentDrmType = '';
  let currentDrmKey = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line) continue;

    // Header line
    if (line.startsWith('#EXTM3U')) {
      continue;
    }

    // KODIPROP line (#KODIPROP:inputstream.adaptive.license_type=... or #KODIPROP:inputstream.adaptive.license_key=...)
    if (line.startsWith('#KODIPROP:')) {
      const prop = line.substring(10).trim();
      if (prop.startsWith('inputstream.adaptive.license_type=')) {
        currentDrmType = prop.substring('inputstream.adaptive.license_type='.length).trim();
      } else if (prop.startsWith('inputstream.adaptive.license_key=')) {
        currentDrmKey = prop.substring('inputstream.adaptive.license_key='.length).trim();
      } else if (prop.startsWith('inputstream.adaptive.stream_headers=')) {
        const headersStr = prop.substring('inputstream.adaptive.stream_headers='.length).trim();
        const parts = headersStr.split('|');
        for (const p of parts) {
          const lower = p.toLowerCase();
          if (lower.startsWith('referer=')) {
            currentVlcReferer = p.substring(8).trim();
          } else if (lower.startsWith('user-agent=')) {
            currentVlcUserAgent = p.substring(11).trim();
          }
        }
      }
      continue;
    }

    // EXTHTTP line (#EXTHTTP:{"Referer":"...","User-Agent":"..."})
    if (line.startsWith('#EXTHTTP:')) {
      try {
        const jsonStr = line.substring(9).trim();
        const parsed = JSON.parse(jsonStr);
        if (parsed.Referer || parsed.referer) {
          currentVlcReferer = parsed.Referer || parsed.referer;
        }
        if (parsed['User-Agent'] || parsed['user-agent']) {
          currentVlcUserAgent = parsed['User-Agent'] || parsed['user-agent'];
        }
      } catch (e) {}
      continue;
    }

    // EXTVLCOPT line (#EXTVLCOPT:http-user-agent=... or #EXTVLCOPT:http-referrer=... or drm-license-key=...)
    if (line.startsWith('#EXTVLCOPT:')) {
      const option = line.substring(11).trim();
      if (option.startsWith('http-user-agent=')) {
        currentVlcUserAgent = option.substring('http-user-agent='.length).trim();
      } else if (option.startsWith('http-referrer=') || option.startsWith('http-referer=')) {
        currentVlcReferer = option.substring(option.indexOf('=') + 1).trim();
      } else if (option.startsWith('drm-license-type=')) {
        currentDrmType = option.substring('drm-license-type='.length).trim();
      } else if (option.startsWith('drm-license-key=')) {
        currentDrmKey = option.substring('drm-license-key='.length).trim();
      }
      continue;
    }

    // Group line (#EXTGRP)
    if (line.startsWith('#EXTGRP:')) {
      currentGroupFromExtgrp = line.substring(8).trim();
      if (currentChannel) {
        currentChannel.group = currentGroupFromExtgrp;
      }
      continue;
    }

    // Channel metadata line (#EXTINF)
    if (line.startsWith('#EXTINF:')) {
      const extinfContent = line.substring(8);
      const commaIndex = extinfContent.lastIndexOf(',');

      let infoAttributes = extinfContent;
      let channelName = 'Unnamed Channel';

      if (commaIndex !== -1) {
        infoAttributes = extinfContent.substring(0, commaIndex);
        channelName = extinfContent.substring(commaIndex + 1).trim() || 'Unnamed Channel';
      }

      // Parse key-value attributes like tvg-logo="...", group-title="..."
      const rawAttributes: Record<string, string> = {};
      const attrRegex = /([a-zA-Z0-9_-]+)="([^"]*)"/g;
      let match: RegExpExecArray | null;

      while ((match = attrRegex.exec(infoAttributes)) !== null) {
        rawAttributes[match[1]] = match[2];
      }

      const group = rawAttributes['group-title'] || currentGroupFromExtgrp || 'General';
      const logo = rawAttributes['tvg-logo'] || rawAttributes['logo'] || '';
      const tvgId = rawAttributes['tvg-id'] || '';
      const tvgName = rawAttributes['tvg-name'] || '';
      const drmType = rawAttributes['drm-type'] || rawAttributes['license_type'] || currentDrmType || '';
      const drmKey = rawAttributes['drm-key'] || rawAttributes['license_key'] || rawAttributes['clearkey'] || currentDrmKey || '';

      currentChannel = {
        name: channelName,
        group: group.trim() || 'General',
        logo: logo.trim(),
        tvgId: tvgId.trim(),
        tvgName: tvgName.trim(),
        userAgent: currentVlcUserAgent || undefined,
        referer: currentVlcReferer || undefined,
        drmType: drmType || undefined,
        drmKey: drmKey || undefined,
        rawAttributes,
      };

      continue;
    }

    // Ignore other comment / directive lines
    if (line.startsWith('#')) {
      continue;
    }

    // Stream URL line
    if (
      line.startsWith('http://') ||
      line.startsWith('https://') ||
      line.startsWith('rtmp://') ||
      line.startsWith('rtsp://') ||
      line.includes('://') ||
      line.length > 5
    ) {
      // Check for pipe parameters: url|user-agent=...|referer=...|clearkey=...
      let streamUrl = line;
      let pipeUserAgent = '';
      let pipeReferer = '';
      let pipeDrmKey = '';
      let pipeDrmType = '';

      if (line.includes('|')) {
        const parts = line.split('|');
        streamUrl = parts[0].trim();

        for (let p = 1; p < parts.length; p++) {
          const param = parts[p].trim();
          if (param.toLowerCase().startsWith('user-agent=')) {
            pipeUserAgent = param.substring('user-agent='.length).trim();
          } else if (param.toLowerCase().startsWith('referer=')) {
            pipeReferer = param.substring('referer='.length).trim();
          } else if (param.toLowerCase().startsWith('clearkey=')) {
            pipeDrmKey = param.substring('clearkey='.length).trim();
            pipeDrmType = 'clearkey';
          } else if (param.toLowerCase().startsWith('license_key=')) {
            pipeDrmKey = param.substring('license_key='.length).trim();
          }
        }
      }

      const finalUserAgent = pipeUserAgent || currentChannel.userAgent || currentVlcUserAgent || undefined;
      const finalReferer = pipeReferer || currentChannel.referer || currentVlcReferer || undefined;
      const finalDrmKey = pipeDrmKey || currentChannel.drmKey || currentDrmKey || undefined;
      const finalDrmType = pipeDrmType || currentChannel.drmType || currentDrmType || undefined;

      const channelId = `ch_${channels.length + 1}_${(currentChannel.name || 'ch').toLowerCase().replace(/[^a-z0-9]/g, '')}_${Math.random().toString(36).substring(2, 7)}`;

      const channelObj: Channel = {
        id: channelId,
        name: currentChannel.name || 'Unnamed Channel',
        group: currentChannel.group || currentGroupFromExtgrp || 'General',
        logo: currentChannel.logo || '',
        tvgId: currentChannel.tvgId,
        tvgName: currentChannel.tvgName,
        url: streamUrl,
        userAgent: finalUserAgent,
        referer: finalReferer,
        drmType: finalDrmType,
        drmKey: finalDrmKey,
        rawAttributes: currentChannel.rawAttributes,
      };

      channels.push(channelObj);

      // Reset channel accumulator
      currentChannel = {};
      currentVlcUserAgent = '';
      currentVlcReferer = '';
      currentDrmType = '';
      currentDrmKey = '';
      currentGroupFromExtgrp = '';
    }
  }

  return channels;
}

/**
 * Demo M3U data with public test streams
 */
export const SAMPLE_M3U_PLAYLIST = `#EXTM3U
#EXTINF:-1 tvg-logo="https://raw.githubusercontent.com/iptv-org/iptv/master/logos/BigBuckBunny.png" group-title="Movies & Demo", Big Buck Bunny (4K HLS)
https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8

#EXTINF:-1 tvg-logo="https://raw.githubusercontent.com/iptv-org/iptv/master/logos/TearsOfSteel.png" group-title="Movies & Demo", Tears of Steel (Multi-audio HLS)
https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8

#EXTINF:-1 tvg-logo="https://raw.githubusercontent.com/iptv-org/iptv/master/logos/Sintel.png" group-title="Movies & Demo", Sintel 1080p Stream
https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8

#EXTINF:-1 tvg-logo="https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/HDTV_logo.svg/320px-HDTV_logo.svg.png" group-title="Live News & Streams", NASA TV Public
https://ntv1.akamaized.net/hls/live/2014075/NASA-TV-1/master.m3u8

#EXTINF:-1 tvg-logo="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Deutsche_Welle_2012.svg/320px-Deutsche_Welle_2012.svg.png" group-title="Live News & Streams", Deutsche Welle English
https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/index.m3u8

#EXTINF:-1 tvg-logo="https://raw.githubusercontent.com/iptv-org/iptv/master/logos/TestPattern.png" group-title="Test Streams", Akamai Test HLS (1080p)
https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8
`;
