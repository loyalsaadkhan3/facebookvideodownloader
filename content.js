(() => {
  const BUTTON = "data-fb-vercel-download";
  const SCANNED = "data-fb-vercel-scanned";

  function valid(v) {
    if (!(v instanceof HTMLVideoElement)) return false;
    const r = v.getBoundingClientRect();
    return r.width >= 180 && r.height >= 120 && r.bottom > 0 && r.right > 0;
  }

  function urlsFor(v) {
    const out = [];
    const add = u => {
      if (!u || u.startsWith("blob:") || u.startsWith("data:")) return;
      if (!out.includes(u)) out.push(u);
    };

    add(v.currentSrc);
    add(v.src);
    v.querySelectorAll("source").forEach(s => add(s.src));

    try {
      performance.getEntriesByType("resource").forEach(e => {
        const u = e.name;
        if (
          /\.mp4(?:[?#]|$)/i.test(u) ||
          /fbcdn|fbsbx/i.test(u)
        ) add(u);
      });
    } catch (_) {}

    out.sort((a,b) =>
      Number(/\.mp4(?:[?#]|$)/i.test(b)) -
      Number(/\.mp4(?:[?#]|$)/i.test(a))
    );

    return out;
  }

  function fileName() {
    const d = new Date();
    const p = n => String(n).padStart(2, "0");
    return `facebook-video-${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.mp4`;
  }

  async function downloadThroughVercel(url) {
    if (!VERCEL_API_URL || VERCEL_API_URL.includes("YOUR-VERCEL-DOMAIN")) {
      throw new Error("Configure VERCEL_API_URL in config.js first.");
    }

    const response = await fetch(VERCEL_API_URL, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({url})
    });

    if (!response.ok) {
      let message = `Vercel API returned ${response.status}`;
      try {
        const data = await response.json();
        if (data?.error) message = data.error;
      } catch (_) {}
      throw new Error(message);
    }

    const blob = await response.blob();

    // The backend is expected to return video/mp4.
    const mp4 = blob.type === "video/mp4"
      ? blob
      : new Blob([blob], {type: "video/mp4"});

    const objectUrl = URL.createObjectURL(mp4);

    try {
      await chrome.runtime.sendMessage({
        action: "saveBlob",
        url: objectUrl,
        filename: fileName()
      });
    } finally {
      setTimeout(() => URL.revokeObjectURL(objectUrl), 15000);
    }
  }

  function add(v) {
    if (!valid(v) || v.hasAttribute(SCANNED)) return;
    v.setAttribute(SCANNED, "1");

    const parent = v.parentElement || v;
    if (getComputedStyle(parent).position === "static")
      parent.style.position = "relative";

    const button = document.createElement("button");
    button.setAttribute(BUTTON, "1");
    button.type = "button";
    button.textContent = "Download MP4";

    button.addEventListener("click", async e => {
      e.preventDefault();
      e.stopPropagation();

      if (button.dataset.busy === "1") return;
      button.dataset.busy = "1";
      button.textContent = "Finding video...";

      const urls = urlsFor(v);

      if (!urls.length) {
        button.textContent = "No video URL";
        setTimeout(() => {
          button.textContent = "Download MP4";
          button.dataset.busy = "0";
        }, 1800);
        return;
      }

      let success = false;
      let lastError = "";

      for (const url of urls.slice(0, 5)) {
        try {
          button.textContent = "Sending to Vercel...";
          await downloadThroughVercel(url);
          success = true;
          break;
        } catch (err) {
          lastError = String(err?.message || err);
        }
      }

      button.textContent = success ? "Downloaded ✓" : "Download failed";
      if (!success) console.warn("Vercel Facebook downloader:", lastError);

      setTimeout(() => {
        button.textContent = "Download MP4";
        button.dataset.busy = "0";
      }, 1800);
    });

    parent.appendChild(button);
  }

  function scan() {
    document.querySelectorAll("video").forEach(add);
  }

  new MutationObserver(scan).observe(
    document.documentElement,
    {childList:true, subtree:true}
  );

  scan();
  setInterval(scan, 2000);
})();