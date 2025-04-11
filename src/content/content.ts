// Content Script: Web Interaction Toolkit
import { WebToolkit } from './web-toolkit';
import { WebInteractionComposer } from './composer-toolkit';

// Instantiate WebToolkit
// WebInteractionComposer is imported but not used for now
const webToolkit = new WebToolkit();

// Forward toolkit execution requests to background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'EXECUTE_TOOLKIT') {
    executeToolkitMethod(message.method, message.args)
      .then(result => {
        sendResponse({ 
          success: true, 
          result 
        });
      })
      .catch(error => {
        sendResponse({ 
          success: false, 
          error: String(error) 
        });
      });
    return true; // Enable asynchronous response
  }
});

// Execute toolkit methods dynamically
async function executeToolkitMethod(
  method: string, 
  args: any[]
): Promise<any> {
  switch (method) {
    case 'findElement':
      return await webToolkit.findElement(args[0], args[1]);
    case 'clickElement':
      return await webToolkit.clickElement(args[0]);
    case 'fillInput':
      return await webToolkit.fillInput(args[0], args[1]);
    case 'scrollToElement':
      return await webToolkit.scrollToElement(args[0]);
    case 'waitForElement':
      return await webToolkit.waitForElement(args[0], args[1]);
    case 'extractText':
      return await webToolkit.extractText(args[0]);
    case 'extractAttribute':
      return await webToolkit.extractAttribute(args[0], args[1]);
    default:
      throw new Error(`Unsupported method: ${method}`);
  }
}
