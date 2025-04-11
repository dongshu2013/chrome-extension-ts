// Web Toolkit for Content Script Interaction
import { sleep } from '../utils/common';

export interface WebInteractionResult {
  success: boolean;
  data?: any;
  error?: string;
}

export class WebToolkit {
  // Default timeout for operations
  private static DEFAULT_TIMEOUT = 5000;

  // Find an element using various selector strategies
  async findElement(selector: string, timeout: number = WebToolkit.DEFAULT_TIMEOUT): Promise<WebInteractionResult> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const checkForElement = () => {
        const element = document.querySelector(selector);
        
        if (element) {
          resolve({ 
            success: true, 
            data: element 
          });
        } else if (Date.now() - startTime > timeout) {
          resolve({
            success: false,
            error: `Element not found: ${selector}`
          });
        } else {
          // Retry after a short delay
          setTimeout(checkForElement, 100);
        }
      };

      checkForElement();
    });
  }

  // Click an element
  async clickElement(selector: string): Promise<WebInteractionResult> {
    try {
      const findResult = await this.findElement(selector);
      
      if (!findResult.success || !findResult.data) {
        return findResult;
      }

      const element = findResult.data as HTMLElement;
      
      // Ensure element is visible and clickable
      if (element.offsetParent === null) {
        return {
          success: false,
          error: `Element is not visible: ${selector}`
        };
      }

      element.click();

      return { 
        success: true,
        data: element
      };
    } catch (error) {
      return {
        success: false,
        error: `Error clicking element: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  // Fill an input element
  async fillInput(selector: string, value: string): Promise<WebInteractionResult> {
    try {
      const findResult = await this.findElement(selector);
      
      if (!findResult.success || !findResult.data) {
        return findResult;
      }

      const element = findResult.data as HTMLInputElement | HTMLTextAreaElement;
      
      // Clear existing value
      element.value = '';
      
      // Simulate user typing
      for (const char of value) {
        element.value += char;
        
        // Dispatch input event to trigger any listeners
        const event = new Event('input', { bubbles: true });
        element.dispatchEvent(event);
        
        // Small delay to simulate typing
        await sleep(10);
      }

      return { 
        success: true,
        data: element
      };
    } catch (error) {
      return {
        success: false,
        error: `Error filling input: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  // Scroll to an element
  async scrollToElement(selector: string): Promise<WebInteractionResult> {
    try {
      const findResult = await this.findElement(selector);
      
      if (!findResult.success || !findResult.data) {
        return findResult;
      }

      const element = findResult.data as HTMLElement;
      
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });

      return { 
        success: true,
        data: element
      };
    } catch (error) {
      return {
        success: false,
        error: `Error scrolling to element: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  // Wait for an element to be present
  async waitForElement(selector: string, timeout: number = WebToolkit.DEFAULT_TIMEOUT): Promise<WebInteractionResult> {
    return this.findElement(selector, timeout);
  }

  // Extract text from an element
  async extractText(selector: string): Promise<WebInteractionResult> {
    try {
      const findResult = await this.findElement(selector);
      
      if (!findResult.success || !findResult.data) {
        return findResult;
      }

      const element = findResult.data as HTMLElement;
      
      return { 
        success: true,
        data: element.textContent?.trim() || ''
      };
    } catch (error) {
      return {
        success: false,
        error: `Error extracting text: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  // Extract an attribute from an element
  async extractAttribute(selector: string, attribute: string): Promise<WebInteractionResult> {
    try {
      const findResult = await this.findElement(selector);
      
      if (!findResult.success || !findResult.data) {
        return findResult;
      }

      const element = findResult.data as HTMLElement;
      
      return { 
        success: true,
        data: element.getAttribute(attribute) || ''
      };
    } catch (error) {
      return {
        success: false,
        error: `Error extracting attribute: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
}
