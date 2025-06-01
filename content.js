function extractArticleContent() {
  // 优先级列表，按照常见的文章容器选择器排序
  const selectors = [
    'article',
    '[role="main"]',
    '.article-content',
    '.post-content', 
    '.entry-content',
    '.content',
    '#content',
    '.main-content',
    '.article-body',
    '.post-body',
    '.story-body',
    '.article-text',
    '.text-content',
    '.kr-rich-text', // 36kr specific
    'main'
  ];
  
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      let text = '';
      
      // 提取标题
      const title = document.title || 
                   document.querySelector('h1')?.textContent ||
                   document.querySelector('.article-title')?.textContent ||
                   document.querySelector('.post-title')?.textContent ||
                   '';
      
      if (title) {
        text += `# ${title.trim()}\n\n`;
      }
      
      // 处理内容
      const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
        {
          acceptNode: function(node) {
            // 跳过脚本、样式和隐藏元素
            if (node.nodeType === Node.ELEMENT_NODE) {
              const tag = node.tagName.toLowerCase();
              if (['script', 'style', 'nav', 'footer', 'aside'].includes(tag)) {
                return NodeFilter.FILTER_REJECT;
              }
              const style = window.getComputedStyle(node);
              if (style.display === 'none' || style.visibility === 'hidden') {
                return NodeFilter.FILTER_REJECT;
              }
            }
            return NodeFilter.FILTER_ACCEPT;
          }
        }
      );
      
      let currentNode;
      while (currentNode = walker.nextNode()) {
        if (currentNode.nodeType === Node.TEXT_NODE) {
          const textContent = currentNode.textContent.trim();
          if (textContent && textContent.length > 2) {
            text += textContent + ' ';
          }
        } else if (currentNode.nodeType === Node.ELEMENT_NODE) {
          const tag = currentNode.tagName.toLowerCase();
          // 添加标题标记
          if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
            const level = parseInt(tag[1]);
            const headingText = currentNode.textContent.trim();
            if (headingText) {
              text += `\n${'#'.repeat(level)} ${headingText}\n`;
            }
          }
          // 添加段落分隔
          else if (['p', 'div', 'br'].includes(tag)) {
            text += '\n';
          }
        }
      }
      
      if (text.trim().length > 100) {
        console.log('提取到文章内容:', text.substring(0, 200) + '...');
        return text.trim();
      }
    }
  }
  
  console.log('未找到合适的文章内容');
  return null;
}

function callLLM(content) {
  if (!content) {
    showErrorMessage('未找到文章内容');
    return;
  }

  const statusDiv = showLoadingMessage('正在调用AI生成思维导图...');
  
  const apiKey = 'sk-04a6e803717443c0810cb0543c7a6c88';
  const apiUrl = 'https://api.deepseek.com/chat/completions';
  
  const requestBody = {
    model: "deepseek-chat",
    messages: [
      {
        role: "system",
        content: "你是一个专业的思维导图生成器。请将用户提供的文章内容转换为清晰的markdown格式的思维导图结构。使用#、##、###等标题层级来表示思维导图的层次结构。确保内容简洁、层次清晰、逻辑性强。"
      },
      {
        role: "user", 
        content: `请将以下文章内容转换为思维导图格式的markdown：\n\n${content}`
      }
    ],
    temperature: 0.3,
    max_tokens: 4000,
    stream: true
  };

  fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(requestBody)
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    statusDiv.textContent = '正在接收AI响应...';
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';

    function readStream() {
      reader.read().then(({ done, value }) => {
        if (done) {
          statusDiv.remove();
          if (fullContent.trim()) {
            updateMindmapContent(fullContent);
          } else {
            showErrorMessage('AI返回的内容为空');
          }
          return;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              statusDiv.remove();
              if (fullContent.trim()) {
                updateMindmapContent(fullContent);
              } else {
                showErrorMessage('AI返回的内容为空');
              }
              return;
            }
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                fullContent += content;
                statusDiv.textContent = `正在接收内容... (${fullContent.length} 字符)`;
              }
            } catch (e) {
              // 忽略解析错误，继续处理下一行
            }
          }
        }

        readStream();
      }).catch(error => {
        console.error('读取流时出错:', error);
        statusDiv.remove();
        showErrorMessage('读取AI响应时出错: ' + error.message);
      });
    }

    readStream();
  })
  .catch(error => {
    console.error('调用API时出错:', error);
    statusDiv.remove();
    showErrorMessage('调用AI接口失败: ' + error.message);
  });
}

