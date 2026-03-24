"use strict";
(() => {
  // src/types.ts
  var MAX_BODY_LENGTH_BYTES = 100 * 1024;
  function truncateBody(body) {
    if (body == null) return void 0;
    const encoder = new TextEncoder();
    const bytes = encoder.encode(body);
    if (bytes.byteLength <= MAX_BODY_LENGTH_BYTES) {
      return body;
    }
    const truncated = bytes.slice(0, MAX_BODY_LENGTH_BYTES);
    const decoder = new TextDecoder();
    return decoder.decode(truncated) + "\n/* truncated */";
  }

  // src/inject.ts
  var ORIGINAL_FETCH = window.fetch.bind(window);
  var OriginalXHR = XMLHttpRequest;
  function uuid() {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
  function isBinaryResponse(response) {
    const contentType = response.headers.get("content-type") || "";
    return /application\/octet-stream|image\/|audio\/|video\//i.test(contentType);
  }
  async function readSafeBody(response) {
    try {
      if (isBinaryResponse(response)) {
        return void 0;
      }
      const clone = response.clone();
      const text = await clone.text();
      const truncated = truncateBody(text);
      if (!truncated) return void 0;
      try {
        return JSON.parse(truncated);
      } catch {
        return truncated;
      }
    } catch {
      return void 0;
    }
  }
  function extractRequestBody(body) {
    if (!body) return void 0;
    try {
      if (typeof body === "string") {
        const truncated = truncateBody(body);
        if (!truncated) return void 0;
        try {
          return JSON.parse(truncated);
        } catch {
          return truncated;
        }
      }
      if (body instanceof URLSearchParams) {
        return Object.fromEntries(body.entries());
      }
      if (body instanceof Blob) {
        return void 0;
      }
      if (body instanceof FormData) {
        const obj = {};
        for (const [key, value] of body.entries()) {
          obj[key] = typeof value === "string" ? value : void 0;
        }
        return obj;
      }
    } catch {
      return void 0;
    }
    return void 0;
  }
  function postNetworkRequest(data) {
    try {
      window.postMessage(
        {
          source: "fetchlens",
          payload: data
        },
        "*"
      );
    } catch {
    }
  }
  function patchFetch() {
    try {
      window.fetch = async (...args) => {
        const start = performance.now();
        const id = uuid();
        try {
          const input = args[0];
          const init2 = args[1] || {};
          const method = (init2.method || (typeof input === "string" ? "GET" : input instanceof Request ? input.method : "GET")).toUpperCase();
          const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);
          const requestHeaders = {};
          if (init2.headers instanceof Headers) {
            init2.headers.forEach((value, key) => {
              requestHeaders[key] = value;
            });
          } else if (Array.isArray(init2.headers)) {
            for (const [key, value] of init2.headers) {
              requestHeaders[key] = value;
            }
          } else if (init2.headers && typeof init2.headers === "object") {
            Object.assign(requestHeaders, init2.headers);
          } else if (input instanceof Request) {
            input.headers.forEach((value, key) => {
              requestHeaders[key] = value;
            });
          }
          const requestBody = extractRequestBody(init2.body ?? (input instanceof Request ? input._bodyInit : void 0));
          const response = await ORIGINAL_FETCH(...args);
          const end = performance.now();
          const duration = end - start;
          const responseBody = await readSafeBody(response);
          const responseHeaders = {};
          response.headers.forEach((value, key) => {
            responseHeaders[key] = value;
          });
          const payload = {
            id,
            type: "fetch",
            url,
            method,
            status: response.status,
            requestHeaders,
            requestBody,
            responseHeaders,
            responseBody,
            duration,
            timestamp: Date.now()
          };
          postNetworkRequest(payload);
          return response;
        } catch (error) {
          try {
            const result = await ORIGINAL_FETCH(...args);
            return result;
          } catch (innerErr) {
            throw innerErr;
          }
        }
      };
    } catch {
    }
  }
  function patchXHR() {
    try {
      const OriginalOpen = OriginalXHR.prototype.open;
      const OriginalSend = OriginalXHR.prototype.send;
      OriginalXHR.prototype.open = function(method, url, async, username, password) {
        try {
          this._fetchlens = {
            id: uuid(),
            method: method.toUpperCase(),
            url: String(url),
            startTime: 0,
            requestBody: void 0
          };
        } catch {
        }
        return OriginalOpen.call(this, method, url, async ?? true, username ?? null, password ?? null);
      };
      OriginalXHR.prototype.send = function(body) {
        const meta = this._fetchlens;
        if (meta) {
          meta.startTime = performance.now();
          meta.requestBody = extractRequestBody(body);
          const onLoadEnd = () => {
            try {
              const end = performance.now();
              const duration = end - meta.startTime;
              const status = this.status;
              let responseBody = void 0;
              try {
                const text = typeof this.responseText === "string" ? this.responseText : "";
                const truncated = truncateBody(text);
                if (truncated) {
                  try {
                    responseBody = JSON.parse(truncated);
                  } catch {
                    responseBody = truncated;
                  }
                }
              } catch {
                responseBody = void 0;
              }
              const headersRaw = this.getAllResponseHeaders() || "";
              const responseHeaders = {};
              headersRaw.trim().split(/[\r\n]+/).forEach((line) => {
                const parts = line.split(": ");
                const header = parts.shift();
                if (!header) return;
                const value = parts.join(": ");
                responseHeaders[header.toLowerCase()] = value;
              });
              const payload = {
                id: meta.id,
                type: "xhr",
                url: meta.url,
                method: meta.method,
                status,
                requestBody: meta.requestBody,
                responseHeaders,
                responseBody,
                duration,
                timestamp: Date.now()
              };
              postNetworkRequest(payload);
            } catch {
            } finally {
              this.removeEventListener("load", onLoadEnd);
              this.removeEventListener("error", onLoadEnd);
              this.removeEventListener("abort", onLoadEnd);
            }
          };
          this.addEventListener("load", onLoadEnd);
          this.addEventListener("error", onLoadEnd);
          this.addEventListener("abort", onLoadEnd);
        }
        return OriginalSend.call(this, body);
      };
    } catch {
    }
  }
  function init() {
    patchFetch();
    patchXHR();
  }
  try {
    init();
  } catch {
  }
})();
