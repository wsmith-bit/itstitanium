// TOC + reading progress + anchor ids
(function(){
  // Reading progress
  const bar=document.querySelector('.reading-progress'); if(bar){
    const onScroll=()=>{const h=document.documentElement; const sc=h.scrollTop/(h.scrollHeight-h.clientHeight)*100; bar.style.width=sc+'%'}; 
    document.addEventListener('scroll',onScroll,{passive:true}); onScroll();
  }
  // IDs on headings + TOC build
  const tocEl=document.querySelector('.toc ul'); if(tocEl){
    const hs=[...document.querySelectorAll('h2, h3')];
    hs.forEach(h=>{
      if(!h.id){ h.id=h.textContent.trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''); }
      const li=document.createElement('li'); if(h.tagName==='H3') li.style.paddingLeft='12px';
      const a=document.createElement('a'); a.href='#'+h.id; a.textContent=h.textContent;
      li.appendChild(a); tocEl.appendChild(li);
    });
  }
})();