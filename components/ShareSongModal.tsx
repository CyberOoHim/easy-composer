'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Song } from '@/types/song';
import { createShareableSongUrl, copySongUrlToClipboard, ShareUrlResult } from '@/lib/songUrl';
import {
  Share2,
  Copy,
  Check,
  X,
  ExternalLink,
  Music,
  Sparkles,
  Link as LinkIcon,
  CheckCircle2,
  AlertTriangle,
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
  const [shareResultData, setShareResultData] = useState<{ song: Song; result: ShareUrlResult } | null>(null);
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const shareResult = (shareResultData && shareResultData.song === song) ? shareResultData.result : null;

  // Generate share URL whenever modal opens or song changes
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    void createShareableSongUrl(song)
      .then(result => {
        if (isMounted) {
          setShareResultData({ song, result });
        }
      })
      .catch(err => {
        console.error('[ShareSongModal] Failed to generate share URL:', err);
      });

    return () => {
      isMounted = false;
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, [isOpen, song]);

  const isGenerating = !shareResult;

  const handleClose = useCallback(() => {
    setCopied(false);
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
        className="w-full max-w-lg bg-white dark:bg-[#141720] border border-zinc-200 dark:border-zinc-750 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40">
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
        <div className="p-4 sm:p-5 flex flex-col gap-4">
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

              {shareResult?.isPreset ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[10px] font-bold shrink-0">
                  <Sparkles className="w-3 h-3" />
                  <span>Preset Link</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold shrink-0">
                  <span>Compressed ({urlLengthKb} KB)</span>
                </span>
              )}
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

          {/* Share URL Input & Copy Group */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="share-url-input"
              className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center justify-between"
            >
              <span>Shareable Score URL</span>
              {copied && (
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-in fade-in">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Copied to Clipboard!</span>
                </span>
              )}
            </label>

            <div className="relative flex items-center">
              <input
                ref={inputRef}
                id="share-url-input"
                type="text"
                readOnly
                value={isGenerating ? 'Generating share link...' : shareResult?.url || ''}
                onClick={handleSelectAll}
                className="w-full px-3 py-2 pr-12 text-xs font-mono bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-800 dark:text-zinc-200 select-all focus:outline-hidden focus:ring-2 focus:ring-amber-500 cursor-pointer h-11 transition-colors"
                placeholder="https://..."
              />
              <button
                type="button"
                onClick={handleCopy}
                disabled={isGenerating || !shareResult?.url}
                className="absolute right-1 p-2 text-zinc-500 hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg"
                title="Copy Link"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-500 stroke-[3]" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>

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

          {/* Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <button
              id="share-modal-copy-btn"
              type="button"
              onClick={handleCopy}
              disabled={isGenerating || !shareResult?.url}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer touch-manipulation min-h-[44px] ${
                copied
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/20'
                  : 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-amber-500/20'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Link Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Share Link</span>
                </>
              )}
            </button>

            <button
              id="share-modal-test-link-btn"
              type="button"
              onClick={handleOpenTest}
              disabled={isGenerating || !shareResult?.url}
              className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold text-xs transition-all active:scale-95 cursor-pointer touch-manipulation min-h-[44px]"
              title="Open the generated share link in a new browser tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Test Link</span>
            </button>
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
        <div className="flex justify-end px-4 sm:px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
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
