// This script runs in the page context
(function() {
  if (window.markmapPageRendererInitialized) {
    console.log('page_renderer.js: Already initialized.');
    return;
  }
  window.markmapPageRendererInitialized = true;

  console.log('page_renderer.js: Script loaded, waiting for renderMarkmapInPage event.');

  document.addEventListener('renderMarkmapInPage', function(event) {
    console.log('page_renderer.js: renderMarkmapInPage event received.', event.detail);
    const { markdown, targetElementId } = event.detail;

    if (!markdown || !targetElementId) {
      console.error('page_renderer.js: Missing markdown or targetElementId in event detail.');
      return;
    }

    const targetElement = document.getElementById(targetElementId);
    if (!targetElement) {
      console.error(`page_renderer.js: Target element #${targetElementId} not found.`);
      // Attempt to create if it's a known ID, though createMindmapContainer should handle this.
      return;
    }

    // Clear previous content
    targetElement.innerHTML = '';

    try {
      const { Transformer, Markmap } = window.markmap; // d3 is used by Markmap internally
      
      if (!Transformer || !Markmap) {
        console.error('page_renderer.js: window.markmap.Transformer or window.markmap.Markmap is not available.');
        targetElement.innerHTML = `<p style="color:red; padding:10px;">错误: Markmap核心组件未加载 (Transformer或Markmap缺失)。</p>`;
        return;
      }
      if (!window.d3) {
        console.error('page_renderer.js: window.d3 is not available.');
        targetElement.innerHTML = `<p style="color:red; padding:10px;">错误: D3库未加载。</p>`;
        return;
      }

      const transformer = new Transformer();
      const { root } = transformer.transform(markdown);

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.style.width = '100%';
      svg.style.height = '100%';
      targetElement.appendChild(svg);
      
      console.log('page_renderer.js: Creating Markmap instance...');
      const mm = Markmap.create(svg, {
         duration: 500,
         nodeMinHeight: 16,
         paddingX: 8,
         spacingHorizontal: 60, // Adjusted for potentially smaller sidebar
         spacingVertical: 10,    // Adjusted
         initialExpandLevel: -1, 
         zoom: true,
         pan: true,
         autoFit: false, 
      });
      
      console.log('page_renderer.js: Setting data and fitting Markmap...');
      mm.setData(root);
      mm.fit(); 

      console.log('page_renderer.js: Mindmap rendered successfully in page context.');

    } catch (e) {
      console.error('page_renderer.js: Error during Markmap rendering:', e);
      targetElement.innerHTML = `<p style="color:red; padding:10px;">思维导图渲染出错: ${e.message}<br><pre>${e.stack}</pre></p>`;
    }
  });
})(); 