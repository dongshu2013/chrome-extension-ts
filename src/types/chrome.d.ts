// This file provides type declarations for Chrome APIs when @types/chrome is not available

declare namespace chrome {
  namespace storage {
    namespace local {
      function get(keys: string | string[] | object | null, callback: (items: any) => void): void;
      function set(items: object, callback?: () => void): void;
      function remove(keys: string | string[], callback?: () => void): void;
      function clear(callback?: () => void): void;
    }
  }

  namespace runtime {
    interface MessageSender {
      tab?: chrome.tabs.Tab;
      frameId?: number;
      id?: string;
      url?: string;
      tlsChannelId?: string;
    }

    function sendMessage(message: any, responseCallback?: (response: any) => void): void;
    function sendMessage(extensionId: string, message: any, responseCallback?: (response: any) => void): void;
    function sendMessage(extensionId: string, message: any, options: any, responseCallback?: (response: any) => void): void;

    const onMessage: {
      addListener(callback: (message: any, sender: MessageSender, sendResponse: (response?: any) => void) => boolean | void): void;
      removeListener(callback: (message: any, sender: MessageSender, sendResponse: (response?: any) => void) => boolean | void): void;
      hasListeners(): boolean;
    };

    const onInstalled: {
      addListener(callback: (details: any) => void): void;
      removeListener(callback: (details: any) => void): void;
      hasListeners(): boolean;
    };

    const lastError: {
      message?: string;
    } | undefined;
  }

  namespace tabs {
    interface Tab {
      id?: number;
      index: number;
      windowId: number;
      highlighted: boolean;
      active: boolean;
      pinned: boolean;
      url?: string;
      title?: string;
      favIconUrl?: string;
      status?: string;
      incognito: boolean;
      width?: number;
      height?: number;
      sessionId?: string;
    }

    function query(queryInfo: any, callback: (result: Tab[]) => void): void;
    function query(queryInfo: any): Promise<Tab[]>;
    function sendMessage(tabId: number, message: any, responseCallback?: (response: any) => void): void;
    function create(createProperties: any, callback?: (tab: Tab) => void): void;
    function update(tabId: number, updateProperties: { url?: string, active?: boolean, highlighted?: boolean, pinned?: boolean, muted?: boolean, autoDiscardable?: boolean }, callback?: (tab?: Tab) => void): void;
    function remove(tabIds: number | number[], callback?: () => void): void;
  }

  namespace windows {
    interface Window {
      id: number;
      focused: boolean;
      top?: number;
      left?: number;
      width?: number;
      height?: number;
      tabs?: chrome.tabs.Tab[];
      incognito: boolean;
      type?: string;
      state?: string;
      alwaysOnTop: boolean;
      sessionId?: string;
    }

    function get(windowId: number, callback: (window: Window) => void): void;
    function getCurrent(callback: (window: Window) => void): void;
    function getCurrent(getInfo: any, callback: (window: Window) => void): void;
    function create(createData: any, callback?: (window: Window) => void): void;
    function remove(windowId: number, callback?: () => void): void;
  }

  namespace scripting {
    function executeScript(details: {
      target: { tabId: number, frameIds?: number[] },
      files?: string[],
      func?: () => any,
      args?: any[],
      injectImmediately?: boolean
    }): Promise<{ frameId: number, result: any }[]>;
  }
} 