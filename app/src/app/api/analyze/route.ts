import { NextResponse } from "next/server";
import { z } from "zod";
import YTDlpWrap from "yt-dlp-wrap";
import type { MediaFormat } from "@/lib/types";

const requestSchema = z.object({
  url: z.string().url(),
});

const ytDlp = new YTDlpWrap();

const sanitizeFormats = (raw: MediaFormat[]): MediaFormat[] =>
  raw
    .filter((format) => !!format.format_id && !!format.ext)
    .map((format) => {
      const filesize =
        typeof format.filesize === "number"
          ? format.filesize
          : typeof format.filesize_approx === "number"
            ? format.filesize_approx
            : undefined;
      return {
        ...format,
        filesize,
        qualityLabel:
          format.height && format.width
            ? `${format.height}p`
            : format.format_note ?? undefined,
      };
    });

const parsePayload = (payload: string) => {
  const lines = payload
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) throw new Error("No output returned by yt-dlp");
  const combinedLine = lines.find((line) => line.startsWith("{")) ?? lines[0];
  return JSON.parse(combinedLine);
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url } = requestSchema.parse(body);

    const stdout = await ytDlp.execPromise([
      url,
      "--skip-download",
      "--no-warnings",
      "--no-call-home",
      "--dump-json",
    ]);

    const data = parsePayload(stdout);
    const payload = {
      id: data.id,
      title: data.title,
      uploader: data.uploader,
      thumbnail: data.thumbnail,
      description: data.description,
      duration: data.duration,
      extractor: data.extractor,
      webpage_url: data.webpage_url ?? url,
      upload_date: data.upload_date,
      categories: data.categories,
      formats: sanitizeFormats(Array.isArray(data.formats) ? data.formats : []),
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error("[analyze]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to analyze the provided URL.",
      },
      { status: 400 },
    );
  }
}
