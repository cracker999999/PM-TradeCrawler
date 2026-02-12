# Polymarket 交易记录神器

一个简洁美观的 Polymarket 用户交易记录导出工具，支持一键部署到 Cloudflare Pages。

## ✨ 功能特点

- 🔍 **智能解析** - 支持直接输入钱包地址或用户主页链接
- 📈 **收益曲线** - 一键生成基于 Polymarket 官方数据的 PnL 走势图
- 📊 **批量抓取** - 自动分页获取全部交易记录
- 📄 **多格式导出** - 支持 CSV、JSON 和 Markdown 格式下载
- 🎨 **现代UI** - 深色/浅色主题切换、玻璃态效果、交互式图表
- ⚡ **纯静态** - 无需后端，支持多种时间跨度（1d/1w/1m/all）分析

## 🚀 快速开始

### 本地预览

```bash
# 使用任意静态服务器
npx http-server -p 8888 -o

# 或直接打开 index.html
```

### 部署到 Cloudflare Pages

1. **Fork 或上传代码到 GitHub**

2. **登录 Cloudflare Dashboard**
   - 进入 Workers & Pages
   - 点击 "Create application" → "Pages"

3. **连接 Git 仓库**
   - 选择你的 GitHub 仓库
   - 构建设置保持默认（纯静态无需构建）

4. **部署完成**
   - 访问分配的 `.pages.dev` 域名即可使用

### 直接上传部署

```bash
# 安装 Wrangler CLI
npm install -g wrangler

# 登录
wrangler login

# 部署
wrangler pages deploy . --project-name polymarket-crawler
```

## 📁 项目结构

```
PMTradeCrawler/
├── index.html      # 主页面
├── styles.css      # 样式表
├── app.js          # 核心逻辑
└── README.md       # 说明文档
```

## 🔧 API 说明

工具使用 Polymarket 公开的 Data API：

```
GET https://data-api.polymarket.com/activity
  ?user=0x...    # 用户钱包地址
  &limit=100     # 每页条数
  &offset=0      # 分页偏移
```

返回数据字段：

| 字段 | 说明 |
|------|------|
| timestamp | 时间戳 |
| type | 类型 (TRADE/REDEEDM...) |
| title | 市场标题 |
| side | 方向 (BUY/SELL) |
| outcome | 结果 (Yes/No) |
| size | 数量 |
| price | 价格 |
| usdcSize | USDC金额 |

---

## 🛠️ 外部调用与导出说明

本项目提供了一个内置的 API 路由（位于 `/functions`），支持通过 URL 直接导出清洗后的 JSON 数据：

**接口地址：**
`/api/export?user={钱包地址}&limit={导出条数}`

**示例：**
`https://your-site.pages.dev/api/export?user=0x80cd...73&limit=50`

**参数说明：**
- `user`: 用户的 0x 钱包地址（必填）
- `limit`: 想要抓取的总记录数（可选，默认 100）

**接口特点：**
1. **直接下载**：返回 `attachment` 响应头，浏览器访问会直接提示保存为 `.json` 文件。
2. **自动清洗**：自动剔除冗余字段（如头像、简介等）。
3. **支持跨域**：已配置跨域头，可供其他应用调用。

## 📜 许可证

MIT License - 仅供学习研究使用
