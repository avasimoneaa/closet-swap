// Closet Swap on Cloudflare Workers.
// Serves the site from ./public and runs AI auto-fill at POST /api/label.
// Only signed-in Supabase users can use auto-fill, so the Anthropic key can't be spent by strangers.

const PROMPT = `You catalogue clothing for Closet Swap, an app where friends lend each other clothes. The attached image is a photo the closet owner took of a piece they own. Label the single most prominent clothing item or accessory (if a full outfit is shown, pick the standout piece; ignore the person).
Reply with JSON only, exactly this shape:
{"name":"2-4 word product name in Title Case, e.g. 'Floral Lace Mini'",
"category":"one of Dresses, Tops, Pants, Shorts, Skirts, Shoes, Accessories (coats, jackets and cardigans count as Tops)",
"color":"main color in 1-3 words",
"colorHex":"#rrggbb main color",
"description":"one friendly sentence under 18 words about the piece and when to wear it"}
If there is no clothing in the photo, return {"name":"","description":""}.`;

const MAX_BODY = 8 * 1024 * 1024; // 8 MB of base64 is plenty for one cropped photo
const TRY_AGAIN = "The assistant couldn’t read this photo. Try again, or fill in the details yourself.";

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

async function signedInUser(request, env) {
  const auth = request.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ") || !env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return null;
  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { authorization: auth, apikey: env.SUPABASE_ANON_KEY },
  });
  if (!res.ok) return null;
  const user = await res.json().catch(() => null);
  return user && user.id ? user : null;
}

export async function handleLabel(request, env) {
  if (!env.ANTHROPIC_API_KEY) return json({ code: "no_key", error: "AI auto-fill isn’t set up yet." }, 503);
  if (!(await signedInUser(request, env))) return json({ code: "signin", error: "Sign in to use AI auto-fill." }, 401);

  const size = Number(request.headers.get("content-length") || 0);
  if (size > MAX_BODY) return json({ code: "too_big", error: "That photo is too large. Try a smaller one." }, 413);

  const body = await request.json().catch(() => null);
  const match = typeof body?.image === "string" && body.image.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return json({ code: "bad_image", error: "Send a JPG, PNG, WebP or GIF photo." }, 400);
  if (match[2].length > MAX_BODY) return json({ code: "too_big", error: "That photo is too large. Try a smaller one." }, 413);

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
      max_tokens: 400,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: match[1], data: match[2] } },
          { type: "text", text: PROMPT },
        ],
      }],
    }),
  });

  if (res.status === 429) return json({ code: "rate_limited", error: "The assistant is busy. Give it a minute and try again." }, 429);
  if (!res.ok) {
    console.error("Anthropic API error", res.status, (await res.text().catch(() => "")).slice(0, 300));
    return json({ code: "upstream", error: TRY_AGAIN }, 502);
  }

  const reply = await res.json().catch(() => ({}));
  const text = (reply.content || []).filter(b => b.type === "text").map(b => b.text).join("");
  const found = text.match(/\{[\s\S]*\}/);
  try {
    return json(JSON.parse(found ? found[0] : ""));
  } catch {
    return json({ code: "bad_reply", error: TRY_AGAIN }, 502);
  }
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/label") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
      return handleLabel(request, env);
    }
    // Everything else is the website. Other /api/ paths return 404, so the app stays in Supabase mode.
    return env.ASSETS.fetch(request);
  },
};
