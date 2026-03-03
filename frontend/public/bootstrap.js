(function () {
  window.__PUSHME_REACT_BOOTED = false;

  function postTelegramEvent(eventType, eventData) {
    var payload = JSON.stringify(eventData || {});
    try {
      if (window.TelegramWebviewProxy && typeof window.TelegramWebviewProxy.postEvent === "function") {
        window.TelegramWebviewProxy.postEvent(eventType, payload);
        return true;
      }
    } catch (e) {}
    try {
      if (window.external && typeof window.external.notify === "function") {
        window.external.notify(JSON.stringify({ eventType: eventType, eventData: eventData || {} }));
        return true;
      }
    } catch (e) {}
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(JSON.stringify({ eventType: eventType, eventData: eventData || {} }), "*");
        return true;
      }
    } catch (e) {}
    return false;
  }

  function notifyIframeReady() {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(
          JSON.stringify({ eventType: "iframe_ready", eventData: { reload_supported: true } }),
          "*"
        );
      }
    } catch (e) {}
  }

  function forceReady() {
    notifyIframeReady();

    var webApp = window.Telegram && window.Telegram.WebApp;
    if (webApp) {
      try {
        webApp.ready && webApp.ready();
        webApp.expand && webApp.expand();
        return;
      } catch (e) {}
    }
    postTelegramEvent("web_app_ready", {});
    postTelegramEvent("web_app_expand", {});
  }

  function loadScript(src, done, timeoutMs) {
    var script = document.createElement("script");
    var finished = false;
    var timer = window.setTimeout(function () {
      if (finished) return;
      finished = true;
      done(false);
    }, timeoutMs || 4000);

    function finish(ok) {
      if (finished) return;
      finished = true;
      window.clearTimeout(timer);
      done(ok);
    }

    script.src = src;
    script.async = true;
    script.onload = function () {
      finish(true);
    };
    script.onerror = function () {
      finish(false);
    };
    document.head.appendChild(script);
  }

  function loadTelegramSdkWithFallback() {
    loadScript("https://telegram.org/js/telegram-web-app.js", function (ok) {
      if (ok) {
        forceReady();
        return;
      }
      loadScript("/telegram-web-app.js", function () {
        forceReady();
      });
    });
  }

  loadTelegramSdkWithFallback();
  forceReady();
  var readyTick = window.setInterval(forceReady, 300);
  window.setTimeout(function () {
    window.clearInterval(readyTick);
  }, 12000);

  window.addEventListener("DOMContentLoaded", function () {
    forceReady();
    window.setTimeout(forceReady, 250);
    window.setTimeout(forceReady, 1200);
  });
  window.addEventListener("load", forceReady);

  window.setTimeout(function () {
    if (window.__PUSHME_REACT_BOOTED) return;
    var root = document.getElementById("root");
    if (!root || root.children.length > 0) return;
    root.innerHTML =
      '<div style="padding:16px;color:#fff;font-family:-apple-system,system-ui,sans-serif;background:#111;min-height:100vh;">' +
      "<h3>Mini App не запустился</h3>" +
      "<p>Нажми reload в Telegram и открой снова через /start.</p>" +
      "</div>";
  }, 12000);

  window.addEventListener("error", function (event) {
    var root = document.getElementById("root");
    if (!root) return;
    root.innerHTML =
      '<div style="padding:16px;color:#fff;font-family:-apple-system,system-ui,sans-serif;background:#111;min-height:100vh;">' +
      "<h3>Ошибка запуска Mini App</h3>" +
      "<p>Обновите страницу или откройте снова через /start.</p>" +
      "</div>";
    console.error("Global error:", event.error || event.message);
  });
})();
