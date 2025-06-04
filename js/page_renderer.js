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
  let toolbar; // Persistent toolbar instance
  const { Transformer, Markmap } = window.markmap;
  const transformer = new Transformer();

  // Function to create and setup toolbar
  function createToolbar(markmapInstance, targetElement) {
    if (!window.markmap.Toolbar) {
      console.warn('page_renderer.js: Toolbar not available, skipping toolbar creation.');
      return null;
    }

    const toolbarInstance = window.markmap.Toolbar.create(markmapInstance);
    toolbarInstance.setBrand(false); // Hide brand to save space
    
    // Add download functionality
    toolbarInstance.register({
      id: 'download',
      title: 'Download as SVG',
      content: window.markmap.Toolbar.icon('M12 2l-7 7h4v6h6v-6h4l-7-7zM5 18v2h14v-2h-14z'),
      onClick: () => {
        const svgElement = targetElement.querySelector('svg');
        if (svgElement) {
          const svgData = new XMLSerializer().serializeToString(svgElement);
          const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
          const svgUrl = URL.createObjectURL(svgBlob);
          const downloadLink = document.createElement('a');
          downloadLink.href = svgUrl;
          downloadLink.download = 'mindmap.svg';
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
          URL.revokeObjectURL(svgUrl);
        }
      }
    });
    
    // Add download as PNG functionality
    toolbarInstance.register({
      id: 'downloadPNG',
      title: 'Download as PNG',
      content: window.markmap.Toolbar.icon('M12 2l-7 7h4v6h6v-6h4l-7-7zM2 18h20v2h-20v-2z'),
      onClick: () => {
        console.log('PNG download button clicked');
        const svgElement = targetElement.querySelector('svg');
        if (!svgElement) {
          console.error('No SVG element found for PNG download');
          alert('未找到思维导图，无法下载PNG');
          return;
        }

        // Use data URL approach to avoid canvas tainting
        const downloadPNGViaDataURL = () => {
          try {
            // Get SVG dimensions
            const svgRect = svgElement.getBoundingClientRect();
            const svgWidth = svgRect.width || 800;
            const svgHeight = svgRect.height || 600;
            
            console.log(`SVG dimensions: ${svgWidth}x${svgHeight}`);

            // Clone and prepare SVG for conversion
            const svgClone = svgElement.cloneNode(true);
            svgClone.setAttribute('width', svgWidth);
            svgClone.setAttribute('height', svgHeight);
            svgClone.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
            
            // Add white background
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('width', '100%');
            rect.setAttribute('height', '100%');
            rect.setAttribute('fill', 'white');
            svgClone.insertBefore(rect, svgClone.firstChild);

            // Convert SVG to data URL directly
            const svgData = new XMLSerializer().serializeToString(svgClone);
            const svgDataURL = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
            
            console.log('SVG data URL created');

            // Create canvas
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = svgWidth * 2; // Higher resolution
            canvas.height = svgHeight * 2;
            
            // Scale context for higher resolution
            ctx.scale(2, 2);
            
            const img = new Image();
            
            // Set crossOrigin to avoid tainting
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
              console.log('Image loaded successfully, drawing to canvas');
              try {
                // Fill white background
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, svgWidth, svgHeight);
                
                // Draw the SVG image
                ctx.drawImage(img, 0, 0, svgWidth, svgHeight);
                
                console.log('Canvas drawing completed, converting to data URL');
                
                // Use toDataURL instead of toBlob to avoid some security issues
                const dataURL = canvas.toDataURL('image/png', 0.95);
                
                console.log('Data URL created, initiating download');
                const downloadLink = document.createElement('a');
                downloadLink.href = dataURL;
                downloadLink.download = 'mindmap.png';
                downloadLink.style.display = 'none';
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
                console.log('PNG download completed');
                
              } catch (drawError) {
                console.error('Error in canvas operations:', drawError);
                tryAlternativeMethod();
              }
            };
            
            img.onerror = (error) => {
              console.error('Image loading failed:', error);
              tryAlternativeMethod();
            };
            
            // Use data URL directly
            img.src = svgDataURL;
            
          } catch (error) {
            console.error('Data URL PNG download error:', error);
            tryAlternativeMethod();
          }
        };

        // Alternative method using html2canvas-like approach
        const tryAlternativeMethod = () => {
          console.log('Trying alternative PNG download method');
          try {
            // Get SVG as string
            const svgData = new XMLSerializer().serializeToString(svgElement);
            
            // Create a new SVG with white background
            const svgWithBackground = `
              <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
                <rect width="100%" height="100%" fill="white"/>
                ${svgData.replace(/<svg[^>]*>/, '').replace(/<\/svg>$/, '')}
              </svg>
            `;
            
            // Convert to data URL
            const dataURL = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgWithBackground);
            
            // Create download link for SVG with white background
            const downloadLink = document.createElement('a');
            downloadLink.href = dataURL;
            downloadLink.download = 'mindmap-with-background.svg';
            downloadLink.style.display = 'none';
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            
            console.log('Alternative SVG download completed');
            alert('PNG转换遇到安全限制，已下载带白色背景的SVG文件');
            
          } catch (altError) {
            console.error('Alternative method failed:', altError);
            alert('PNG下载功能暂时不可用，请使用SVG下载');
          }
        };

        // Start with data URL approach
        downloadPNGViaDataURL();
      }
    });
    
    // Set toolbar items including the new download buttons
    toolbarInstance.setItems(['zoomIn', 'zoomOut', 'fit', 'recurse', 'download', 'downloadPNG']);
    
    // Add toolbar to the target container
    if (targetElement.style.position !== 'relative') {
      targetElement.style.position = 'relative';
    }
    
    // Remove existing toolbar if any
    const existingToolbar = targetElement.querySelector('.mm-toolbar');
    if (existingToolbar) {
      existingToolbar.remove();
    }
    
    targetElement.appendChild(toolbarInstance.el);
    
    // Style the toolbar positioning
    toolbarInstance.el.style.position = 'absolute';
    toolbarInstance.el.style.top = '10px';
    toolbarInstance.el.style.right = '10px';
    toolbarInstance.el.style.zIndex = '1000';
    toolbarInstance.el.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
    toolbarInstance.el.style.backdropFilter = 'blur(10px)';
    toolbarInstance.el.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    toolbarInstance.el.style.borderRadius = '0.5rem';
    toolbarInstance.el.style.transition = 'all 0.3s ease';
    
    // Add hover effect
    toolbarInstance.el.addEventListener('mouseenter', () => {
      toolbarInstance.el.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.2)';
      toolbarInstance.el.style.transform = 'translateY(-1px)';
    });
    
    toolbarInstance.el.addEventListener('mouseleave', () => {
      toolbarInstance.el.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
      toolbarInstance.el.style.transform = 'translateY(0)';
    });
    
    return toolbarInstance;
  }

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
        
        // Create toolbar for the new markmap instance
        toolbar = createToolbar(mm, targetElement);
        if (toolbar) {
          console.log('page_renderer.js: Toolbar created successfully.');
        }
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