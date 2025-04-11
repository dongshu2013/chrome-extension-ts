export interface WebInteractionResult {
  success: boolean;
  data?: any;
  error?: string;
}

export class TabToolkit {
  /**
   * Open a new tab with a specific URL
   */
  static openTab(url: string): Promise<WebInteractionResult> {
    return new Promise((resolve) => {
      chrome.tabs.create({ url }, (tab) => {
        if (chrome.runtime.lastError) {
          resolve({
            success: false,
            error: chrome.runtime.lastError.message
          });
        } else if (tab && tab.id) {
          resolve({
            success: true,
            data: {
              tabId: tab.id,
              url: tab.url
            }
          });
        } else {
          resolve({
            success: false,
            error: 'Failed to create tab'
          });
        }
      });
    });
  }

  /**
   * Close a specific tab
   */
  static closeTab(tabId: number): Promise<WebInteractionResult> {
    return new Promise((resolve) => {
      chrome.tabs.remove(tabId, () => {
        if (chrome.runtime.lastError) {
          resolve({
            success: false,
            error: chrome.runtime.lastError.message
          });
        } else {
          resolve({
            success: true,
            data: { tabId }
          });
        }
      });
    });
  }

  /**
   * Find a tab by URL or title
   */
  static findTab(
    query: { 
      url?: string | RegExp, 
      title?: string | RegExp 
    }
  ): Promise<WebInteractionResult> {
    return new Promise((resolve) => {
      chrome.tabs.query({}, (tabs) => {
        const matchingTabs = tabs.filter(tab => {
          const urlMatch = query.url 
            ? (typeof query.url === 'string' 
              ? tab.url === query.url 
              : query.url.test(tab.url || ''))
            : true;
          
          const titleMatch = query.title
            ? (typeof query.title === 'string'
              ? tab.title === query.title
              : query.title.test(tab.title || ''))
            : true;
          
          return urlMatch && titleMatch;
        });

        if (matchingTabs.length > 0) {
          resolve({
            success: true,
            data: matchingTabs.map(tab => ({
              tabId: tab.id,
              url: tab.url,
              title: tab.title
            }))
          });
        } else {
          resolve({
            success: false,
            error: 'No matching tabs found'
          });
        }
      });
    });
  }

  /**
   * Switch to a specific tab
   */
  static switchToTab(tabId: number): Promise<WebInteractionResult> {
    return new Promise((resolve) => {
      chrome.tabs.update(tabId, { active: true }, (tab) => {
        if (chrome.runtime.lastError) {
          resolve({
            success: false,
            error: chrome.runtime.lastError.message
          });
        } else if (tab) {
          // Focus the window containing the tab
          chrome.windows.update(tab.windowId, { focused: true }, () => {
            resolve({
              success: true,
              data: {
                tabId: tab.id,
                url: tab.url
              }
            });
          });
        } else {
          resolve({
            success: false,
            error: 'Failed to switch to tab'
          });
        }
      });
    });
  }

  /**
   * Wait for a tab to load
   */
  static waitForTabLoad(tabId: number, timeout: number = 10000): Promise<WebInteractionResult> {
    return new Promise((resolve) => {
      const startTime = Date.now();

      const checkTabStatus = () => {
        chrome.tabs.get(tabId, (tab) => {
          if (chrome.runtime.lastError) {
            resolve({
              success: false,
              error: chrome.runtime.lastError.message
            });
            return;
          }

          if (tab.status === 'complete') {
            resolve({
              success: true,
              data: {
                tabId: tab.id,
                url: tab.url
              }
            });
          } else if (Date.now() - startTime > timeout) {
            resolve({
              success: false,
              error: 'Tab load timeout'
            });
          } else {
            // Retry after a short delay
            setTimeout(checkTabStatus, 100);
          }
        });
      };

      checkTabStatus();
    });
  }

  /**
   * Get current active tab
   */
  static getCurrentActiveTab(): Promise<WebInteractionResult> {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0 && tabs[0].id) {
          resolve({
            success: true,
            data: {
              tabId: tabs[0].id,
              url: tabs[0].url,
              title: tabs[0].title
            }
          });
        } else {
          resolve({
            success: false,
            error: 'No active tab found'
          });
        }
      });
    });
  }

  /**
   * Create a popup window for the extension
   * @param url URL to load in the popup
   * @param width Optional width of the popup (default: 400)
   * @param height Optional height of the popup (default: 600)
   */
  static createPopupWindow(
    url: string, 
    width: number = 400, 
    height: number = 600
  ): Promise<WebInteractionResult> {
    return new Promise((resolve) => {
      const createData: chrome.windows.CreateData = {
        url,
        type: 'popup',
        width,
        height,
        focused: true
      };

      chrome.windows.create(createData, (window) => {
        if (chrome.runtime.lastError) {
          resolve({
            success: false,
            error: chrome.runtime.lastError.message
          });
        } else if (window && window.tabs && window.tabs[0]?.id) {
          resolve({
            success: true,
            data: {
              windowId: window.id,
              tabId: window.tabs[0].id,
              url: window.tabs[0].url
            }
          });
        } else {
          resolve({
            success: false,
            error: 'Failed to create popup window'
          });
        }
      });
    });
  }

  /**
   * Close a specific window
   */
  static closeWindow(windowId: number): Promise<WebInteractionResult> {
    return new Promise((resolve) => {
      chrome.windows.remove(windowId, () => {
        if (chrome.runtime.lastError) {
          resolve({
            success: false,
            error: chrome.runtime.lastError.message
          });
        } else {
          resolve({
            success: true,
            data: { windowId }
          });
        }
      });
    });
  }
}