// Helper function to inject a script and wait for a global variable to be set in the page context
function injectScriptAndWait(scriptUrl, globalVarNameToWait) {
  return new Promise((resolve, reject) => {
    const mainScript = document.createElement('script');
    mainScript.src = chrome.runtime.getURL(scriptUrl);

    // Unique confirmation type for this specific script and variable
    const confirmationType = `LIB_LOADED_CONFIRMATION_${globalVarNameToWait.replace(/\./g, '_')}_${Date.now()}`;

    const eventListener = (event) => {
      if (event.source === window && event.data && event.data.type === confirmationType) {
        window.removeEventListener('message', eventListener);
        
        // Attempt to remove the checker script element from the DOM
        const checkerElement = document.getElementById(`checker_for_${confirmationType}`);
        if (checkerElement) {
          checkerElement.remove();
        }

        if (event.data.success) {
          console.log(`Confirmation received: ${globalVarNameToWait} (from ${scriptUrl}) is defined in page context. Detail: ${event.data.detail}`);
          resolve();
        } else {
          console.error(`Confirmation received: ${globalVarNameToWait} (from ${scriptUrl}) NOT defined in page context. Detail: ${event.data.detail}`);
          reject(new Error(`${globalVarNameToWait} not found in page context after loading ${scriptUrl}. Detail: ${event.data.detail}`));
        }
      }
    };
    window.addEventListener('message', eventListener);

    mainScript.onload = () => {
      console.log(`${scriptUrl} loaded into page. Injecting checker script for ${globalVarNameToWait}...`);
      const checkerScript = document.createElement('script');
      checkerScript.id = `checker_for_${confirmationType}`; // Unique ID for the checker script

      // Pass parameters to checker.js via URL query string
      const checkerUrl = new URL(chrome.runtime.getURL('js/checker.js'));
      checkerUrl.searchParams.append('globalVar', globalVarNameToWait);
      checkerUrl.searchParams.append('confirmationType', confirmationType);
      checkerUrl.searchParams.append('scriptUrl', scriptUrl); // For logging inside checker

      checkerScript.src = checkerUrl.toString();
      
      checkerScript.onerror = () => { // Error loading the checker script itself
        window.removeEventListener('message', eventListener);
        console.error(`Failed to load checker script for ${globalVarNameToWait} (from ${scriptUrl})`);
        reject(new Error(`Failed to load checker script for ${globalVarNameToWait}`));
      };
      document.head.appendChild(checkerScript);
    };

    mainScript.onerror = () => {
      window.removeEventListener('message', eventListener);
      console.error(`Failed to load main script tag for: ${scriptUrl}`);
      reject(new Error(`Failed to load main script tag for: ${scriptUrl}`));
    };

    document.head.appendChild(mainScript);
  });
}

async function loadMarkmapLibraries() {
  console.log('Loading markmap libraries into page context...');
  try {
    // d3.js should define window.d3
    await injectScriptAndWait('js/d3.js', 'd3');
    
    // markmap-lib.js depends on d3 and populates window.markmap with Transformer, etc.
    // We'll check for window.markmap.Transformer as an indicator.
    await injectScriptAndWait('js/markmap-lib.js', 'markmap.Transformer');
    
    // markmap-view.js depends on d3 and markmap-lib, and adds/finalizes window.markmap.Markmap
    await injectScriptAndWait('js/markmap-view.js', 'markmap.Markmap');

    console.log('All libraries confirmed in page context.');
  } catch (error) {
    console.error('Error loading libraries into page context:', error);
    throw error; 
  }
}

function createMindmapContainer() {
  // Remove any existing mindmap container
  const existingContainer = document.getElementById('web2mindmap-container');
  if (existingContainer) {
    existingContainer.remove();
  }

  // Create main container
  const container = document.createElement('div');
  container.id = 'web2mindmap-container';
  container.style.cssText = `
    position: fixed;
    top: 0;
    right: 0;
    width: 50%;
    height: 100vh;
    background: white;
    border-left: 2px solid #ccc;
    z-index: 2147483647;
    display: flex;
    flex-direction: column;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    box-shadow: -2px 0 10px rgba(0,0,0,0.1);
  `;

  // Create header
  const header = document.createElement('div');
  header.style.cssText = `
    padding: 15px 20px;
    background: #f8f9fa;
    border-bottom: 1px solid #dee2e6;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 16px;
    font-weight: 600;
    color: #2c3e50;
  `;
  header.innerHTML = `
    <span>网页思维导图</span>
    <button id="close-mindmap" style="
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      color: #666;
      padding: 5px;
      border-radius: 3px;
    ">×</button>
  `;

  // Create mindmap container
  const mindmapContainer = document.createElement('div');
  mindmapContainer.id = 'mindmap-svg-container';
  mindmapContainer.style.cssText = `
    flex: 1;
    padding: 20px;
    overflow: hidden;
    background: white;
  `;

  container.appendChild(header);
  container.appendChild(mindmapContainer);
  
  // Add close functionality
  header.querySelector('#close-mindmap').addEventListener('click', () => {
    container.remove();
    // Restore original layout
    document.body.style.marginRight = '';
  });

  // Adjust main content layout
  document.body.style.marginRight = '50%';
  document.body.appendChild(container);

  return mindmapContainer;
}

