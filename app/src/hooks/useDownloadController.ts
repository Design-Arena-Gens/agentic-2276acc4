"use client";

import { useCallback, useMemo, useRef } from "react";
import { v4 as uuid } from "uuid";
import { useHistoryStore } from "@/store/history";
import type { MediaFormat, MediaMetadata } from "@/lib/types";
import { buildFileName } from "@/lib/utils";

type DownloadController = {
  id: string;
  abort: AbortController;
  chunks: Uint8Array[];
  downloadedBytes: number;
  totalBytes?: number;
  metadata: MediaMetadata;
  format: MediaFormat;
};

const mergeChunks = (chunks: Uint8Array[], totalBytes?: number) => {
  const length =
    totalBytes ??
    chunks.reduce((accumulator, chunk) => accumulator + chunk.byteLength, 0);
  const buffer = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return buffer;
};

export const useDownloadController = () => {
  const upsertActive = useHistoryStore((state) => state.upsertActiveDownload);
  const complete = useHistoryStore((state) => state.completeDownload);
  const fail = useHistoryStore((state) => state.failDownload);
  const recordSearch = useHistoryStore((state) => state.recordSearch);

  const controllersRef = useRef<Record<string, DownloadController>>({});

  const performDownload = useCallback(
    async (id: string) => {
      const controller = controllersRef.current[id];
      if (!controller) return;
      const { abort, metadata, format } = controller;

      upsertActive(id, { status: "downloading" });

      const params = new URLSearchParams({
        url: metadata.webpage_url,
        formatId: format.format_id,
        title: metadata.title ?? "video",
        ext: format.ext,
      });

      try {
        const response = await fetch(`/api/download?${params.toString()}`, {
          signal: abort.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error("Unable to start download stream.");
        }

        const reader = response.body.getReader();
        let received = 0;
        const total = controller.totalBytes;
        controller.chunks = [];
        controller.downloadedBytes = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!value) continue;
          controller.chunks.push(value);
          received += value.length;
          controller.downloadedBytes = received;
          upsertActive(id, {
            status: "downloading",
            downloadedBytes: received,
            progress: total ? Math.min(100, (received / total) * 100) : 0,
          });
        }

        const merged = mergeChunks(controller.chunks, received);
        const blob = new Blob([merged], {
          type: response.headers.get("Content-Type") ?? "application/octet-stream",
        });

        const blobUrl = URL.createObjectURL(blob);
        complete(id, {
          blobUrl,
          format,
          size: received,
        });
        delete controllersRef.current[id];
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        throw error;
      }
    },
    [complete, upsertActive],
  );

  const startDownload = useCallback(
    async (request: { url: string; metadata: MediaMetadata; format: MediaFormat }) => {
      const id = uuid();
      const { url, metadata, format } = request;
      const title = metadata.title ?? url;
      const fileName = buildFileName(title, format.ext);

      upsertActive(id, {
        id,
        url,
        title,
        status: "fetching",
        progress: 0,
        downloadedBytes: 0,
        totalBytes: format.filesize ?? format.filesize_approx,
        format,
        requestedAt: new Date().toISOString(),
        fileName,
        thumbnail: metadata.thumbnail,
      });

      controllersRef.current[id] = {
        id,
        abort: new AbortController(),
        chunks: [],
        downloadedBytes: 0,
        totalBytes: format.filesize ?? format.filesize_approx,
        metadata,
        format,
      };

      recordSearch(url, metadata);
      await performDownload(id).catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        const message =
          error instanceof Error ? error.message : "Failed to initiate download.";
        fail(id, message);
      });

      return id;
    },
    [fail, performDownload, recordSearch, upsertActive],
  );

  const pauseDownload = useCallback(
    (id: string) => {
      const controller = controllersRef.current[id];
      if (!controller) return;
      controller.abort.abort();
      controller.abort = new AbortController();
      controller.chunks = [];
      controller.downloadedBytes = 0;
      upsertActive(id, { status: "paused", progress: 0, downloadedBytes: 0 });
    },
    [upsertActive],
  );

  const resumeDownload = useCallback(
    async (id: string) => {
      const controller = controllersRef.current[id];
      if (!controller) return;
      controller.abort = new AbortController();
      upsertActive(id, { status: "downloading" });
      await performDownload(id);
    },
    [performDownload, upsertActive],
  );

  const cancelDownload = useCallback(
    (id: string) => {
      const controller = controllersRef.current[id];
      if (!controller) return;
      controller.abort.abort();
      delete controllersRef.current[id];
      upsertActive(id, { status: "cancelled" });
    },
    [upsertActive],
  );

  const downloads = useHistoryStore((state) => state.activeDownloads);

  return useMemo(
    () => ({
      downloads,
      startDownload,
      pauseDownload,
      resumeDownload,
      cancelDownload,
    }),
    [cancelDownload, downloads, pauseDownload, resumeDownload, startDownload],
  );
};
