# Twitter 用户分析助手

> 基于ChromeExtension的Twitter用户分析工具，可以分析用户特征，生成个性化回复。

## 主要功能

- **用户搜索**: 支持通过用户名搜索Twitter用户，实时获取数据
- **用户分析**: 分析用户的个性特点、兴趣爱好和沟通风格
- **个性化回复**: 根据用户特征生成个性化回复建议
- **设置系统**: 完整的设置页面，包括AI模型配置、Twitter API设置等

## 技术特点

- 支持三种数据获取方式:
  1. **网页爬虫**: 直接抓取Twitter用户数据，无需API密钥
  2. **Twitter API**: 当配置API Token后，可通过官方API获取数据
  3. **备用模拟数据**: 当以上方法都不可用时，生成模拟用户数据

- 支持AI分析:
  - 使用OpenAI API分析用户特征
  - 提供个性化交流建议
  - 可选添加查看详情提醒

## 安装指南

### 开发版本安装

1. 克隆仓库
```bash
git clone [仓库URL]
cd chrome-extension-ts
```

2. 安装依赖
```bash
pnpm install
```

3. 开发模式
```bash
pnpm dev
```

4. 构建生产版本
```bash
pnpm build
```

### 浏览器安装

1. 打开Chrome浏览器，进入扩展管理页面: `chrome://extensions/`
2. 开启右上角的"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择build目录下的`chrome-mv3-prod`文件夹
5. 确认安装成功，可在浏览器工具栏看到扩展图标

## 使用说明

1. **搜索用户**:
   - 点击扩展图标，在弹出的搜索框中输入Twitter用户名
   - 查看搜索结果并选择要分析的用户

2. **查看分析**:
   - 点击用户卡片查看详细分析
   - 分析结果包括性格特点、兴趣爱好和沟通风格

3. **生成回复**:
   - 在用户分析页面点击"生成回复"
   - 可获得根据用户特征生成的个性化回复建议

4. **调整设置**:
   - 点击设置图标访问设置页面
   - 配置Twitter API、OpenAI API和其他功能设置

## 项目结构

```
src/
├── background.ts            # 后台脚本，处理搜索和分析
├── options.tsx              # 设置页面组件
├── popup.tsx                # 弹出窗口组件
├── services/
│   ├── ai-service.ts        # AI分析服务
│   ├── twitter-api.ts       # Twitter API服务
│   └── twitter-scraper.ts   # Twitter爬虫服务
└── types/
    ├── app.ts               # 应用类型定义
    └── twitter.ts           # Twitter相关类型定义
```

## 权限说明

本扩展需要以下权限:

- `storage`: 存储设置和分析结果
- `tabs`: 创建和管理标签页
- `activeTab`: 访问当前标签页
- `scripting`: 执行内容脚本，用于爬取用户数据
- `*://*.twitter.com/*`, `*://*.x.com/*`: 在Twitter网站上运行内容脚本

## 隐私说明

- 所有用户数据分析仅在本地进行，除非启用OpenAI API
- 搜索历史可在设置中选择是否保存
- 不会收集或传输任何个人身份信息

## 许可证

MIT License
