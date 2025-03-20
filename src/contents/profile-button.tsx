import type { PlasmoCSConfig } from "plasmo";
import React, { useEffect } from "react";

export const config: PlasmoCSConfig = {
  matches: ["*://*.twitter.com/*", "*://*.x.com/*"],
};

// 消息响应类型
interface MessageResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// Twitter个人资料分析按钮组件
const ProfileButton = () => {
  useEffect(() => {
    const addAnalysisButton = () => {
      try {
        // 查找个人资料页面的用户名元素
        const profileHeader = document.querySelector(
          '[data-testid="primaryColumn"] [data-testid="UserName"]'
        );

        // 如果找到了元素并且尚未添加按钮
        if (
          profileHeader &&
          !document.querySelector(".twitter-profile-analysis-btn")
        ) {
          // 查找放置按钮的容器
          const actionsContainer = profileHeader
            .closest('[data-testid="primaryColumn"]')
            ?.querySelector('[role="group"]');

          if (!actionsContainer) return;

          // 创建分析按钮
          const button = document.createElement("button");
          button.className = "twitter-profile-analysis-btn";
          button.textContent = "分析用户";
          button.title = "分析此用户的特征和风格";
          button.style.cssText = `
            background-color: #1da1f2;
            color: white;
            border: none;
            border-radius: 9999px;
            padding: 8px 16px;
            font-weight: 700;
            font-size: 14px;
            cursor: pointer;
            margin-left: 12px;
            transition: background-color 0.2s;
          `;

          // 悬停效果
          button.addEventListener("mouseover", () => {
            button.style.backgroundColor = "#1a91da";
          });

          button.addEventListener("mouseout", () => {
            button.style.backgroundColor = "#1da1f2";
          });

          // 获取当前用户名
          const userProfilePath = window.location.pathname;
          const username = userProfilePath.split("/")[1] || "";

          // 添加点击事件处理
          button.addEventListener("click", () => {
            // 消息请求添加用户
            chrome.runtime.sendMessage(
              { type: "ADD_USER_TO_SELECTED", username },
              (response: MessageResponse | undefined) => {
                if (response && response.success) {
                  // 打开侧边栏
                  chrome.runtime.sendMessage({ type: "OPEN_SIDEBAR" });

                  // 显示成功状态
                  button.textContent = "已添加";
                  button.style.backgroundColor = "#17bf63";

                  // 延迟后恢复原始状态
                  setTimeout(() => {
                    button.textContent = "分析用户";
                    button.style.backgroundColor = "#1da1f2";
                  }, 2000);
                } else {
                  // 显示失败状态
                  button.textContent = "添加失败";
                  button.style.backgroundColor = "#e0245e";

                  // 延迟后恢复原始状态
                  setTimeout(() => {
                    button.textContent = "分析用户";
                    button.style.backgroundColor = "#1da1f2";
                  }, 2000);
                }
              }
            );
          });

          // 添加按钮到页面
          actionsContainer.appendChild(button);
          console.log("Twitter个人资料分析按钮已添加");
        }
      } catch (error) {
        console.error("添加Twitter个人资料分析按钮时出错:", error);
      }
    };

    // 检查当前页面是否是个人资料页
    const checkProfilePage = () => {
      const pathParts = window.location.pathname.split("/");
      return (
        pathParts.length >= 2 &&
        pathParts[1] !== "" &&
        !["home", "explore", "notifications", "messages"].includes(pathParts[1])
      );
    };

    // 初始检查
    if (checkProfilePage()) {
      addAnalysisButton();
    }

    // 监听DOM变化
    const observer = new MutationObserver(() => {
      if (checkProfilePage()) {
        addAnalysisButton();
      }
    });

    // 开始观察DOM变化
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // 组件卸载时停止观察
    return () => {
      observer.disconnect();
    };
  }, []);

  // 这是一个内容脚本组件，不需要渲染任何UI
  return null;
};

export default ProfileButton;
