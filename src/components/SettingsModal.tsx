import React from 'react';
import { X, Settings, Shield, PlayCircle, RefreshCw, Layers } from 'lucide-react';
import type { PlayerSettings } from '../types/iptv';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: PlayerSettings;
  onUpdateSettings: (newSettings: Partial<PlayerSettings>) => void;
  onResetAllData: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onResetAllData,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Pengaturan Player</h3>
              <p className="text-[11px] text-slate-400">Sesuaikan konfigurasi pemutar video dan CORS proxy</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5 text-xs">
          {/* Proxy Mode Selector */}
          <div>
            <label className="flex items-center gap-1.5 font-semibold text-slate-200 mb-1.5">
              <Shield className="w-4 h-4 text-indigo-400" /> Mode Pemutaran Proxy
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => onUpdateSettings({ proxyMode: 'auto' })}
                className={`p-2.5 rounded-xl border text-center font-semibold transition flex flex-col items-center justify-center gap-1 ${
                  (settings.proxyMode || 'auto') === 'auto'
                    ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                <span>⚡ Auto (Fallback)</span>
                <span className="text-[9px] font-normal text-slate-400">Coba langsung dulu</span>
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ proxyMode: 'direct' })}
                className={`p-2.5 rounded-xl border text-center font-semibold transition flex flex-col items-center justify-center gap-1 ${
                  settings.proxyMode === 'direct'
                    ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                <span>🟢 Direct Only</span>
                <span className="text-[9px] font-normal text-slate-400">Tanpa Proxy</span>
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ proxyMode: 'proxy' })}
                className={`p-2.5 rounded-xl border text-center font-semibold transition flex flex-col items-center justify-center gap-1 ${
                  settings.proxyMode === 'proxy'
                    ? 'bg-amber-600/20 text-amber-300 border-amber-500'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                <span>🛡️ Always Proxy</span>
                <span className="text-[9px] font-normal text-slate-400">Selalu lewat Proxy</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
              Pilih <strong>Direct Only</strong> untuk mematikan proxy sepenuhnya, atau <strong>Always Proxy</strong> jika semua siaran memblokir koneksi browser.
            </p>
          </div>

          {/* CORS Proxy Input */}
          <div>
            <label className="flex items-center gap-1.5 font-semibold text-slate-200 mb-1">
              <Shield className="w-4 h-4 text-indigo-400" /> CORS Proxy URL Prefix
            </label>
            <input
              type="text"
              placeholder="/api/proxy?url="
              value={settings.corsProxy}
              onChange={(e) => onUpdateSettings({ corsProxy: e.target.value })}
              className="w-full bg-slate-950 text-slate-200 font-mono text-xs px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 transition"
            />
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={() => onUpdateSettings({ corsProxy: '/api/proxy?url=' })}
                className="px-2 py-1 bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 rounded-lg text-[10px] hover:bg-indigo-600/30 transition"
              >
                Vite Proxy (Lokal)
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ corsProxy: 'https://corsproxy.io/?url=' })}
                className="px-2 py-1 bg-slate-800 text-slate-300 border border-slate-700 rounded-lg text-[10px] hover:bg-slate-700 transition"
              >
                CorsProxy.io
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ corsProxy: '' })}
                className="px-2 py-1 bg-slate-800 text-slate-400 border border-slate-700 rounded-lg text-[10px] hover:bg-slate-700 transition"
              >
                Tanpa Proxy (Langsung)
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
              Gunakan Vite Proxy lokal atau CORS proxy publik jika stream IPTV memblokir koneksi browser / membutuhkan header kustom.
            </p>
          </div>

          {/* Autoplay Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/60">
            <div className="flex items-center gap-2.5">
              <PlayCircle className="w-4 h-4 text-indigo-400" />
              <div>
                <p className="font-semibold text-slate-200">Putar Otomatis (Autoplay)</p>
                <p className="text-[10px] text-slate-400">Otomatis jalankan video saat saluran dipilih</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoPlay}
                onChange={(e) => onUpdateSettings({ autoPlay: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {/* Aspect Ratio Default */}
          <div>
            <label className="flex items-center gap-1.5 font-semibold text-slate-200 mb-1">
              <Layers className="w-4 h-4 text-indigo-400" /> Default Rasio Video
            </label>
            <select
              value={settings.aspectRatio}
              onChange={(e) =>
                onUpdateSettings({
                  aspectRatio: e.target.value as 'contain' | 'cover' | 'fill',
                })
              }
              className="w-full bg-slate-950 text-slate-200 text-xs px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 transition"
            >
              <option value="contain">Original Aspect Ratio (Contain)</option>
              <option value="cover">Crop Fill Screen (Cover)</option>
              <option value="fill">Stretch Video (Fill)</option>
            </select>
          </div>

          {/* Clear Data Button */}
          <div className="pt-4 border-t border-slate-800/80">
            <button
              onClick={() => {
                if (confirm('Apakah Anda yakin ingin menghapus seluruh data playlist dan favorit tersimpan?')) {
                  onResetAllData();
                  onClose();
                }
              }}
              className="w-full py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 rounded-xl font-semibold transition flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reset Seluruh Data & Cache
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
