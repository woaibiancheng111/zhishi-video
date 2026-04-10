"""
知视AI推荐服务入口
FastAPI 应用
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import recommend, cards

app = FastAPI(
    title="知视AI推荐服务",
    description="知识短视频平台AI推荐和知识卡片生成服务",
    version="1.0.0"
)

# CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(recommend.router, prefix="/api/v1", tags=["推荐"])
app.include_router(cards.router, prefix="/api/v1", tags=["知识卡片"])


@app.get("/health")
async def health_check():
    """健康检查端点"""
    return {
        "status": "ok",
        "service": "zhishi-ai-service",
        "version": "1.0.0"
    }
