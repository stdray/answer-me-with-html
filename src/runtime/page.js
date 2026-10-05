(() => {
  const root = document.documentElement;
  // Each toolbar list sets one root attribute; its options name the values, so the runtime names no theme or mode.
  for (const [name, attr] of [['theme', 'data-theme'], ['mode', 'data-mode']]) {
    const select = document.querySelector(`select[data-am="${name}"]`);
    if (!select) continue;
    select.value = root.getAttribute(attr);
    select.addEventListener('change', () => root.setAttribute(attr, select.value));
  }

  const copyBtn = document.querySelector('[data-am="copy"]');
  copyBtn?.addEventListener('click', async () => {
    const nodes = document.querySelectorAll('#am-source');
    const text = nodes[nodes.length - 1]?.value ?? '';
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = Object.assign(document.createElement('textarea'), { value: text });
      document.body.append(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    const original = copyBtn.textContent;
    copyBtn.textContent = copyBtn.dataset.done;
    setTimeout(() => { copyBtn.textContent = original; }, 1400);
  });

  // ── Diagrams in a new tab ──────────────────────────────────────────────
  // The in-page copy of a diagram is capped by the column width, which
  // downscales the whole drawing — text included — and browser zoom cannot
  // recover it, because the cap tracks the viewport. Handing the SVG to a new
  // tab shows it at natural size, where zoom works as usual.
  const DIAGRAM_CSS = ['.am-diagram', '.am-node', '.am-edge', '.am-arrow', '.am-lifeline', '.am-actor', '.am-note', '.am-step', '.am-cluster', '.am-edge-label'];
  // Theme and mode live in variables on <html data-theme data-mode>; a tab of
  // its own has no <html>, so the variables have to move onto the <svg>.
  const THEME_VARS = ['--bg', '--ink', '--ink-2', '--ink-3', '--paper', '--fill', '--line', '--line-2', '--accent', '--accent-bg', '--ok', '--ok-bg', '--warn', '--warn-bg', '--err', '--err-bg', '--head-bg', '--head-fg', '--head-font', '--bw', '--radius', '--shadow', '--font-sans', '--font-mono'];

  const diagramCss = () => {
    const out = [];
    for (const sheet of document.styleSheets) {
      let rules;
      try { rules = sheet.cssRules; } catch { continue; }
      if (!rules) continue;
      for (const r of rules) {
        if (!r.selectorText) continue;
        if (DIAGRAM_CSS.some((p) => r.selectorText.includes(p))) out.push(r.cssText);
      }
    }
    return out.join('\n');
  };

  const openDiagram = (svg) => {
    const clone = svg.cloneNode(true);
    clone.removeAttribute('width');
    clone.removeAttribute('height');
    clone.setAttribute('width', '100%');
    clone.setAttribute('height', '100%');
    // Some rules are scoped under .am-diagram, which a tab of its own lacks.
    if (!clone.classList.contains('am-diagram')) clone.classList.add('am-diagram');
    const cs = getComputedStyle(document.documentElement);
    for (const name of THEME_VARS) {
      const value = cs.getPropertyValue(name).trim();
      if (value) clone.style.setProperty(name, value);
    }
    // The SVG canvas is transparent and a document of its own defaults to
    // white. Take the background from the panel the diagram sits in, not from
    // the page: .am-panel-body paints nothing itself (background-color is not
    // inherited), .am-panel does.
    let bg = '';
    for (let node = svg.closest('.am-diagram'); node && node !== document.documentElement; node = node.parentNode) {
      const c = getComputedStyle(node).backgroundColor;
      if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') { bg = c; break; }
    }
    if (!bg) bg = cs.getPropertyValue('--bg').trim();
    if (bg) {
      clone.style.setProperty('background-color', bg);
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', '0');
      rect.setAttribute('y', '0');
      rect.setAttribute('width', '100%');
      rect.setAttribute('height', '100%');
      rect.setAttribute('style', 'fill: ' + bg);
      clone.insertBefore(rect, clone.firstChild);
    }
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = diagramCss();
    clone.insertBefore(style, clone.firstChild);
    const markup = '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(clone);
    const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }));
    window.open(url, '_blank');
  };

  for (const btn of document.querySelectorAll('.am-diagram-open')) {
    btn.addEventListener('click', () => {
      const svg = btn.closest('.am-panel')?.querySelector('.am-diagram svg');
      if (svg) openDiagram(svg);
    });
  }
})();
