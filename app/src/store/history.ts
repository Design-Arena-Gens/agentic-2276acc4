import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { v4 as uuid } from "uuid";
import type {
  ActiveDownload,
  DownloadHistoryItem,
  MediaMetadata,
  MediaFormat,
  SearchHistoryItem,
} from "@/lib/types";
import { buildFileName } from "@/lib/utils";

type HistoryState = {
  searches: SearchHistoryItem[];
  downloads: DownloadHistoryItem[];
  activeDownloads: Record<string, ActiveDownload>;
};

type HistoryActions = {
  recordSearch: (url: string, metadata?: MediaMetadata) => SearchHistoryItem;
  removeSearch: (id: string) => void;
  clearSearches: () => void;
  upsertActiveDownload: (
    id: string,
    updater:
      | Partial<ActiveDownload>
      | ((prev?: ActiveDownload) => Partial<ActiveDownload> | ActiveDownload),
  ) => ActiveDownload;
  completeDownload: (
    id: string,
    payload: { blobUrl: string; format: MediaFormat; size?: number },
  ) => void;
  failDownload: (id: string, error: string) => void;
  removeDownload: (id: string) => void;
  clearDownloads: () => void;
};

const MAX_HISTORY = 150;

type Store = HistoryState & HistoryActions;

export const useHistoryStore = create<Store>()(
  persist(
    (set, get) => ({
      searches: [],
      downloads: [],
      activeDownloads: {},
      recordSearch: (url, metadata) => {
        const entry: SearchHistoryItem = {
          id: uuid(),
          url,
          createdAt: new Date().toISOString(),
          metadata: metadata
            ? {
                title: metadata.title,
                thumbnail: metadata.thumbnail,
                duration: metadata.duration,
              }
            : undefined,
        };
        set((state) => ({
          searches: [entry, ...state.searches].slice(0, MAX_HISTORY),
        }));
        return entry;
      },
      removeSearch: (id) => {
        set((state) => ({
          searches: state.searches.filter((entry) => entry.id !== id),
        }));
      },
      clearSearches: () => set({ searches: [] }),
      upsertActiveDownload: (id, updater) => {
        const prev = get().activeDownloads[id];
        const nextPartial =
          typeof updater === "function" ? updater(prev) : updater;
        const base: ActiveDownload =
          typeof nextPartial === "object" && "status" in nextPartial
            ? ({ ...prev, ...nextPartial } as ActiveDownload)
            : {
                id,
                url: "",
                title: "",
                requestedAt: new Date().toISOString(),
                status: "queued",
                progress: 0,
                downloadedBytes: 0,
                format: { format_id: "unknown", ext: "mp4" },
                ...nextPartial,
              };
        set((state) => ({
          activeDownloads: {
            ...state.activeDownloads,
            [id]: { ...(prev ?? base), ...nextPartial },
          },
        }));
        return { ...(prev ?? base), ...nextPartial };
      },
      completeDownload: (id, payload) => {
        const active = get().activeDownloads[id];
        if (!active) return;
        const item: DownloadHistoryItem = {
          id,
          title: active.title,
          url: active.url,
          downloadedAt: new Date().toISOString(),
          format: {
            format_id: active.format.format_id,
            ext: active.format.ext,
            format_note: active.format.format_note,
            height: active.format.height,
            width: active.format.width,
            tbr: active.format.tbr,
          },
          fileName: active.fileName ?? buildFileName(active.title, active.format.ext),
          size: payload.size ?? active.totalBytes ?? active.downloadedBytes,
          thumbnail: active.thumbnail,
          blobUrl: payload.blobUrl,
        };
        set((state) => {
          const updated = { ...state.activeDownloads };
          delete updated[id];
          return {
            downloads: [item, ...state.downloads].slice(0, MAX_HISTORY),
            activeDownloads: updated,
          };
        });
      },
      failDownload: (id, error) => {
        set((state) => ({
          activeDownloads: {
            ...state.activeDownloads,
            [id]: {
              ...state.activeDownloads[id],
              status: "error",
              error,
            },
          },
        }));
      },
      removeDownload: (id) => {
        set((state) => ({
          downloads: state.downloads.filter((item) => item.id !== id),
        }));
      },
      clearDownloads: () => set({ downloads: [] }),
    }),
    {
      name: "streamsaviour-history",
      storage:
        typeof window !== "undefined"
          ? createJSONStorage(() => localStorage)
          : undefined,
      partialize: (state) => ({
        searches: state.searches,
        downloads: state.downloads,
      }),
    },
  ),
);

export const useActiveDownloads = () =>
  useHistoryStore((state) => state.activeDownloads);
