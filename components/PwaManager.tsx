'use client';

import React, { useState, useEffect, useSyncExternalStore } from 'react';
import { X, WifiOff, Tablet } from 'lucide-react';
import { isIPad, isStandalonePwa } from '@/lib/device';
import { getStoredPwaDismissed, setStoredPwaDismissed } from '@/lib/storage';

const emptySubscribe = () => () => {};

function subscribeOnline(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getIsOfflineSnapshot(): boolean {
  return typeof navigator !== 'undefined' ? !navigator.onLine : false;
}

function getIsOfflineServerSnapshot(): boolean {
  return false;
}

export const PwaManager: React.FC = () => {
  const hasMounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const isOffline = useSyncExternalStore(subscribeOnline, getIsOfflineSnapshot, getIsOfflineServerSnapshot);

  const [isDismissed, setIsDismissed] = useState(false);
  const [hasUpdate, setHasUpdate] = useState(false);

  // Register Service Worker for iPad PWA offline asset caching
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
      const swUrl = `${basePath}/sw.js`;

      navigator.serviceWorker
        .register(swUrl)
        .then((reg) => {
          reg.onupdatefound = () => {
            const installingWorker = reg.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setHasUpdate(true);
                }
              };
            }
          };
        })
        .catch((err) => {
          console.warn('iPad Service Worker registration skipped or failed:', err);
        });
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      setStoredPwaDismissed(true);
    } catch {
      /* storage blocked */
    }
  };

  if (!hasMounted) {
    return null;
  }

  const isStandalone = isStandalonePwa();
  const isIpadDevice = isIPad();

  let storedDismissed = false;
  try {
    storedDismissed = getStoredPwaDismissed();
  } catch {
    /* storage blocked */
  }

  const showIpadInstallBanner = Boolean(isIpadDevice && !isStandalone && !storedDismissed && !isDismissed);

  return (
    <>
      {/* Service Worker Update Toast */}
      {hasUpdate && (
        <div
          id="pwa-update-indicator"
          className="fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-amber-500 text-zinc-950 text-xs font-bold shadow-xl border border-amber-400 animate-in fade-in duration-200 print:hidden"
        >
          <span>發現新版本更新！</span>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="min-h-[44px] px-3 py-1 rounded-xl bg-zinc-950 text-amber-400 text-xs font-black hover:bg-zinc-900 transition-all cursor-pointer touch-manipulation flex items-center justify-center"
          >
            立即重新載入
          </button>
        </div>
      )}

      {/* Offline Status Pill Notification */}
      {isOffline && (
        <div
          id="pwa-offline-indicator"
          className="fixed bottom-[max(5rem,calc(env(safe-area-inset-bottom,0px)+4.5rem))] left-4 z-40 flex items-center gap-2 px-3 py-2 rounded-full bg-zinc-900/90 text-amber-400 border border-amber-500/30 text-xs font-semibold shadow-lg backdrop-blur-md animate-in fade-in duration-200 print:hidden"
        >
          <WifiOff className="w-3.5 h-3.5 shrink-0" />
          <span>iPad 離線模式：樂譜編輯與鋼琴音源皆可在無網路下完整運作</span>
        </div>
      )}

      {/* Dedicated iPad PWA Add-to-Home-Screen Card */}
      {showIpadInstallBanner && (
        <aside
          id="pwa-install-banner"
          aria-label="iPad PWA Install Prompt"
          className="fixed bottom-[max(5rem,calc(env(safe-area-inset-bottom,0px)+4.5rem))] right-4 z-40 max-w-sm w-[calc(100vw-2rem)] p-4 rounded-2xl bg-zinc-900/95 text-white border border-amber-500/40 shadow-2xl backdrop-blur-lg animate-in slide-in-from-bottom-5 duration-300 print:hidden"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 text-zinc-950 font-bold shadow-md shadow-amber-500/20 shrink-0">
                <Tablet className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5">
                  <span>安裝至 iPad 主畫面</span>
                  <span className="text-[10px] px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded-full font-mono">
                    iPadOS PWA
                  </span>
                </h2>
                <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                  點擊 Safari 工具列的分享按鈕 <strong className="text-amber-400 font-bold">⎋</strong> 並選擇「<strong className="text-amber-400 font-bold">加入主畫面</strong>」，即可享有免網址列全螢幕與低耗電琴鍵！
                </p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-zinc-400 hover:text-zinc-200 p-2 rounded-xl transition-colors shrink-0 cursor-pointer touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="關閉提示 Dismiss prompt"
              aria-label="Dismiss prompt"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-end gap-2 mt-3 pt-2 border-t border-zinc-800">
            <button
              onClick={handleDismiss}
              className="min-h-[44px] px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 font-medium transition-colors cursor-pointer touch-manipulation flex items-center justify-center"
            >
              知道了 (Got it)
            </button>
          </div>
        </aside>
      )}
    </>
  );
};

