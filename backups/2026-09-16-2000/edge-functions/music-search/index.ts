const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const query = String(body?.query || "").trim();

    if (query.length < 2) {
      return new Response(JSON.stringify({ results: [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL("https://itunes.apple.com/search");
    url.searchParams.set("term", query);
    url.searchParams.set("country", "ZA");
    url.searchParams.set("media", "music");
    url.searchParams.set("entity", "song");
    url.searchParams.set("limit", "20");
    url.searchParams.set("explicit", "No");

    const appleResponse = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
    });

    if (!appleResponse.ok) {
      const errorText = await appleResponse.text();
      console.error("Apple music search error:", appleResponse.status, errorText);
      throw new Error(`Apple music search failed with status ${appleResponse.status}`);
    }

    const data = await appleResponse.json();
    const results = (data.results || [])
      .filter((item: any) => item.kind === "song")
      .map((item: any) => ({
        track_id: item.trackId,
        title: item.trackName || "",
        artist: item.artistName || "",
        album: item.collectionName || "",
        artwork_url: item.artworkUrl100 || null,
        track_url: item.trackViewUrl || null,
        album_url: item.collectionViewUrl || null,
        release_date: item.releaseDate || null,
        genre: item.primaryGenreName || "",
      }));

    return new Response(JSON.stringify({ query, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("music-search error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Music search failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});