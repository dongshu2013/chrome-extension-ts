import React, { useState, useEffect } from "react";
import "./style.css";

// 简单日志
const log = (message: string, ...data: any[]) => {
  console.log(`[Popup] ${message}`, ...data);
};

// 错误日志
const logError = (message: string, error: any) => {
  console.error(`[Popup Error] ${message}`, error);
};

// 弹出窗口组件
function Popup() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasTwitterTab, setHasTwitterTab] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "disconnected" | "checking"
  >("checking");

  // 初始加载
  useEffect(() => {
    log("弹出窗口初始化");

    // 初始化检查
    const init = async () => {
      try {
        // 检查Twitter标签页
        try {
          log("检查Twitter标签页");
          const tabs = await chrome.tabs.query({
            url: ["*://*.twitter.com/*", "*://*.x.com/*"],
          });
          log("找到Twitter标签页", tabs.length);
          setHasTwitterTab(tabs.length > 0);
        } catch (err) {
          logError("检查Twitter标签页失败", err);
        }

        // 检查后台连接
        try {
          log("检查后台连接");
          chrome.runtime.sendMessage({ type: "PING" }, (response) => {
            log("后台连接响应", response);

            if (
              response &&
              typeof response === "object" &&
              "success" in response
            ) {
              setConnectionStatus("connected");
            } else {
              setConnectionStatus("disconnected");
            }
          });
        } catch (err) {
          logError("连接后台失败", err);
          setConnectionStatus("disconnected");
        }
      } catch (err) {
        logError("初始化失败", err);
      } finally {
        // 延迟一下设置loading状态，确保UI已更新
        setTimeout(() => {
          setLoading(false);
        }, 500);
      }
    };

    init();
  }, []);

  // 打开侧边栏
  const openSidebar = () => {
    log("准备打开侧边栏");

    try {
      // 查找当前活动的Twitter标签
      chrome.tabs.query(
        {
          active: true,
          url: ["*://*.twitter.com/*", "*://*.x.com/*"],
        },
        (tabs) => {
          log("当前Twitter标签", tabs);

          if (tabs.length > 0 && tabs[0].id) {
            const tabId = tabs[0].id;
            log(`向标签 ${tabId} 发送OPEN_SIDEBAR消息`);

            // 找到Twitter标签，注入侧边栏
            chrome.tabs.sendMessage(
              tabId,
              { action: "OPEN_SIDEBAR" },
              (response) => {
                log("侧边栏响应", response);
                window.close(); // 关闭弹出窗口
              }
            );
          } else {
            // 没有找到Twitter标签，尝试查找任何Twitter标签
            chrome.tabs.query(
              {
                url: ["*://*.twitter.com/*", "*://*.x.com/*"],
              },
              (allTwitterTabs) => {
                log("所有Twitter标签", allTwitterTabs);

                if (allTwitterTabs.length > 0 && allTwitterTabs[0].id) {
                  const tabId = allTwitterTabs[0].id;
                  log(`切换到标签 ${tabId}`);

                  // 切换到第一个Twitter标签
                  chrome.tabs.update(tabId, { active: true }, () => {
                    log(`向标签 ${tabId} 发送OPEN_SIDEBAR消息`);

                    // 注入侧边栏
                    chrome.tabs.sendMessage(
                      tabId,
                      { action: "OPEN_SIDEBAR" },
                      (response) => {
                        log("侧边栏响应", response);
                        window.close(); // 关闭弹出窗口
                      }
                    );
                  });
                } else {
                  // 没有找到任何Twitter标签
                  log("未找到Twitter标签页");
                  setError("未找到Twitter标签页，请先打开Twitter");
                }
              }
            );
          }
        }
      );
    } catch (err) {
      logError("打开侧边栏失败", err);
      setError("打开侧边栏失败，请刷新页面后重试");
    }
  };

  // 打开选项页
  const openOptions = () => {
    log("打开选项页");
    try {
      chrome.tabs.create({ url: "options.html" });
    } catch (err) {
      logError("打开选项页失败", err);
    }
  };

  // 打开Twitter
  const openTwitter = () => {
    log("打开Twitter");
    try {
      chrome.tabs.create({ url: "https://twitter.com" });
    } catch (err) {
      logError("打开Twitter失败", err);
    }
  };

  // 显示加载状态
  if (loading) {
    return (
      <div className="popup-container loading">
        <div className="loading-container">
          <div className="spinner"></div>
          <p className="loading-text">加载中...</p>
        </div>
      </div>
    );
  }

  // 渲染主界面
  return (
    <div className="popup-container">
      <h1 className="popup-title">Twitter 用户分析助手</h1>

      {error && <div className="error-alert">{error}</div>}

      {connectionStatus === "disconnected" && (
        <div className="warning-alert">
          扩展连接已断开，请尝试刷新页面或重启浏览器
        </div>
      )}

      <div className="card">
        <div className="card-content">
          <div className="card-header">
            <span className="icon-analytics"></span>
            <h2 className="card-title">分析控制台</h2>
          </div>
          <p className="card-description">
            {hasTwitterTab
              ? "已检测到Twitter页面，可以打开侧边栏进行分析"
              : "未检测到Twitter页面，请先打开Twitter"}
          </p>
        </div>
        <hr className="divider" />
        <div className="card-actions">
          <button
            className="btn btn-primary"
            onClick={openSidebar}
            disabled={!hasTwitterTab || connectionStatus !== "connected"}
          >
            <span className="icon-open"></span>
            打开分析侧边栏
          </button>
        </div>
      </div>

      <div className="actions-container">
        <button className="btn btn-outline" onClick={openTwitter}>
          <span className="icon-open"></span>
          打开Twitter
        </button>
        <button className="btn btn-outline" onClick={openOptions}>
          <span className="icon-settings"></span>
          设置
        </button>
      </div>
    </div>
  );
}

export default Popup;
