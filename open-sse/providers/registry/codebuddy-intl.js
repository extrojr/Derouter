// CodeBuddy international (codebuddy.ai) — mirrors codebuddy-cn registry shape,
// swapping the Tencent CN domain for the .ai endpoint set. All OAuth/plugin URLs
// use the /v2/plugin prefix with platform=ide (CN uses platform=CLI).
export default {
  id: "codebuddy-intl",
  alias: "cbai",
  uiAlias: "cbai",
  hidden: false,
  priority: 90,
  display: {
    name: "CodeBuddy",
    icon: "smart_toy",
    color: "#006EFF",
    website: "https://www.codebuddy.ai",
    notice: {
      signupUrl: "https://www.codebuddy.ai",
    },
  },
  category: "oauth",
  authModes: ["oauth", "apikey"],
  hasOAuth: true,
  transport: {
    // Chat gateway is OpenAI-compatible SSE (same /v2/chat/completions path as CN).
    baseUrl: "https://www.codebuddy.ai/v2/chat/completions",
    forceStream: true,
    // CodeBuddy intl speaks the same unified OpenAI reasoning_effort shape as CN.
    thinkingFormat: "openai",
    headers: {
      "User-Agent": "IDE/2.108.1 CodeBuddy/2.108.1",
      "X-Product": "SaaS",
      "X-IDE-Type": "IDE",
      "X-IDE-Name": "IDE",
      "x-requested-with": "XMLHttpRequest",
      "x-codebuddy-request": "1",
    },
    auth: {
      combined: true,
      header: "Authorization",
      scheme: "bearer",
    },
    // Intl billing endpoint mirrors CN shape (data.Response.Data.Accounts[]).
    usage: {
      url: "https://www.codebuddy.ai/v2/billing/meter/get-user-resource",
    },
  },
  // Same model lineup exposed by the CN gateway — intl backend is the same catalog.
  // Additional models verified against the live www.codebuddy.ai/v2 gateway (Oct 2026).
  models: [
    { id: "glm-5.3", name: "GLM-5.3" },
    { id: "glm-5.2", name: "GLM-5.2" },
    { id: "glm-5.1", name: "GLM-5.1" },
    { id: "glm-5.0", name: "GLM-5.0" },
    { id: "glm-5.0-turbo", name: "GLM-5.0-Turbo" },
    { id: "glm-5v-turbo", name: "GLM-5v-Turbo" },
    { id: "glm-4.7", name: "GLM-4.7" },
    { id: "minimax-m3", name: "MiniMax-M3" },
    { id: "minimax-m2.7", name: "MiniMax-M2.7" },
    { id: "kimi-k3", name: "Kimi-K3" },
    { id: "kimi-k2.8-preview", name: "Kimi-K2.8-Preview" },
    { id: "kimi-k2.7", name: "Kimi-K2.7-Code" },
    { id: "kimi-k2.6", name: "Kimi-K2.6" },
    { id: "kimi-k2.5", name: "Kimi-K2.5" },
    { id: "hy4-preview", name: "Hy4 Preview" },
    { id: "hy3-preview", name: "Hy3 Preview" },
    { id: "hy3", name: "Hy3" },
    { id: "deepseek-v4-pro", name: "DeepSeek-V4-Pro" },
    // deepseek-v4-flash kept in the list per user contract; the live gateway now
    // serves the same catalog as deepseek-v4.1-flash (older id may 400 on some accounts).
    { id: "deepseek-v4-flash", name: "DeepSeek-V4-Flash" },
    { id: "deepseek-v4.1-flash", name: "DeepSeek-V4.1-Flash" },
    { id: "deepseek-v3-2-volc", name: "DeepSeek-V3.2" },
    { id: "gpt-6-astra", name: "GPT-6-Astra" },
    { id: "gpt-5.6-sol", name: "GPT-5.6-Sol" },
    { id: "gpt-5.6-terra", name: "GPT-5.6-Terra" },
    { id: "gpt-5.6-luna", name: "GPT-5.6-Luna" },
    { id: "gpt-5.6", name: "GPT-5.6" },
    { id: "gpt-5.4", name: "GPT-5.4" },
    { id: "gpt-5.3-codex", name: "GPT-5.3-Codex" },
    { id: "claude-opus-5", name: "Claude-Opus-5" },
    { id: "claude-opus-4.7-1m", name: "Claude-Opus-4.7-1M" },
    { id: "claude-opus-4.6", name: "Claude-Opus-4.6" },
    { id: "gemini-3.1-pro", name: "Gemini-3.1-Pro" },
    { id: "gemini-3.5-flash", name: "Gemini-3.5-Flash" },
    { id: "grok-4.7", name: "Grok-4.7" },
    { id: "grok-4.6", name: "Grok-4.6" },
    // Image generation models (served via /v2/images/generations)
    { id: "gpt-image-2", name: "GPT-Image-2", params: ["n", "size"], kind: "image" },
    { id: "gemini-2.5-flash-image", name: "Gemini-2.5-Flash-Image", params: ["n", "size"], kind: "image" },
    { id: "gemini-3.1-flash-image", name: "Gemini-3.1-Flash-Image", params: ["n", "size"], kind: "image" },
    // Video generation model (served via /v2/videos/generations)
    { id: "seedance-2.5", name: "Seedance-2.5", params: ["n"], kind: "video" },
  ],
  serviceKinds: ["llm", "image", "video"],
  imageConfig: {
    baseUrl: "https://www.codebuddy.ai/v2/images/generations",
    bodyFields: ["model", "prompt", "n", "size"],
  },
  videoConfig: {
    baseUrl: "https://www.codebuddy.ai/v2/videos/generations",
    bodyFields: ["model", "prompt", "n"],
  },
  oauth: {
    baseUrl: "https://www.codebuddy.ai",
    stateUrl: "https://www.codebuddy.ai/v2/plugin/auth/state",
    tokenUrl: "https://www.codebuddy.ai/v2/plugin/auth/token",
    refreshUrl: "https://www.codebuddy.ai/v2/plugin/auth/token/refresh",
    userAgent: "IDE/2.63.2 CodeBuddy/2.63.2",
    platform: "ide",
    pollInterval: 5000,
  },
  features: {
    usage: true,
    usageApikey: true,
  },
};
