/**
 * API 调用封装
 * axios 实例，自动添加 Authorization header
 */
import axios from 'axios';

// 创建 axios 实例
const api = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器：自动添加 Authorization header
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('zhishi_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器：统一错误处理
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      if (status === 401) {
        localStorage.removeItem('zhishi_token');
        localStorage.removeItem('zhishi_user');
        sessionStorage.setItem('auth_expired_message', data?.message || '登录状态已失效，请重新登录');
        window.location.href = '/login';
      }
      return Promise.reject(data || error);
    }
    return Promise.reject(error);
  }
);

// ============================================
// 认证相关 API
// ============================================

/** 手机号登录 */
export const login = (phone, code) =>
  api.post('/auth/login', { phone, code });

/** 注册 */
export const register = (phone, nickname, code) =>
  api.post('/auth/register', { phone, nickname, code });

/** 更新用户画像 */
export const updateCareerProfile = (careerDirection, skillTags) =>
  api.post('/auth/profile', {
    career_direction: careerDirection,
    skill_tags: skillTags
  });

// ============================================
// 视频相关 API
// ============================================

/** 获取视频列表 */
export const getVideos = (params) =>
  api.get('/videos', { params });

/** 获取视频详情 */
export const getVideoDetail = (id) =>
  api.get(`/videos/${id}`);

/** 点赞/取消点赞 */
export const toggleLike = (id) =>
  api.post(`/videos/${id}/like`);

/** 上报播放行为 */
export const reportPlay = (id, duration, progress) =>
  api.post(`/videos/${id}/play`, { duration, progress });

/** 获取分类列表 */
export const getCategories = () =>
  api.get('/videos/categories/list');

// ============================================
// 推荐Feed API
// ============================================

/** 获取推荐Feed */
export const getFeed = (cursor) =>
  api.get('/feed', { params: { cursor, limit: 10 } });

// ============================================
// 搜索相关 API
// ============================================

/** 搜索视频 */
export const searchVideos = (q, limit = 20, page = 1) =>
  api.get('/search', { params: { q, limit, page } });

/** 搜索建议 */
export const searchSuggest = (q) =>
  api.get('/search/suggest', { params: { q } });

/** 获取热门搜索词 */
export const getHotKeywords = () =>
  api.get('/search/suggest');

// ============================================
// 收藏相关 API
// ============================================

/** 获取收藏列表 */
export const getFavorites = (folderId) =>
  api.get('/favorites', { params: { folder_id: folderId } });

/** 添加收藏 */
export const addFavorite = (videoId, folderId) =>
  api.post('/favorites', { video_id: videoId, folder_id: folderId });

/** 取消收藏 */
export const removeFavorite = (id) =>
  api.delete(`/favorites/${id}`);

/** 创建收藏夹 */
export const createFolder = (name, description) =>
  api.post('/favorites/folders', { name, description });

// ============================================
// 用户相关 API
// ============================================

/** 获取当前用户信息 */
export const getUserProfile = () =>
  api.get('/users/me');

/** 更新用户信息 */
export const updateUserProfile = (data) =>
  api.put('/users/me', data);

// ============================================
// AI 服务 API
// ============================================

/** 获取知识卡片 */
export const getKnowledgeCard = (videoId) =>
  api.get(`/ai/cards/${videoId}`);

export default api;

// ============================================
// 评论相关 API
// ============================================

/** 获取视频评论 */
export const getComments = (videoId, page = 1, limit = 20) =>
  api.get(`/comments/${videoId}`, { params: { page, limit } });

/** 发表评论 */
export const postComment = (videoId, content) =>
  api.post(`/comments/${videoId}`, { content });

/** 删除评论 */
export const deleteComment = (id) =>
  api.delete(`/comments/${id}`);

// ============================================
// 学习笔记相关 API
// ============================================

/** 获取笔记列表 */
export const getNotes = (videoId, page = 1, limit = 20) =>
  api.get('/notes', { params: { video_id: videoId, page, limit } });

/** 创建笔记 */
export const createNote = (videoId, content, timestampSec = 0) =>
  api.post('/notes', { video_id: videoId, content, timestamp_sec: timestampSec });

/** 更新笔记 */
export const updateNote = (id, content) =>
  api.put(`/notes/${id}`, { content });

/** 删除笔记 */
export const deleteNote = (id) =>
  api.delete(`/notes/${id}`);

// ============================================
// 学习历史 API
// ============================================

/** 获取学习历史 */
export const getLearningHistory = (page = 1, limit = 20) =>
  api.get('/users/history', { params: { page, limit } });


// ============================================
// 成就与打卡 API
// ============================================

/** 每日打卡 */
export const checkIn = () =>
  api.post('/users/check-in');

/** 获取用户成就与统计 */
export const getAchievements = () =>
  api.get('/users/achievements');
