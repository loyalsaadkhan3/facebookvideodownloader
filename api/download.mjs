export default {
  async fetch(request) {
    if (request.method === "GET") {
      return new Response(
        JSON.stringify({
          status: "ok",
          message: "Facebook downloader API is working"
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }

    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({
          error: "POST method required"
        }),
        {
          status: 405,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }

    try {
      const body = await request.json();
      const url = body?.url;

      if (!url) {
        return new Response(
          JSON.stringify({
            error: "Video URL is required"
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json"
            }
          }
        );
      }

      const upstream = await fetch(url, {
        redirect: "follow"
      });

      if (!upstream.ok) {
        return new Response(
          JSON.stringify({
            error: "Unable to fetch video",
            status: upstream.status
          }),
          {
            status: 502,
            headers: {
              "Content-Type": "application/json"
            }
          }
        );
      }

      const headers = new Headers();

      headers.set(
        "Content-Type",
        upstream.headers.get("content-type") || "video/mp4"
      );

      headers.set(
        "Content-Disposition",
        'attachment; filename="facebook-video.mp4"'
      );

      return new Response(upstream.body, {
        status: 200,
        headers
      });

    } catch (error) {
      return new Response(
        JSON.stringify({
          error: "Server error",
          message: error.message
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }
  }
};
