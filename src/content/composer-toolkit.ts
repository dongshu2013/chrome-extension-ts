// Content Script: Web Interaction Composer
import { WebToolkit } from './web-toolkit';

export interface WebInteractionResult {
  success: boolean;
  data?: any;
  error?: string;
}

export class WebInteractionComposer {
  private webToolkit: WebToolkit;

  constructor() {
    this.webToolkit = new WebToolkit();
  }

  // Twitter-specific interaction workflows
  async composeTweet(text: string): Promise<WebInteractionResult[]> {
    return [
      // Wait for tweet input to be ready
      await this.safeExecute(() => this.webToolkit.waitForElement('textarea[data-testid="tweetTextarea"]')),
      
      // Fill tweet text
      await this.safeExecute(() => this.webToolkit.fillInput('textarea[data-testid="tweetTextarea"]', text)),
      
      // Click tweet button
      await this.safeExecute(() => this.webToolkit.clickElement('button[data-testid="tweetButton"]'))
    ];
  }

  async replyToTweet(
    tweetSelector: string, 
    replyText: string
  ): Promise<WebInteractionResult[]> {
    return [
      // Find reply button for specific tweet
      await this.safeExecute(() => this.webToolkit.clickElement(`${tweetSelector} [data-testid="replyButton"]`)),
      
      // Wait for reply textarea
      await this.safeExecute(() => this.webToolkit.waitForElement('textarea[data-testid="replyTextarea"]')),
      
      // Fill reply text
      await this.safeExecute(() => this.webToolkit.fillInput('textarea[data-testid="replyTextarea"]', replyText)),
      
      // Send reply
      await this.safeExecute(() => this.webToolkit.clickElement('button[data-testid="sendReplyButton"]'))
    ];
  }

  async submitForm(formSelector: string): Promise<WebInteractionResult[]> {
    return [
      // Wait for form
      await this.safeExecute(() => this.webToolkit.waitForElement(formSelector)),
      
      // Find submit button within the form
      await this.safeExecute(() => this.webToolkit.clickElement(`${formSelector} [type="submit"]`))
    ];
  }

  async selectDropdownOption(
    selectSelector: string, 
    optionValue: string
  ): Promise<WebInteractionResult[]> {
    return [
      // Click to open dropdown
      await this.safeExecute(() => this.webToolkit.clickElement(selectSelector)),
      
      // Select specific option
      await this.safeExecute(() => this.webToolkit.clickElement(`${selectSelector} option[value="${optionValue}"]`))
    ];
  }

  // Utility method to execute a sequence of interactions
  async executeWorkflow(
    interactions: Array<() => Promise<WebInteractionResult[]>>
  ): Promise<WebInteractionResult[]> {
    const results: WebInteractionResult[] = [];

    for (const interaction of interactions) {
      try {
        const interactionResults = await interaction();
        results.push(...interactionResults);

        // Stop if any interaction fails
        if (interactionResults.some(result => !result.success)) {
          break;
        }
      } catch (error) {
        results.push({
          success: false,
          error: String(error)
        });
        break;
      }
    }

    return results;
  }

  // Safe execution wrapper to convert WebToolkit method results to WebInteractionResult
  private async safeExecute(
    action: () => Promise<any>
  ): Promise<WebInteractionResult> {
    try {
      const result = await action();
      return {
        success: true,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: String(error)
      };
    }
  }
}
