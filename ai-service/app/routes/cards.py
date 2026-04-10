"""
知识卡片路由
视频知识卡片生成和查询
"""
from fastapi import APIRouter, HTTPException
from app.services.card_generator import CardGenerator

router = APIRouter()

# 初始化知识卡片生成器
card_generator = CardGenerator()


@router.get("/cards/{video_id}")
async def get_knowledge_card(video_id: int):
    """
    获取视频的知识卡片

    - **video_id**: 视频ID
    """
    try:
        card = card_generator.generate(video_id)
        return {
            "success": True,
            "data": card
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"知识卡片生成异常: {str(e)}")
