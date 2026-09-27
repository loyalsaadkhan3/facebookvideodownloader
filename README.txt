FACEBOOK REELS & VIDEO DOWNLOADER — VERCEL CONNECTED

FILES
-----
manifest.json       Chrome MV3 manifest
config.js           PUT YOUR VERCEL API URL HERE
content.js          Detects accessible Facebook video URLs
background.js       Saves downloaded MP4
style.css           Download button styling
icons                Extension icons


SETUP
-----
1. Deploy the supplied Vercel backend.
2. Copy its endpoint, for example:
   https://your-project.vercel.app/api/download

3. Open config.js and replace:
   https://YOUR-VERCEL-DOMAIN.vercel.app/api/download

   with your real endpoint.

4. Open chrome://extensions/
5. Turn on Developer mode.
6. Remove the previous Facebook downloader if installed.
7. Click Load unpacked.
8. Select this extension folder.
9. Refresh Facebook.

USAGE
-----
Open a Facebook Reel/video.
Click "Download MP4".
The extension sends the accessible video URL to your Vercel endpoint.
The returned video is saved by Chrome as an .mp4 file.

LIMITATIONS
-----------
This does not bypass DRM, protected media, login restrictions, or Facebook
security controls. Some Reels are delivered as segmented/protected streams
and do not expose a single downloadable MP4 URL.

Also, the Vercel backend is a proxy. Large/long videos may exceed serverless
execution or response limits. For those videos, browser-side downloading is
preferable.

PRIVACY
-------
The extension sends the selected video URL to your configured Vercel server.
Do not put Facebook login cookies or passwords into the extension/API.
