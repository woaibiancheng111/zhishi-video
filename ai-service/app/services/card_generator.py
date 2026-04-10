"""
知识卡片生成器
根据视频信息生成结构化的知识要点
MVP阶段使用预设数据模拟AI生成
"""
from typing import Dict, List, Optional


class CardGenerator:
    """
    模拟知识卡片生成器

    根据视频标题和描述生成结构化的知识要点。
    MVP阶段使用预设数据，生产环境可接入大语言模型API。
    """

    # 预设的知识卡片数据（video_id -> card_data）
    PRESET_CARDS = {
        1: {
            "video_id": 1,
            "summary": "PRD文档是产品经理的核心交付物，本文详细讲解了PRD的写作方法论，包括用户故事编写、功能描述规范和验收标准制定。",
            "key_points": [
                "PRD核心要素：背景与目标、用户故事、功能描述、交互说明、验收标准",
                "用户故事格式：作为[角色]，我希望[功能]，以便[价值]",
                "需求优先级排序：使用KANO模型或MoSCoW方法进行优先级划分",
                "PRD评审要点：确保完整性、一致性、可测试性",
                "版本管理：记录每次修改的内容和原因"
            ],
            "mindmap": {
                "center": "PRD文档写作",
                "branches": [
                    {
                        "name": "核心要素",
                        "children": ["背景与目标", "用户故事", "功能描述", "交互说明", "验收标准"]
                    },
                    {
                        "name": "写作技巧",
                        "children": ["结构清晰", "语言简洁", "图文并茂", "版本管理"]
                    },
                    {
                        "name": "评审要点",
                        "children": ["完整性", "一致性", "可测试性", "优先级"]
                    }
                ]
            }
        },
        2: {
            "video_id": 2,
            "summary": "用户画像是产品经理理解目标用户的核心工具，通过数据分析构建用户画像，帮助产品决策更加精准。",
            "key_points": [
                "用户画像包含人口统计学特征和行为偏好两个维度",
                "数据来源：用户调研、行为数据、第三方数据",
                "定性分析：用户访谈、焦点小组、日记研究",
                "定量分析：聚类分析、因子分析、关联规则",
                "画像应用：需求优先级、功能设计、营销策略"
            ],
            "mindmap": {
                "center": "用户画像",
                "branches": [
                    {"name": "数据来源", "children": ["用户调研", "行为数据", "第三方数据"]},
                    {"name": "分析方法", "children": ["定性分析", "定量分析", "混合方法"]},
                    {"name": "应用场景", "children": ["需求分析", "功能设计", "精准营销"]}
                ]
            }
        },
        3: {
            "video_id": 3,
            "summary": "竞品分析是产品策略制定的重要依据，系统化的竞品分析能帮助产品团队了解市场格局和竞争态势。",
            "key_points": [
                "竞品选择：直接竞品、间接竞品、潜在竞品",
                "分析维度：产品功能、用户体验、商业模式、市场策略",
                "SWOT分析：优势、劣势、机会、威胁",
                "功能对比矩阵：量化对比各产品功能差异",
                "持续跟踪：建立竞品监控机制，定期更新分析报告"
            ],
            "mindmap": {
                "center": "竞品分析",
                "branches": [
                    {"name": "竞品选择", "children": ["直接竞品", "间接竞品", "潜在竞品"]},
                    {"name": "分析方法", "children": ["SWOT分析", "功能对比", "体验对比"]},
                    {"name": "输出成果", "children": ["分析报告", "策略建议", "监控机制"]}
                ]
            }
        },
        4: {
            "video_id": 4,
            "summary": "用户运营的核心是围绕用户生命周期进行精细化管理，通过AARRR模型实现用户增长和留存。",
            "key_points": [
                "AARRR模型：获取、激活、留存、变现、推荐",
                "用户生命周期：新手期、成长期、成熟期、衰退期、流失期",
                "留存策略：新手引导、激励体系、内容推荐、社区运营",
                "增长黑客：低成本、高效率的增长策略",
                "数据驱动：通过数据分析优化运营策略"
            ],
            "mindmap": {
                "center": "用户运营",
                "branches": [
                    {"name": "AARRR模型", "children": ["获取", "激活", "留存", "变现", "推荐"]},
                    {"name": "生命周期", "children": ["新手期", "成长期", "成熟期", "衰退期"]},
                    {"name": "核心策略", "children": ["新手引导", "激励体系", "内容推荐", "社区运营"]}
                ]
            }
        },
        5: {
            "video_id": 5,
            "summary": "爆款内容有其底层创作逻辑，掌握选题策划、标题优化和内容结构的方法论，能显著提升内容传播效果。",
            "key_points": [
                "选题策划：热点追踪、用户痛点、差异化视角",
                "标题优化：数字法、疑问法、对比法、悬念法",
                "内容结构：SCQA模型、金字塔原理、故事化叙事",
                "传播策略：发布时机、渠道选择、互动引导",
                "数据复盘：阅读量、完播率、互动率、转化率"
            ],
            "mindmap": {
                "center": "爆款内容运营",
                "branches": [
                    {"name": "选题策划", "children": ["热点追踪", "用户痛点", "差异化视角"]},
                    {"name": "标题技巧", "children": ["数字法", "疑问法", "对比法", "悬念法"]},
                    {"name": "内容结构", "children": ["SCQA模型", "金字塔原理", "故事化叙事"]}
                ]
            }
        },
        6: {
            "video_id": 6,
            "summary": "活动运营是运营工作的核心模块之一，从策划到复盘的完整流程把控是活动成功的关键。",
            "key_points": [
                "活动目标设定：SMART原则，明确可衡量的KPI",
                "方案策划：主题创意、规则设计、奖品设置、预算规划",
                "执行落地：时间节点管理、资源协调、风险预案",
                "效果评估：参与度、转化率、ROI分析",
                "复盘总结：经验沉淀、流程优化、知识传承"
            ],
            "mindmap": {
                "center": "活动运营",
                "branches": [
                    {"name": "策划阶段", "children": ["目标设定", "方案设计", "预算规划"]},
                    {"name": "执行阶段", "children": ["时间管理", "资源协调", "风险预案"]},
                    {"name": "复盘阶段", "children": ["效果评估", "经验总结", "流程优化"]}
                ]
            }
        },
        7: {
            "video_id": 7,
            "summary": "React Hooks是现代React开发的核心，掌握Hooks能让函数组件具备状态管理和副作用处理能力。",
            "key_points": [
                "useState：在函数组件中声明和管理状态",
                "useEffect：处理副作用，替代生命周期方法",
                "useContext：跨组件层级传递数据",
                "useReducer：管理复杂状态逻辑的替代方案",
                "useMemo/useCallback：性能优化，缓存计算结果和回调函数",
                "自定义Hook：封装可复用的有状态逻辑"
            ],
            "mindmap": {
                "center": "React Hooks",
                "branches": [
                    {"name": "基础Hooks", "children": ["useState", "useEffect", "useContext"]},
                    {"name": "进阶Hooks", "children": ["useReducer", "useMemo", "useCallback", "useRef"]},
                    {"name": "自定义Hook", "children": ["逻辑复用", "命名规范", "测试策略"]},
                    {"name": "最佳实践", "children": ["依赖数组", "性能优化", "TypeScript"]}
                ]
            }
        },
        8: {
            "video_id": 8,
            "summary": "Node.js + Express是构建RESTful API的经典技术栈，本视频从零搭建完整的后端服务。",
            "key_points": [
                "Express框架：轻量灵活的Node.js Web框架",
                "RESTful设计：资源化URL、HTTP方法语义化、状态码规范",
                "中间件机制：请求处理管道，可组合的请求处理器",
                "路由组织：模块化路由设计，支持路由参数",
                "错误处理：统一错误处理中间件",
                "数据库集成：使用pg-promise连接PostgreSQL"
            ],
            "mindmap": {
                "center": "Node.js后端开发",
                "branches": [
                    {"name": "核心技术", "children": ["Express框架", "路由设计", "中间件"]},
                    {"name": "数据层", "children": ["PostgreSQL", "Redis缓存", "ORM集成"]},
                    {"name": "安全认证", "children": ["JWT认证", "输入校验", "CORS配置"]},
                    {"name": "部署运维", "children": ["Docker", "PM2", "日志监控"]}
                ]
            }
        },
        9: {
            "video_id": 9,
            "summary": "Pandas是Python数据分析的核心库，掌握DataFrame操作是数据分析的基本功。",
            "key_points": [
                "DataFrame：二维表格数据结构，支持行列操作和索引",
                "数据清洗：处理缺失值、重复值、异常值",
                "数据筛选：条件过滤、loc/iloc索引、布尔索引",
                "数据聚合：groupby分组聚合、pivot_table透视表",
                "数据合并：merge关联、concat拼接、join连接",
                "时间序列：日期解析、重采样、滚动窗口计算"
            ],
            "mindmap": {
                "center": "Pandas数据分析",
                "branches": [
                    {"name": "数据结构", "children": ["Series", "DataFrame", "Index"]},
                    {"name": "数据操作", "children": ["筛选", "排序", "聚合", "合并"]},
                    {"name": "数据清洗", "children": ["缺失值", "类型转换", "去重"]},
                    {"name": "分析技巧", "children": ["分组统计", "透视表", "时间序列"]}
                ]
            }
        },
        10: {
            "video_id": 10,
            "summary": "微服务架构将单体应用拆分为多个独立服务，每个服务独立开发、部署和扩展。",
            "key_points": [
                "服务拆分原则：按业务能力拆分，保持服务高内聚低耦合",
                "服务间通信：同步REST/gRPC、异步消息队列",
                "数据管理：每个服务独立数据库，事件驱动保证一致性",
                "服务治理：服务注册发现、负载均衡、熔断降级",
                "容器化部署：Docker + Kubernetes编排管理",
                "可观测性：分布式链路追踪、集中日志、指标监控"
            ],
            "mindmap": {
                "center": "微服务架构",
                "branches": [
                    {"name": "设计原则", "children": ["服务拆分", "独立部署", "数据隔离"]},
                    {"name": "通信方式", "children": ["REST/gRPC", "消息队列", "事件驱动"]},
                    {"name": "服务治理", "children": ["注册发现", "负载均衡", "熔断降级"]},
                    {"name": "运维部署", "children": ["Docker", "K8s", "监控告警"]}
                ]
            }
        },
        11: {
            "video_id": 11,
            "summary": "色彩理论是UI设计的基础，掌握配色技巧能显著提升设计作品的视觉表现力。",
            "key_points": [
                "色彩三要素：色相、饱和度、明度",
                "配色方案：单色、互补色、类似色、三角配色",
                "色彩心理学：不同颜色的情感联想和品牌应用",
                "对比度：确保文字和背景有足够的对比度",
                "工具推荐：Coolors、Adobe Color、Color Hunt"
            ],
            "mindmap": {
                "center": "UI色彩设计",
                "branches": [
                    {"name": "色彩基础", "children": ["色相", "饱和度", "明度"]},
                    {"name": "配色方案", "children": ["单色", "互补色", "类似色", "三角配色"]},
                    {"name": "应用原则", "children": ["对比度", "色彩心理学", "品牌一致性"]}
                ]
            }
        },
        12: {
            "video_id": 12,
            "summary": "Figma是目前最流行的UI设计工具，掌握其高效工作流能大幅提升设计效率。",
            "key_points": [
                "组件系统：创建可复用的设计组件和变体",
                "Auto Layout：灵活的响应式布局方案",
                "原型交互：设计可交互的原型演示",
                "团队协作：实时多人编辑、评论和版本管理",
                "设计规范：建立Design Token和组件库"
            ],
            "mindmap": {
                "center": "Figma设计",
                "branches": [
                    {"name": "核心功能", "children": ["组件系统", "Auto Layout", "原型交互"]},
                    {"name": "团队协作", "children": ["实时编辑", "评论反馈", "版本管理"]},
                    {"name": "设计系统", "children": ["Design Token", "组件库", "设计规范"]}
                ]
            }
        },
        13: {
            "video_id": 13,
            "summary": "可用性测试是验证产品设计有效性的核心方法，通过真实用户测试发现体验问题。",
            "key_points": [
                "测试计划：明确测试目标、选择测试方法",
                "任务设计：设计真实场景下的操作任务",
                "用户招募：选择目标用户群体，5-8人即可发现85%问题",
                "测试执行：观察记录、思考 aloud、不引导不暗示",
                "数据分析：识别问题模式、计算任务完成率"
            ],
            "mindmap": {
                "center": "可用性测试",
                "branches": [
                    {"name": "测试准备", "children": ["目标设定", "任务设计", "用户招募"]},
                    {"name": "测试执行", "children": ["观察记录", "Think Aloud", "不引导"]},
                    {"name": "结果分析", "children": ["问题分类", "优先级排序", "改进建议"]}
                ]
            }
        },
        14: {
            "video_id": 14,
            "summary": "SQL是数据分析的必备技能，掌握从基础查询到窗口函数的完整知识体系。",
            "key_points": [
                "基础查询：SELECT、WHERE、ORDER BY、LIMIT分页",
                "聚合函数：COUNT、SUM、AVG、MAX、MIN配合GROUP BY",
                "多表关联：INNER JOIN、LEFT JOIN、RIGHT JOIN、FULL JOIN",
                "子查询：标量子查询、表子查询、EXISTS判断",
                "窗口函数：ROW_NUMBER、RANK、DENSE_RANK、LEAD/LAG",
                "CTE：WITH子句提高复杂查询的可读性"
            ],
            "mindmap": {
                "center": "SQL查询",
                "branches": [
                    {"name": "基础语法", "children": ["SELECT", "WHERE", "GROUP BY", "ORDER BY"]},
                    {"name": "高级查询", "children": ["JOIN", "子查询", "CTE", "窗口函数"]},
                    {"name": "性能优化", "children": ["索引", "执行计划", "查询重写"]},
                    {"name": "实战场景", "children": ["漏斗分析", "留存分析", "用户画像"]}
                ]
            }
        },
        15: {
            "video_id": 15,
            "summary": "数据可视化是将数据转化为直观图表的过程，好的可视化能有效传达数据洞察。",
            "key_points": [
                "图表选择：根据数据类型和表达目的选择合适的图表",
                "设计原则：数据墨水比最大化、避免图表垃圾",
                "配色方案：使用色盲友好的配色，突出重点数据",
                "交互设计：筛选、缩放、提示框增强数据探索",
                "工具推荐：ECharts、D3.js、Tableau、Power BI"
            ],
            "mindmap": {
                "center": "数据可视化",
                "branches": [
                    {"name": "图表类型", "children": ["柱状图", "折线图", "饼图", "散点图"]},
                    {"name": "设计原则", "children": ["数据墨水比", "配色方案", "标注说明"]},
                    {"name": "工具生态", "children": ["ECharts", "D3.js", "Tableau", "BI工具"]}
                ]
            }
        },
        16: {
            "video_id": 16,
            "summary": "Scrum是最流行的敏捷开发框架，通过固定周期的迭代交付价值。",
            "key_points": [
                "三个角色：产品负责人、Scrum Master、开发团队",
                "五个事件：Sprint、Sprint计划、每日站会、评审会、回顾会",
                "三个工件：产品待办列表、Sprint待办列表、增量",
                "Sprint周期：通常2-4周，时间盒固定不可延长",
                "敏捷宣言：个体互动高于流程工具，响应变化高于遵循计划"
            ],
            "mindmap": {
                "center": "Scrum敏捷开发",
                "branches": [
                    {"name": "三个角色", "children": ["产品负责人", "Scrum Master", "开发团队"]},
                    {"name": "五个事件", "children": ["Sprint计划", "每日站会", "评审会", "回顾会"]},
                    {"name": "核心工件", "children": ["产品待办", "Sprint待办", "增量"]}
                ]
            }
        },
        17: {
            "video_id": 17,
            "summary": "项目复盘是团队持续改进的关键环节，系统化的复盘方法论能最大化复盘价值。",
            "key_points": [
                "复盘时机：项目里程碑、Sprint结束、重大问题后",
                "复盘流程：回顾目标、评估结果、分析原因、总结规律",
                "GRAI复盘法：Goal-Result-Analysis-Insight",
                "营造氛围：对事不对人，鼓励开放讨论",
                "行动计划：制定具体的改进措施并跟踪执行"
            ],
            "mindmap": {
                "center": "项目复盘",
                "branches": [
                    {"name": "复盘方法", "children": ["GRAI法", "KPT法", "STAR法"]},
                    {"name": "复盘流程", "children": ["回顾目标", "评估结果", "分析原因", "总结规律"]},
                    {"name": "关键原则", "children": ["对事不对人", "开放讨论", "行动跟踪"]}
                ]
            }
        },
        18: {
            "video_id": 18,
            "summary": "快速融入新团队是职场新人的第一课，良好的第一印象和主动沟通是关键。",
            "key_points": [
                "入职第一周：了解团队文化、熟悉工作流程、建立初步关系",
                "主动沟通：积极提问、及时反馈、展示学习意愿",
                "建立信任：按时交付、质量保证、主动承担",
                "寻找导师：向经验丰富的同事学习",
                "展现价值：从小事做起，逐步承担更大责任"
            ],
            "mindmap": {
                "center": "融入新团队",
                "branches": [
                    {"name": "入职适应", "children": ["了解文化", "熟悉流程", "建立关系"]},
                    {"name": "沟通技巧", "children": ["主动提问", "及时反馈", "积极倾听"]},
                    {"name": "价值展现", "children": ["按时交付", "主动承担", "持续学习"]}
                ]
            }
        },
        19: {
            "video_id": 19,
            "summary": "时间管理是提升工作效率的核心技能，番茄工作法和GTD是两种经典的时间管理方法。",
            "key_points": [
                "番茄工作法：25分钟专注 + 5分钟休息，每4个番茄钟长休息15-30分钟",
                "GTD五步法：收集、处理、组织、执行、回顾",
                "四象限法则：按重要性和紧急性划分任务优先级",
                "时间块管理：将一天划分为专注时间块和碎片时间块",
                "减少干扰：关闭通知、专注模式、批量处理"
            ],
            "mindmap": {
                "center": "时间管理",
                "branches": [
                    {"name": "番茄工作法", "children": ["25分钟专注", "5分钟休息", "长休息"]},
                    {"name": "GTD方法", "children": ["收集", "处理", "组织", "执行", "回顾"]},
                    {"name": "效率技巧", "children": ["四象限", "时间块", "减少干扰"]}
                ]
            }
        },
        20: {
            "video_id": 20,
            "summary": "职场汇报是展示个人能力的重要机会，好的汇报需要清晰的结构和出色的表达。",
            "key_points": [
                "汇报结构：结论先行、支撑论据、行动建议",
                "PPT设计：一页一观点、数据可视化、简洁美观",
                "演讲技巧：控制语速、眼神交流、肢体语言",
                "Q&A准备：预判问题、准备答案、从容应对",
                "时间管理：提前演练、控制时长、留出互动时间"
            ],
            "mindmap": {
                "center": "职场汇报",
                "branches": [
                    {"name": "内容结构", "children": ["结论先行", "数据支撑", "行动建议"]},
                    {"name": "PPT设计", "children": ["一页一观点", "数据可视化", "简洁美观"]},
                    {"name": "演讲表达", "children": ["语速控制", "眼神交流", "肢体语言"]}
                ]
            }
        }
    }

    def generate(self, video_id: int) -> Dict:
        """
        生成或获取视频的知识卡片

        Args:
            video_id: 视频ID

        Returns:
            知识卡片数据，包含摘要、关键要点和思维导图
        """
        # 查找预设的知识卡片
        preset_card = self.PRESET_CARDS.get(video_id)

        if preset_card:
            return preset_card

        # 如果没有预设数据，生成通用模板
        return self._generate_generic_card(video_id)

    def _generate_generic_card(self, video_id: int) -> Dict:
        """
        为没有预设数据的视频生成通用知识卡片模板
        """
        return {
            "video_id": video_id,
            "summary": f"视频 {video_id} 的知识要点总结，帮助你快速掌握核心内容。",
            "key_points": [
                "理解核心概念和基本原理",
                "掌握关键方法和实操技巧",
                "结合实际案例加深理解",
                "持续练习和复盘巩固知识"
            ],
            "mindmap": {
                "center": f"视频{video_id}知识要点",
                "branches": [
                    {
                        "name": "基础概念",
                        "children": ["核心定义", "基本原理", "关键术语"]
                    },
                    {
                        "name": "实操方法",
                        "children": ["步骤一", "步骤二", "步骤三"]
                    },
                    {
                        "name": "应用场景",
                        "children": ["日常工作", "项目实战", "面试准备"]
                    }
                ]
            }
        }
