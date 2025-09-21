(function(){
  const progressEl = document.querySelector('.reading-progress');
  const doc = document.documentElement;
  if (progressEl) {
    const updateProgress = () => {
      const scrollTop = doc.scrollTop || document.body.scrollTop;
      const height = doc.scrollHeight - doc.clientHeight;
      const ratio = height > 0 ? Math.min(scrollTop / height, 1) : 0;
      progressEl.style.width = (ratio * 100).toFixed(2) + '%';
    };
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
    updateProgress();
  }

  const tocList = document.querySelector('.toc ul');
  if (tocList) {
    const headings = document.querySelectorAll('.article-body h2, .article-body h3');
    tocList.innerHTML = '';
    headings.forEach((heading) => {
      const level = heading.tagName.toLowerCase();
      if (!heading.id) {
        const slug = heading.textContent.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        heading.id = slug || 'section-' + Math.random().toString(36).slice(2, 7);
      }
      const li = document.createElement('li');
      if (level === 'h3') {
        li.style.paddingLeft = '16px';
      }
      const link = document.createElement('a');
      link.href = '#' + heading.id;
      link.textContent = heading.textContent.trim();
      link.setAttribute('data-level', level);
      li.appendChild(link);
      tocList.appendChild(li);
    });
  }

  const tocLinks = document.querySelectorAll('.toc a');
  if (tocLinks.length) {
    const activate = () => {
      let activeId = null;
      for (const heading of document.querySelectorAll('.article-body h2, .article-body h3')) {
        const rect = heading.getBoundingClientRect();
        if (rect.top >= 0 && rect.top <= window.innerHeight * 0.4) {
          activeId = heading.id;
          break;
        }
      }
      tocLinks.forEach((link) => {
        if (activeId && link.getAttribute('href') === '#' + activeId) {
          link.classList.add('is-active');
        } else {
          link.classList.remove('is-active');
        }
      });
    };
    window.addEventListener('scroll', activate, { passive: true });
    activate();
  }
})();
