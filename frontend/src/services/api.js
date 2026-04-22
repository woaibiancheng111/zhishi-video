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
// 创作者中心 API
// ============================================

/** 获取创作者统计 */
export const getCreatorStats = () =>
  api.get('/creator/stats');

/** 获取创作者视频列表 */
export const getCreatorVideos = (params) =>
  api.get('/creator/videos', { params });

/** 获取创作者单个视频详情 */
export const getCreatorVideo = (id) =>
  api.get(`/creator/videos/${id}`);

/** 上传视频文件 */
export const uploadVideo = (file, onProgress) => {
  const formData = new FormData();
  formData.append('video', file);
  return api.post('/creator/upload/video', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        onProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
      }
    }
  });
};

/** 上传封面图片 */
export const uploadCover = (file, onProgress) => {
  const formData = new FormData();
  formData.append('cover', file);
  return api.post('/creator/upload/cover', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        onProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
      }
    }
  });
};

/** 创建视频 */
export const createVideo = (data) =>
  api.post('/creator/videos', data);

/** 更新视频 */
export const updateVideo = (id, data) =>
  api.put(`/creator/videos/${id}`, data);

/** 发布视频 */
export const publishVideo = (id) =>
  api.post(`/creator/videos/${id}/publish`);

/** 删除视频 */
export const deleteVideo = (id) =>
  api.delete(`/creator/videos/${id}`);

// ============================================
// 字幕 API
// ============================================

/** 获取视频的字幕列表 */
export const getVideoSubtitles = (videoId) =>
  api.get(`/subtitles/video/${videoId}`);

/** 获取字幕详情 */
export const getSubtitle = (id) =>
  api.get(`/subtitles/${id}`);

/** 上传字幕文件 */
export const uploadSubtitle = (file) => {
  const formData = new FormData();
  formData.append('subtitle', file);
  return api.post('/subtitles/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

/** 创建字幕 */
export const createSubtitle = (data) =>
  api.post('/subtitles', data);

/** 更新字幕 */
export const updateSubtitle = (id, data) =>
  api.put(`/subtitles/${id}`, data);

/** 删除字幕 */
export const deleteSubtitle = (id) =>
  api.delete(`/subtitles/${id}`);

/** 生成自动字幕 */
export const generateSubtitle = (videoId, language = 'zh-CN') =>
  api.post('/subtitles/generate', { video_id: videoId, language });

// ============================================
// 知识点标记 API
// ============================================

/** 获取视频的知识点列表 */
export const getVideoKnowledgePoints = (videoId) =>
  api.get(`/knowledge-points/video/${videoId}`);

/** 获取知识点详情 */
export const getKnowledgePoint = (id) =>
  api.get(`/knowledge-points/${id}`);

/** 创建知识点 */
export const createKnowledgePoint = (data) =>
  api.post('/knowledge-points', data);

/** 批量创建知识点 */
export const createKnowledgePointsBatch = (videoId, points) =>
  api.post('/knowledge-points/batch', { video_id: videoId, points });

/** 更新知识点 */
export const updateKnowledgePoint = (id, data) =>
  api.put(`/knowledge-points/${id}`, data);

/** 删除知识点 */
export const deleteKnowledgePoint = (id) =>
  api.delete(`/knowledge-points/${id}`);

/** 批量删除知识点 */
export const deleteKnowledgePointsBatch = (ids) =>
  api.post('/knowledge-points/batch-delete', { ids });

/** 生成知识点（AI模拟） */
export const generateKnowledgePoints = (videoId) =>
  api.post('/knowledge-points/generate', { video_id: videoId });

// ============================================
// 复习提醒 API
// ============================================

/** 获取复习提醒列表 */
export const getReminders = (params) =>
  api.get('/reminders', { params });

/** 获取今日提醒 */
export const getTodayReminders = () =>
  api.get('/reminders/today');

/** 创建复习提醒 */
export const createReminder = (data) =>
  api.post('/reminders', data);

/** 创建艾宾浩斯复习系列 */
export const createEbbinghausReminder = (videoId, knowledgePointId, startTime) =>
  api.post('/reminders/ebbinghaus', {
    video_id: videoId,
    knowledge_point_id: knowledgePointId,
    start_time: startTime
  });

/** 更新复习提醒 */
export const updateReminder = (id, data) =>
  api.put(`/reminders/${id}`, data);

/** 标记提醒为已完成 */
export const completeReminder = (id) =>
  api.post(`/reminders/${id}/complete`);

/** 取消复习提醒 */
export const cancelReminder = (id) =>
  api.post(`/reminders/${id}/cancel`);

/** 删除复习提醒 */
export const deleteReminder = (id) =>
  api.delete(`/reminders/${id}`);

/** 获取艾宾浩斯复习间隔配置 */
export const getReminderIntervals = () =>
  api.get('/reminders/config/intervals');

// ============================================
// 笔记导出 API
// ============================================

/** 导出笔记为Markdown */
export const exportNotesAsMarkdown = (noteIds) =>
  api.post('/notes/export/markdown', { note_ids: noteIds }, { responseType: 'blob' });

/** 导出笔记为JSON */
export const exportNotesAsJson = (noteIds) =>
  api.post('/notes/export/json', { note_ids: noteIds });

/** 导出笔记为TXT */
export const exportNotesAsTxt = (noteIds) =>
  api.post('/notes/export/txt', { note_ids: noteIds }, { responseType: 'blob' });

/** 导出单条笔记 */
export const exportSingleNote = (id, format = 'markdown') =>
  api.get(`/notes/${id}/export/${format}`, { responseType: 'blob' });
