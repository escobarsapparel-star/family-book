import { createSupabaseContext } from "npm:@supabase/server";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectsCommand,
  PutBucketCorsCommand,
} from "npm:@aws-sdk/client-s3";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner";

const B2_KEY_ID = Deno.env.get("B2_KEY_ID")!;
const B2_APPLICATION_KEY = Deno.env.get("B2_APPLICATION_KEY")!;
const B2_BUCKET_NAME = Deno.env.get("B2_BUCKET_NAME")!;
const B2_S3_ENDPOINT = Deno.env.get("B2_S3_ENDPOINT")!;
const B2_REGION = Deno.env.get("B2_REGION")!;
const B2_ALLOWED_ORIGIN = Deno.env.get("B2_ALLOWED_ORIGIN")!;
const APP_ALLOWED_ORIGINS = [
  "http://localhost",
  "https://localhost",
  "capacitor://localhost",
];
const ALLOWED_ORIGINS = new Set([B2_ALLOWED_ORIGIN, ...APP_ALLOWED_ORIGINS]);

const s3 = new S3Client({
  endpoint: B2_S3_ENDPOINT,
  region: B2_REGION,
  forcePathStyle: true,
  requestChecksumCalculation: "WHEN_REQUIRED",
  credentials: {
    accessKeyId: B2_KEY_ID,
    secretAccessKey: B2_APPLICATION_KEY,
  },
});

function isAllowedOrigin(origin: string | null) {
  return !origin || ALLOWED_ORIGINS.has(origin);
}

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : B2_ALLOWED_ORIGIN;
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function json(body: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin),
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function cleanPath(value: unknown) {
  const path = String(value ?? "")
    .replace(/^\/+/, "")
    .replace(/\/{2,}/g, "/");

  if (!path || path.includes("..") || path.includes("\\") || path.length > 1024) {
    throw new Error("Invalid media path.");
  }

  return path;
}

function pathParts(path: string) {
  const parts = path.split("/").filter(Boolean);
  return {
    familyId: parts[0] || "",
    uploaderUserId: parts[1] || "",
  };
}

