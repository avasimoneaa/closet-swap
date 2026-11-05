// AI auto-fill: sends a cropped photo to Claude and gets back the piece's name,
// category, color and a one-line description.
const PROMPT = `You catalogue clothing for Closet Swap, an app where friends lend each other clothes. The attached image is a photo the closet owner took of a piece they own. Label the single most prominent clothing item or accessory (if a full outfit is shown, pick the standout piece; ignore the person).
Reply with JSON only, exactly this shape:
{"name":"2-4 word product name in Title Case, e.g. 'Floral Lace Mini'",
"category":"one of Dresses, Tops, Pants, Shorts, Skirts, Shoes, Accessories (coats, jackets and cardigans count as Tops)",
"color":"main color in 1-3 words",
"colorHex":"#rrggbb main color",
"description":"one friendly sentence under 18 words about the piece and when to wear it"}
If there is no clothing in the photo, return {"name":"","description":""}.`;

export class AiError extends Error {
  constructor(code, message, status = 502) { super(message); this.code = code; this.status = status; }
}

export async function labelImage({ mediaType, base64 }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new AiError("no_key", "AI auto-fill isn’t set up yet. Add ANTHROPIC_API_KEY to your .env file.", 503);

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
      max_tokens: 400,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          { type: "text", text: PROMPT },
        ],
      }],
    }),
  });

  if (res.status === 429) throw new AiError("rate_limited", "The assistant is busy. Give it a minute and try again.", 429);
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("Anthropic API error", res.status, detail.slice(0, 300));
    throw new AiError("upstream", "The assistant couldn’t read this photo. Try again, or fill in the details yourself.");
  }

  const body = await res.json();
  const text = (body.content || []).filter(b => b.type === "text").map(b => b.text).join("");
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new AiError("bad_reply", "The assistant couldn’t read this photo. Try again, or fill in the details yourself.");
  try {
    return JSON.parse(match[0]);
  } catch {
    throw new AiError("bad_reply", "The assistant couldn’t read this photo. Try again, or fill in the details yourself.");
  }
}
