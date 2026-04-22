# 知视 - 职场知识短视频平台

> 一个面向职场学习场景的知识短视频项目，包含推荐 Feed、分类浏览、搜索、视频播放、知识卡片、评论、收藏、笔记、学习历史、路线图、个人中心与创作者中心等模块。

## 项目简介

「知视」聚焦职场学习内容消费，核心体验是：

- 浏览推荐内容
- 搜索或按分类发现视频
- 在播放页点赞、收藏、评论、记笔记
- 在个人中心查看收藏、笔记、历史与学习统计
- 查看学习路线图与创作者数据面板

当前仓库已经具备完整的前后端联调能力，并接入了独立的 AI 服务用于推荐与知识卡片生成。

## 当前已实现功能

### 内容发现

- **推荐 Feed**：首页按游标分页加载推荐内容，支持刷新与滚动加载更多
- **分类浏览**：支持一级/二级分类切换，按热门排序查看视频
- **搜索**：支持关键词搜索、热门搜索词、搜索建议、结果分页加载

### 视频学习

- **视频播放页**：支持 HTML5 播放、分享、相关推荐
- **点赞**：支持点赞 / 取消点赞
- **收藏**：支持添加收藏、取消收藏、收藏夹筛选、新建收藏夹
- **知识卡片**：支持调用 AI 服务生成摘要、关键要点、思维导图
- **评论系统**：支持查看评论、发表评论、删除自己的评论
- **学习笔记**：支持在播放页按时间戳记录笔记，并在笔记页统一管理
- **学习历史**：支持记录播放行为并展示最近观看记录与进度
- **笔记导出**：支持 JSON、Markdown、TXT 三种格式导出笔记
- **复习提醒**：支持创建复习提醒和艾宾浩斯遗忘曲线复习计划

### 用户与成长

- **手机号登录**：MVP 阶段验证码固定为 `1234`
- **新用户职业方向初始化**：首次登录后可选择职业方向，并写入技能标签
- **个人中心**：展示昵称、职业方向、技能标签、学习统计
- **每日打卡与成就**：支持每日打卡、连续天数统计、徽章进度查询

### 扩展页面

- **学习路线图**：支持路线图列表与详情页，详情页展示个人进度
- **创作者中心**：支持查看创作者统计与视频列表
- **设置 / 反馈 / 关于**：已提供页面入口和基础交互，其中部分能力目前仍是前端占位交互

## 当前实现说明

以下能力已经有页面或接口，但目前属于基础版实现：

- **设置页**：本地开关、清理缓存提示、退出登录
- **反馈页**：前端表单提交成功提示，未落库
- **关于页**：检查更新、协议、隐私政策为占位提示
- **创作者中心**：可查看统计和内容列表；上传 / 编辑仍为占位交互
- **路线图详情**：依赖登录态获取个人进度

## 技术栈

| 层级    | 技术                                |
| ----- | --------------------------------- |
| 前端    | React 18 + React Router 6 + Axios |
| 后端    | Node.js + Express + pg-promise    |
| AI 服务 | Python + FastAPI                  |
| 数据库   | PostgreSQL                        |
| 缓存    | Redis                             |
| 反向代理  | Nginx                             |
| 容器化   | Docker + Docker Compose           |

## 项目结构

```text
zhishi-video/
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── src/
│   │   ├── index.js              # Express 入口
│   │   ├── config/               # 配置管理
│   │   ├── middleware/           # JWT 鉴权中间件
│   │   ├── models/               # PostgreSQL / Redis 连接
│   │   ├── routes/               # 业务接口
│   │   └── utils/
│   └── scripts/seed.sql          # 初始化数据
├── ai-service/
│   └── app/
│       ├── main.py               # FastAPI 入口
│       ├── routes/               # recommend / cards
│       └── services/             # 推荐与卡片生成逻辑
├── frontend/
│   ├── public/
│   └── src/
│       ├── components/           # 通用组件
│       ├── hooks/                # useAuth 等
│       ├── pages/                # 页面
│       ├── services/             # API 封装
│       ├── App.js                # 路由入口
│       └── App.css               # 样式
└── nginx/
```

## 前端页面一览

