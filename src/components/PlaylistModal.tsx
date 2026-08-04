import React, { useState } from 'react';
import { X, Link, Upload, FileText, Check, Trash2, ListVideo, Sparkles, RefreshCw, Layers } from 'lucide-react';
import type { Playlist } from '../types/iptv';
import { parseM3U, SAMPLE_M3U_PLAYLIST } from '../utils/m3uParser';

interface PlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlists: Playlist[];
  activePlaylistId: string | null;
  onSelectPlaylist: (playlistId: string) => void;
  onAddPlaylist: (newPlaylist: Playlist) => void;
  onDeletePlaylist: (playlistId: string) => void;
  onRefreshPlaylist?: (playlistId: string) => void;
}

export const PlaylistModal: React.FC<PlaylistModalProps> = ({
  isOpen,
  onClose,
  playlists,
  activePlaylistId,
  onSelectPlaylist,
  onAddPlaylist,
  onDeletePlaylist,
  onRefreshPlaylist,
}) => {
  const [activeTab, setActiveTab] = useState<'url' | 'file' | 'text'>('url');
  const [playlistName, setPlaylistName] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [textInput, setTextInput] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setPlaylistName('');
    setUrlInput('');
    setTextInput('');
    setSelectedFiles(null);
    setErrorMessage(null);
  };

  const handleAddFromUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    const urls = urlInput
      .split(/\r?\n/)
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    if (urls.length === 0) {
      setErrorMessage('Silakan masukkan satu atau beberapa URL playlist M3U yang valid.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    let addedCount = 0;
    let errors: string[] = [];

    for (let index = 0; index < urls.length; index++) {
      const singleUrl = urls[index];
      try {
        const res = await fetch(singleUrl);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status} pada ${singleUrl}`);
        }

        const content = await res.text();
        const channels = parseM3U(content);

        if (channels.length === 0) {
          throw new Error(`Tidak ada saluran valid di ${singleUrl}`);
        }

        const name =
          urls.length === 1 && playlistName.trim()
            ? playlistName.trim()
            : `Playlist URL ${playlists.length + addedCount + 1} (${channels.length} Saluran)`;

        const newPlaylist: Playlist = {
          id: `pl-${Date.now()}-${index}`,
          name,
          sourceType: 'url',
          sourceUrl: singleUrl,
          channels,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        onAddPlaylist(newPlaylist);
        addedCount++;
      } catch (err: any) {
        console.error('Fetch playlist error:', err);
        errors.push(err.message || singleUrl);
      }
    }

    setIsLoading(false);

    if (addedCount > 0) {
      resetForm();
      onClose();
    } else {
      setErrorMessage(`Gagal memuat M3U: ${errors.join(', ')}.`);
    }
  };

  const handleAddFromFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFiles || selectedFiles.length === 0) {
      setErrorMessage('Silakan pilih setidaknya satu file M3U/M3U8.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    let addedCount = 0;
    const fileList = Array.from(selectedFiles);

    for (let index = 0; index < fileList.length; index++) {
      const file = fileList[index];
      try {
        const content = await file.text();
        const channels = parseM3U(content);

        if (channels.length === 0) {
          continue;
        }

        const name =
          fileList.length === 1 && playlistName.trim()
            ? playlistName.trim()
            : file.name.replace(/\.[^/.]+$/, '');

        const newPlaylist: Playlist = {
          id: `pl-${Date.now()}-${index}`,
          name,
          sourceType: 'file',
          channels,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        onAddPlaylist(newPlaylist);
        addedCount++;
      } catch (err: any) {
        console.error('Error reading file:', err);
      }
    }

    setIsLoading(false);

    if (addedCount > 0) {
      resetForm();
      onClose();
    } else {
      setErrorMessage('Gagal membaca file M3U yang dipilih.');
    }
  };

  const handleAddFromText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) {
      setErrorMessage('Silakan tempel teks format M3U terlebih dahulu.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const channels = parseM3U(textInput);

      if (channels.length === 0) {
        throw new Error('Format teks tidak valid atau tidak memiliki tag #EXTINF.');
      }

      const name = playlistName.trim() || `Playlist Text (${channels.length} Saluran)`;
      const newPlaylist: Playlist = {
        id: `pl-${Date.now()}`,
        name,
        sourceType: 'text',
        channels,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      onAddPlaylist(newPlaylist);
      resetForm();
      onClose();
    } catch (err: any) {
      setErrorMessage(`Gagal memproses teks M3U: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSamplePlaylist = () => {
    const channels = parseM3U(SAMPLE_M3U_PLAYLIST);
    const demoPlaylist: Playlist = {
      id: `pl-demo-${Date.now()}`,
      name: 'Demo Public Legal Streams',
      sourceType: 'text',
      channels,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    onAddPlaylist(demoPlaylist);
    onClose();
  };

  const totalAllChannels = playlists.reduce((sum, pl) => sum + pl.channels.length, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <ListVideo className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Kelola Playlist M3U</h3>
              <p className="text-[11px] text-slate-400">Tambah URL playlist, upload file M3U, atau gabungkan banyak playlist</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Saved Playlists Selector Section */}
        {playlists.length > 0 && (
          <div className="p-4 bg-slate-950/50 border-b border-slate-800/60 max-h-56 overflow-y-auto">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Playlist Tersimpan di LocalStorage ({playlists.length})
            </span>
            <div className="space-y-2">
              {/* Option to Combined All Playlists */}
              {playlists.length > 1 && (
                <div
                  onClick={() => {
                    onSelectPlaylist('ALL_COMBINED');
                    onClose();
                  }}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                    activePlaylistId === 'ALL_COMBINED'
                      ? 'bg-gradient-to-r from-indigo-950/80 to-purple-950/80 border-indigo-500/60 text-indigo-200 shadow-md'
                      : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-indigo-500/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        activePlaylistId === 'ALL_COMBINED'
                          ? 'border-indigo-500 bg-indigo-500 text-white'
                          : 'border-slate-600'
                      }`}
                    >
                      {activePlaylistId === 'ALL_COMBINED' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                    <div>
                      <p className="font-bold text-indigo-300 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-purple-400" /> Semua Playlist (Gabungan)
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Total {totalAllChannels} saluran dari seluruh {playlists.length} playlist tersimpan
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    GABUNGAN
                  </span>
                </div>
              )}

              {playlists.map((pl) => {
                const isActive = pl.id === activePlaylistId;
                return (
                  <div
                    key={pl.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition ${
                      isActive
                        ? 'bg-indigo-950/50 border-indigo-500/40 text-indigo-200'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div
                      onClick={() => {
                        onSelectPlaylist(pl.id);
                        onClose();
                      }}
                      className="flex items-center gap-2.5 flex-1 cursor-pointer min-w-0"
                    >
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                          isActive
                            ? 'border-indigo-500 bg-indigo-500 text-white'
                            : 'border-slate-600'
                        }`}
                      >
                        {isActive && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-200 truncate">{pl.name}</p>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-slate-800 text-emerald-400 border border-emerald-500/30">
                            Tersimpan
                          </span>
                        </div>
                        {pl.sourceUrl && (
                          <p className="text-[10px] text-slate-400 truncate font-mono">
                            🔗 {pl.sourceUrl}
                          </p>
                        )}
                        <p className="text-[10px] text-slate-500">
                          {pl.channels.length} saluran • Tipe: {pl.sourceType.toUpperCase()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {pl.sourceType === 'url' && pl.sourceUrl && onRefreshPlaylist && (
                        <button
                          onClick={() => onRefreshPlaylist(pl.id)}
                          className="p-1.5 text-slate-400 hover:text-indigo-300 hover:bg-slate-800 rounded-lg transition"
                          title="Muat Ulang Saluran dari URL"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => onDeletePlaylist(pl.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                        title="Hapus Playlist"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab Selection */}
        <div className="flex border-b border-slate-800 bg-slate-950/30">
          <button
            onClick={() => {
              setActiveTab('url');
              setErrorMessage(null);
            }}
            className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition ${
              activeTab === 'url'
                ? 'border-indigo-500 text-indigo-400 bg-slate-900/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Link className="w-4 h-4" /> Dari URL M3U
          </button>
          <button
            onClick={() => {
              setActiveTab('file');
              setErrorMessage(null);
            }}
            className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition ${
              activeTab === 'file'
                ? 'border-indigo-500 text-indigo-400 bg-slate-900/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" /> Upload File M3U
          </button>
          <button
            onClick={() => {
              setActiveTab('text');
              setErrorMessage(null);
            }}
            className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition ${
              activeTab === 'text'
                ? 'border-indigo-500 text-indigo-400 bg-slate-900/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" /> Tempel Teks M3U
          </button>
        </div>

        {/* Modal Form Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 leading-relaxed">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Nama Playlist (Opsional)</label>
            <input
              type="text"
              placeholder="Contoh: Saluran TV Indonesia, Sports Live, dll."
              value={playlistName}
              onChange={(e) => setPlaylistName(e.target.value)}
              className="w-full bg-slate-950 text-slate-200 text-xs px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          {/* TAB 1: URL */}
          {activeTab === 'url' && (
            <form onSubmit={handleAddFromUrl} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Masukkan Satu atau Beberapa URL Playlist M3U / M3U8 (Satu per baris)
                </label>
                <textarea
                  rows={4}
                  placeholder={`https://iptv-org.github.io/iptv/countries/id.m3u\nhttps://example.com/playlist2.m3u`}
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  required
                  className="w-full bg-slate-950 text-slate-200 font-mono text-[11px] p-3 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 transition leading-relaxed"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  💡 Bisa memasukkan banyak URL sekaligus (pisahkan dengan baris baru).
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-xs transition shadow-lg shadow-indigo-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    Memuat Playlist...
                  </>
                ) : (
                  'Muat Saluran dari URL'
                )}
              </button>
            </form>
          )}

          {/* TAB 2: File Upload */}
          {activeTab === 'file' && (
            <form onSubmit={handleAddFromFile} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Pilih Satu atau Beberapa File M3U / M3U8 / TXT Sekaligus
                </label>
                <input
                  type="file"
                  multiple
                  accept=".m3u,.m3u8,.txt"
                  onChange={(e) => setSelectedFiles(e.target.files)}
                  required
                  className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer bg-slate-950 p-2 rounded-xl border border-slate-800"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  💡 Gunakan Ctrl/Cmd atau Shift untuk memilih banyak file sekaligus.
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading || !selectedFiles || selectedFiles.length === 0}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-xs transition shadow-lg shadow-indigo-600/20 disabled:opacity-50"
              >
                Impor File M3U ({selectedFiles ? selectedFiles.length : 0} File)
              </button>
            </form>
          )}

          {/* TAB 3: Paste Text */}
          {activeTab === 'text' && (
            <form onSubmit={handleAddFromText} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Konten Teks Format M3U
                </label>
                <textarea
                  rows={6}
                  placeholder={`#EXTM3U\n#EXTINF:-1 tvg-logo="http://example.com/logo.png" group-title="Channel Group", Nama Saluran\nhttp://example.com/stream.m3u8`}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  required
                  className="w-full bg-slate-950 text-slate-200 font-mono text-[11px] p-3 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 transition leading-relaxed"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-xs transition shadow-lg shadow-indigo-600/20 disabled:opacity-50"
              >
                Impor dari Teks M3U
              </button>
            </form>
          )}

          {/* Quick Demo Preset Button */}
          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">Ingin coba langsung?</span>
            <button
              onClick={loadSamplePlaylist}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 rounded-lg border border-indigo-500/20 font-medium transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Muat Playlist Demo Publik
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
