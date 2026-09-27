import { spawn } from "node:child_process";
import { Readable } from "node:stream";
import ffmpegPath from "ffmpeg-static";

export const config = { maxDuration: 60 };

function json(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.end(JSON.stringify(data));
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "POST") {
    json(res, 405, {error:"Use POST /api/convert"});
    return;
  }

  try {
    const {url, format="webm"} = req.body || {};

    if (!url || !/^https?:\/\//i.test(url)) {
      json(res, 400, {error:"A direct HTTP(S) video URL is required."});
      return;
    }

    if (format !== "webm") {
      json(res, 400, {error:"This endpoint currently supports WebM output."});
      return;
    }

    if (!ffmpegPath) {
      json(res, 500, {error:"FFmpeg binary is unavailable in this deployment."});
      return;
    }

    const upstream = await fetch(url, {redirect:"follow"});

    if (!upstream.ok || !upstream.body) {
      json(res, 502, {
        error:`Source video could not be fetched (HTTP ${upstream.status}).`
      });
      return;
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "video/webm");
    res.setHeader("Content-Disposition", 'attachment; filename="facebook-converted.webm"');
    res.setHeader("Cache-Control", "no-store");

    const ff = spawn(ffmpegPath, [
      "-hide_banner",
      "-loglevel", "error",
      "-i", "pipe:0",
      "-map", "0:v:0",
      "-map", "0:a:0?",
      "-c:v", "libvpx-vp9",
      "-deadline", "realtime",
      "-cpu-used", "4",
      "-crf", "32",
      "-b:v", "0",
      "-c:a", "libopus",
      "-b:a", "96k",
      "-f", "webm",
      "pipe:1"
    ], {stdio:["pipe","pipe","pipe"]});

    let stderr = "";
    ff.stderr.on("data", chunk => {
      stderr += chunk.toString();
      if (stderr.length > 8000) stderr = stderr.slice(-8000);
    });

    ff.on("error", err => {
      if (!res.headersSent) json(res, 500, {error:"FFmpeg failed to start: "+err.message});
      else res.destroy(err);
    });

    ff.on("close", code => {
      if (code !== 0 && !res.destroyed) {
        res.destroy(new Error(stderr || `FFmpeg exited with code ${code}`));
      }
    });

    Readable.fromWeb(upstream.body).pipe(ff.stdin);
    ff.stdout.pipe(res);

  } catch (error) {
    if (!res.headersSent) {
      json(res, 500, {error:error?.message || "Conversion failed."});
    } else {
      res.destroy(error);
    }
  }
}
