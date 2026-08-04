import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RefreshCw, AlertTriangle, Tv } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('IPTV Player Uncaught Error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center shadow-2xl space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400">
              <Tv className="w-8 h-8" />
            </div>
            
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-slate-100">Terjadi Kendala Teknis</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Pemutar IPTV mengalami sedikit kendala sistem. Silakan muat ulang aplikasi untuk melanjutkan pemutaran.
              </p>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-left text-[11px] text-slate-400 font-mono overflow-x-auto max-h-24">
              <div className="flex items-center gap-1.5 text-rose-400 font-semibold mb-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Pesan Sistem:
              </div>
              {this.state.error?.message || 'Kesalahan komponen tidak terduga'}
            </div>

            <button
              onClick={this.handleReset}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" /> Muat Ulang Aplikasi
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
