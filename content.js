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

function createMindmapContainer() {
  const mainContainerId = 'web2mindmap-container';
  const svgContainerId = 'mindmap-svg-container';
  const resizeHandleId = 'mindmap-resize-handle';

  let mainContainer = document.getElementById(mainContainerId);
  let mindmapSgvDiv;

  if (mainContainer) {
    // Main container exists, ensure the SVG container child also exists
    mindmapSgvDiv = document.getElementById(svgContainerId);
    if (!mindmapSgvDiv) {
      console.warn(`'${mainContainerId}' exists, but child '${svgContainerId}' is missing. Recreating child.`);
      mindmapSgvDiv = document.createElement('div');
      mindmapSgvDiv.id = svgContainerId;
      mindmapSgvDiv.style.cssText = `
        flex: 1;
        padding: 20px;
        overflow: hidden;
        background: white;
      `;
      // Try to append it in the correct place (after header)
      const header = mainContainer.querySelector('div[style*="padding: 15px 20px"]');
      if (header && header.nextSibling) {
          mainContainer.insertBefore(mindmapSgvDiv, header.nextSibling);
      } else {
          mainContainer.appendChild(mindmapSgvDiv); // Fallback
      }
    }
    
    // Ensure resize handle exists
    if (!document.getElementById(resizeHandleId)) {
      createResizeHandle(mainContainer);
    }
    
    // Adjust body width based on current container width
    const currentWidth = parseFloat(mainContainer.style.width) || 60;
    const bodyWidth = Math.max(40, 100 - currentWidth + 20); // Ensure overlap
    document.body.style.width = `${bodyWidth}%`;
    document.body.style.marginRight = '';
    
    return mindmapSgvDiv;
  }

  // ---- Main container does not exist, create everything from scratch ----
  console.log("Creating new mindmap container elements from scratch.");
  mainContainer = document.createElement('div');
  mainContainer.id = mainContainerId;
  mainContainer.style.cssText = `
    position: fixed;
    top: 0;
    right: 0;
    width: 60%;
    height: 100vh;
    background: white;
    border-left: 2px solid #ccc;
    z-index: 2147483647;
    display: flex;
    flex-direction: column;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    box-shadow: -2px 0 10px rgba(0,0,0,0.1);
  `;

  // Create resize handle
  createResizeHandle(mainContainer);

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
    <div style="display: flex; align-items: center; gap: 12px;">
      <span>网页思维导图</span>
      <span id="mindmap-status" style="font-size: 12px; font-weight: normal; color: #999; display: none;"></span>
    </div>
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

  mindmapSgvDiv = document.createElement('div');
  mindmapSgvDiv.id = svgContainerId;
  mindmapSgvDiv.style.cssText = `
    flex: 1;
    padding: 20px;
    overflow: hidden;
    background: white;
  `;

  mainContainer.appendChild(header);
  mainContainer.appendChild(mindmapSgvDiv);
  
  header.querySelector('#close-mindmap').addEventListener('click', () => {
    mainContainer.remove();
    const resizeHandle = document.getElementById(resizeHandleId);
    if (resizeHandle) resizeHandle.remove();
    document.body.style.width = '';
    document.body.style.marginRight = '';
  });

  document.body.style.width = '60%';
  document.body.style.marginRight = '';
  document.body.appendChild(mainContainer);

  return mindmapSgvDiv;
}

function createResizeHandle(container) {
  const resizeHandle = document.createElement('div');
  resizeHandle.id = 'mindmap-resize-handle';
  resizeHandle.style.cssText = `
    position: absolute;
    left: -5px;
    top: 0;
    width: 10px;
    height: 100%;
    cursor: ew-resize;
    background: transparent;
    z-index: 2147483648;
    border-left: 3px solid transparent;
    transition: border-color 0.2s ease;
  `;
  
  // Add hover effect
  resizeHandle.addEventListener('mouseenter', () => {
    resizeHandle.style.borderLeftColor = '#007bff';
  });
  
  resizeHandle.addEventListener('mouseleave', () => {
    resizeHandle.style.borderLeftColor = 'transparent';
  });

  let isResizing = false;
  let startX = 0;
  let startWidth = 0;

  resizeHandle.addEventListener('mousedown', (e) => {
    isResizing = true;
    startX = e.clientX;
    startWidth = parseFloat(container.style.width);
    
    // Add visual feedback during resize
    resizeHandle.style.borderLeftColor = '#007bff';
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
    
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;

    const deltaX = startX - e.clientX; // Negative when dragging left (increasing width)
    const windowWidth = window.innerWidth;
    const newWidthPx = (startWidth / 100) * windowWidth + deltaX;
    const newWidthPercent = (newWidthPx / windowWidth) * 100;
    
    // Limit width between 30% and 80%
    const clampedWidth = Math.max(30, Math.min(80, newWidthPercent));
    
    container.style.width = `${clampedWidth}%`;
    
    // Adjust body width to maintain overlap
    const bodyWidth = Math.max(40, 100 - clampedWidth + 20);
    document.body.style.width = `${bodyWidth}%`;
    
    e.preventDefault();
  });

  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      resizeHandle.style.borderLeftColor = 'transparent';
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  });

  container.appendChild(resizeHandle);
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
      // Yield to the browser's layout/paint cycle before dispatching
      setTimeout(() => {
        document.dispatchEvent(new CustomEvent('renderMarkmapInPage', {
          detail: {
            markdown: markdownContent,
            targetElementId: mindmapSvgContainerId
          }
        }));
      }, 0);
      
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

