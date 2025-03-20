import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import type { PlasmoCSConfig } from "plasmo";
import "./twitter-sidebar.css";

// 定义接口
interface TwitterUser {
  id: string;
  username: string;
  name: string;
  profile_image_url?: string;
  verified?: boolean;
  description?: string;
  followersCount?: number;
  followingCount?: number;
}

interface SearchResultItem {
  user: TwitterUser;
  score?: number;
}

interface UserAnalysis {
  username: string;
  traits: string[];
  interests: string[];
  communicationStyle: string;
  summary: string;
  generatedAt: number;
  replyTemplates?: string[];
}

// 指定该脚本应在Twitter和X.com上运行
export const config: PlasmoCSConfig = {
  matches: ["*://*.twitter.com/*", "*://*.x.com/*"],
};

// 创建侧边栏容器
function createSidebarContainer() {
  const existingContainer = document.getElementById("twitter-analysis-sidebar");
  if (existingContainer) {
    return existingContainer;
  }

  const container = document.createElement("div");
  container.id = "twitter-analysis-sidebar";
  container.classList.add("twitter-sidebar-container");
  document.body.appendChild(container);
  return container;
}

// 模拟 Twitter 用户数据
const mockUsers: TwitterUser[] = [
  {
    id: "1",
    username: "elonmusk",
    name: "Elon Musk",
    profile_image_url:
      "https://pbs.twimg.com/profile_images/1683325380441128960/yRsRRjGO_400x400.jpg",
    verified: true,
    description: "CEO of Tesla, SpaceX, Neuralink and The Boring Company",
    followersCount: 150200000,
    followingCount: 220,
  },
  {
    id: "2",
    username: "BillGates",
    name: "Bill Gates",
    profile_image_url:
      "https://pbs.twimg.com/profile_images/1414439092373254147/JdS8yLGI_400x400.jpg",
    verified: true,
    description: "Co-chair of the Bill & Melinda Gates Foundation",
    followersCount: 62900000,
    followingCount: 418,
  },
  {
    id: "3",
    username: "ylecun",
    name: "Yann LeCun",
    profile_image_url:
      "https://pbs.twimg.com/profile_images/1483577865056702469/rWA-3_T7_400x400.jpg",
    verified: true,
    description: "Chief AI Scientist at Meta, Professor at NYU",
    followersCount: 542000,
    followingCount: 1342,
  },
];

// 模拟用户分析数据
const mockAnalysisData: Record<string, UserAnalysis> = {
  elonmusk: {
    username: "elonmusk",
    traits: ["独立思考", "创新", "冒险", "直言不讳", "工作狂"],
    interests: ["太空探索", "电动汽车", "人工智能", "可持续能源", "技术创新"],
    communicationStyle: "直接、幽默、有时争议性",
    summary:
      "思维跳跃，对科技和未来充满热情，喜欢在社交媒体上分享想法和观点，经常引发讨论和辩论。",
    generatedAt: Date.now(),
    replyTemplates: [
      "感谢您的见解！您提出了关于[主题]的重要观点。作为一个注重创新的人，您可能也会对[相关主题]感兴趣。",
      "您的发言非常有启发性。考虑到您对[兴趣领域]的关注，我想分享一个相关的观点：[内容]。",
      "作为一个直言不讳的人，您的观点总是令人耳目一新。关于[主题]，我认为[补充观点]可能也值得考虑。",
    ],
  },
  BillGates: {
    username: "BillGates",
    traits: ["分析性思维", "慈善", "全球视野", "谦逊", "终身学习者"],
    interests: ["全球健康", "气候变化", "教育", "技术创新", "读书"],
    communicationStyle: "深思熟虑、教育性、平和",
    summary:
      "理性而富有同情心，关注全球性问题，擅长将复杂话题简化为可理解的信息，注重基于数据的决策。",
    generatedAt: Date.now(),
    replyTemplates: [
      "您的观点很有见地。从全球健康的角度看，[相关内容]也是一个值得关注的问题。",
      "感谢分享！作为一个注重数据的人，您可能会对这些关于[主题]的研究发现感兴趣：[数据点]。",
      "您提出了重要的问题。考虑到教育的重要性，我想补充[教育相关观点]可能对这个讨论有所帮助。",
    ],
  },
  ylecun: {
    username: "ylecun",
    traits: ["学术严谨", "开放思想", "好奇心", "创新", "合作"],
    interests: [
      "深度学习",
      "计算机视觉",
      "人工智能伦理",
      "科学研究",
      "技术教育",
    ],
    communicationStyle: "技术性、精确、教育性",
    summary:
      "思维严谨，关注AI领域的技术进步和伦理问题，善于解释复杂概念，积极参与学术和公共讨论。",
    generatedAt: Date.now(),
    replyTemplates: [
      "您的观点引发了我对[AI相关主题]的思考。从技术角度看，[补充技术细节]可能会对讨论有所帮助。",
      "这是个有趣的问题！考虑到深度学习的最新研究，[相关研究发现]可能会为您提供更多见解。",
      "感谢您分享这个观点。作为一个关注AI伦理的人，您可能也会对[伦理问题]的最新讨论感兴趣。",
    ],
  },
};

