// reading progress
(function(){
  const bar = document.querySelector('.reading-progress');
  if(!bar) return;
  const onScroll = () => {
    const h = document.documentElement;
    const scrolled = (h.scrollTop)/(h.scrollHeight - h.clientHeight);
    bar.style.width = (scrolled*100)+'%';
  };
  document.addEventListener('scroll', onScroll, {passive:true});
  onScroll();
})();

// build TOC from h2s
(function(){
  const toc = document.querySelector('.toc ul');
  if(!toc) return;
  const headings = [...document.querySelectorAll('h2')];
  headings.forEach(h => {
    const id = h.textContent.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
    if(!h.id) h.id = id;
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = '#'+h.id;
    a.textContent = h.textContent;
    li.appendChild(a);
    toc.appendChild(li);
  });
})();
