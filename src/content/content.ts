import browser from 'webextension-polyfill';
import { isTwitterProfileUrl } from '../twitter/timeline';
import { Settings, DEFAULT_SETTINGS } from '../types';

class ContentAnalyzer {
  private settings: Settings = DEFAULT_SETTINGS;
  private selectedText: string = '';
  private contextMenu: HTMLDivElement | null = null;

  constructor() {
    this.loadSettings();
    this.initializeEventListeners();
  }

  private async loadSettings() {
    this.settings = await new Promise((resolve) => {
      chrome.storage.sync.get(['settings'], (result) => {
        resolve(result.settings || DEFAULT_SETTINGS);
      });
    });
  }

  private initializeEventListeners() {
    // Listen for text selection
    document.addEventListener('mouseup', (e) => this.handleTextSelection(e));
    
    // Listen for settings changes
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.settings) {
        this.settings = changes.settings.newValue;
      }
    });

    // Listen for messages from the popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log('Content script received message:', request);
      if (request.type === 'ANALYZE_PAGE') {
        console.log('Starting page analysis...');
        this.analyzePageContent();
      }
    });
  }

  async analyzePageContent() {
    console.log('Analyzing page content...');
    console.log('Is Twitter profile?', this.isTwitterProfilePage());
    
    // Check if it's a Twitter profile page
    if (this.isTwitterProfilePage()) {
      try {
        console.log('Getting Twitter profile HTML...');
        const html = await this.getTwitterProfileHtml();
        if (!html) {
          throw new Error('Failed to get Twitter profile HTML');
        }
        console.log('Got HTML, sending to background script...');

        // Send HTML to background script for analysis
        chrome.runtime.sendMessage({
          type: 'ANALYZE_PROFILE',
          html: html
        });
      } catch (error: unknown) {
        console.error('Error analyzing Twitter profile:', error);
        chrome.runtime.sendMessage({
          type: 'PROFILE_ERROR',
          error: error instanceof Error ? error.message : 'An unknown error occurred'
        });
      }
    } else {
      console.log('Not a Twitter profile page, sending unsupported message');
      chrome.runtime.sendMessage({
        type: 'PROFILE_ERROR',
        error: 'Please navigate to a Twitter/X profile page first.'
      });
    }
  }

  private isTwitterProfilePage(): boolean {
    return isTwitterProfileUrl(window.location.href);
  }

  private async getTwitterProfileHtml(): Promise<string | null> {
    try {
      // Simple scroll to load more content
      let lastHeight = document.documentElement.scrollHeight;
      await this.smoothScroll(lastHeight);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Scroll back to top gently
      await this.smoothScroll(0);
      
      // Get the cleaned HTML content
      const cleanHtml = document.documentElement.outerHTML
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // Remove styles
        .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ''); // Remove SVGs

      return cleanHtml;
    } catch (error) {
      console.error('Error getting Twitter profile HTML:', error);
      return null;
    }
  }

  private async smoothScroll(targetScroll: number) {
    const duration = 1000; // 1 second
    const start = window.scrollY;
    const distance = targetScroll - start;
    const startTime = performance.now();

    return new Promise<void>(resolve => {
      function step() {
        const currentTime = performance.now();
        const elapsed = currentTime - startTime;
        
        if (elapsed >= duration) {
          window.scrollTo(0, targetScroll);
          resolve();
          return;
        }

        // Easing function
        const progress = elapsed / duration;
        const easeProgress = 0.5 - Math.cos(progress * Math.PI) / 2;
        const currentPosition = start + (distance * easeProgress);
        
        window.scrollTo(0, currentPosition);
        requestAnimationFrame(step);
      }

      requestAnimationFrame(step);
    });
  }

  private handleTextSelection(e: MouseEvent) {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      this.hideContextMenu();
      return;
    }

    const text = selection.toString().trim();
    if (text && text !== this.selectedText) {
      this.selectedText = text;
      this.showContextMenu(e);
    }
  }

  private showContextMenu(e: MouseEvent) {
    if (this.contextMenu) {
      document.body.removeChild(this.contextMenu);
    }

    this.contextMenu = document.createElement('div');
    this.contextMenu.className = 'fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-2';
    this.contextMenu.style.left = `${e.pageX}px`;
    this.contextMenu.style.top = `${e.pageY}px`;

    const addButton = document.createElement('button');
    addButton.className = 'px-3 py-1 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded';
    addButton.textContent = 'Add to Character';
    addButton.onclick = () => this.addTraitToCharacter();

    this.contextMenu.appendChild(addButton);
    document.body.appendChild(this.contextMenu);

    // Close menu when clicking outside
    document.addEventListener('mousedown', (e) => {
      if (this.contextMenu && !this.contextMenu.contains(e.target as Node)) {
        this.hideContextMenu();
      }
    }, { once: true });
  }

  private hideContextMenu() {
    if (this.contextMenu) {
      document.body.removeChild(this.contextMenu);
      this.contextMenu = null;
    }
    this.selectedText = '';
  }

  private async addTraitToCharacter() {
    if (!this.selectedText) return;
    
    // Send selected text to background script for analysis
    chrome.runtime.sendMessage({
      type: 'ANALYZE_PROFILE',
      html: this.selectedText
    });

    this.hideContextMenu();
  }

  // Add styles for the context menu
  public injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .fixed {
        position: fixed;
      }
      .z-50 {
        z-index: 50;
      }
      .bg-white {
        background-color: white;
      }
      .rounded-lg {
        border-radius: 0.5rem;
      }
      .shadow-lg {
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      }
      .border {
        border-width: 1px;
      }
      .border-gray-200 {
        border-color: #e5e7eb;
      }
      .p-2 {
        padding: 0.5rem;
      }
      .px-3 {
        padding-left: 0.75rem;
        padding-right: 0.75rem;
      }
      .py-1 {
        padding-top: 0.25rem;
        padding-bottom: 0.25rem;
      }
      .text-sm {
        font-size: 0.875rem;
      }
      .text-white {
        color: white;
      }
      .bg-indigo-600 {
        background-color: #4f46e5;
      }
      .hover\\:bg-indigo-700:hover {
        background-color: #4338ca;
      }
      .rounded {
        border-radius: 0.25rem;
      }
    `;
    document.head.appendChild(style);
  }
}

// Initialize content analyzer when the page loads
new ContentAnalyzer().injectStyles();