- `/` 推荐首页
- `/login` 登录 / 职业方向初始化
- `/category` 分类浏览
- `/search` 搜索
- `/video/:id` 视频播放页
- `/favorites` 我的收藏
- `/notes` 我的笔记
- `/history` 学习历史
- `/profile` 个人中心
- `/roadmaps` 学习路线图列表
- `/roadmaps/:id` 学习路线图详情
- `/creator` 创作者中心
- `/settings` 设置
- `/feedback` 意见反馈
- `/about` 关于知视

## 后端接口概览

### 认证

- `POST /api/v1/auth/login` 手机号登录
- `POST /api/v1/auth/register` 注册
- `POST /api/v1/auth/profile` 更新职业方向 / 技能标签

### 视频与内容

- `GET /api/v1/videos` 视频列表
- `GET /api/v1/videos/:id` 视频详情
- `POST /api/v1/videos/:id/like` 点赞 / 取消点赞
- `POST /api/v1/videos/:id/play` 播放行为上报
- `GET /api/v1/videos/categories/list` 分类列表
- `GET /api/v1/feed` 推荐 Feed
- `GET /api/v1/search` 搜索视频
- `GET /api/v1/search/suggest` 搜索建议 / 热门词

### 收藏、评论、笔记

- `GET /api/v1/favorites` 收藏列表
- `POST /api/v1/favorites` 添加收藏
- `DELETE /api/v1/favorites/:id` 取消收藏
- `POST /api/v1/favorites/folders` 创建收藏夹
- `GET /api/v1/comments/:videoId` 获取评论
- `POST /api/v1/comments/:videoId` 发表评论
- `DELETE /api/v1/comments/:id` 删除评论
- `GET /api/v1/notes` 获取笔记
- `POST /api/v1/notes` 创建笔记
- `PUT /api/v1/notes/:id` 更新笔记
- `DELETE /api/v1/notes/:id` 删除笔记

### 用户

- `GET /api/v1/users/me` 获取当前用户资料与学习统计
- `PUT /api/v1/users/me` 更新用户资料
- `GET /api/v1/users/history` 获取学习历史
- `POST /api/v1/users/check-in` 每日打卡
- `GET /api/v1/users/achievements` 获取成就与徽章进度

### 路线图与创作者

- `GET /api/v1/roadmaps` 路线图列表
- `GET /api/v1/roadmaps/:id` 路线图详情与进度
- `GET /api/v1/creator/stats` 创作者数据统计
- `GET /api/v1/creator/videos` 创作者视频列表

### AI 服务

- `GET /health` AI 服务健康检查
- `POST /api/v1/recommend` 生成推荐视频 ID 列表
- `GET /api/v1/cards/:video_id` 获取知识卡片

## 快速启动

### 1. 准备环境变量

```bash
cp .env.example .env
```

### 2. 使用 Docker Compose 启动

docker-compose up --build  或者  docker compose up --build

启动后可访问：

- 前端：`http://localhost`
- 后端健康检查：`http://localhost/health` 或 `http://localhost:3000/health`（取决于你的代理配置）
- AI 服务文档：`http://localhost:8000/docs`

## 本地开发

### 后端

```bash
cd backend
npm install
npm run dev
```

### 前端

```bash
cd frontend
npm install
npm start
```

### AI 服务

```bash
cd ai-service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## 测试说明

- 登录验证码固定为：`1234`
- 任意合法手机号均可登录
- 首次登录用户会进入职业方向选择流程

## 新增功能说明

### 创作者功能

- **视频上传**：支持 MP4、WebM、MOV、AVI、MKV 格式，最大 500MB
- **视频编辑**：支持修改标题、描述、分类、标签、封面图
- **视频发布**：草稿状态可发布为已发布状态
- **自动字幕**：一键生成自动字幕（当前为模拟实现，可接入真实 ASR 服务）
- **知识点标记**：为视频添加带时间范围的知识点标记，支持标签分类

### 学习辅助功能

- **笔记导出**：支持 JSON、Markdown、TXT 三种格式导出学习笔记
- **复习提醒**：支持创建自定义时间的复习提醒
- **艾宾浩斯复习计划**：基于 SM-2 算法的间隔重复复习系统，自动计算下次复习时间

### 数据库新增表

- `subtitles` - 自动字幕表
- `knowledge_points` - 知识点标记表
- `review_reminders` - 复习提醒表
- `review_schedules` - 复习计划表（艾宾浩斯遗忘曲线）

## 备注

README 已按当前仓库实现同步，描述以现有代码为准。
