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

// ============================================
// 创作者相关 API
// ============================================

/** 获取创作者统计 */
export const getCreatorStats = () =>
  api.get('/creator/stats');

/** 获取创作者视频列表 */
export const getCreatorVideos = (params) =>
  api.get('/creator/videos', { params });

/** 上传视频文件 */
export const uploadVideo = (file, onProgress) => {
  const formData = new FormData();
  formData.append('video', file);
  
  const token = localStorage.getItem('zhishi_token');
  const config = {
    headers: {
      'Content-Type': 'multipart/form-data',
      ...(token && { Authorization: `Bearer ${token}` })
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percentCompleted);
      }
    }
  };
  
  return api.post('/creator/videos/upload', formData, config);
};

/** 上传封面图 */
export const uploadCover = (file) => {
  const formData = new FormData();
  formData.append('cover', file);
  
  const token = localStorage.getItem('zhishi_token');
  const config = {
    headers: {
      'Content-Type': 'multipart/form-data',
      ...(token && { Authorization: `Bearer ${token}` })
    }
  };
  
  return api.post('/creator/videos/cover', formData, config);
};

/** 创建/更新视频信息 */
export const saveVideo = (data) =>
  api.post('/creator/videos', data);

/** 删除视频 */
export const deleteVideo = (id) =>
  api.delete(`/creator/videos/${id}`);

/** 发布视频 */
export const publishVideo = (id) =>
  api.post(`/creator/videos/${id}/publish`);

/** 获取视频处理进度 */
export const getVideoProgress = (id) =>
  api.get(`/creator/videos/${id}/progress`);

/** 获取视频字幕列表 */
export const getVideoSubtitles = (videoId) =>
  api.get(`/creator/videos/${videoId}/subtitles`);

/** 生成自动字幕 */
export const generateSubtitles = (videoId, language = 'zh-CN') =>
  api.post(`/creator/videos/${videoId}/subtitles/generate`, { language });

/** 更新字幕 */
export const updateSubtitles = (videoId, language, content) =>
  api.put(`/creator/videos/${videoId}/subtitles/${language}`, { content });

/** 获取视频知识点 */
export const getKnowledgePoints = (videoId) =>
  api.get(`/creator/videos/${videoId}/knowledge-points`);

/** 创建/更新知识点 */
export const saveKnowledgePoint = (videoId, data) =>
  api.post(`/creator/videos/${videoId}/knowledge-points`, data);

/** 删除知识点 */
export const deleteKnowledgePoint = (videoId, pointId) =>
  api.delete(`/creator/videos/${videoId}/knowledge-points/${pointId}`);

// ============================================
// 笔记导出 API
// ============================================

/** 导出笔记 */
export const exportNotes = (format = 'json', videoId) =>
  api.get('/notes/export', { 
    params: { format, video_id: videoId },
    responseType: format === 'json' ? 'json' : 'blob'
  });

// ============================================
// 复习提醒 API
// ============================================

/** 获取复习提醒列表 */
export const getReminders = (params) =>
  api.get('/reminders', { params });

/** 创建复习提醒 */
export const createReminder = (data) =>
  api.post('/reminders', data);

/** 更新复习提醒 */
export const updateReminder = (id, data) =>
  api.put(`/reminders/${id}`, data);

/** 删除复习提醒 */
export const deleteReminder = (id) =>
  api.delete(`/reminders/${id}`);

/** 获取复习计划列表 */
export const getReviewSchedules = (params) =>
  api.get('/reminders/schedules', { params });

/** 创建复习计划 */
export const createReviewSchedule = (targetType, targetId) =>
  api.post('/reminders/schedules', { target_type: targetType, target_id: targetId });

/** 完成一次复习 */
export const completeReview = (scheduleId, quality = 4) =>
  api.post(`/reminders/schedules/${scheduleId}/review`, { quality });

/** 取消复习计划 */
export const cancelReviewSchedule = (id) =>
  api.delete(`/reminders/schedules/${id}`);

/** 获取今日待复习 */
export const getTodayReviews = () =>
  api.get('/reminders/today');
