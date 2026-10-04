// CodeBuddy video generation — www.codebuddy.ai/v2/videos/generations
//
// CodeBuddy's video API is async with a unique shape:
// - POST {baseUrl} with {model, prompt, n} → {code:0, data:{id, status:"queued"}}
// - Poll: POST {baseUrl} with {model, prompt, n, id} → {code:0, data:{status, video_url?}}
// Unlike xAI/OpenRouter, polling is a POST (not GET /videos/{id}), and the
// registry transport headers (X-Product, X-IDE-Type, etc.) are required.

const SUPPORTED_ACTIONS = new Set(["generations"]);

function headers(config, token) {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(config.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default {
  buildRequest({ config, action, requestId, rawBody, contentType, token }) {
    const base = config.baseUrl.replace(/\/$/, "");

    // Polling: CodeBuddy uses POST with the id in the body, not GET /videos/{id}.
    // rawBody may be null for GET poll requests — CodeBuddy still needs a JSON
    // body with model + id. Default to "seedance-2.5" (the only video model).
    if (requestId) {
      let body;
      try {
        const parsed = rawBody ? JSON.parse(typeof rawBody === "string" ? rawBody : rawBody.toString("utf8")) : {};
        parsed.id = requestId;
        if (!parsed.model) parsed.model = "seedance-2.5";
        body = JSON.stringify(parsed);
      } catch {
        body = JSON.stringify({ model: "seedance-2.5", id: requestId });
      }
      return { method: "POST", url: base, headers: headers(config, token), body };
    }

    if (!SUPPORTED_ACTIONS.has(action)) {
      return { error: `CodeBuddy video supports 'generations' only (got '${action}')` };
    }
    if (contentType && !contentType.includes("application/json")) {
      return { error: "CodeBuddy video requires an application/json body" };
    }
    return {
      method: "POST",
      url: base,
      headers: headers(config, token),
      body: rawBody,
    };
  },
};
