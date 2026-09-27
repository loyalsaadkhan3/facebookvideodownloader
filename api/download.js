export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "POST method required"
    });
  }

  try {
    const { url } = req.body || {};

    if (!url || typeof url !== "string") {
      return res.status(400).json({
        error: "Video URL is required"
      });
    }

    const upstream = await fetch(url, {
      redirect: "follow"
    });

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: "Unable to fetch the video"
      });
    }

    const contentType =
      upstream.headers.get("content-type") || "video/mp4";

    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="facebook-video.mp4"'
    );

    if (upstream.body) {
      const reader = upstream.body.getReader();

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        res.write(Buffer.from(value));
      }

      return res.end();
    }

    return res.status(502).json({
      error: "Empty video response"
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Server error"
    });
  }
}
