(function() {
  const params = new URLSearchParams(document.currentScript.src.split('?')[1]);
  const globalVarNameToWait = params.get('globalVar');
  const confirmationType = params.get('confirmationType');
  const scriptUrl = params.get('scriptUrl'); // For logging

  let attempts = 0;
  const maxAttempts = 50; // Approx 5 seconds (50 * 100ms)

  let checkCondition = `typeof window.${globalVarNameToWait} !== 'undefined'`;
  if (globalVarNameToWait.includes('.')) {
      const parts = globalVarNameToWait.split('.');
      let currentObject = 'window';
      const conditions = [];
      for (const part of parts) {
          currentObject += `.${part}`;
          conditions.push(`typeof ${currentObject} !== 'undefined'`);
      }
      checkCondition = conditions.join(' && ');
  }
  
  const intervalId = setInterval(() => {
    let success = false;
    let detail = `Variable ${globalVarNameToWait} (from ${scriptUrl}) `;
    try {
      // 使用 eval 来动态执行检查条件字符串
      success = eval(checkCondition);
      detail += success ? 'is defined.' : 'is NOT defined.';
    } catch (e) {
      success = false;
      detail += `threw an error during check: ${e.message}.`;
    }

    if (success) {
      clearInterval(intervalId);
      window.postMessage({ type: confirmationType, success: true, detail: detail }, '*');
    } else {
      attempts++;
      if (attempts >= maxAttempts) {
        clearInterval(intervalId);
        detail += ` Check timed out after ${maxAttempts} attempts.`;
        window.postMessage({ type: confirmationType, success: false, detail: detail }, '*');
      }
    }
  }, 100);
})(); 