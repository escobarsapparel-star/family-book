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

    const tmdbToken = Deno.env.get("TMDB_READ_ACCESS_TOKEN");
    if (!tmdbToken) throw new Error("TMDB_READ_ACCESS_TOKEN is not configured");

    const body = await req.json();
    const query = String(body?.query || "").trim();

    if (query.length < 2) {
      return new Response(JSON.stringify({ results: [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL("https://api.themoviedb.org/3/search/multi");
    url.searchParams.set("query", query);
    url.searchParams.set("include_adult", "false");
    url.searchParams.set("language", "en-US");
    url.searchParams.set("page", "1");

    const tmdbResponse = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${tmdbToken}`, Accept: "application/json" },
    });

    if (!tmdbResponse.ok) {
      const errorText = await tmdbResponse.text();
      console.error("TMDB error:", tmdbResponse.status, errorText);
      throw new Error(`TMDB request failed with status ${tmdbResponse.status}`);
    }

    const data = await tmdbResponse.json();
    const results = (data.results || [])
      .filter((item: any) => item.media_type === "movie" || item.media_type === "tv")
      .slice(0, 15)
      .map((item: any) => {
        const isMovie = item.media_type === "movie";
        const title = isMovie ? item.title : item.name;
        const originalTitle = isMovie ? item.original_title : item.original_name;
        const date = isMovie ? item.release_date : item.first_air_date;
        return {
          id: item.id,
          media_type: item.media_type,
          title: title || "",
          original_title: originalTitle || "",
          year: date ? String(date).substring(0, 4) : "",
          release_date: date || "",
          overview: item.overview || "",
          poster_path: item.poster_path || null,
          poster_url: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
          backdrop_path: item.backdrop_path || null,
          backdrop_url: item.backdrop_path ? `https://image.tmdb.org/t/p/w780${item.backdrop_path}` : null,
          popularity: item.popularity || 0,
        };
      });

    return new Response(JSON.stringify({ query, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("tmdb-search error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Movie search failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});