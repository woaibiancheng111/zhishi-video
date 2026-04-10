"""
推荐算法路由
基于用户画像和行为数据的视频推荐
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from app.services.recommender import Recommender

router = APIRouter()

# 初始化推荐器
recommender = Recommender()


class RecommendRequest(BaseModel):
    """推荐请求参数"""
    user_id: int
    watched_videos: List[int] = []
    career_direction: Optional[str] = None
    skill_tags: List[str] = []


class RecommendResponse(BaseModel):
    """推荐响应"""
    video_ids: List[int]
    reason: str


@router.post("/recommend", response_model=RecommendResponse)
async def get_recommendations(request: RecommendRequest):
    """
    基于用户画像返回推荐视频ID列表

    - **user_id**: 用户ID
    - **watched_videos**: 已观看视频ID列表
    - **career_direction**: 职业方向
    - **skill_tags**: 技能标签
    """
    try:
        # 调用推荐器获取推荐结果
        result = recommender.recommend(
            user_id=request.user_id,
            watched_videos=request.watched_videos,
            career_direction=request.career_direction,
            skill_tags=request.skill_tags
        )

        return RecommendResponse(
            video_ids=result["video_ids"],
            reason=result["reason"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"推荐服务异常: {str(e)}")
