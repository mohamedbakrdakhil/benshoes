/* ======================= thème ======================= */
(function(){const saved=lsGet('benkashoes.theme');if(saved)document.documentElement.setAttribute('data-theme',saved);
  document.addEventListener('click',e=>{if(!e.target.closest('#themebtn'))return;
    const cur=document.documentElement.getAttribute('data-theme');
    const dark=cur?cur==='dark':matchMedia('(prefers-color-scheme: dark)').matches;
    const nx=dark?'light':'dark';document.documentElement.setAttribute('data-theme',nx);lsSet('benkashoes.theme',nx);
    // Le logo est une image, pas du texte : aucune variable CSS ne le suit.
    // Sans ce rappel, il garde la couleur du thème qu'on vient de quitter.
    poserLogo();});
  // Même chose quand c'est le système qui bascule, et seulement si la
  // cliente n'a pas imposé son propre choix.
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{
    if(!document.documentElement.getAttribute('data-theme'))poserLogo();});})();

