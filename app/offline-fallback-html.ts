export const OFFLINE_FALLBACK_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<title>Sem internet</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
    padding: 24px; text-align: center;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background: #fdf8f3; color: #1f1d1c;
  }
  main { display: flex; flex-direction: column; align-items: center; gap: 20px; max-width: 22rem; }
  .icon {
    width: 56px; height: 56px; display: flex; align-items: center; justify-content: center;
    border-radius: 16px; border: 1px solid rgba(31,29,28,0.1); background: rgba(255,255,255,0.7);
  }
  h1 { font-size: 1.25rem; font-weight: 700; margin: 0; letter-spacing: -0.01em; }
  p { font-size: 0.875rem; line-height: 1.55; margin: 0; color: rgba(31,29,28,0.72); }
  .actions { display: flex; flex-direction: column; gap: 10px; width: 100%; }
  button, a.btn {
    display: inline-flex; align-items: center; justify-content: center;
    border-radius: 999px; padding: 11px 24px; font-size: 0.875rem; font-weight: 600;
    text-decoration: none; cursor: pointer; border: none;
  }
  button { background: #1f1d1c; color: #fdf8f3; }
  a.btn { background: transparent; color: #1f1d1c; border: 1px solid rgba(31,29,28,0.2); }
  @media (prefers-color-scheme: dark) {
    body { background: #1f1d1c; color: #fdf8f3; }
    .icon { border-color: rgba(253,248,243,0.12); background: rgba(253,248,243,0.06); }
    p { color: rgba(253,248,243,0.78); }
    button { background: #fdf8f3; color: #1f1d1c; }
    a.btn { color: #fdf8f3; border-color: rgba(253,248,243,0.24); }
  }
</style>
</head>
<body>
<main>
  <div class="icon" aria-hidden="true">
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#f28e25" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
      <path d="m2 2 20 20"/><path d="M5.782 5.782A7 7 0 0 0 9 19h8.5a4.5 4.5 0 0 0 1.307-.193"/><path d="M21.532 16.5A4.5 4.5 0 0 0 17.5 10h-1.79A7.008 7.008 0 0 0 10 5.07"/>
    </svg>
  </div>
  <h1>Sem internet agora</h1>
  <p>A gente atualiza tudo assim que o sinal voltar. Enquanto isso, as calculadoras funcionam offline.</p>
  <div class="actions">
    <button type="button" onclick="location.reload()">Tentar de novo</button>
    <a class="btn" href="/app/simular">Abrir calculadoras</a>
  </div>
</main>
</body>
</html>`;
