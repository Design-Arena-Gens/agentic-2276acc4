"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  AudioLines,
  Check,
  CirclePlay,
  Download,
  History,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  Search,
  Share2,
  Trash2,
  Video,
  X,
} from "lucide-react";
import clsx from "clsx";
import { useDownloadController } from "@/hooks/useDownloadController";
import { SUPPORTED_PLATFORMS, PLATFORM_COUNT } from "@/lib/platforms";
import type { MediaFormat, MediaMetadata } from "@/lib/types";
import { useHistoryStore } from "@/store/history";
import { SwipeableRow } from "@/components/swipeable-row";
import {
  describeFormat,
  formatBytes,
  formatDuration,
  getQualityLabel,
  isAudioOnly,
} from "@/lib/utils";
import type { ActiveDownload } from "@/lib/types";

type FormatFilter = "all" | "video" | "audio";

function ClipboardHint({ onPaste }: { onPaste: (value: string) => void }) {
  const [checking, setChecking] = useState(true);
  const [lastClipboard, setLastClipboard] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const detectClipboard = async () => {
      if (!navigator.clipboard?.readText) {
        setChecking(false);
        return;
      }
      try {
        const text = await navigator.clipboard.readText();
        if (mounted && text && text !== lastClipboard) {
          setLastClipboard(text);
          onPaste(text);
        }
      } catch (error) {
        console.info("[clipboard]", error);
      } finally {
        if (mounted) setChecking(false);
      }
    };
    detectClipboard();
    return () => {
      mounted = false;
    };
  }, [lastClipboard, onPaste]);

  if (checking) {
    return (
      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Checking clipboard…
      </div>
    );
  }

  return null;
}

function FormatOption({
  format,
  isSelected,
  onSelect,
}: {
  format: MediaFormat;
  isSelected: boolean;
  onSelect: (format: MediaFormat) => void;
}) {
  const label = getQualityLabel(format);
  const description = describeFormat(format);
  const size = formatBytes(format.filesize ?? format.filesize_approx);
  return (
    <button
      type="button"
      onClick={() => onSelect(format)}
      className={clsx(
        "flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-sky-300 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 dark:border-slate-700 dark:bg-slate-800",
        isSelected && "border-sky-400 shadow-sm",
      )}
    >
      <div className="flex flex-col">
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
          {label}
          {isAudioOnly(format) ? (
            <AudioLines className="h-4 w-4 text-slate-400" />
          ) : (
            <Video className="h-4 w-4 text-slate-400" />
          )}
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400">{description}</span>
      </div>
      <div className="flex items-center gap-3 text-xs font-medium text-slate-500 dark:text-slate-300">
        <span>{format.ext.toUpperCase()}</span>
        <span>{size}</span>
        <span
          className={clsx(
            "flex h-5 w-5 items-center justify-center rounded-full border",
            isSelected
              ? "border-sky-500 bg-sky-500 text-white"
              : "border-slate-200 text-slate-300 dark:border-slate-600",
          )}
        >
          {isSelected ? <Check className="h-3 w-3" /> : null}
        </span>
      </div>
    </button>
  );
}

