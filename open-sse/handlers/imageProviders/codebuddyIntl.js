// CodeBuddy (codebuddy-intl / codebuddy-cn) image adapter.
//
// Text-to-image posts to /v2/images/generations. Image-to-image (editing)
// posts to /v2/images/edits with an `image` field (a data URL). The upstream
// picks the right behaviour from the presence of the image, so we switch the
// URL here based on the request body.
//
// Verified upstream contract (from two independent reverse-engineering
// projects, Oct 2026): POST /v2/images/edits
//   { model, prompt, size, n, image: "data:image/png;base64,..." }
//
// This is an ADDITIVE adapter: it only replaces the shared OpenAI factory for
// the codebuddy providers. Every other image provider keeps its own adapter.
import { PROVIDER_MEDIA } from "../../providers/index.js";

const imageCfg = (id) => PROVIDER_MEDIA[id]?.imageConfig || {};

/** Normalise a reference image (raw base64, data URL) to a data URL. */
function toDataUrl(input, mimeType) {
  if (!input || typeof input !== "string") return null;
  if (input.startsWith("data:")) return input;
  if (/^https?:\/\//i.test(input)) return input;
  const mime = mimeType || "image/png";
  return `data:${mime};base64,${input}`;
}

/**
 * Coerce a caller seed to the int32 the upstream expects.
 * Numeric strings/numbers pass through (clamped to a positive int32). A
 * non-numeric seed (e.g. an old base36 preset) is hashed to a STABLE int so the
 * same seed string still reproduces the same result.
 */
function toSeedInt(seed) {
  if (typeof seed === "number" && Number.isFinite(seed)) {
    return Math.abs(Math.trunc(seed)) % 2147483647;
  }
  if (typeof seed === "string") {
    const t = seed.trim();
    if (/^-?\d+$/.test(t)) {
      return Math.abs(parseInt(t, 10)) % 2147483647;
    }
    // FNV-1a 32-bit -> positive int32, deterministic per seed string.
    let h = 0x811c9dc5;
    for (let i = 0; i < t.length; i++) {
      h ^= t.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0) % 2147483647;
  }
  return null;
}

export default function createCodebuddyImageAdapter(providerId) {
  const cfg = imageCfg(providerId);
  const generationsUrl = cfg.baseUrl;
  const editsUrl = cfg.editsUrl || String(generationsUrl || "").replace(/\/generations\/?$/, "/edits");

  return {
    // Extra `body` arg is optional; existing call sites pass (model, credentials).
    buildUrl: (_model, _credentials, body) => {
      const hasImage = !!(
        body && (body.image || (Array.isArray(body.images) && body.images.length > 0))
      );
      return hasImage ? editsUrl : generationsUrl;
    },
    buildHeaders: (credentials) => {
      const headers = { "Content-Type": "application/json", ...(cfg.headers || {}) };
      const key = credentials?.apiKey || credentials?.accessToken;
      if (key) headers["Authorization"] = `Bearer ${key}`;
      return headers;
    },
    buildBody: (model, body) => {
      const { prompt, n = 1, size = "1024x1024" } = body;
      // Keep the exact field set the text-to-image path already uses (it works),
      // and add `image` only for the editing path.
      const full = { model, prompt, n, size };
      // The upstream EditImageRequest expects `image` as an ARRAY of strings
      // (verified live: "cannot unmarshal string into Go struct field
      // EditImageRequest.image of type []string"). Accept the caller's `image`
      // whether it is a single string or an array, and normalise to a list.
      const rawList = Array.isArray(body.images)
        ? body.images
        : Array.isArray(body.image)
          ? body.image
          : body.image
            ? [body.image]
            : [];
      const images = rawList
        .map((raw) => toDataUrl(raw, body.image_mime || body.mimeType))
        .filter(Boolean);
      if (images.length > 0) full.image = images;
      // Forward a seed when the caller supplies one. Upstream field is
      // `EditImageRequest.seed` of type int32 (verified live: "cannot unmarshal
      // string into Go struct field EditImageRequest.seed of type int32"), so a
      // numeric string must be coerced and a non-numeric one hashed to a stable
      // int (so an old base36 preset still reproduces the same result).
      if (body.seed !== undefined && body.seed !== null && body.seed !== "") {
        const asInt = toSeedInt(body.seed);
        if (asInt !== null) full.seed = asInt;
      }
      return full;
    },
    normalize: (responseBody) => responseBody,
  };
}