function updateMindmapStatus(message, show = true) {
  const statusElement = document.getElementById('mindmap-status');
  if (statusElement) {
    if (show && message) {
      statusElement.textContent = message;
      statusElement.style.display = 'block';
    } else {
      statusElement.style.display = 'none';
    }
  }
}

async function callLLM(articleContent) {
  if (!articleContent) {
    showErrorMessage('文章内容为空，无法调用AI。');
    return;
  }

  updateMindmapStatus('正在调用AI生成思维导图...');
  
  try {
    // Read API configuration from storage
    const config = await chrome.storage.sync.get(['apiKey', 'apiUrl']);
    
    if (!config.apiKey || !config.apiKey.trim()) {
      updateMindmapStatus('', false);
      showErrorMessage('API Key 未配置，请在扩展设置中配置 API Key');
      return;
    }
    
    const apiKey = config.apiKey.trim();
    const apiUrl = config.apiUrl?.trim() || 'https://api.deepseek.com/chat/completions';
    
    console.log('Using API URL:', apiUrl);
    
    let progressiveRenderDebounceTimer = null;
    const DEBOUNCE_DELAY_MS = 250;
    let lastActualRenderTime = 0;
    const MAX_TIME_WITHOUT_RENDER_MS = 750;

    const requestBody = {
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: "你是一个专业的思维导图生成器。请将用户提供的文章内容转换为清晰的markdown格式的思维导图结构。使用#、##、###等标题层级来表示思维导图的层次结构。确保内容简洁、层次清晰、逻辑性强。"
        },
        {
          role: "user", 
          content: `请将以下文章内容转换为思维导图格式的markdown：\n\n${articleContent}`
        }
      ],
      temperature: 0.3,
      max_tokens: 4000,
      stream: true
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${response.statusText}. Response: ${errorText}`);
    }
    
    updateMindmapStatus('正在接收AI响应...');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';
    let mindmapAlreadyUpdated = false;

    function cleanMarkdown(markdownText) {
      if (!markdownText || typeof markdownText !== 'string') {
        return '';
      }
      let text = markdownText.trim();
      
      // Regex to match the full ```markdown ... ``` block or ``` ... ``` block
      const fullMatchRegex = /^```(?:markdown)?\s*([\s\S]*?)\s*```$/;
      const fullMatch = text.match(fullMatchRegex);

      if (fullMatch && typeof fullMatch[1] === 'string') {
        // console.log("Markdown cleaned (full match): Removed wrapper.");
        return fullMatch[1].trim();
      }

      // If not a full match, try to match only a prefix (for progressive rendering)
      // This will strip "```markdown\n" or "```\n" from the beginning of the text
      const prefixOnlyRegex = /^```(?:markdown)?\s*\n?([\s\S]*)/;
      const prefixMatch = text.match(prefixOnlyRegex);

      if (prefixMatch && typeof prefixMatch[1] === 'string') {
        // console.log("Markdown cleaned (prefix only): Removed leading prefix.");
        // Return the content *after* the prefix, trimmed.
        // This handles cases like "```markdown\n# Title" -> "# Title"
        return prefixMatch[1].trim();
      }
      
      // If no known wrapper or prefix is found, return the text as is (trimmed).
      // console.log("Markdown cleaning: No wrapper or only partial prefix found, returning trimmed original.");
      return text; // text was already trimmed at the beginning of the function
    }

    function readStream() {
      reader.read().then(({ done, value }) => {
        if (done) {
          clearTimeout(progressiveRenderDebounceTimer);
          updateMindmapStatus('', false);
          if (fullContent.trim() && !mindmapAlreadyUpdated) {
             const cleanedContent = cleanMarkdown(fullContent);
             console.log("LLM Stream finished. RAW Markdown from AI:", fullContent);
             console.log("LLM Stream finished. Cleaned Markdown for mindmap:", cleanedContent);
             updateMindmapContent(cleanedContent);
          } else if (!fullContent.trim()) {
            showErrorMessage('AI返回的内容为空。');
          }
          return;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data.trim() === '[DONE]') {
              clearTimeout(progressiveRenderDebounceTimer);
              updateMindmapStatus('', false);
              if (fullContent.trim() && !mindmapAlreadyUpdated) {
                const cleanedContent = cleanMarkdown(fullContent);
                console.log("LLM Stream signaled [DONE]. RAW Markdown from AI:", fullContent);
                console.log("LLM Stream signaled [DONE]. Cleaned Markdown for mindmap:", cleanedContent);
                updateMindmapContent(cleanedContent);
              } else if (!fullContent.trim()) {
                 showErrorMessage('AI返回的内容为空 ([DONE] received).');
              }
              mindmapAlreadyUpdated = true; 
              return;
            }
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                fullContent += content;
                updateMindmapStatus(`AI生成中... (${fullContent.length} 字符)`);
                
                if (!mindmapAlreadyUpdated) {
                    clearTimeout(progressiveRenderDebounceTimer);
                    const now = Date.now();

                    const performRender = () => {
                        const cleanedContentForRender = cleanMarkdown(fullContent);
                        if (cleanedContentForRender.trim()) {
                            updateMindmapContent(cleanedContentForRender);
                            lastActualRenderTime = Date.now();
                        }
                    };

                    if (now - lastActualRenderTime > MAX_TIME_WITHOUT_RENDER_MS) {
                        performRender();
                    } else {
                        progressiveRenderDebounceTimer = setTimeout(performRender, DEBOUNCE_DELAY_MS);
                    }
                }
              }
            } catch (e) {
              // console.warn('LLM Stream: Non-JSON data or parse error in line, skipping:', line, e);
            }
          }
        }
        if (!mindmapAlreadyUpdated) {
            readStream();
        }
      }).catch(error => {
        console.error('读取AI响应流时出错:', error);
        updateMindmapStatus('', false);
        showErrorMessage('读取AI响应时出错: ' + error.message);
      });
    }
    readStream();
  } catch (error) {
    console.error('调用AI API时出错:', error);
    updateMindmapStatus('', false);
    
    let errorMessage = '调用AI接口失败: ' + error.message;
    
    // Provide more specific error messages
    if (error.message.includes('401')) {
      errorMessage = 'API Key 无效或已过期，请检查设置中的 API Key';
    } else if (error.message.includes('403')) {
      errorMessage = 'API Key 权限不足，请检查 API Key 配置';
    } else if (error.message.includes('429')) {
      errorMessage = 'API 调用频率超限，请稍后重试';
    } else if (error.message.includes('500')) {
      errorMessage = 'AI 服务暂时不可用，请稍后重试';
    }
    
    showErrorMessage(errorMessage);
  }
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