// Twitter侧边栏组件
function TwitterSidebar() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<TwitterUser[]>([]);
  const [userAnalyses, setUserAnalyses] = useState<
    Record<string, UserAnalysis>
  >({});
  const [isAnalyzing, setIsAnalyzing] = useState<Record<string, boolean>>({});
  const [currentTab, setCurrentTab] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const searchTimeoutRef = useRef<number | null>(null);

  // 搜索用户
  useEffect(() => {
    if (searchTimeoutRef.current) {
      window.clearTimeout(searchTimeoutRef.current);
    }

    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    // 添加搜索延迟，实现打字时的实时搜索
    searchTimeoutRef.current = window.setTimeout(() => {
      const query = searchQuery.toLowerCase();
      const results = mockUsers
        .filter(
          (user) =>
            user.username.toLowerCase().includes(query) ||
            user.name.toLowerCase().includes(query) ||
            (user.description && user.description.toLowerCase().includes(query))
        )
        .map((user) => ({
          user,
          score: calculateSearchScore(user, query),
        }))
        .sort((a, b) => (b.score || 0) - (a.score || 0));

      setSearchResults(results);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        window.clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // 计算搜索相关性分数
  const calculateSearchScore = (user: TwitterUser, query: string): number => {
    let score = 0;

    // 用户名匹配 (高权重)
    if (user.username.toLowerCase() === query) score += 10;
    else if (user.username.toLowerCase().startsWith(query)) score += 8;
    else if (user.username.toLowerCase().includes(query)) score += 5;

    // 名称匹配 (中等权重)
    if (user.name.toLowerCase() === query) score += 8;
    else if (user.name.toLowerCase().startsWith(query)) score += 6;
    else if (user.name.toLowerCase().includes(query)) score += 4;

    // 描述匹配 (低权重)
    if (user.description && user.description.toLowerCase().includes(query))
      score += 2;

    // 已验证账号加分
    if (user.verified) score += 1;

    // 粉丝数量加分 (用于推荐知名用户)
    if (user.followersCount) {
      if (user.followersCount > 10000000) score += 2;
      else if (user.followersCount > 1000000) score += 1;
    }

    return score;
  };

  // 选择用户进行分析
  const handleSelectUser = (user: TwitterUser) => {
    if (!selectedUsers.some((u) => u.id === user.id)) {
      setSelectedUsers((prev) => [...prev, user]);
      setNotification(`已添加 ${user.name} 到分析列表`);

      // 自动切换到已选标签
      setTimeout(() => {
        setCurrentTab(1);
      }, 500);
    } else {
      setNotification(`${user.name} 已在分析列表中`);
    }

    // 清除搜索结果
    setSearchQuery("");
    setSearchResults([]);
  };

  // 移除用户
  const handleRemoveUser = (userId: string) => {
    setSelectedUsers((prev) => prev.filter((user) => user.id !== userId));
    setNotification("已移除用户");
  };

  // 分析用户
  const handleAnalyzeUser = async (username: string) => {
    setIsAnalyzing((prev) => ({ ...prev, [username]: true }));

    try {
      // 模拟API调用延迟
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // 从模拟数据获取或生成随机分析
      const analysis = mockAnalysisData[username] || {
        username,
        traits: ["分析性思维", "创新", "社交", "开放态度", "好奇心"],
        interests: ["科技", "社交媒体", "新闻", "娱乐", "时尚"],
        communicationStyle: "友好、直接、有见地",
        summary: "活跃的社交媒体用户，喜欢分享观点和互动，关注多元化话题。",
        generatedAt: Date.now(),
      };

      setUserAnalyses((prev) => ({
        ...prev,
        [username]: analysis,
      }));

      setNotification(`分析完成: ${username}`);
    } catch (err) {
      console.error("分析出错:", err);
      setError(`分析 ${username} 时出错`);
    } finally {
      setIsAnalyzing((prev) => ({ ...prev, [username]: false }));
    }
  };

  // 复制回复模板
  const handleCopyTemplate = (template: string) => {
    navigator.clipboard
      .writeText(template)
      .then(() => setNotification("已复制到剪贴板"))
      .catch((err) => {
        console.error("复制失败:", err);
        setError("复制到剪贴板失败");
      });
  };

  // 渲染搜索结果项
  const renderSearchResultItem = (item: SearchResultItem) => {
    const { user } = item;
    return (
      <div
        className="sidebar-search-result"
        key={user.id}
        onClick={() => handleSelectUser(user)}
      >
        <div className="user-avatar">
          <img
            src={
              user.profile_image_url ||
              "https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png"
            }
            alt={user.name}
          />
          {user.verified && <div className="verified-badge" />}
        </div>
        <div className="user-info">
          <div className="user-name">{user.name}</div>
          <div className="user-username">@{user.username}</div>
          {user.description && (
            <div className="user-description">
              {user.description.length > 60
                ? user.description.slice(0, 60) + "..."
                : user.description}
            </div>
          )}
        </div>
      </div>
    );
  };

  // 渲染已选择的用户
  const renderSelectedUser = (user: TwitterUser) => {
    return (
      <div className="sidebar-selected-user" key={user.id}>
        <div className="user-avatar">
          <img
            src={
              user.profile_image_url ||
              "https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png"
            }
            alt={user.name}
          />
          {user.verified && <div className="verified-badge" />}
        </div>
        <div className="user-info">
          <div className="user-name">{user.name}</div>
          <div className="user-username">@{user.username}</div>
        </div>
        <div className="user-actions">
          <button
            className="analyze-button"
            onClick={() => handleAnalyzeUser(user.username)}
            disabled={isAnalyzing[user.username]}
          >
            {isAnalyzing[user.username] ? "分析中..." : "分析"}
          </button>
          <button
            className="remove-button"
            onClick={() => handleRemoveUser(user.id)}
          >
            移除
          </button>
        </div>
      </div>
    );
  };

  // 渲染用户分析
  const renderUserAnalysis = (user: TwitterUser) => {
    const analysis = userAnalyses[user.username];

    if (!analysis) {
      return (
        <div className="sidebar-analysis-item" key={user.id}>
          <div className="user-info-compact">
            <div className="user-avatar">
              <img
                src={
                  user.profile_image_url ||
                  "https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png"
                }
                alt={user.name}
              />
            </div>
            <div>
              <div className="user-name">{user.name}</div>
              <div className="user-username">@{user.username}</div>
            </div>
          </div>
          <button
            className="analyze-button-large"
            onClick={() => handleAnalyzeUser(user.username)}
            disabled={isAnalyzing[user.username]}
          >
            {isAnalyzing[user.username] ? "分析中..." : "开始分析用户"}
          </button>
        </div>
      );
    }

    return (
      <div className="sidebar-analysis-item" key={user.id}>
        <div className="user-info-compact">
          <div className="user-avatar">
            <img
              src={
                user.profile_image_url ||
                "https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png"
              }
              alt={user.name}
            />
          </div>
          <div>
            <div className="user-name">{user.name}</div>
            <div className="user-username">@{user.username}</div>
          </div>
        </div>

        <div className="analysis-summary">
          <h3>个性总结</h3>
          <p>{analysis.summary}</p>
        </div>

        <div className="analysis-traits">
          <h3>性格特征</h3>
          <div className="traits-list">
            {analysis.traits.map((trait, index) => (
              <span className="trait-tag" key={index}>
                {trait}
              </span>
            ))}
          </div>
        </div>

        <div className="analysis-interests">
          <h3>兴趣领域</h3>
          <div className="interests-list">
            {analysis.interests.map((interest, index) => (
              <span className="interest-tag" key={index}>
                {interest}
              </span>
            ))}
          </div>
        </div>

        <div className="analysis-communication">
          <h3>沟通风格</h3>
          <p>{analysis.communicationStyle}</p>
        </div>

        {analysis.replyTemplates && (
          <div className="reply-templates">
            <h3>回复模板</h3>
            <div className="templates-list">
              {analysis.replyTemplates.map((template, index) => (
                <div className="template-item" key={index}>
                  <p>{template}</p>
                  <button
                    className="copy-button"
                    onClick={() => handleCopyTemplate(template)}
                  >
                    复制
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="analysis-timestamp">
          分析时间: {new Date(analysis.generatedAt).toLocaleString()}
        </div>
      </div>
    );
  };

  // 关闭侧边栏
  const handleClose = () => {
    const container = document.getElementById("twitter-analysis-sidebar");
    if (container) {
      container.remove();
    }
  };

  // 清除通知
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [notification]);

  return (
    <div className="twitter-sidebar">
      {/* 头部 */}
      <div className="sidebar-header">
        <h1 className="sidebar-title">用户分析助手</h1>
        <button className="close-button" onClick={handleClose}>
          ×
        </button>
      </div>

      {/* 通知 */}
      {notification && (
        <div className="sidebar-notification">{notification}</div>
      )}

      {/* 错误 */}
      {error && (
        <div className="sidebar-error">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* 标签页 */}
      <div className="sidebar-tabs">
        <button
          className={`tab-button ${currentTab === 0 ? "active" : ""}`}
          onClick={() => setCurrentTab(0)}
        >
          搜索
        </button>
        <button
          className={`tab-button ${currentTab === 1 ? "active" : ""}`}
          onClick={() => setCurrentTab(1)}
        >
          已选择 ({selectedUsers.length})
        </button>
        <button
          className={`tab-button ${currentTab === 2 ? "active" : ""}`}
          onClick={() => setCurrentTab(2)}
        >
          分析
        </button>
      </div>

      {/* 搜索标签内容 */}
      {currentTab === 0 && (
        <div className="sidebar-content">
          <div className="search-box">
            <input
              type="text"
              placeholder="搜索Twitter用户..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="search-icon"></div>
          </div>

          <div className="search-results">
            {searchResults.length > 0 ? (
              searchResults.map((item) => renderSearchResultItem(item))
            ) : searchQuery ? (
              <div className="no-results">没有找到匹配的用户</div>
            ) : (
              <div className="search-hint">
                <p>搜索提示：</p>
                <ul>
                  <li>输入用户名或全名</li>
                  <li>搜索与特定主题相关的用户</li>
                  <li>结果将按相关性排序</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 已选择标签内容 */}
      {currentTab === 1 && (
        <div className="sidebar-content">
          {selectedUsers.length > 0 ? (
            <div className="selected-users">
              {selectedUsers.map((user) => renderSelectedUser(user))}
            </div>
          ) : (
            <div className="empty-state">
              <p>尚未选择用户分析</p>
              <button
                className="action-button"
                onClick={() => setCurrentTab(0)}
              >
                搜索用户
              </button>
            </div>
          )}
        </div>
      )}

      {/* 分析标签内容 */}
      {currentTab === 2 && (
        <div className="sidebar-content">
          {selectedUsers.length > 0 ? (
            <div className="analysis-results">
              {selectedUsers.map((user) => renderUserAnalysis(user))}
            </div>
          ) : (
            <div className="empty-state">
              <p>请先选择用户进行分析</p>
              <button
                className="action-button"
                onClick={() => setCurrentTab(0)}
              >
                搜索用户
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 注入侧边栏
function injectSidebar() {
  const container = createSidebarContainer();
  const root = createRoot(container);
  root.render(<TwitterSidebar />);
}

// 创建触发按钮
function createTriggerButton() {
  const existingButton = document.getElementById("twitter-analysis-trigger");
  if (existingButton) {
    return;
  }

  const button = document.createElement("button");
  button.id = "twitter-analysis-trigger";
  button.classList.add("twitter-analysis-button");
  button.innerHTML = `
    <svg viewBox="0 0 24 24" width="24" height="24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" fill="currentColor"></path>
    </svg>
  `;
  button.title = "分析用户";
  document.body.appendChild(button);

  button.addEventListener("click", () => {
    const sidebar = document.getElementById("twitter-analysis-sidebar");
    if (sidebar) {
      sidebar.remove();
    } else {
      injectSidebar();
    }
  });
}

// 创建用户头像悬停分析按钮
function createHoverButtons() {
  // 检测页面中的Twitter用户头像
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length) {
        // 查找用户头像或用户名元素
        const profileImages = document.querySelectorAll(
          'img[src*="profile_images"]'
        );

        profileImages.forEach((img) => {
          if (img.getAttribute("data-analysis-button-added")) return;

          const parent = img.closest("div");
          if (!parent) return;

          img.setAttribute("data-analysis-button-added", "true");

          // 为头像元素添加悬停事件
          parent.addEventListener("mouseenter", () => {
            // 如果已经有了分析按钮，就不再创建
            if (parent.querySelector(".hover-analysis-button")) return;

            const hoverButton = document.createElement("button");
            hoverButton.className = "hover-analysis-button";
            hoverButton.innerHTML = "分析";
            hoverButton.title = "分析此用户";

            parent.style.position = "relative";
            parent.appendChild(hoverButton);

            // 获取用户名信息
            let username = "";

            // 尝试从页面元素获取用户名
            const usernameEl = parent
              .closest("article")
              ?.querySelector('a[href*="/status/"]');
            if (usernameEl) {
              const href = usernameEl.getAttribute("href");
              if (href) {
                const match = href.match(/\/([^\/]+)\/status\//);
                if (match && match[1]) {
                  username = match[1];
                }
              }
            }

            // 点击事件 - 打开侧边栏并添加到分析列表
            hoverButton.addEventListener("click", (e) => {
              e.stopPropagation();

              // 获取用户资料
              const userName = username || "unknown";

              // 打开侧边栏
              const sidebar = document.getElementById(
                "twitter-analysis-sidebar"
              );
              if (!sidebar) {
                injectSidebar();
              }

              // 向侧边栏发送消息
              setTimeout(() => {
                // 这里使用自定义事件将用户添加到分析列表
                const event = new CustomEvent("add-user-to-analysis", {
                  detail: { username: userName },
                });
                document.dispatchEvent(event);
              }, 300);
            });
          });

          // 移出事件移除按钮
          parent.addEventListener("mouseleave", () => {
            const button = parent.querySelector(".hover-analysis-button");
            if (button) {
              button.remove();
            }
          });
        });
      }
    }
  });

  // 开始观察DOM变化
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// 初始化
function initTwitterAnalysis() {
  createTriggerButton();
  createHoverButtons();

  // 监听消息
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Twitter侧边栏收到消息:", message);

    if (message && message.action === "OPEN_SIDEBAR") {
      try {
        const sidebar = document.getElementById("twitter-analysis-sidebar");
        if (sidebar) {
          // 如果侧边栏已经存在，先移除它
          sidebar.remove();
          console.log("已移除现有侧边栏");
        }

        // 注入新的侧边栏
        console.log("注入新侧边栏");
        injectSidebar();

        // 发送成功响应
        sendResponse({ success: true, message: "侧边栏已打开" });
      } catch (err) {
        console.error("打开侧边栏失败:", err);
        sendResponse({ success: false, error: "打开侧边栏失败" });
      }
      return true; // 保持消息通道打开以进行异步响应
    }
    return false;
  });
}

// 在DOMContentLoaded后初始化或立即初始化
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initTwitterAnalysis);
} else {
  initTwitterAnalysis();
}

// 导出空组件以满足 Plasmo 的要求
export default function TwitterSidebarWrapper() {
  return null;
}
