/* ======================= thème ======================= */
(function(){const saved=lsGet('benkashoes.theme');if(saved)document.documentElement.setAttribute('data-theme',saved);
  document.addEventListener('click',e=>{if(!e.target.closest('#themebtn'))return;
    const cur=document.documentElement.getAttribute('data-theme');
    const dark=cur?cur==='dark':matchMedia('(prefers-color-scheme: dark)').matches;
    const nx=dark?'light':'dark';document.documentElement.setAttribute('data-theme',nx);lsSet('benkashoes.theme',nx);});})();

