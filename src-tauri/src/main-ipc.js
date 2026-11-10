// Effect Lab Windows bridge. Tauri's public Builder::invoke_system contract.
// WebView2 injects initialization scripts in subframes too; never install an
// authenticated transport there. The invoke key stays in the top frame closure.
;(function () {
  if (window.top !== window) {
    Object.defineProperty(window.__TAURI_INTERNALS__, 'postMessage', {
      value: function () { throw new Error('Effect Lab: IPC nativo prohibido en la vista previa'); }
    });
    return;
  }
  const key = __INVOKE_KEY__;
  Object.defineProperty(window.__TAURI_INTERNALS__, 'postMessage', {
    value: async function ({ cmd, callback, error, payload, options }) {
      try {
        const headers = new Headers(options?.headers || {});
        headers.set('Content-Type', 'application/json');
        headers.set('Tauri-Callback', String(callback));
        headers.set('Tauri-Error', String(error));
        headers.set('Tauri-Invoke-Key', key);
        const response = await fetch(window.__TAURI_INTERNALS__.convertFileSrc(cmd, 'ipc'), { method: 'POST', body: JSON.stringify(payload), headers });
        const type = response.headers.get('content-type') || '';
        const data = type.includes('application/json') ? await response.json() : type.startsWith('text/') ? await response.text() : await response.arrayBuffer();
        window.__TAURI_INTERNALS__.runCallback(response.headers.get('Tauri-Response') === 'ok' ? callback : error, data);
      } catch (e) { window.__TAURI_INTERNALS__.runCallback(error, String(e)); }
    }
  });
})();
