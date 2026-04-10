"""
协同过滤推荐器
基于用户-视频交互矩阵计算相似度
支持冷启动（新用户基于职业标签推荐）
"""
import random
from typing import List, Optional


class Recommender:
    """
    简单的协同过滤推荐器

    MVP阶段实现：
    1. 基于用户职业标签的内容推荐
    2. 基于用户行为的协同过滤
    3. 热门视频兜底
    """

    # 职业方向与分类的映射关系
    CAREER_CATEGORY_MAP = {
        "产品经理": [4, 1, 2, 3],
        "运营": [5, 6, 7],
        "技术/开发": [9, 10, 11],
        "设计": [12, 13],
        "数据分析": [14, 15],
        "项目管理": [16, 17],
        "通用职场": [18, 19],
    }

    # 技能标签与视频的映射关系
    SKILL_VIDEO_MAP = {
        "PRD": [1],
        "需求分析": [1, 3],
        "产品设计": [2],
        "用户画像": [2],
        "竞品分析": [3],
        "用户运营": [4],
        "增长黑客": [4],
        "内容运营": [5],
        "活动运营": [6],
        "React": [7],
        "Hooks": [7],
        "Node.js": [8],
        "Express": [8],
        "Python": [9],
        "Pandas": [9],
        "微服务": [10],
        "架构设计": [10],
        "UI设计": [11, 12],
        "Figma": [12],
        "UX设计": [13],
        "SQL": [14],
        "数据可视化": [15],
        "Scrum": [16],
        "敏捷开发": [16],
        "时间管理": [19],
        "沟通技巧": [18, 20],
    }

    # 所有视频ID（用于热门推荐兜底）
    ALL_VIDEO_IDS = list(range(1, 21))

    # 模拟的用户-视频交互矩阵（用户ID -> 观看过的视频ID列表）
    USER_VIDEO_MATRIX = {
        1: [1, 2, 7],
        2: [7, 8, 9, 10],
    }

    def recommend(
        self,
        user_id: int,
        watched_videos: List[int] = None,
        career_direction: Optional[str] = None,
        skill_tags: List[str] = None
    ) -> dict:
        """
        生成推荐结果

        Args:
            user_id: 用户ID
            watched_videos: 已观看视频ID列表
            career_direction: 职业方向
            skill_tags: 技能标签列表

        Returns:
            包含推荐视频ID列表和推荐原因的字典
        """
        if watched_videos is None:
            watched_videos = []
        if skill_tags is None:
            skill_tags = []

        recommended_ids = []
        reason = ""

        # 策略1：基于职业方向的内容推荐
        if career_direction:
            category_ids = self.CAREER_CATEGORY_MAP.get(career_direction, [])
            if category_ids:
                # 推荐对应分类下的视频
                for vid in self.ALL_VIDEO_IDS:
                    if vid not in watched_videos and vid not in recommended_ids:
                        recommended_ids.append(vid)
                reason = f"基于您的职业方向「{career_direction}」推荐"

        # 策略2：基于技能标签推荐
        if skill_tags:
            for tag in skill_tags:
                tag_videos = self.SKILL_VIDEO_MAP.get(tag, [])
                for vid in tag_videos:
                    if vid not in watched_videos and vid not in recommended_ids:
                        recommended_ids.append(vid)
            if not reason:
                reason = f"基于您的技能标签「{', '.join(skill_tags[:3])}」推荐"

        # 策略3：协同过滤 - 找到相似用户喜欢的视频
        similar_videos = self._collaborative_filter(user_id, watched_videos)
        for vid in similar_videos:
            if vid not in recommended_ids:
                recommended_ids.append(vid)
        if not reason:
            reason = "基于相似用户的偏好推荐"

        # 兜底：补充热门视频
        if len(recommended_ids) < 10:
            hot_videos = self._get_hot_videos()
            for vid in hot_videos:
                if vid not in watched_videos and vid not in recommended_ids:
                    recommended_ids.append(vid)
                if len(recommended_ids) >= 20:
                    break

        # 如果还是没有推荐结果，返回随机视频
        if not recommended_ids:
            recommended_ids = random.sample(self.ALL_VIDEO_IDS, min(10, len(self.ALL_VIDEO_IDS)))
            reason = "为您随机推荐热门内容"

        # 打乱顺序并限制数量
        random.shuffle(recommended_ids)
        recommended_ids = recommended_ids[:20]

        return {
            "video_ids": recommended_ids,
            "reason": reason
        }

    def _collaborative_filter(
        self,
        user_id: int,
        watched_videos: List[int]
    ) -> List[int]:
        """
        简单的协同过滤
        找到与当前用户观看过相同视频的其他用户，推荐他们看过但当前用户没看过的视频
        """
        if not watched_videos:
            return []

        # 计算与每个其他用户的相似度（基于共同观看的视频数）
        similarities = {}
        for other_user_id, other_watched in self.USER_VIDEO_MATRIX.items():
            if other_user_id == user_id:
                continue
            common = set(watched_videos) & set(other_watched)
            if common:
                similarities[other_user_id] = len(common)

        # 按相似度排序
        sorted_users = sorted(similarities.items(), key=lambda x: x[1], reverse=True)

        # 收集相似用户看过但当前用户没看过的视频
        recommended = []
        for other_user_id, _ in sorted_users[:5]:
            other_watched = self.USER_VIDEO_MATRIX[other_user_id]
            for vid in other_watched:
                if vid not in watched_videos and vid not in recommended:
                    recommended.append(vid)

        return recommended

    def _get_hot_videos(self) -> List[int]:
        """
        获取热门视频列表（模拟）
        按播放量和点赞数排序
        """
        # 模拟热门视频排序
        hot_order = [7, 14, 9, 8, 4, 18, 19, 1, 5, 12, 10, 16, 3, 11, 20, 15, 2, 6, 13, 17]
        return hot_order
