// This script runs in the page context
(function() {
  if (window.markmapPageRendererInitialized) {
    console.log('page_renderer.js: Already initialized.');
    return;
  }
  window.markmapPageRendererInitialized = true;

  console.log('page_renderer.js: Script loaded, waiting for renderMarkmapInPage event.');

  let mm; // Persistent Markmap instance
  let svgForMm; // Persistent SVG element for the Markmap instance
  const { Transformer, Markmap } = window.markmap;
  const transformer = new Transformer();

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
      return;
    }

    try {
      const { root } = transformer.transform(markdown);

      if (mm && svgForMm && targetElement.contains(svgForMm)) {
        // Markmap instance and its SVG already exist and SVG is still in the target
        console.log('page_renderer.js: Updating existing Markmap instance...');
        mm.setData(root);
        mm.fit();
      } else {
        // First time, or if SVG was somehow removed from target: clear target and recreate
        targetElement.innerHTML = ''; // Clear only when (re)creating SVG

        svgForMm = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svgForMm.style.width = '100%';
        svgForMm.style.height = '100%';
        targetElement.appendChild(svgForMm);
      
        console.log('page_renderer.js: Creating new Markmap instance...');
        mm = Markmap.create(svgForMm, null, root);
        // Markmap.create usually fits, so an explicit fit here might be redundant
        // but generally safe. If issues persist, this extra fit could be removed.
      }
      
      console.log('page_renderer.js: Mindmap operation completed.');

    } catch (e) {
      console.error('page_renderer.js: Error during Markmap rendering:', e);
      // Ensure targetElement is still valid before trying to write error message to it
      if (targetElement) {
          targetElement.innerHTML = `<p style="color:red; padding:10px;">思维导图渲染出错: ${e.message}<br><pre>${e.stack}</pre></p>`;
      }
    }
  });
})(); 