// REVISED init function
async function init() {
  console.log('Content script init sequence started.');
  try {
    await loadMarkmapLibraries();
    console.log('Markmap libraries confirmed in page context.');
    
    const placeholderMarkdown = `# 思维导图加载中...\n\n- 正在提取内容\n- 正在调用AI服务`;
    await createMindmapView(placeholderMarkdown); 
    console.log('Placeholder mindmap displayed.');

    updateMindmapStatus('正在提取文章内容...');
    const articleText = extractArticleContent();
    
    if (articleText && articleText.trim().length > 50) {
      console.log('Article content extracted, length:', articleText.length);
      updateMindmapStatus('内容已提取，正在调用AI...');
      
      callLLM(articleText); 
      
    } else {
      console.log('Not an article page or no substantial content extracted for init.');
      updateMindmapStatus('', false);
      const noContentMarkdown = `# 未能提取内容\n\n- 无法找到足够的文本来生成思维导图。\n- 请确保您在包含长篇文章的页面上。`;
      await createMindmapView(noContentMarkdown);
    }
  } catch (error) {
    console.error('初始化过程中出错 (init function):', error);
    updateMindmapStatus('', false);
    const errorMarkdown = `# 初始化错误\n\n- ${error.message.replace(/\n/g, '\n  - ')}`;
    try {
      await createMindmapView(errorMarkdown);
    } catch (e) { /* ignore error during error display */ }
    showErrorMessage(`初始化失败: ${error.message}\n\n请刷新页面重试`);
  }
}

// Ensure init is called correctly (your existing logic for DOMContentLoaded is fine)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
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
