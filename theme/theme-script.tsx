const SCRIPT = `(function(){try{function apply(){var t=document.cookie.match(/(?:^|; )sf_theme=([^;]*)/);var v=t?decodeURIComponent(t[1]):"system";var m=window.matchMedia("(prefers-color-scheme: dark)");var dark=v==="dark"||(v==="system"&&m.matches);document.documentElement.setAttribute("data-theme",dark?"dark":"light");}apply();var mq=window.matchMedia("(prefers-color-scheme: dark)");if(mq.addEventListener){mq.addEventListener("change",apply);}else if(mq.addListener){mq.addListener(apply);}}catch(e){}})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
