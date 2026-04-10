# 知视 - 知识短视频平台

> 面向职场人的知识短视频推荐平台，通过AI算法为用户推荐个性化的职业技能学习内容。

## 项目简介

「知视」是一款面向职场人士的知识短视频平台，帮助用户利用碎片化时间学习职业技能。平台通过AI推荐算法，根据用户的职业方向和兴趣偏好，精准推荐产品经理、运营、技术开发、设计、数据分析等领域的优质知识短视频。

### 核心功能

- **智能推荐Feed** - 基于用户画像和协同过滤算法的个性化推荐
- **分类浏览** - 按职业方向分类浏览视频内容
- **全文搜索** - 支持视频标题、描述、标签的全文搜索
- **知识卡片** - AI自动生成视频知识要点，辅助学习
- **收藏管理** - 支持创建收藏夹，分类管理学习内容
- **评论互动** - 在视频下方发表评论，与其他学习者互动交流
- **学习笔记** - 观看视频时记录学习笔记，支持时间戳标注，随时回顾
- **学习历史** - 追踪学习行为，展示观看历史及完成进度
- **学习统计** - 追踪学习行为，展示学习数据

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + React Router 6 + Axios |
| 后端 | Node.js 20 + Express + pg-promise |
| AI服务 | Python 3.11 + FastAPI |
| 数据库 | PostgreSQL 16 |
| 缓存 | Redis 7 |
| 反向代理 | Nginx |
| 容器化 | Docker + Docker Compose |

## 项目结构

```
zhishi-video/
├── docker-compose.yml          # Docker 编排
├── .env.example                # 环境变量模板
├── backend/                    # 后端服务
│   ├── src/
│   │   ├── index.js            # Express 入口
│   │   ├── config/             # 配置管理
│   │   ├── middleware/          # 中间件（JWT认证）
│   │   ├── routes/             # API 路由
│   │   ├── models/             # 数据库模型
│   │   └── utils/              # 工具函数
│   └── scripts/seed.sql        # 种子数据
├── ai-service/                 # AI推荐服务
│   └── app/
│       ├── main.py             # FastAPI 入口
│       ├── routes/             # API 路由
│       └── services/           # 推荐算法
├── frontend/                   # 前端应用
│   └── src/
│       ├── pages/              # 页面组件
│       │   ├── Home.jsx        # 首页推荐Feed
│       │   ├── Category.jsx    # 分类浏览
│       │   ├── Search.jsx      # 搜索
│       │   ├── Player.jsx      # 视频播放（含评论、笔记）
│       │   ├── Favorites.jsx   # 我的收藏
│       │   ├── Notes.jsx       # 学习笔记
│       │   ├── History.jsx     # 学习历史
│       │   ├── Profile.jsx     # 个人中心
│       │   └── Login.jsx       # 登录
│       ├── components/         # 通用组件
│       │   ├── NavBar.jsx      # 底部导航栏
│       │   ├── VideoCard.jsx   # 视频卡片
│       │   ├── SearchBar.jsx   # 搜索框
│       │   ├── KnowledgeCard.jsx # 知识卡片弹窗
│       │   ├── Comments.jsx    # 评论区组件
│       │   └── NotesModal.jsx  # 学习笔记弹窗
│       ├── services/           # API调用
│       └── hooks/              # 自定义Hooks
└── nginx/                      # Nginx配置
```

## 快速启动

### 前置要求

- Docker 20.10+
- Docker Compose 2.0+

### 一键启动

```bash
# 克隆项目
git clone <repo-url>
cd zhishi-video

# 复制环境变量
cp .env.example .env

# 启动所有服务
docker-compose up --build

# 访问应用
# 前端: http://localhost
# 后端API: http://localhost/api/v1/health
# AI服务: http://localhost:8000/docs
```

### 测试账号

| 手机号 | 验证码 | 说明 |
|--------|--------|------|
| 13800000001 | 1234 | 测试用户1（产品经理方向） |
| 13800000002 | 1234 | 测试用户2（技术开发方向） |

> MVP阶段验证码固定为 `1234`，任意手机号均可登录。

## 本地开发

### 后端开发

```bash
cd backend
npm install
cp ../.env.example ../.env
npm run dev
```

### AI服务开发

```bash
cd ai-service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 前端开发

```bash
cd frontend
npm install
npm start
```

## API文档

### 认证接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/v1/auth/login | 手机号登录 |
| POST | /api/v1/auth/register | 注册 |
| POST | /api/v1/auth/profile | 更新用户画像 |

### 视频接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/v1/videos | 视频列表（分页、分类筛选） |
| GET | /api/v1/videos/:id | 视频详情 |
| POST | /api/v1/videos/:id/like | 点赞 |
| POST | /api/v1/videos/:id/play | 上报播放行为 |
| GET | /api/v1/categories | 分类列表 |

### 推荐接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/v1/feed | 推荐Feed（需登录） |

### 搜索接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/v1/search?q=xxx | 搜索视频 |
| GET | /api/v1/search/suggest?q=xxx | 搜索建议 |

### 收藏接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/v1/favorites | 收藏列表 |
| POST | /api/v1/favorites | 添加收藏 |
| DELETE | /api/v1/favorites/:id | 取消收藏 |
| POST | /api/v1/favorites/folders | 创建收藏夹 |

### 用户接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/v1/users/me | 当前用户信息 |
| PUT | /api/v1/users/me | 更新用户信息 |
| GET | /api/v1/users/history | 学习历史（需登录） |

### AI服务接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/v1/ai/recommend | AI推荐 |
| GET | /api/v1/ai/cards/:video_id | 知识卡片 |

### 评论接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/v1/comments/:videoId | 获取视频评论列表 |
| POST | /api/v1/comments/:videoId | 发表评论（需登录） |
| DELETE | /api/v1/comments/:id | 删除评论（仅本人） |

### 学习笔记接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/v1/notes | 获取笔记列表（需登录） |
| POST | /api/v1/notes | 创建笔记（需登录） |
| PUT | /api/v1/notes/:id | 更新笔记（需登录） |
| DELETE | /api/v1/notes/:id | 删除笔记（需登录） |

## 截图

> TODO: 添加应用截图

## 许可证

MIT License
