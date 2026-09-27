const API_URL =
  "https://facebookvideodownloader-nine.vercel.app/api/download";

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== "DOWNLOAD_VIDEO") return;

  (async () => {
    try {
      const url = message.url;

      if (!isHttpUrl(url)) {
        throw new Error("Only HTTP(S) video URLs are supported.");
      }

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ url })
      });

      const contentType = response.headers.get("content-type") || "";

      if (!response.ok) {
        let detail = `API returned HTTP ${response.status}`;

        if (contentType.includes("application/json")) {
          try {
            const data = await response.json();
            if (data?.error) detail += `: ${data.error}`;
          } catch {}
        }

        throw new Error(detail);
      }

      if (contentType.includes("application/json")) {
        const data = await response.json();
        throw new Error(data?.error || "API returned an error.");
      }

      const blob = await response.blob();

      if (!blob.size) {
        throw new Error("The API returned an empty video.");
      }

      const objectUrl = URL.createObjectURL(blob);

      try {
        await chrome.downloads.download({
          url: objectUrl,
          filename: "facebook-video.mp4",
          saveAs: false,
          conflictAction: "uniquify"
        });
      } finally {
        // Keep the object URL alive briefly so Chrome's download manager can
        // consume it before it is revoked.
        setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
      }

      sendResponse({ ok: true });
    } catch (error) {
      console.error("[Facebook Downloader] background error:", error);
      sendResponse({
        ok: false,
        error: error?.message || "Download failed"
      });
    }
  })();

  return true;
});
