'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Song } from '@/types/song';
import { createShareableSongUrl, copySongUrlToClipboard, ShareUrlResult } from '@/lib/songUrl';
import {
  generateScoreQrCodeWithTitle,
  downloadQrCodeImage,
  FormattedSongTitle,
} from '@/lib/qrCode';
import {
  Share2,
  Copy,
  Check,
  X,
  ExternalLink,
  Sparkles,
  Link as LinkIcon,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Smartphone,
  Download,
} from 'lucide-react';

interface ShareSongModalProps {
  isOpen: boolean;
  onClose: () => void;
  song: Song;
}

export const ShareSongModal: React.FC<ShareSongModalProps> = ({
  isOpen,
  onClose,
  song,
}) => {
  const [shareData, setShareData] = useState<{ song: Song; result: ShareUrlResult } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);
  const [copied, setCopied] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);
  const [downloadedQr, setDownloadedQr] = useState(false);
  const [qrState, setQrState] = useState<{
    url: string;
    dataUrl: string | null;
    combinedDataUrl: string | null;
    titleInfo: FormattedSongTitle | null;
    error: string | null;
    isTooLarge: boolean;
  }>({
    url: '',
    dataUrl: null,
    combinedDataUrl: null,
    titleInfo: null,
    error: null,
    isTooLarge: false,
  });

  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const downloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const shareResult = shareData && shareData.song === song ? shareData.result : null;
  const isGenerating = !shareResult && !error;
  const isQrLoading = showQrCode && Boolean(shareResult?.url) && qrState.url !== shareResult?.url;

  const handleRetry = useCallback(() => {
    setError(null);
    setShareData(null);
    setRetryTrigger(c => c + 1);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    let isCancelled = false;

    // Reuse already generated share URL if song hasn't changed, preventing redundant compression and CPU usage
    if (shareData && shareData.song === song && !error) {
      return;
    }

    createShareableSongUrl(song)
      .then(result => {
        if (!isCancelled) {
          setShareData({ song, result });
          setError(null);
        }
      })
      .catch(err => {
        if (!isCancelled) {
          console.error('[ShareSongModal] Failed to generate share URL:', err);
          setError(err instanceof Error ? err.message : 'Failed to generate share link. Please try again.');
        }
      });

    return () => {
      isCancelled = true;
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
      if (downloadTimerRef.current) {
        clearTimeout(downloadTimerRef.current);
      }
    };
  }, [isOpen, song, retryTrigger, shareData, error]);

  // Generate QR code with song title on top when showQrCode is activated and URL is available
  useEffect(() => {
    if (!showQrCode || !shareResult?.url) return;
    if (qrState.url === shareResult.url) return;

    let isCancelled = false;

    generateScoreQrCodeWithTitle(shareResult.url, song)
      .then(result => {
        if (!isCancelled) {
          setQrState({
            url: shareResult.url,
            dataUrl: result.dataUrl,
            combinedDataUrl: result.combinedDataUrl,
            titleInfo: result.titleInfo,
            error: result.error,
            isTooLarge: result.isTooLarge,
          });
        }
      })
      .catch(err => {
        if (!isCancelled) {
          setQrState({
            url: shareResult.url,
            dataUrl: null,
            combinedDataUrl: null,
            titleInfo: null,
            error: err instanceof Error ? err.message : 'Failed to generate QR code',
            isTooLarge: false,
          });
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [showQrCode, shareResult?.url, qrState.url, song]);

  const handleDownloadQr = useCallback(() => {
    const targetUrl = qrState.combinedDataUrl || qrState.dataUrl;
    if (!targetUrl) return;

    const baseName = (qrState.titleInfo?.primaryTitle || song.title || 'musical-score')
      .replace(/[\\/:*?"<>|]/g, '_')
      .trim();
    const fileName = `${baseName}-qrcode.png`;

    const success = downloadQrCodeImage(targetUrl, fileName);
    if (success) {
      setDownloadedQr(true);
      if (downloadTimerRef.current) clearTimeout(downloadTimerRef.current);
      downloadTimerRef.current = setTimeout(() => {
        setDownloadedQr(false);
      }, 2500);
    }
  }, [qrState.combinedDataUrl, qrState.dataUrl, qrState.titleInfo?.primaryTitle, song.title]);

  const handleClose = useCallback(() => {
    setCopied(false);
    setDownloadedQr(false);
    setShowQrCode(false);
    onClose();
  }, [onClose]);

  const handleCopy = async () => {
    if (!shareResult?.url) return;
    const ok = await copySongUrlToClipboard(shareResult.url);
    if (ok) {
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => {
        setCopied(false);
      }, 2500);
    }
  };

  const handleNativeShare = async () => {
    if (!shareResult?.url) return;
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: song.title ? `${song.title} - Easy Composer` : 'Musical Score - Easy Composer',
          text: `Open and play "${song.title || 'Musical Score'}" in Easy Composer:`,
          url: shareResult.url,
        });
        return;
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          return;
        }
      }
    }
    // Fallback to copy if Web Share API is unavailable or rejected
    handleCopy();
  };

  const handleSelectAll = () => {
    if (inputRef.current) {
      inputRef.current.select();
    }
  };

  const handleOpenTest = () => {
    if (shareResult?.url && typeof window !== 'undefined') {
      window.open(shareResult.url, '_blank');
    }
  };

  // Close modal on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  const urlLengthKb = shareResult ? (shareResult.url.length / 1024).toFixed(1) : '0';
  const isUrlLong = shareResult ? !shareResult.isPreset && shareResult.payloadSize > 4096 : false;

  return (
    <div
      id="share-song-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={handleClose}
    >
      <div
        id="share-song-modal-card"
        role="dialog"
        aria-modal="true"
        aria-label="Share Song Link"
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg max-h-[92vh] bg-white dark:bg-[#141720] border border-zinc-200 dark:border-zinc-750 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">
                Share Musical Score
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Generate a direct URL for others to open this score
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer touch-manipulation min-w-[36px] min-h-[36px] flex items-center justify-center"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 flex flex-col gap-4 overflow-y-auto max-h-[calc(92vh-120px)]">
          {/* Song Overview Card */}
          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-850/70 border border-zinc-200/80 dark:border-zinc-750 flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                  {song.title || 'Untitled Song'}
                </h4>
                {song.subtitle && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                    {song.subtitle}
                  </p>
                )}
              </div>

              {isGenerating ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[10px] font-bold shrink-0 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                  <span>Generating...</span>
                </span>
              ) : shareResult?.isPreset ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[10px] font-bold shrink-0">
                  <Sparkles className="w-3 h-3" />
                  <span>Preset Link</span>
                </span>
              ) : shareResult?.format === 'delta' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold shrink-0">
                  <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span>Delta Link ({urlLengthKb} KB)</span>
                </span>
              ) : shareResult ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold shrink-0">
                  <span>Compact ({urlLengthKb} KB)</span>
                </span>
              ) : null}
            </div>

            {/* Song Spec Badges */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-zinc-600 dark:text-zinc-300">
              <span className="px-2 py-0.5 rounded-md bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-bold">
                1={song.key}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                {song.timeSignature}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                {song.bpm} BPM
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-sans">
                {song.measures.length} Measures
              </span>
            </div>
          </div>

          {/* Share URL Input & Action Buttons Group */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="share-url-input"
                className="text-[11px] font-bold tracking-wider text-stone-600 dark:text-stone-400 uppercase"
              >
                DIRECT SCORE URL
              </label>
              {copied && (
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-in fade-in">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Copied to Clipboard!</span>
                </span>
              )}
            </div>

            {/* URL Input with adjacent Copy Button */}
            <div className="flex items-stretch gap-2">
              <input
                ref={inputRef}
                id="share-url-input"
                type="text"
                readOnly
                value={
                  isGenerating
                    ? 'Generating share link...'
                    : error
                    ? 'Failed to generate share link'
                    : shareResult?.url || ''
                }
                onClick={handleSelectAll}
                className="flex-1 min-w-0 px-3.5 py-2 text-xs font-mono bg-[#f5ede3]/70 dark:bg-zinc-900 border border-[#dfd5c7] dark:border-zinc-700 rounded-xl text-zinc-800 dark:text-zinc-200 select-all focus:outline-hidden focus:ring-2 focus:ring-amber-500 cursor-pointer h-11 transition-colors"
                placeholder="https://..."
              />
              <button
                id="share-modal-copy-btn"
                type="button"
                onClick={handleCopy}
                disabled={isGenerating || !shareResult?.url}
                className="px-4 py-2 rounded-xl font-bold text-xs bg-[#7a5833] hover:bg-[#684728] active:scale-95 text-white flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer touch-manipulation shrink-0 min-h-[44px]"
                title="Copy Link to Clipboard"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Action Buttons Row: Show/Hide QR Code, Share via App, Test Link */}
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  id="share-modal-toggle-qr-btn"
                  type="button"
                  onClick={() => setShowQrCode(prev => !prev)}
                  disabled={isGenerating || !shareResult?.url}
                  className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer touch-manipulation min-h-[38px] ${
                    showQrCode
                      ? 'border-[#7a5833] bg-[#7a5833]/10 text-[#5c3e20] dark:text-amber-300 dark:border-amber-600/50'
                      : 'border-[#d8cdbd] dark:border-zinc-700 bg-[#f7f2ea] hover:bg-[#eee6da] dark:bg-zinc-850 dark:hover:bg-zinc-800 text-[#3e2b1d] dark:text-zinc-200'
                  }`}
                  title={showQrCode ? 'Hide QR Code' : 'Show QR Code'}
                >
                  <QrCode className="w-4 h-4 text-[#7a5833] dark:text-amber-400" />
                  <span>{showQrCode ? 'Hide QR Code' : 'Show QR Code'}</span>
                </button>

                <button
                  id="share-modal-app-share-btn"
                  type="button"
                  onClick={handleNativeShare}
                  disabled={isGenerating || !shareResult?.url}
                  className="px-3 py-2 rounded-xl border border-[#d8cdbd] dark:border-zinc-700 bg-[#f7f2ea] hover:bg-[#eee6da] dark:bg-zinc-850 dark:hover:bg-zinc-800 text-[#3e2b1d] dark:text-zinc-200 font-semibold text-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer touch-manipulation min-h-[38px]"
                  title="Share using your device's native sharing menu"
                >
                  <Smartphone className="w-4 h-4 text-[#7a5833] dark:text-amber-400" />
                  <span>Share via App</span>
                </button>
              </div>

              <button
                id="share-modal-test-link-btn"
                type="button"
                onClick={handleOpenTest}
                disabled={isGenerating || !shareResult?.url}
                className="text-xs font-semibold text-stone-700 hover:text-stone-900 dark:text-stone-300 dark:hover:text-stone-100 flex items-center gap-1 py-1.5 px-2 hover:underline transition-colors cursor-pointer touch-manipulation shrink-0"
                title="Open the generated share link in a new browser tab"
              >
                <span>Test Link</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* QR Code Presentation Card (shown when showQrCode is true) */}
            {showQrCode && (
              <div
                id="share-modal-qr-container"
                className="mt-2 p-5 sm:p-6 rounded-2xl bg-[#faf5ee] dark:bg-[#181a22] border border-[#ebd8c4] dark:border-zinc-750 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-200"
              >
                {isQrLoading ? (
                  <div className="w-52 h-52 sm:w-60 sm:h-60 rounded-2xl bg-white/70 dark:bg-zinc-800/50 flex flex-col items-center justify-center gap-3 border border-[#e4dcd0] dark:border-zinc-700">
                    <div className="w-7 h-7 border-2 border-[#7a5833] border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-stone-600 dark:text-stone-400 font-medium">
                      Generating QR Code...
                    </span>
                  </div>
                ) : qrState.error ? (
                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700/50 max-w-sm text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mx-auto mb-2" />
                    <p className="font-bold mb-1">QR Code Unavailable</p>
                    <p>{qrState.error}</p>
                  </div>
                ) : qrState.dataUrl ? (
                  <>
                    {/* Song Title Text (per language setting) above QR code */}
                    {qrState.titleInfo && (
                      <div className="mb-3 text-center max-w-sm px-2">
                        <h4
                          id="share-modal-qr-title"
                          className="font-serif font-black text-lg sm:text-xl text-[#2e1f13] dark:text-zinc-100 tracking-wide leading-tight"
                        >
                          {qrState.titleInfo.primaryTitle}
                        </h4>
                        {qrState.titleInfo.secondaryTitle && (
                          <p
                            id="share-modal-qr-subtitle"
                            className="font-serif text-xs sm:text-sm text-[#705a46] dark:text-zinc-400 mt-1 leading-snug"
                          >
                            {qrState.titleInfo.secondaryTitle}
                          </p>
                        )}
                      </div>
                    )}

                    {/* QR Code and Title Composite Image Display */}
                    <div className="p-3 sm:p-4 rounded-2xl bg-white shadow-xs border border-[#e4dcd0] dark:border-zinc-650 inline-flex items-center justify-center">
                      <Image
                        id="share-modal-qr-image"
                        src={qrState.combinedDataUrl || qrState.dataUrl}
                        alt={`QR Code for ${qrState.titleInfo?.fullTitle || song.title || 'Musical Score'}`}
                        width={280}
                        height={320}
                        unoptimized
                        referrerPolicy="no-referrer"
                        className="w-52 h-auto sm:w-64 max-h-80 object-contain rounded-lg"
                      />
                    </div>

                    {/* Download Image Button and Instructions */}
                    <div className="mt-3.5 flex flex-col items-center gap-2">
                      <button
                        id="share-modal-download-qr-btn"
                        type="button"
                        onClick={handleDownloadQr}
                        className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95 ${
                          downloadedQr
                            ? 'bg-emerald-600 text-white border border-emerald-600'
                            : 'bg-[#3b2818] hover:bg-[#2e1f13] text-amber-50 dark:bg-amber-600 dark:hover:bg-amber-500 dark:text-zinc-950 border border-transparent'
                        }`}
                        title="Download QR code and song title image"
                      >
                        {downloadedQr ? (
                          <>
                            <Check className="w-4 h-4 text-white" />
                            <span>Image Downloaded!</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4 shrink-0" />
                            <span>Download QR Code Image</span>
                          </>
                        )}
                      </button>

                      <p className="text-[11px] sm:text-xs text-[#705a46] dark:text-zinc-400 max-w-xs sm:max-w-sm leading-normal">
                        Includes song title and numbered notation QR code ready for sharing or printing.
                      </p>
                    </div>
                  </>
                ) : null}
              </div>
            )}

            {error && (
              <div
                id="share-modal-error-message"
                className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-900 dark:text-red-200 text-xs flex items-center justify-between gap-2.5 animate-in fade-in"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{error}</span>
                </div>
                <button
                  type="button"
                  onClick={handleRetry}
                  className="px-2.5 py-1 rounded-lg bg-red-500 text-white font-bold text-[11px] hover:bg-red-600 transition-colors cursor-pointer shrink-0"
                >
                  Retry
                </button>
              </div>
            )}

            {isUrlLong && (
              <div
                id="share-modal-url-length-warning"
                className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5 animate-in fade-in"
              >
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5 leading-relaxed">
                  <p className="font-bold text-zinc-900 dark:text-zinc-100">
                    Large Score URL ({urlLengthKb} KB)
                  </p>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                    This score contains extensive notes and lyrics. Some messaging apps or chat tools may truncate links longer than 4 KB. For best results, share via email or direct copy-paste.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Explanation Tip Box */}
          <div className="p-3 rounded-xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 text-zinc-600 dark:text-zinc-400 text-xs flex items-start gap-2.5">
            <LinkIcon className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-0.5 leading-relaxed">
              <p className="font-semibold text-zinc-800 dark:text-zinc-200">
                How link sharing works
              </p>
              <p className="text-[11px]">
                Anyone who opens this URL will immediately see this score loaded in Easy Composer.
                The song is embedded directly in the link, requiring zero accounts or server uploads.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end px-4 sm:px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 shrink-0">
          <button
            id="share-modal-done-btn"
            type="button"
            onClick={handleClose}
            className="px-5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-bold text-xs transition-all cursor-pointer touch-manipulation min-h-[40px]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

