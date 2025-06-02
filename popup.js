// Tab switching functionality
document.addEventListener('DOMContentLoaded', function() {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.getAttribute('data-tab');
      
      // Update button states
      tabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      // Update content visibility
      tabContents.forEach(content => content.classList.remove('active'));
      document.getElementById(`${targetTab}-tab`).classList.add('active');
    });
  });
  
  // Load and display current settings
  loadSettings();
  
  // Check API status
  updateApiStatus();
});

// Load settings from storage
async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get(['apiKey', 'apiUrl']);
    
    if (result.apiKey) {
      document.getElementById('apiKey').value = result.apiKey;
    }
    
    if (result.apiUrl) {
      document.getElementById('apiUrl').value = result.apiUrl;
    } else {
      document.getElementById('apiUrl').value = 'https://api.deepseek.com/chat/completions';
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

// Update API status indicator
async function updateApiStatus() {
  try {
    const result = await chrome.storage.sync.get(['apiKey']);
    const statusElement = document.getElementById('api-status');
    const generateButton = document.getElementById('generateMindmap');
    
    if (result.apiKey && result.apiKey.trim()) {
      statusElement.textContent = 'API Key 已配置 ✓';
      statusElement.className = 'api-status configured';
      generateButton.disabled = false;
    } else {
      statusElement.textContent = 'API Key 未配置，请先在设置中配置';
      statusElement.className = 'api-status not-configured';
      generateButton.disabled = true;
    }
  } catch (error) {
    console.error('Failed to check API status:', error);
  }
}

// Save settings
document.getElementById('saveSettings').addEventListener('click', async function() {
  const apiKey = document.getElementById('apiKey').value.trim();
  const apiUrl = document.getElementById('apiUrl').value.trim();
  const statusElement = document.getElementById('settings-status');
  
  if (!apiKey) {
    showStatus(statusElement, 'error', '请输入 API Key');
    return;
  }
  
  if (!apiUrl) {
    showStatus(statusElement, 'error', '请输入 API 地址');
    return;
  }
  
  try {
    await chrome.storage.sync.set({
      apiKey: apiKey,
      apiUrl: apiUrl
    });
    
    showStatus(statusElement, 'success', '设置已保存');
    updateApiStatus();
    
    // Auto switch to generate tab after successful save
    setTimeout(() => {
      document.querySelector('[data-tab="generate"]').click();
    }, 1000);
    
  } catch (error) {
    console.error('Failed to save settings:', error);
    showStatus(statusElement, 'error', '保存失败：' + error.message);
  }
});

// Generate mindmap
document.getElementById('generateMindmap').addEventListener('click', async function() {
  const statusElement = document.getElementById('generate-status');
  
  try {
    // Check if API key is configured
    const result = await chrome.storage.sync.get(['apiKey']);
    if (!result.apiKey || !result.apiKey.trim()) {
      showStatus(statusElement, 'error', '请先配置 API Key');
      document.querySelector('[data-tab="settings"]').click();
      return;
    }
    
    // Get current active tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tabs.length === 0) {
      showStatus(statusElement, 'error', '无法获取当前页面');
      return;
    }
    
    showStatus(statusElement, 'success', '正在生成思维导图...');
    
    // Execute content script
    await chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      files: ['content.js']
    });
    
    // Close popup after execution
    setTimeout(() => {
      window.close();
    }, 500);
    
  } catch (error) {
    console.error('Failed to generate mindmap:', error);
    showStatus(statusElement, 'error', '生成失败：' + error.message);
  }
});

// Helper function to show status messages
function showStatus(element, type, message) {
  element.textContent = message;
  element.className = `status-message status-${type}`;
  element.style.display = 'block';
  
  if (type === 'success') {
    setTimeout(() => {
      element.style.display = 'none';
    }, 3000);
  }
} 