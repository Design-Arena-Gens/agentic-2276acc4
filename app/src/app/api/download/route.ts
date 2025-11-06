import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import YTDlpWrap from "yt-dlp-wrap";
import { PassThrough, Readable } from "stream";

const requestSchema = z.object({
  url: z.string().url(),
  formatId: z.string().min(1),
  title: z.string().min(1),
  ext: z.string().min(1),
});

const ytDlp = new YTDlpWrap();

const contentTypeFromExt = (ext: string) => {
  switch (ext.toLowerCase()) {
    case "mp3":
      return "audio/mpeg";
    case "m4a":
      return "audio/mp4";
    case "aac":
      return "audio/aac";
    case "ogg":
      return "audio/ogg";
    case "wav":
      return "audio/wav";
    case "webm":
      return "video/webm";
    case "3gp":
      return "video/3gpp";
    case "mov":
      return "video/quicktime";
    case "flv":
      return "video/x-flv";
    default:
      return "video/mp4";
  }
};

const sanitizeFileName = (title: string, ext: string) =>
  `${title
    .trim()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "video"}-${Date.now()}.${ext}`;

export async function GET(req: NextRequest) {
  try {
    const params = requestSchema.parse(
      Object.fromEntries(req.nextUrl.searchParams.entries()),
    );

    const process = ytDlp.exec([
      params.url,
      "-f",
      params.formatId,
      "-o",
      "-",
      "--quiet",
      "--no-warnings",
      "--no-call-home",
    ]);

    const nodeStream = (process as unknown as { stdout: NodeJS.ReadableStream | null }).stdout;

    if (!nodeStream) {
      throw new Error("Failed to initialise download stream.");
    }

    const passThrough = new PassThrough();
    nodeStream.pipe(passThrough);
    const webStream = Readable.toWeb(passThrough) as unknown as ReadableStream<Uint8Array>;
    const headers = new Headers();
    headers.set("Content-Type", contentTypeFromExt(params.ext));
    headers.set(
      "Content-Disposition",
      `attachment; filename="${sanitizeFileName(params.title, params.ext)}"`,
    );
    headers.set("Cache-Control", "no-store");

    (process as unknown as { stderr?: NodeJS.ReadableStream }).stderr?.on(
      "data",
      (chunk) => {
        console.warn("[download:stderr]", chunk.toString());
      },
    );

    process.on("error", (error) => {
      console.error("[download:error]", error);
    });

    return new NextResponse(webStream as unknown as BodyInit, {
      headers,
    });
  } catch (error) {
    console.error("[download]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to start download stream.",
      },
      { status: 400 },
    );
  }
}
