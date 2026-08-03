/* ============ GTO 训练器 · 解锁码验证模块 ============
 * 激活流程：本地验签（快速过滤乱码）→ 联网确认（一码一用，严格模式）
 * 服务器：Cloudflare Workers + KV（gto-license.gto-license.workers.dev）
 */
const LICENSE = {
  API_URL: "https://gto-license.gto-license.workers.dev/activate",
  API_TIMEOUT: 15000,

  PUB_KEY_PEM: '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtm4GAsX/vcnC6bm4EhmE\n9gp+Mv2U3RYrBfnpzBy1euRskcNuYa/vV4pKowocFvwTsvAoSwBOZzvZHINoAyFC\n1zFmLeft+SEDHLyIc++k1kMobG054m5ygSg/THlxjRnL4KGZqxw4D0mozSHnegHB\n9F62MaiJmPvQ+Cg1XHVhoJv8VM2BFxmyIFTf1Zlyl+GRGCYVIjAXXj/h6rf9ymbS\nIORKUwzvVwBzBKXPIKtjJb06j3eQf8J43PIxhB9UOVH7NODHyeFxkOaaZW6zKvbe\nuJrT+940JS2o0zeFBP7DNICAieJejPRfdl5Pw7uoallNnhbOSRnnGz09zuQk9W/9\n3wIDAQAB\n-----END PUBLIC KEY-----',

  isUnlocked() {
    try { return localStorage.getItem("gto_unlocked") === "1"; } catch (e) { return false; }
  },

  setUnlocked() {
    try { localStorage.setItem("gto_unlocked", "1"); } catch (e) {}
  },

  /* 返回 {ok:true} 或 {ok:false, reason:"invalid"|"used"|"network"} */
  async activate(code) {
    const text = String(code || "").trim();
    const parts = text.split("-");
    if (parts.length < 3 || parts[0] !== "GTO") return { ok: false, reason: "invalid" };
    const cid = parts[1];
    if (!cid || cid.length !== 12) return { ok: false, reason: "invalid" };
    const sigB64 = parts.slice(2).join("-");
    const data = new TextEncoder().encode("GTO-" + cid);

    // 第一步：本地验签（快速过滤乱码，验签失败不发网络请求）
    let sig, key;
    try {
      sig = this._b64ToBuf(sigB64);
      key = await this._importKey();
      const ok = await crypto.subtle.verify(
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        key, sig, data
      );
      if (!ok) return { ok: false, reason: "invalid" };
    } catch (e) {
      return { ok: false, reason: "invalid" };
    }

    // 第二步：联网确认（严格一码一用；激活后离线可用）
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), this.API_TIMEOUT);
      const resp = await fetch(this.API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: text }),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      const data = await resp.json();
      if (data.ok) {
        this.setUnlocked();
        return { ok: true };
      }
      return { ok: false, reason: data.reason === "used" ? "used" : "invalid" };
    } catch (e) {
      return { ok: false, reason: "network" };
    }
  },

  _b64ToBuf(b64) {
    const s = b64.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(s);
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    return buf;
  },

  async _importKey() {
    const pem = this.PUB_KEY_PEM.replace(/-----BEGIN PUBLIC KEY-----/, "")
      .replace(/-----END PUBLIC KEY-----/, "").replace(/\s+/g, "");
    const der = this._b64ToBuf(pem);
    return crypto.subtle.importKey(
      "spki", der,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false, ["verify"]
    );
  },
};
