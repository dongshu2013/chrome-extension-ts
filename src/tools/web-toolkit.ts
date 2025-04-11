// Web Toolkit Proxy for Content Script Interaction

export interface WebInteractionResult {
  success: boolean;
  data?: any;
  error?: string;
}

export class WebToolkit {
  // Proxy method to send messages to content script
  private async sendContentMessage(method: string, ...args: any[]): Promise<WebInteractionResult> {
    return new Promise((resolve, reject) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].id) {
          chrome.tabs.sendMessage(
            tabs[0].id, 
            { 
              type: 'EXECUTE_TOOLKIT', 
              method, 
              args 
            }, 
            (response) => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
              } else if (response && response.success) {
                resolve(response.result);
              } else {
                reject(new Error(response?.error || 'Unknown error'));
              }
            }
          );
        } else {
          reject(new Error('No active tab found'));
        }
      });
    });
  }

  // Proxy methods for each WebToolkit function
  async findElement(selector: string, timeout?: number): Promise<WebInteractionResult> {
    return this.sendContentMessage('findElement', selector, timeout);
  }

  async clickElement(selector: string): Promise<WebInteractionResult> {
    return this.sendContentMessage('clickElement', selector);
  }

  async fillInput(selector: string, value: string): Promise<WebInteractionResult> {
    return this.sendContentMessage('fillInput', selector, value);
  }

  async selectOption(selectSelector: string, optionSelector: string): Promise<WebInteractionResult> {
    return this.sendContentMessage('selectOption', selectSelector, optionSelector);
  }

  async scrollToElement(selector: string): Promise<WebInteractionResult> {
    return this.sendContentMessage('scrollToElement', selector);
  }

  async waitForElement(selector: string, timeout?: number): Promise<WebInteractionResult> {
    return this.sendContentMessage('waitForElement', selector, timeout);
  }

  async extractText(selector: string): Promise<WebInteractionResult> {
    return this.sendContentMessage('extractText', selector);
  }

  async extractAttribute(selector: string, attribute: string): Promise<WebInteractionResult> {
    return this.sendContentMessage('extractAttribute', selector, attribute);
  }
}