// NEW FUNCTION to create view and dispatch rendering to page context
async function createMindmapView(markdownContent) {
  console.log('Creating/updating mindmap view with new content...');
  const mindmapSvgContainerId = 'mindmap-svg-container';

  // 1. Ensure the visual container for the mindmap is ready
  // createMindmapContainer is idempotent (removes old, creates new)
  createMindmapContainer(); 

  // 2. Inject page_renderer.js if not already done, then dispatch event
  return new Promise((resolve, reject) => {
    // Check if page_renderer.js might have already been injected and its listener is active
    // For simplicity, we'll inject it; the script itself has a guard (window.markmapPageRendererInitialized)
    const rendererScript = document.createElement('script');
    rendererScript.src = chrome.runtime.getURL('js/page_renderer.js');

    rendererScript.onload = () => {
      console.log('js/page_renderer.js is loaded/ensured. Dispatching event with markdown.');
      document.dispatchEvent(new CustomEvent('renderMarkmapInPage', {
        detail: {
          markdown: markdownContent,
          targetElementId: mindmapSvgContainerId
        }
      }));
      // It's good practice to remove the script tag after it has executed its one-time setup
      // The event listener it sets up will remain active.
      if (rendererScript.parentNode) {
        rendererScript.remove();
      }
      resolve();
    };

    rendererScript.onerror = () => {
      console.error('Failed to load js/page_renderer.js');
      if (rendererScript.parentNode) {
        rendererScript.remove();
      }
      reject(new Error('Failed to load page_renderer.js for mindmap rendering.'));
    };

    document.head.appendChild(rendererScript);
  });
}

// MODIFIED updateMindmapContent function (approx lines 927-950)
function updateMindmapContent(newMarkdownContent) {
  console.log('Updating mindmap content via updateMindmapContent...');
  try {
    const mindmapContainer = document.getElementById('mindmap-svg-container');
    
    // If the container doesn't exist (e.g., closed by user), createMindmapView will recreate it.
    if (!mindmapContainer) {
      console.log('Mindmap container not found by updateMindmapContent, createMindmapView will handle it.');
    }
    
    if (newMarkdownContent && newMarkdownContent.trim()) {
      createMindmapView(newMarkdownContent)
        .then(() => {
          console.log('Mindmap update dispatched successfully by updateMindmapContent.');
        })
        .catch(error => {
          console.error('Failed to dispatch mindmap update from updateMindmapContent:', error);
          showErrorMessage('更新思维导图时出错: ' + error.message);
        });
    } else {
      console.log('No new content provided to updateMindmapContent.');
      // Optionally show a message if the AI returned empty content
      // showErrorMessage('AI返回的内容为空或无效，无法更新思维导图。');
    }
  } catch (error) {
    console.error('更新思维导图内容时出错 (outer scope in updateMindmapContent):', error);
    showErrorMessage('更新思维导图失败: ' + error.message);
  }
}

// MODIFIED init function (approx lines 952-968)
async function init() {
  console.log('Content script init sequence started.');
  let loadingStatusDiv = null; // Keep track of loading message
  try {
    // It's better to show loading message before async operations
    loadingStatusDiv = showLoadingMessage('正在初始化思维导图...');

    await loadMarkmapLibraries(); // Ensures d3, markmap.Transformer, markmap.Markmap are on page's window
    console.log('Markmap libraries confirmed in page context.');
    
    if(loadingStatusDiv) loadingStatusDiv.textContent = '正在提取文章内容...';
    const articleMarkdown = extractArticleContent();
    
    if (articleMarkdown) {
      if(loadingStatusDiv) loadingStatusDiv.textContent = '正在生成思维导图...';
      await createMindmapView(articleMarkdown);
      console.log('Mindmap view creation initiated by init.');
      if(loadingStatusDiv) loadingStatusDiv.remove(); // Remove loading message on success
    } else {
      console.log('Not an article page or no content extracted for init.');
      if(loadingStatusDiv) loadingStatusDiv.remove();
      showErrorMessage('未提取到足够的文章内容来生成思维导图。');
    }
  } catch (error) {
    console.error('初始化过程中出错 (init function):', error);
    if(loadingStatusDiv) loadingStatusDiv.remove();
    showErrorMessage(`初始化失败: ${error.message}\n\n请刷新页面重试`);
  }
}

// Ensure init is called correctly (your existing logic for DOMContentLoaded is fine)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

function showLoadingMessage(message) {
  const loading = document.createElement('div');
  loading.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 20px 30px;
    border-radius: 8px;
    font-size: 16px;
    z-index: 2147483648;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;
  loading.textContent = message;
  document.body.appendChild(loading);
  return loading;
}

function showErrorMessage(message) {
  const error = document.createElement('div');
  error.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #ff4757;
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    font-size: 14px;
    z-index: 2147483648;
    max-width: 400px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  `;
  error.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 8px;">错误</div>
    <div>${message}</div>
    <div style="margin-top: 10px; font-size: 12px; opacity: 0.8;">点击关闭</div>
  `;
  
  error.addEventListener('click', () => error.remove());
  document.body.appendChild(error);
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    if (error.parentNode) error.remove();
  }, 5000);
}
