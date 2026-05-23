const SCRIPT = `(function(){try{function ck(n){var m=document.cookie.match(new RegExp("(?:^|; )"+n+"=([^;]*)"));return m?decodeURIComponent(m[1]):"";}function apply(){var d=document.documentElement;var v=ck("sf_theme")||"system";var m=window.matchMedia("(prefers-color-scheme: dark)");var dark=v==="dark"||(v==="system"&&m.matches);d.setAttribute("data-theme",dark?"dark":"light");d.setAttribute("data-cb",ck("sf_cb")==="on"?"on":"off");d.style.fontSize=(ck("sf_textsize")||"16")+"px";d.setAttribute("data-density",ck("sf_density")||"cozy");d.setAttribute("data-motion",ck("sf_motion")||"full");d.setAttribute("data-contrast",ck("sf_contrast")||"normal");}apply();var mq=window.matchMedia("(prefers-color-scheme: dark)");if(mq.addEventListener){mq.addEventListener("change",apply);}else if(mq.addListener){mq.addListener(apply);}}catch(e){}})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
