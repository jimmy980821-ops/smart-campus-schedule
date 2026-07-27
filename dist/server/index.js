/**
 * Sites 部署入口：將所有請求交由平台的靜態資源服務處理。
 * 本機網站本身仍維持 index.html、style.css、script.js 三檔案架構。
 */
export default {
  async fetch(request, env) {
    if (!env.ASSETS || typeof env.ASSETS.fetch !== "function") {
      return new Response("Static asset service is unavailable.", { status: 503 });
    }
    return env.ASSETS.fetch(request);
  }
};
