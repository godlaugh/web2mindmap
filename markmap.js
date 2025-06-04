document.addEventListener('DOMContentLoaded', () => {
  const { markmap } = window;
  const options = {};
  const transformer = new markmap.Transformer();
  const svg = document.querySelector(".markmap > svg");
  const mm = markmap.Markmap.create(svg, options);
  
  // Create and setup toolbar
  const toolbar = markmap.Toolbar.create(mm);
  toolbar.setBrand(false); // Hide brand to save space
  
  // Add download functionality
  toolbar.register({
    id: 'download',
    title: 'Download as SVG',
    content: markmap.Toolbar.icon('M12 2l-7 7h4v6h6v-6h4l-7-7zM5 18v2h14v-2h-14z'),
    onClick: () => {
      const svgElement = document.querySelector('.markmap > svg');
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
  });
  
  // Add download as PNG functionality
  toolbar.register({
    id: 'downloadPNG',
    title: 'Download as PNG',
    content: markmap.Toolbar.icon('M12 2l-7 7h4v6h6v-6h4l-7-7zM2 18h20v2h-20v-2z'),
    onClick: () => {
      const svgElement = document.querySelector('.markmap > svg');
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob((blob) => {
          const url = URL.createObjectURL(blob);
          const downloadLink = document.createElement('a');
          downloadLink.href = url;
          downloadLink.download = 'mindmap.png';
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
          URL.revokeObjectURL(url);
        });
      };
      
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      img.src = url;
    }
  });
  
  // Set toolbar items including the new download buttons
  toolbar.setItems(['zoomIn', 'zoomOut', 'fit', 'recurse', 'download', 'downloadPNG']);
  
  // Add toolbar to the markmap container
  const markmapContainer = document.querySelector('.markmap');
  markmapContainer.insertBefore(toolbar.el, markmapContainer.firstChild);
  
  // Style the toolbar positioning
  toolbar.el.style.position = 'absolute';
  toolbar.el.style.top = '10px';
  toolbar.el.style.right = '10px';
  toolbar.el.style.zIndex = '1000';
  toolbar.el.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
  toolbar.el.style.backdropFilter = 'blur(5px)';
  toolbar.el.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
  
  const updateThreshold = 25;
  const codeUpdateThreshold = 100;
  let lastContent = '';
  let contentLength = 0;
  let inCodeBlock = false;
  let lastUpdateTime = 0;
  const updateInterval = 3000;

  function removeBackticks(markdown_content) {
    if (markdown_content.startsWith('```')) {
      markdown_content = markdown_content.split('\n').slice(1).join('\n');
    }
    if (markdown_content.startsWith('```') && markdown_content.endsWith('```')) {
      markdown_content = markdown_content.split('\n').slice(1, -1).join('\n');
    }
    return markdown_content;
  }

  function updateCodeBlockStatus(markdown_content) {
    markdown_content = removeBackticks(markdown_content);
    const lines = markdown_content.split('\n');
    let localInCodeBlock = false;
    for (let line of lines) {
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
        }
      }
      if (inCodeBlock) {
        localInCodeBlock = true;
      }
    }
    inCodeBlock = localInCodeBlock;
  }

  function render(markdown_content) {
    markdown_content = removeBackticks(markdown_content);
    const { root } = transformer.transform(markdown_content);
    mm.setData(root);
    mm.fit();
  }

  chrome.storage.local.get('mindmapContent', (data) => {
    const content = data.mindmapContent || '';
    document.getElementById('mindmap-content').textContent = content;
    lastContent = content;
    contentLength = content.length;
    updateCodeBlockStatus(content);
    render(content);
    document.querySelector('.loading').style.display = 'none';
    lastUpdateTime = Date.now();
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "updateContent") {
      const newContent = message.content;
      document.getElementById('mindmap-content').textContent = newContent;

      updateCodeBlockStatus(newContent);

      let charUpdateThreshold = inCodeBlock ? codeUpdateThreshold : updateThreshold;

      const currentTime = Date.now();
      if (Math.abs(newContent.length - contentLength) >= charUpdateThreshold || (currentTime - lastUpdateTime) > updateInterval) {
        render(newContent);
        lastContent = newContent;
        contentLength = newContent.length;
        lastUpdateTime = currentTime;
      }
      document.querySelector('.loading').style.display = 'none';
    }
  });
});
