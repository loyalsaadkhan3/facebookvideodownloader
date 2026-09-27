(() => {
  "use strict";

  const BUTTON_CLASS = "fb-vd-download-btn";
  const API_MESSAGE = "DOWNLOAD_VIDEO";

  function isFacebookVideoPage() {
    return /(^|\.)facebook\.com$/i.test(location.hostname) ||
           /(^|\.)fb\.watch$/i.test(location.hostname);
  }

  function getVideoCandidates(video) {
    const urls = [];
    const add = (value) => {
      if (typeof value !== "string" || !value) return;
      if (/^https?:\/\//i.test(value)) urls.push(value);
    };

    add(video.currentSrc);
    add(video.src);

    video.querySelectorAll("source").forEach(source => add(source.src));

    // Only use normal HTTP(S) URLs. Blob URLs are not useful to the Vercel
    // server because they exist only inside this browser tab.
    return [...new Set(urls)].filter(url => !/^blob:/i.test(url));
  }

  function findVideo() {
    const videos = [...document.querySelectorAll("video")];
    if (!videos.length) return null;

    // Prefer a visible video with a real HTTP(S) source.
    const visible = videos.find(video => {
      const rect = video.getBoundingClientRect();
      return rect.width > 150 &&
             rect.height > 100 &&
             rect.bottom > 0 &&
             rect.right > 0 &&
             getVideoCandidates(video).length;
    });

    return visible || videos.find(video => getVideoCandidates(video).length) || null;
  }

  function createButton(video) {
    if (!video || video.dataset.fbVdButton === "1") return;
    video.dataset.fbVdButton = "1";

    const button = document.createElement("button");
    button.className = BUTTON_CLASS;
    button.type = "button";
    button.textContent = "Download";
    button.title = "Download this accessible video";

    Object.assign(button.style, {
      position: "absolute",
      zIndex: "2147483647",
      right: "12px",
      top: "12px",
      padding: "8px 12px",
      border: "0",
      borderRadius: "8px",
      background: "#1877f2",
      color: "#fff",
      fontSize: "13px",
      fontWeight: "600",
      cursor: "pointer",
      boxShadow: "0 2px 8px rgba(0,0,0,.25)"
    });

    const wrapper = video.parentElement;
    if (!wrapper) return;

    const position = getComputedStyle(wrapper).position;
    if (position === "static") wrapper.style.position = "relative";

    wrapper.appendChild(button);

    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();

      button.disabled = true;
      button.textContent = "Preparing...";

      try {
        const candidates = getVideoCandidates(video);

        if (!candidates.length) {
          throw new Error(
            "No direct HTTP(S) video URL is exposed by this video. " +
            "Blob/protected streams cannot be sent to the server."
          );
        }

        let lastError = null;

        for (const url of candidates) {
          try {
            const response = await chrome.runtime.sendMessage({
              type: API_MESSAGE,
              url
            });

            if (response?.ok) {
              button.textContent = "Download started";
              setTimeout(() => {
                button.textContent = "Download";
                button.disabled = false;
              }, 1800);
              return;
            }

            lastError = new Error(response?.error || "Download failed");
          } catch (error) {
            lastError = error;
          }
        }

        throw lastError || new Error("Download failed");
      } catch (error) {
        console.error("[Facebook Downloader]", error);
        button.textContent = "Download failed";
        button.title = error?.message || "Download failed";

        setTimeout(() => {
          button.textContent = "Download";
          button.disabled = false;
        }, 2500);
      }
    });
  }

  function scan() {
    if (!isFacebookVideoPage()) return;
    document.querySelectorAll("video").forEach(createButton);
  }

  const observer = new MutationObserver(scan);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  scan();
  setInterval(scan, 2500);
})();
