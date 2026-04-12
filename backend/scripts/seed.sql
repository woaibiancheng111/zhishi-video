-- ============================================
-- 知视知识短视频平台 - 种子数据
-- ============================================

-- 清理已有表
DROP TABLE IF EXISTS user_badges CASCADE;
DROP TABLE IF EXISTS badges CASCADE;
DROP TABLE IF EXISTS user_statistics CASCADE;
DROP TABLE IF EXISTS notes CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS knowledge_cards CASCADE;
DROP TABLE IF EXISTS user_behaviors CASCADE;
DROP TABLE IF EXISTS favorites CASCADE;
DROP TABLE IF EXISTS favorite_folders CASCADE;
DROP TABLE IF EXISTS videos CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================
-- 用户表
-- ============================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(11) UNIQUE NOT NULL,
    nickname VARCHAR(50) DEFAULT '',
    avatar_url VARCHAR(500) DEFAULT '',
    bio TEXT DEFAULT '',
    career_direction VARCHAR(100) DEFAULT '',
    skill_tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 分类表
-- ============================================
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(50) DEFAULT '',
    description TEXT DEFAULT '',
    parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 视频表
-- ============================================
CREATE TABLE videos (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT DEFAULT '',
    video_url VARCHAR(500) NOT NULL,
    cover_url VARCHAR(500) DEFAULT '',
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    creator_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    tags TEXT[] DEFAULT '{}',
    duration INTEGER DEFAULT 0,
    play_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'published',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 用户行为表
-- ============================================
CREATE TABLE user_behaviors (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    video_id INTEGER REFERENCES videos(id) ON DELETE CASCADE,
    behavior_type VARCHAR(20) NOT NULL,
    duration INTEGER DEFAULT 0,
    progress NUMERIC(5, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 收藏夹表
-- ============================================
CREATE TABLE favorite_folders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 收藏表
-- ============================================
CREATE TABLE favorites (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    video_id INTEGER REFERENCES videos(id) ON DELETE CASCADE,
    folder_id INTEGER REFERENCES favorite_folders(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 知识卡片表
-- ============================================
CREATE TABLE knowledge_cards (
    id SERIAL PRIMARY KEY,
    video_id INTEGER REFERENCES videos(id) ON DELETE CASCADE,
    summary TEXT DEFAULT '',
    key_points TEXT[] DEFAULT '{}',
    mindmap JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 评论表
-- ============================================
CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    video_id INTEGER REFERENCES videos(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    like_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 学习笔记表
-- ============================================
CREATE TABLE notes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    video_id INTEGER REFERENCES videos(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    timestamp_sec INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 创建索引
-- ============================================
CREATE INDEX idx_videos_category ON videos(category_id);
CREATE INDEX idx_videos_status ON videos(status);
CREATE INDEX idx_videos_created ON videos(created_at DESC);
CREATE INDEX idx_user_behaviors_user ON user_behaviors(user_id);
CREATE INDEX idx_user_behaviors_video ON user_behaviors(video_id);
CREATE INDEX idx_favorites_user ON favorites(user_id);
CREATE INDEX idx_user_behaviors_type ON user_behaviors(user_id, behavior_type);
CREATE INDEX idx_comments_video ON comments(video_id);
CREATE INDEX idx_comments_user ON comments(user_id);
CREATE INDEX idx_notes_user ON notes(user_id);
CREATE INDEX idx_notes_video ON notes(user_id, video_id);

-- ============================================
-- 插入分类数据
-- ============================================

-- 一级分类
INSERT INTO categories (name, icon, description, sort_order) VALUES
('产品经理', 'briefcase', '产品思维、需求分析、产品设计', 1),
('运营', 'megaphone', '用户运营、内容运营、活动运营', 2),
('技术/开发', 'code', '前后端开发、架构设计、技术选型', 3),
('设计', 'palette', 'UI/UX设计、视觉设计、交互设计', 4),
('数据分析', 'chart-bar', '数据分析、数据可视化、数据建模', 5),
('项目管理', 'tasks', '项目管理、敏捷开发、团队协作', 6),
('通用职场', 'users', '职场技能、沟通技巧、职业发展', 7);

-- 二级分类 - 产品经理
INSERT INTO categories (name, icon, description, parent_id, sort_order) VALUES
('需求分析', 'search', '用户调研、需求挖掘、需求文档', 1, 1),
('产品设计', 'layout', '原型设计、交互设计、信息架构', 1, 2),
('产品策略', 'trending-up', '产品规划、竞品分析、商业模式', 1, 3);

-- 二级分类 - 运营
INSERT INTO categories (name, icon, description, parent_id, sort_order) VALUES
('用户运营', 'user-plus', '用户增长、留存策略、社群运营', 2, 1),
('内容运营', 'file-text', '内容策划、内容分发、内容营销', 2, 2),
('活动运营', 'calendar', '活动策划、活动执行、效果评估', 2, 3);

-- 二级分类 - 技术/开发
INSERT INTO categories (name, icon, description, parent_id, sort_order) VALUES
('前端开发', 'monitor', 'React、Vue、CSS、JavaScript', 3, 1),
('后端开发', 'server', 'Node.js、Python、Java、Go', 3, 2),
('架构设计', 'layers', '系统架构、微服务、分布式', 3, 3);

-- 二级分类 - 设计
INSERT INTO categories (name, icon, description, parent_id, sort_order) VALUES
('UI设计', 'paint-brush', '界面设计、设计规范、组件库', 4, 1),
('UX设计', 'compass', '用户体验、可用性测试、用户研究', 4, 2);

-- 二级分类 - 数据分析
INSERT INTO categories (name, icon, description, parent_id, sort_order) VALUES
('SQL与数据库', 'database', 'SQL查询、数据库优化、数据建模', 5, 1),
('数据可视化', 'pie-chart', '图表设计、BI工具、数据报告', 5, 2);

-- 二级分类 - 项目管理
INSERT INTO categories (name, icon, description, parent_id, sort_order) VALUES
('敏捷开发', 'zap', 'Scrum、看板、迭代管理', 6, 1),
('团队管理', 'users', '团队建设、绩效管理、沟通协作', 6, 2);

-- 二级分类 - 通用职场
INSERT INTO categories (name, icon, description, parent_id, sort_order) VALUES
('职业规划', 'target', '职业定位、晋升路径、行业选择', 7, 1),
('沟通表达', 'message-circle', '演讲技巧、汇报能力、谈判技巧', 7, 2);

-- ============================================
-- 插入测试用户
-- ============================================
INSERT INTO users (phone, nickname, avatar_url, career_direction, skill_tags) VALUES
('13800000001', '产品小王', 'https://api.dicebear.com/7.x/initials/svg?seed=WX', '产品经理', ARRAY['需求分析', '产品设计', '用户调研', 'Axure', 'PRD']),
('13800000002', '技术大牛', 'https://api.dicebear.com/7.x/initials/svg?seed=DN', '技术/开发', ARRAY['React', 'Node.js', 'Python', '系统架构', '前端开发']);

-- ============================================
-- 插入模拟视频数据
-- ============================================
INSERT INTO videos (title, description, video_url, cover_url, category_id, creator_id, tags, duration, play_count, like_count) VALUES

-- 产品经理方向视频
('产品经理必看：如何写出一份高质量的PRD文档', '手把手教你撰写产品需求文档，从用户故事到功能描述，包含真实案例拆解。掌握PRD写作的核心方法论，让你的需求文档更加专业清晰。', 'https://www.w3schools.com/html/mov_bbb.mp4', 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=400&h=300&fit=crop', 4, 1, ARRAY['PRD', '需求文档', '产品经理', '入门'], 580, 3420, 256),

('5分钟理解用户画像：从数据到洞察', '用户画像是产品经理的核心技能之一。本视频讲解如何通过数据分析构建用户画像，从人口统计学特征到行为偏好，帮助你更好地理解目标用户。', 'https://www.w3schools.com/html/mov_bbb.mp4', 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop', 4, 1, ARRAY['用户画像', '数据分析', '用户研究', '产品经理'], 420, 2180, 189),

('竞品分析实战：如何系统化分析竞争对手', '从信息收集到分析框架，系统讲解竞品分析的方法论。包含SWOT分析、功能对比矩阵、用户体验对比等实用技巧。', 'https://www.w3schools.com/html/mov_bbb.mp4', 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=400&h=300&fit=crop', 4, 1, ARRAY['竞品分析', '产品策略', 'SWOT', '产品经理'], 650, 1850, 142),

-- 运营方向视频
('零基础学用户运营：从0到1搭建用户增长体系', '系统讲解用户运营的核心方法论，包括AARRR模型、用户生命周期管理、留存策略等。适合刚入行或想转行做运营的同学。', 'https://www.w3schools.com/html/mov_bbb.mp4', 'https://images.unsplash.com/photo-1533750349088-cd871a92f312?w=400&h=300&fit=crop', 5, 1, ARRAY['用户运营', '增长黑客', 'AARRR', '留存'], 720, 4560, 378),

('爆款内容运营：10万+文章的底层逻辑', '拆解爆款内容的创作方法论，从选题策划到标题优化，从内容结构到传播策略。帮助你掌握内容运营的核心技巧。', 'https://www.w3schools.com/html/mov_bbb.mp4', 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=400&h=300&fit=crop', 5, 1, ARRAY['内容运营', '爆款', '新媒体', '写作技巧'], 550, 3240, 267),

('活动运营全流程：从策划到复盘', '详解活动运营的完整流程，包括活动目标设定、方案策划、资源协调、执行落地和效果复盘。附带活动策划模板。', 'https://www.w3schools.com/html/mov_bbb.mp4', 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=300&fit=crop', 5, 1, ARRAY['活动运营', '策划', '复盘', '执行'], 480, 2100, 165),

-- 技术/开发方向视频
('React Hooks 完全指南：从入门到精通', '深入讲解React Hooks的核心概念，包括useState、useEffect、useContext、useReducer等。配合实际案例帮助你快速掌握React Hooks。', 'https://www.w3schools.com/html/mov_bbb.mp4', 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=300&fit=crop', 9, 2, ARRAY['React', 'Hooks', '前端开发', 'JavaScript'], 900, 6780, 523),

('Node.js 后端开发实战：构建RESTful API', '从零开始搭建一个完整的Node.js后端项目，包括Express框架、路由设计、中间件使用、数据库连接等。适合有JavaScript基础的同学。', 'https://www.w3schools.com/html/mov_bbb.mp4', 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=400&h=300&fit=crop', 10, 2, ARRAY['Node.js', 'Express', 'RESTful', '后端开发'], 850, 5430, 412),

('Python数据分析入门：Pandas基础教程', 'Python数据分析必备库Pandas的基础教程，讲解DataFrame操作、数据清洗、数据聚合等核心功能。配合Jupyter Notebook实战练习。', 'https://www.w3schools.com/html/mov_bbb.mp4', 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&h=300&fit=crop', 10, 2, ARRAY['Python', 'Pandas', '数据分析', '入门'], 680, 4210, 345),

('微服务架构设计：从单体到微服务的演进', '讲解微服务架构的核心概念和设计原则，包括服务拆分策略、服务间通信、数据一致性、服务治理等。适合有一定开发经验的工程师。', 'https://www.w3schools.com/html/mov_bbb.mp4', 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&h=300&fit=crop', 11, 2, ARRAY['微服务', '架构设计', '分布式', '系统设计'], 780, 3890, 298),

-- 设计方向视频
('UI设计基础：色彩理论与配色技巧', '从色彩三要素到配色方案，系统讲解UI设计中的色彩运用。包含实际案例分析和配色工具推荐。', 'https://www.w3schools.com/html/mov_bbb.mp4', 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=300&fit=crop', 12, 1, ARRAY['UI设计', '色彩理论', '配色', '设计基础'], 520, 2890, 234),

('Figma高效设计工作流：从入门到进阶', '全面介绍Figma设计工具的使用技巧，包括组件系统、Auto Layout、原型交互、团队协作等功能。提升你的设计效率。', 'https://www.w3schools.com/html/mov_bbb.mp4', 'https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=400&h=300&fit=crop', 12, 1, ARRAY['Figma', 'UI设计', '设计工具', '组件库'], 660, 3560, 287),

('用户体验设计：如何做好可用性测试', '讲解可用性测试的方法论和实操技巧，包括测试计划制定、任务设计、用户招募、数据分析和报告撰写。', 'https://www.w3schools.com/html/mov_bbb.mp4', 'https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=400&h=300&fit=crop', 13, 1, ARRAY['UX设计', '可用性测试', '用户研究', '体验设计'], 450, 1920, 156),

-- 数据分析方向视频
('SQL入门到精通：数据分析必备技能', '从基础查询到高级分析，系统讲解SQL的核心语法和实用技巧。包括JOIN、子查询、窗口函数、CTE等重要知识点。', 'https://www.w3schools.com/html/mov_bbb.mp4', 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop', 14, 1, ARRAY['SQL', '数据库', '数据分析', '查询'], 800, 5670, 445),

('数据可视化实战：用图表讲好数据故事', '讲解数据可视化的设计原则和实战技巧，包括图表类型选择、配色方案、交互设计等。帮助你用数据驱动决策。', 'https://www.w3schools.com/html/mov_bbb.mp4', 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop', 15, 1, ARRAY['数据可视化', '图表', 'BI', '数据报告'], 560, 2340, 198),

-- 项目管理方向视频
('Scrum敏捷开发实战：从理论到落地', '详解Scrum框架的核心实践，包括Sprint计划、每日站会、评审会和回顾会。附带项目管理工具推荐和团队协作技巧。', 'https://www.w3schools.com/html/mov_bbb.mp4', 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=300&fit=crop', 16, 1, ARRAY['Scrum', '敏捷开发', '项目管理', 'Sprint'], 620, 3120, 245),

('如何做好项目复盘：方法论与模板', '项目复盘是团队成长的关键环节。本视频讲解复盘的方法论、流程和注意事项，附带复盘模板。', 'https://www.w3schools.com/html/mov_bbb.mp4', 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=300&fit=crop', 17, 1, ARRAY['项目复盘', '项目管理', '团队管理', '持续改进'], 380, 1780, 134),

-- 通用职场方向视频
('职场新人必看：如何快速融入新团队', '从入职第一天到试用期结束，教你如何快速适应新环境、建立人际关系、展现个人价值。包含实用的职场沟通技巧。', 'https://www.w3schools.com/html/mov_bbb.mp4', 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&h=300&fit=crop', 18, 1, ARRAY['职场新人', '团队融入', '沟通技巧', '职业发展'], 480, 4560, 389),

('高效时间管理：番茄工作法与GTD实践', '介绍两种经典的时间管理方法：番茄工作法和GTD（Getting Things Done）。帮助你提升工作效率，告别拖延症。', 'https://www.w3schools.com/html/mov_bbb.mp4', 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=400&h=300&fit=crop', 19, 1, ARRAY['时间管理', '番茄工作法', 'GTD', '效率提升'], 420, 3890, 312),

('如何做一场精彩的职场汇报', '职场汇报是展示个人能力的重要机会。本视频讲解汇报的结构设计、PPT制作技巧、演讲表达方法，帮助你做出令人印象深刻的汇报。', 'https://www.w3schools.com/html/mov_bbb.mp4', 'https://images.unsplash.com/photo-1531498860502-7c67cf02f657?w=400&h=300&fit=crop', 19, 1, ARRAY['职场汇报', 'PPT', '演讲技巧', '表达能力'], 530, 2670, 201);

-- ============================================
-- 插入知识卡片数据
-- ============================================
INSERT INTO knowledge_cards (video_id, summary, key_points, mindmap) VALUES
(1, 'PRD文档是产品经理日常工作中最重要的交付物之一，一份好的PRD需要清晰描述功能需求、用户场景和验收标准。',
 ARRAY['PRD的核心要素：背景、目标、用户故事、功能描述、交互说明、验收标准', '用户故事格式：作为XX角色，我希望XX，以便XX', '需求优先级排序：使用KANO模型或MoSCoW方法', 'PRD评审要点：完整性、一致性、可测试性'],
 '{"center":"PRD文档","branches":[{"name":"核心要素","children":["背景与目标","用户故事","功能描述","交互说明","验收标准"]},{"name":"写作技巧","children":["结构清晰","语言简洁","图文并茂","版本管理"]},{"name":"评审要点","children":["完整性","一致性","可测试性","优先级"]}]}'),

(7, 'React Hooks是React 16.8引入的新特性，让函数组件也能使用状态和副作用，是现代React开发的核心技能。',
 ARRAY['useState：在函数组件中管理状态', 'useEffect：处理副作用（API调用、订阅、DOM操作）', 'useContext：跨组件传递数据，避免prop drilling', 'useReducer：管理复杂状态逻辑', 'useMemo/useCallback：性能优化，避免不必要的渲染', '自定义Hook：复用有状态的逻辑'],
 '{"center":"React Hooks","branches":[{"name":"基础Hooks","children":["useState","useEffect","useContext"]},{"name":"进阶Hooks","children":["useReducer","useMemo","useCallback","useRef"]},{"name":"自定义Hook","children":["逻辑复用","命名规范","测试策略"]},{"name":"最佳实践","children":["依赖数组规则","性能优化","TypeScript集成"]}]}'),

(8, 'Node.js是一个基于Chrome V8引擎的JavaScript运行时，非常适合构建高性能的RESTful API服务。',
 ARRAY['Express框架：轻量灵活的Web框架', '路由设计：RESTful风格，资源化URL', '中间件机制：请求处理管道', '错误处理：统一错误处理中间件', '数据库集成：使用ORM或查询构建器', '认证授权：JWT Token认证方案'],
 '{"center":"Node.js后端开发","branches":[{"name":"核心技术","children":["Express框架","路由设计","中间件"]},{"name":"数据层","children":["PostgreSQL","Redis缓存","ORM集成"]},{"name":"安全","children":["JWT认证","输入校验","CORS配置"]},{"name":"部署","children":["Docker容器","PM2进程管理","日志监控"]}]}'),

(9, 'Pandas是Python数据分析的核心库，提供了高效的数据结构和数据分析工具。',
 ARRAY['DataFrame：二维表格数据结构，支持行列操作', '数据清洗：处理缺失值、重复值、异常值', '数据筛选：条件过滤、loc/iloc索引', '数据聚合：groupby分组、聚合函数', '数据合并：merge、join、concat', '时间序列：日期解析、重采样、滚动窗口'],
 '{"center":"Pandas数据分析","branches":[{"name":"数据结构","children":["Series","DataFrame","Index"]},{"name":"数据操作","children":["筛选","排序","聚合","合并"]},{"name":"数据清洗","children":["缺失值处理","类型转换","去重"]},{"name":"分析技巧","children":["分组统计","透视表","时间序列"]}]}'),

(14, 'SQL是数据分析的必备技能，掌握SQL可以高效地从数据库中提取和分析数据。',
 ARRAY['基础查询：SELECT、WHERE、ORDER BY、LIMIT', '聚合函数：COUNT、SUM、AVG、MAX、MIN', '多表关联：INNER JOIN、LEFT JOIN、RIGHT JOIN', '子查询：标量子查询、表子查询、EXISTS', '窗口函数：ROW_NUMBER、RANK、DENSE_RANK、LEAD/LAG', 'CTE：WITH子句，提高查询可读性'],
 '{"center":"SQL查询","branches":[{"name":"基础语法","children":["SELECT","WHERE","GROUP BY","ORDER BY"]},{"name":"高级查询","children":["JOIN","子查询","CTE","窗口函数"]},{"name":"性能优化","children":["索引使用","执行计划","查询重写"]},{"name":"实战场景","children":["用户分析","漏斗分析","留存分析"]}]}');


-- ============================================
-- 用户统计表
-- ============================================
CREATE TABLE user_statistics (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    check_in_count INTEGER DEFAULT 0,
    continuous_days INTEGER DEFAULT 0,
    last_check_in_date DATE,
    total_points INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 徽章定义表
-- ============================================
CREATE TABLE badges (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT DEFAULT '',
    icon_url VARCHAR(500) DEFAULT '',
    category VARCHAR(50) DEFAULT 'achievement',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 用户徽章关系表
-- ============================================
CREATE TABLE user_badges (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    badge_id INTEGER REFERENCES badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, badge_id)
);


CREATE INDEX idx_user_statistics_user ON user_statistics(user_id);
CREATE INDEX idx_user_badges_user ON user_badges(user_id);
CREATE INDEX idx_badges_category ON badges(category);

-- ============================================
-- 插入一些模拟用户行为数据
-- ============================================
INSERT INTO user_behaviors (user_id, video_id, behavior_type, duration, progress) VALUES
(1, 1, 'play', 580, 100),
(1, 2, 'play', 420, 85),
(1, 7, 'play', 300, 33),
(1, 1, 'like', 0, 0),
(1, 2, 'like', 0, 0),
(2, 7, 'play', 900, 100),
(2, 8, 'play', 850, 100),
(2, 9, 'play', 680, 95),
(2, 10, 'play', 500, 64),
(2, 7, 'like', 0, 0),
(2, 8, 'like', 0, 0),
(2, 9, 'like', 0, 0);

-- ============================================
-- 插入默认收藏夹
-- ============================================
INSERT INTO favorite_folders (user_id, name, description) VALUES
(1, '默认收藏', '我的默认收藏夹'),
(1, '产品学习', '产品经理相关学习资料'),
(2, '默认收藏', '我的默认收藏夹'),
(2, '技术收藏', '技术开发相关收藏');

-- 插入一些收藏数据
INSERT INTO favorites (user_id, video_id, folder_id) VALUES
(1, 1, 1),
(1, 2, 2),
(2, 7, 3),
(2, 8, 4),
(2, 10, 4);

-- 完成
-- 执行完毕提示
DO $$
BEGIN
    RAISE NOTICE '知视种子数据初始化完成！';
    RAISE NOTICE '- 用户: 2个测试用户';
    RAISE NOTICE '- 分类: 7个一级分类 + 15个子分类';
    RAISE NOTICE '- 视频: 20条模拟视频';
    RAISE NOTICE '- 知识卡片: 5条';
    RAISE NOTICE '- 用户行为: 12条';
    RAISE NOTICE '- 收藏夹: 4个';
END $$;


-- ============================================
-- 插入预设徽章与统计
-- ============================================
INSERT INTO badges (name, description, icon_url, category, sort_order) VALUES
('连续打卡7天', '连续7天完成每日打卡', 'https://api.dicebear.com/7.x/icons/svg?seed=streak7', 'checkin', 1),
('视频狂人', '观看超过50个视频', 'https://api.dicebear.com/7.x/icons/svg?seed=videomaniac', 'engagement', 2),
('笔记达人', '撰写超过20条学习笔记', 'https://api.dicebear.com/7.x/icons/svg?seed=notesmaster', 'learning', 3);

INSERT INTO user_statistics (user_id, check_in_count, continuous_days, last_check_in_date, total_points, level) VALUES
(1, 0, 0, NULL, 0, 1),
(2, 0, 0, NULL, 0, 1);