export default {
  fetch: async (req: Request) => {
    const origin = req.headers.get("Origin");

    if (req.method === "OPTIONS") {
      if (!isAllowedOrigin(origin)) {
        return json({ error: "Origin not allowed." }, 403, origin);
      }
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (req.method !== "POST") {
      return json({ error: "POST required." }, 405, origin);
    }

    if (!isAllowedOrigin(origin)) {
      return json({ error: "Origin not allowed." }, 403, origin);
    }

    const { data: ctx, error: authError } = await createSupabaseContext(req, {
      auth: "user",
    });

    if (authError || !ctx) {
      return json(
        {
          error: authError?.message || "Authentication required.",
          code: authError?.code || "AUTH_REQUIRED",
        },
        authError?.status || 401,
        origin,
      );
    }

    const userId = String(ctx.userClaims?.sub || ctx.userClaims?.id || "");
    if (!userId) return json({ error: "Authenticated user ID missing." }, 401, origin);

    const { data: membership, error: membershipError } = await ctx.supabase
      .from("family_memberships")
      .select("family_id, user_id, role, status")
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (membershipError) {
      console.error("Membership lookup failed:", membershipError);
      return json({ error: "Could not verify family membership." }, 500, origin);
    }

    if (!membership?.family_id) {
      return json({ error: "Active family membership required." }, 403, origin);
    }

    const familyId = String(membership.family_id);
    const isAdmin = String(membership.role || "") === "admin";

    let body: any;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON body." }, 400, origin);
    }

    const action = String(body?.action || "");

    try {
      if (action === "health") {
        return json({ ok: true, provider: "backblaze-b2", bucket: B2_BUCKET_NAME, region: B2_REGION, familyId }, 200, origin);
      }

      if (action === "configure-cors") {
        if (!isAdmin) return json({ error: "Family admin access is required." }, 403, origin);

        await s3.send(
          new PutBucketCorsCommand({
            Bucket: B2_BUCKET_NAME,
            CORSConfiguration: {
              CORSRules: [
                {
                  ID: "family-book-browser-media",
                  AllowedOrigins: [B2_ALLOWED_ORIGIN, "http://localhost", "https://localhost"],
                  AllowedMethods: ["GET", "PUT", "HEAD", "DELETE"],
                  AllowedHeaders: ["*"],
                  ExposeHeaders: ["ETag"],
                  MaxAgeSeconds: 3600,
                },
              ],
            },
          }),
        );

        return json({
          ok: true,
          configured: true,
          provider: "backblaze-b2",
          bucket: B2_BUCKET_NAME,
          b2Origins: [B2_ALLOWED_ORIGIN, "http://localhost", "https://localhost"],
          methods: ["GET", "PUT", "HEAD", "DELETE"],
        }, 200, origin);
      }

      if (action === "sign-upload") {
        const path = cleanPath(body?.path);
        const parts = pathParts(path);
        if (parts.familyId !== familyId) return json({ error: "Upload path is outside your family." }, 403, origin);
        if (parts.uploaderUserId !== userId) return json({ error: "Uploads must use your own user folder." }, 403, origin);

        const contentType = String(body?.contentType || "application/octet-stream").slice(0, 150);
        const command = new PutObjectCommand({ Bucket: B2_BUCKET_NAME, Key: path, ContentType: contentType });
        const url = await getSignedUrl(s3, command, { expiresIn: 15 * 60 });
        return json({ ok: true, provider: "backblaze-b2", path, method: "PUT", contentType, url, expiresIn: 15 * 60 }, 200, origin);
      }

      if (action === "sign-downloads") {
        const rawPaths = Array.isArray(body?.paths) ? body.paths : [];
        const paths = [...new Set(rawPaths.map(cleanPath))].slice(0, 100);
        if (!paths.length) return json({ ok: true, urls: {} }, 200, origin);

        for (const path of paths) {
          const parts = pathParts(path);
          if (parts.familyId !== familyId) return json({ error: "A requested media path is outside your family." }, 403, origin);
        }

        const entries = await Promise.all(paths.map(async (path) => {
          const command = new GetObjectCommand({ Bucket: B2_BUCKET_NAME, Key: path });
          const url = await getSignedUrl(s3, command, { expiresIn: 2 * 60 * 60 });
          return [path, url] as const;
        }));

        return json({ ok: true, provider: "backblaze-b2", urls: Object.fromEntries(entries), expiresIn: 2 * 60 * 60 }, 200, origin);
      }

      if (action === "delete") {
        const rawPaths = Array.isArray(body?.paths) ? body.paths : [];
        const paths = [...new Set(rawPaths.map(cleanPath))].slice(0, 100);
        if (!paths.length) return json({ ok: true, deleted: [] }, 200, origin);

        for (const path of paths) {
          const parts = pathParts(path);
          if (parts.familyId !== familyId) return json({ error: "Delete path is outside your family." }, 403, origin);
          if (!isAdmin && parts.uploaderUserId !== userId) return json({ error: "You cannot delete media uploaded by another user." }, 403, origin);
        }

        const result = await s3.send(new DeleteObjectsCommand({
          Bucket: B2_BUCKET_NAME,
          Delete: { Quiet: true, Objects: paths.map((Key) => ({ Key })) },
        }));

        if (result.Errors?.length) {
          console.error("B2 delete errors:", result.Errors);
          return json({
            error: "One or more files could not be deleted.",
            details: result.Errors.map((x) => ({ key: x.Key, code: x.Code })),
          }, 502, origin);
        }

        return json({ ok: true, provider: "backblaze-b2", deleted: paths }, 200, origin);
      }

      return json({ error: "Unknown media action." }, 400, origin);
    } catch (err) {
      console.error("B2 media signer error:", err);
      return json({ error: err instanceof Error ? err.message : "B2 media request failed." }, 500, origin);
    }
  },
};