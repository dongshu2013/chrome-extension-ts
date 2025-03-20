import type { AppState } from "./app";

// 扩展Chrome运行时的类型
declare global {
  namespace chrome.runtime {
    interface MessageResponse {
      success: boolean;
      message?: string;
      error?: string;
      state?: AppState;
      timestamp?: number;
      users?: any[];
      analysis?: any;
      reply?: string;
      results?: any;
      tabInfo?: any;
    }
  }
}

export {}; 