function ActiveDownloads({
  downloads,
  onPause,
  onResume,
  onCancel,
}: {
  downloads: Record<string, ActiveDownload>;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  const downloadList = Object.values(downloads);

  if (!downloadList.length) {
    return null;
  }

  return (
    <section className="mt-10 space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Active Downloads
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Monitor progress, pause, resume, or cancel downloads in real-time.
          </p>
        </div>
      </header>
      <div className="space-y-4">
        {downloadList.map((download) => (
          <div
            key={download.id}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {download.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {download.format.ext.toUpperCase()} ·{" "}
                  {getQualityLabel(download.format)} ·{" "}
                  {formatBytes(download.totalBytes ?? download.downloadedBytes)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {download.status === "downloading" ? (
                  <button
                    type="button"
                    className="flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600"
                    onClick={() => onPause(download.id)}
                  >
                    <Pause className="h-3.5 w-3.5" />
                    Pause
                  </button>
                ) : (
                  <button
                    type="button"
                    className="flex items-center gap-1 rounded-full bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-600"
                    onClick={() => onResume(download.id)}
                  >
                    <Play className="h-3.5 w-3.5" />
                    Resume
                  </button>
                )}
                <button
                  type="button"
                  className="flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 ring-1 ring-slate-200 transition hover:text-red-500 hover:ring-red-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700 dark:hover:text-red-400 dark:hover:ring-red-400/30"
                  onClick={() => onCancel(download.id)}
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </button>
              </div>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className="h-2 bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 transition-all"
                style={{
                  width: `${download.progress}%`,
                }}
              />
            </div>
            <div className="mt-2 flex justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>{download.status.toUpperCase()}</span>
              <span>
                {formatBytes(download.downloadedBytes)} /
                {" "}
                {formatBytes(download.totalBytes ?? download.downloadedBytes)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SearchHistoryPanel() {
  const searches = useHistoryStore((state) => state.searches);
  const removeSearch = useHistoryStore((state) => state.removeSearch);
  const clearSearches = useHistoryStore((state) => state.clearSearches);
  const [filter, setFilter] = useState("");

  const filtered = useMemo(() => {
    if (!filter) return searches;
    const lower = filter.toLowerCase();
    return searches.filter(
      (entry) =>
        entry.url.toLowerCase().includes(lower) ||
        entry.metadata?.title?.toLowerCase().includes(lower),
    );
  }, [filter, searches]);

  const handleReuse = (url: string) => {
    const input = document.querySelector<HTMLInputElement>("#url-input");
    if (input) {
      input.value = url;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      requestAnimationFrame(() => {
        const form = document.querySelector<HTMLFormElement>("#analyze-form");
        form?.requestSubmit();
      });
    }
  };

  return (
    <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
            <Search className="h-5 w-5 text-sky-500" />
            Search History
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Recently analysed URLs with timestamps for quick access.
          </p>
        </div>
        {searches.length ? (
          <button
            type="button"
            onClick={clearSearches}
            className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <Trash2 className="h-4 w-4" />
            Clear All
          </button>
        ) : null}
      </header>
      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-slate-700 dark:bg-slate-800">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          className="flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-100"
          placeholder="Filter history…"
        />
        {filter ? (
          <button
            type="button"
            onClick={() => setFilter("")}
            className="text-xs text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
          >
            Clear
          </button>
        ) : null}
      </div>
      <div className="space-y-3">
        {!filtered.length ? (
          <p className="text-center text-sm text-slate-400">
            No entries yet. Analyse a URL to begin building history.
          </p>
        ) : (
          filtered.map((entry) => (
            <SwipeableRow key={entry.id} id={entry.id} onDelete={removeSearch}>
              <button
                type="button"
                onClick={() => handleReuse(entry.url)}
                className="flex w-full items-center gap-4 p-4 text-left"
              >
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                  {entry.metadata?.thumbnail ? (
                    <Image
                      src={entry.metadata.thumbnail}
                      alt={entry.metadata.title ?? "Thumbnail"}
                      width={64}
                      height={64}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <History className="h-6 w-6 text-slate-400" />
                  )}
                </div>
                <div className="flex flex-1 flex-col">
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {entry.metadata?.title ?? entry.url}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {new Date(entry.createdAt).toLocaleString()}
                  </span>
                  <span className="mt-1 text-xs text-slate-400 line-clamp-1">
                    {entry.url}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <RefreshCw className="h-4 w-4" />
                  Re-run
                </div>
              </button>
            </SwipeableRow>
          ))
        )}
      </div>
    </section>
  );
}

function DownloadHistoryPanel() {
  const downloads = useHistoryStore((state) => state.downloads);
  const removeDownload = useHistoryStore((state) => state.removeDownload);
  const clearDownloads = useHistoryStore((state) => state.clearDownloads);

  const handleShare = async (blobUrl: string, title: string, fileName: string) => {
    try {
      if (!navigator.share || !("canShare" in navigator)) {
        const anchor = document.createElement("a");
        anchor.href = blobUrl;
        anchor.download = fileName;
        anchor.click();
        return;
      }
      const response = await fetch(blobUrl);
      const blob = await response.blob();
      const file = new File([blob], fileName, { type: blob.type });
      const shareData: ShareData = { title, text: title, files: [file] };
      const nav = navigator as Navigator & {
        canShare?: (data: ShareData) => boolean;
      };
      if (nav.canShare && !nav.canShare(shareData)) {
        throw new Error("Sharing not supported for this file type.");
      }
      await navigator.share(shareData);
    } catch (error) {
      console.warn("[share]", error);
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = fileName;
      anchor.click();
    }
  };

  return (
    <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
            <Download className="h-5 w-5 text-sky-500" />
            Download Library
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Access completed downloads, preview inline, share or remove items.
          </p>
        </div>
        {downloads.length ? (
          <button
            type="button"
            onClick={clearDownloads}
            className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <Trash2 className="h-4 w-4" />
            Clear All
          </button>
        ) : null}
      </header>
      {!downloads.length ? (
        <p className="text-center text-sm text-slate-400">
          Your download list is empty. Completed downloads will appear here.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {downloads.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/70"
            >
              <div className="flex items-start gap-3">
                <div className="relative h-20 w-32 overflow-hidden rounded-xl bg-slate-200 dark:bg-slate-700">
                  <video
                    src={item.blobUrl}
                    controls
                    preload="metadata"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex flex-1 flex-col">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {new Date(item.downloadedAt).toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {item.format.ext.toUpperCase()} · {formatBytes(item.size)} ·{" "}
                    {getQualityLabel(item.format as unknown as MediaFormat)}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleShare(item.blobUrl, item.title, item.fileName)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full bg-sky-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-sky-600"
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const anchor = document.createElement("a");
                    anchor.href = item.blobUrl;
                    anchor.download = item.fileName;
                    anchor.click();
                  }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800"
                >
                  <Download className="h-4 w-4" />
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => removeDownload(item.id)}
                  className="flex items-center justify-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-rose-500 ring-1 ring-rose-200 transition hover:bg-rose-50 dark:bg-slate-900 dark:text-rose-300 dark:ring-rose-800 dark:hover:bg-slate-800"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function DownloaderShell() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [metadata, setMetadata] = useState<MediaMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FormatFilter>("all");
  const [selectedFormat, setSelectedFormat] = useState<MediaFormat | null>(null);

  const { downloads, startDownload, pauseDownload, resumeDownload, cancelDownload } =
    useDownloadController();

  useEffect(() => {
    const form = document.querySelector<HTMLFormElement>("#analyze-form");
    if (!form) return;
    const controller = new AbortController();
    const listener = (event: Event) => {
      setUrl((event.target as HTMLInputElement).value);
    };
    const input = form.querySelector<HTMLInputElement>("#url-input");
    input?.addEventListener("input", listener, { signal: controller.signal });
    return () => controller.abort();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!url) return;
    try {
      setLoading(true);
      setError(null);
      setMetadata(null);
      setSelectedFormat(null);
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error ?? "Unable to analyse URL");
      }
      const payload = (await response.json()) as MediaMetadata;
      setMetadata(payload);
      setSelectedFormat(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const formats = useMemo(() => {
    if (!metadata) return [];
    return metadata.formats
      .filter((format) => !!format.ext)
      .filter((format) => {
        if (filter === "all") return true;
        return filter === "audio" ? isAudioOnly(format) : !isAudioOnly(format);
      })
      .filter((format) => format.format_id && format.format_id !== "0");
  }, [filter, metadata]);

  const qualityBuckets = useMemo(
    () => ({
      hd: formats.filter((format) => (format.height ?? 0) >= 720 && !isAudioOnly(format)),
      sd: formats.filter(
        (format) =>
          (format.height ?? 0) > 0 && (format.height ?? 0) < 720 && !isAudioOnly(format),
      ),
      audio: formats.filter((format) => isAudioOnly(format)),
    }),
    [formats],
  );

  const clipboardPaste = (value: string) => {
    if (!value) return;
    setUrl(value);
    const input = document.querySelector<HTMLInputElement>("#url-input");
    if (input) {
      input.value = value;
    }
  };

  const handleDownload = async () => {
    if (!metadata || !selectedFormat) return;
    await startDownload({ url, metadata, format: selectedFormat });
  };

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-10 md:px-8">
      <section className="relative overflow-hidden rounded-[2.5rem] border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-700 p-8 text-white shadow-xl dark:border-slate-800">
        <div className="absolute inset-0 opacity-60">
          <Image
            src="https://images.unsplash.com/photo-1580894897200-29dc07a215c1?auto=format&fit=crop&w=1600&q=80"
            alt=""
            fill
            className="object-cover"
          />
        </div>
        <div className="relative flex flex-col gap-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-wide">
                Cross-Platform Downloader
              </span>
              <h1 className="mt-4 text-3xl font-semibold leading-tight text-white md:text-4xl">
                Save videos & audio from 40+ social platforms instantly.
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-white/80 md:text-base">
                StreamSaviour powers high-speed downloads with multiple quality options,
                background support, and automatic history syncing across sessions.
              </p>
            </div>
            <div className="rounded-3xl bg-white/10 p-5 text-center backdrop-blur">
              <span className="text-sm uppercase tracking-wide text-white/70">
                Supported Platforms
              </span>
              <p className="mt-2 text-4xl font-semibold">{PLATFORM_COUNT}+</p>
              <p className="text-xs text-white/70">and counting</p>
            </div>
          </div>
          <form
            id="analyze-form"
            onSubmit={handleSubmit}
            className="glass relative flex flex-col gap-2 rounded-3xl border border-white/20 bg-white/90 p-4 text-slate-900 shadow-2xl backdrop-blur-xl dark:bg-slate-950/70 dark:text-slate-100"
          >
            <label htmlFor="url-input" className="text-xs font-semibold uppercase">
              Video URL
            </label>
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="flex flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-600 focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-sky-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                <Search className="h-4 w-4 text-slate-300" />
                <input
                  id="url-input"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                  placeholder="Paste any video link from YouTube, Instagram, TikTok…"
                  required
                />
                {url ? (
                  <button
                    type="button"
                    onClick={() => setUrl("")}
                    className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500 transition hover:bg-slate-200"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-sky-400 md:w-auto"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analysing…
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Analyse URL
                  </>
                )}
              </button>
            </div>
            <ClipboardHint onPaste={clipboardPaste} />
            {error ? (
              <p className="text-sm text-red-400">Error: {error}</p>
            ) : null}
          </form>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Format & Quality Options
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Choose between multiple qualities, codecs, and formats for your download.
                </p>
              </div>
              <div className="flex rounded-full bg-slate-100 p-1 text-xs dark:bg-slate-800">
                {(["all", "video", "audio"] as FormatFilter[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setFilter(option)}
                    className={clsx(
                      "flex items-center gap-1 rounded-full px-3 py-1.5 capitalize transition",
                      filter === option
                        ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
                        : "text-slate-500",
                    )}
                  >
                    {option === "audio" ? (
                      <AudioLines className="h-3.5 w-3.5" />
                    ) : option === "video" ? (
                      <Video className="h-3.5 w-3.5" />
                    ) : (
                      <CirclePlay className="h-3.5 w-3.5" />
                    )}
                    {option}
                  </button>
                ))}
              </div>
            </header>
            {!metadata ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-800">
                <Video className="h-6 w-6" />
                Paste a URL to inspect available download options.
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-800/70">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
                    <div className="relative h-28 w-full overflow-hidden rounded-2xl md:w-48">
                      {metadata.thumbnail ? (
                        <Image
                          src={metadata.thumbnail}
                          alt={metadata.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-slate-200 text-slate-500">
                          <Video className="h-10 w-10" />
                        </div>
                      )}
                      {metadata.duration ? (
                        <span className="absolute bottom-2 right-2 rounded-full bg-black/70 px-3 py-1 text-xs text-white">
                          {formatDuration(metadata.duration)}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-col gap-2">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        {metadata.title}
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {metadata.uploader}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-400">
                        {SUPPORTED_PLATFORMS.slice(0, 6).map((platform) => (
                          <span
                            key={platform}
                            className="rounded-full bg-white px-3 py-1 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700"
                          >
                            {platform}
                          </span>
                        ))}
                        <span className="rounded-full bg-white px-3 py-1 text-slate-400 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
                          + more
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                        <div className="rounded-2xl bg-white px-3 py-2 text-center shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
                          <p className="text-[11px] uppercase text-slate-400">HD</p>
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                            {qualityBuckets.hd.length}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-white px-3 py-2 text-center shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
                          <p className="text-[11px] uppercase text-slate-400">SD</p>
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                            {qualityBuckets.sd.length}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-white px-3 py-2 text-center shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
                          <p className="text-[11px] uppercase text-slate-400">Audio</p>
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                            {qualityBuckets.audio.length}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {formats.map((format) => (
                    <FormatOption
                      key={format.format_id}
                      format={format}
                      isSelected={selectedFormat?.format_id === format.format_id}
                      onSelect={(picked) => setSelectedFormat(picked)}
                    />
                  ))}
                </div>
                {!formats.length ? (
                  <p className="text-sm text-slate-400">
                    No formats available for the applied filter. Try another category.
                  </p>
                ) : null}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={!selectedFormat}
                    onClick={handleDownload}
                    className="flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Download className="h-4 w-4" />
                    Start Download
                  </button>
                  {selectedFormat ? (
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {selectedFormat.ext.toUpperCase()} ·{" "}
                      {getQualityLabel(selectedFormat)} ·{" "}
                      {formatBytes(selectedFormat.filesize)}
                    </span>
                  ) : null}
                </div>
              </div>
            )}
          </div>
          <ActiveDownloads
            downloads={downloads}
            onPause={pauseDownload}
            onResume={resumeDownload}
            onCancel={cancelDownload}
          />
        </div>
        <div className="flex flex-col gap-8">
          <SearchHistoryPanel />
          <DownloadHistoryPanel />
        </div>
      </section>
      <SupportedPlatformsGrid />
    </main>
  );
}
function SupportedPlatformsGrid() {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
            <CirclePlay className="h-5 w-5 text-sky-500" />
            Supported Platforms
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Works seamlessly with major social media, video and audio hubs.
          </p>
        </div>
      </header>
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {SUPPORTED_PLATFORMS.map((platform) => (
          <div
            key={platform}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:text-sky-600 hover:shadow-md dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300"
          >
            {platform}
          </div>
        ))}
      </div>
    </section>
  );
}
