'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Download, RotateCcw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    console.error('[GlobalError] Critical system error:', error);
  }, [error]);

  const handleDownloadBackup = () => {
    try {
      const raw = localStorage.getItem('taigi_composer_current_song') || localStorage.getItem('taigi_composer_last_active_song');
      if (raw) {
        const blob = new Blob([raw], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `easy-composer-emergency-backup-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setDownloaded(true);
      }
    } catch (err) {
      console.error('Emergency backup download failed:', err);
    }
  };

  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center p-6 bg-zinc-950 text-zinc-100 font-sans">
        <div className="max-w-md w-full p-8 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 mb-5">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <h2 className="text-xl font-black mb-2">System Error</h2>
          <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
            A critical system error occurred during initialization. Your score data is safely saved in your browser storage.
          </p>

          <div className="w-full flex flex-col gap-3">
            <button
              type="button"
              onClick={handleDownloadBackup}
              className="w-full py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-semibold text-sm flex items-center justify-center gap-2 border border-zinc-700 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>{downloaded ? 'Backup Downloaded' : 'Download Score Backup'}</span>
            </button>

            <button
              type="button"
              onClick={() => reset()}
              className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Restart Application</span>
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
