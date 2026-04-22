/**
 * Player - 视频播放页
 * HTML5 video 播放器
 * 视频信息、操作按钮、知识卡片弹窗、字幕显示
 */
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  getVideoDetail,
  toggleLike,
  reportPlay,
  addFavorite,
  removeFavorite,
  getFeed,
  getVideoSubtitles,
  getSubtitle,
  generateSubtitle,
  getVideoKnowledgePoints,
  createKnowledgePoint,
  updateKnowledgePoint,
  deleteKnowledgePoint,
  generateKnowledgePoints,
  createEbbinghausReminder
} from '../services/api';
import { useAuth } from '../hooks/useAuth';
import KnowledgeCard from '../components/KnowledgeCard';
import Comments from '../components/Comments';
import NotesModal from '../components/NotesModal';

function formatCount(count) {
  if (!count) return '0';
  if (count >= 10000) return `${(count / 10000).toFixed(1)}万`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return String(count);
}

function formatDuration(seconds) {
  if (!seconds || Number.isNaN(Number(seconds))) return '0:00';
  const total = Number(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function Player() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  const redirectToLogin = (message) => {
    sessionStorage.setItem('auth_prompt_message', message);
    navigate('/login');
  };
  const videoRef = useRef(null);
  const [resumeApplied, setResumeApplied] = useState(false);

  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [favoriteId, setFavoriteId] = useState(null);
  const [likeCount, setLikeCount] = useState(0);
  const [showCard, setShowCard] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [favoriteMessage, setFavoriteMessage] = useState('');
  const [currentTimestamp, setCurrentTimestamp] = useState(0);
  const [playReported, setPlayReported] = useState(false);
  const [relatedVideos, setRelatedVideos] = useState([]);
  const [relatedLoading, setRelatedLoading] = useState(true);

  const [subtitles, setSubtitles] = useState([]);
  const [currentSubtitle, setCurrentSubtitle] = useState(null);
  const [currentSubtitleText, setCurrentSubtitleText] = useState('');
  const [loadingSubtitles, setLoadingSubtitles] = useState(false);
  const [generatingSubtitle, setGeneratingSubtitle] = useState(false);
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);

  const [knowledgePoints, setKnowledgePoints] = useState([]);
  const [showKnowledgePoints, setShowKnowledgePoints] = useState(false);
  const [showAddKnowledgePoint, setShowAddKnowledgePoint] = useState(false);
  const [editingKnowledgePoint, setEditingKnowledgePoint] = useState(null);
  const [generatingKP, setGeneratingKP] = useState(false);
  const [savingKP, setSavingKP] = useState(false);

  const [newKPData, setNewKPData] = useState({
    title: '',
    description: '',
    importance: 'normal',
    start_time_sec: 0,
    end_time_sec: 0
  });

  useEffect(() => {
    setResumeApplied(false);
    fetchVideoDetail();
    fetchRelatedVideos();
    fetchSubtitles();
    fetchKnowledgePoints();
  }, [id]);

  const fetchSubtitles = async () => {
    setLoadingSubtitles(true);
    try {
      const res = await getVideoSubtitles(id);
      if (res.success && res.data) {
        setSubtitles(res.data || []);
      }
    } catch (err) {
      console.error('获取字幕列表失败:', err);
    } finally {
      setLoadingSubtitles(false);
    }
  };

  const fetchKnowledgePoints = async () => {
    try {
      const res = await getVideoKnowledgePoints(id);
      if (res.success && res.data) {
        setKnowledgePoints(res.data || []);
      }
    } catch (err) {
      console.error('获取知识点列表失败:', err);
    }
  };

  const handleAddKnowledgePoint = () => {
    setNewKPData({
      title: '',
      description: '',
      importance: 'normal',
      start_time_sec: currentTimestamp,
      end_time_sec: currentTimestamp + 10
    });
    setEditingKnowledgePoint(null);
    setShowAddKnowledgePoint(true);
  };

  const handleEditKnowledgePoint = (kp) => {
    setNewKPData({
      title: kp.title || '',
      description: kp.description || '',
      importance: kp.importance || 'normal',
      start_time_sec: kp.start_time_sec || 0,
      end_time_sec: kp.end_time_sec || 0
    });
    setEditingKnowledgePoint(kp);
    setShowAddKnowledgePoint(true);
  };

  const handleSaveKnowledgePoint = async () => {
    if (!newKPData.title.trim()) {
      alert('请输入知识点标题');
      return;
    }

    setSavingKP(true);
    try {
      if (editingKnowledgePoint) {
        const res = await updateKnowledgePoint(editingKnowledgePoint.id, newKPData);
        if (res.success) {
          setKnowledgePoints((prev) =>
            prev.map((kp) =>
              kp.id === editingKnowledgePoint.id ? { ...kp, ...newKPData } : kp
            )
          );
          alert('知识点更新成功！');
        }
      } else {
        const res = await createKnowledgePoint({
          video_id: parseInt(id, 10),
          ...newKPData
        });
        if (res.success) {
          setKnowledgePoints((prev) => [...prev, res.data]);
          alert('知识点添加成功！');
        }
      }
      setShowAddKnowledgePoint(false);
    } catch (err) {
      console.error('保存知识点失败:', err);
      alert('保存失败: ' + (err.message || '请稍后重试'));
    } finally {
      setSavingKP(false);
    }
  };

  const handleDeleteKnowledgePoint = async (kp) => {
    if (!confirm(`确定要删除知识点"${kp.title}"吗？`)) return;

    try {
      const res = await deleteKnowledgePoint(kp.id);
      if (res.success) {
        setKnowledgePoints((prev) => prev.filter((item) => item.id !== kp.id));
      }
    } catch (err) {
      console.error('删除知识点失败:', err);
      alert('删除失败，请稍后重试');
    }
  };

  const handleGenerateKnowledgePoints = async () => {
    setGeneratingKP(true);
    try {
      const res = await generateKnowledgePoints(id);
      if (res.success) {
        alert(`生成成功！共生成 ${res.data?.length || 0} 个知识点`);
        fetchKnowledgePoints();
      }
    } catch (err) {
      console.error('生成知识点失败:', err);
      alert('生成失败: ' + (err.message || '请稍后重试'));
    } finally {
      setGeneratingKP(false);
    }
  };

  const handleAddReminder = async (kp) => {
    try {
      const res = await createEbbinghausReminder(
        parseInt(id, 10),
        kp.id,
        new Date().toISOString()
      );
      if (res.success) {
        alert('复习提醒已创建！将按照艾宾浩斯遗忘曲线提醒您复习。');
      }
    } catch (err) {
      console.error('创建提醒失败:', err);
      alert('创建提醒失败，请稍后重试');
    }
  };

  const getImportanceLabel = (importance) => {
    const labels = {
      critical: { text: '关键', color: '#fb7185' },
      important: { text: '重要', color: '#f59e0b' },
      normal: { text: '普通', color: '#7ddaff' },
      optional: { text: '了解', color: '#64748b' }
    };
    return labels[importance] || { text: importance, color: '#7ddaff' };
  };

  const handleJumpToKP = (kp) => {
    if (videoRef.current) {
      videoRef.current.currentTime = kp.start_time_sec;
      setCurrentTimestamp(kp.start_time_sec);
    }
  };

  useEffect(() => {
    if (!videoRef.current || resumeApplied) return;

    const params = new URLSearchParams(location.search);
    const resumeAt = Number(params.get('t'));

    if (!Number.isFinite(resumeAt) || resumeAt <= 0) {
      setResumeApplied(true);
      return;
    }

    const applyResume = () => {
      if (!videoRef.current) return;
      const duration = Number(videoRef.current.duration);
      const targetTime = duration > 0 ? Math.min(resumeAt, Math.max(duration - 1, 0)) : resumeAt;
      videoRef.current.currentTime = Math.max(targetTime, 0);
      setCurrentTimestamp(Math.floor(Math.max(targetTime, 0)));
      setResumeApplied(true);
    };

    if (videoRef.current.readyState >= 1) {
      applyResume();
      return;
    }

    videoRef.current.addEventListener('loadedmetadata', applyResume, { once: true });
    return () => videoRef.current?.removeEventListener('loadedmetadata', applyResume);
  }, [location.search, resumeApplied, id]);

  const fetchVideoDetail = async () => {
    setLoading(true);
    setPlayReported(false);
    try {
      const res = await getVideoDetail(id);
      if (res.success && res.data) {
        setVideo(res.data);
        setLiked(res.data.is_liked || false);
        setFavorited(res.data.is_favorited || false);
        setFavoriteId(res.data.favorite_id || null);
        setLikeCount(res.data.like_count || 0);
      }
    } catch (err) {
      console.error('获取视频详情失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatedVideos = async () => {
    setRelatedLoading(true);
    try {
      const res = await getFeed(0);
      if (res.success && res.data?.list) {
        const list = res.data.list
          .filter((item) => String(item.id) !== String(id))
          .slice(0, 8);
        setRelatedVideos(list);
      }
    } catch (err) {
      console.error('获取相关推荐失败:', err);
    } finally {
      setRelatedLoading(false);
    }
  };

  const handleLike = async () => {
    if (!isAuthenticated) {
      redirectToLogin('登录后即可点赞这条视频');
      return;
    }

    try {
      const res = await toggleLike(id);
      if (res.success) {
        setLiked(res.data.liked);
        setLikeCount((prev) => (res.data.liked ? prev + 1 : Math.max(prev - 1, 0)));
      }
    } catch (err) {
      console.error('点赞失败:', err);
      alert(err?.message || '点赞失败，请重新登录后重试');
    }
  };

  const handleFavorite = async () => {
    if (!isAuthenticated) {
      redirectToLogin('登录后即可收藏并稍后复习');
      return;
    }

    setFavoriteMessage('');
    try {
      if (favorited) {
        if (!favoriteId) {
          throw new Error('未找到收藏记录');
        }
        const res = await removeFavorite(favoriteId);
        if (res.success) {
          setFavorited(false);
          setFavoriteId(null);
          setFavoriteMessage('已取消收藏');
        }
      } else {
        const res = await addFavorite(parseInt(id, 10));
        if (res.success) {
          setFavorited(true);
          setFavoriteId(res.data?.id || null);
          setFavoriteMessage('已加入收藏');
        }
      }
    } catch (err) {
      console.error('收藏操作失败:', err);
      setFavoriteMessage(err?.message || '收藏失败，请重新登录后重试');
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const { currentTime, duration } = videoRef.current;
    setCurrentTimestamp(Math.floor(currentTime));

    if (!isAuthenticated || playReported) return;
    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    if (currentTime > 10 || progress > 50) {
      setPlayReported(true);
      reportPlay(parseInt(id, 10), Math.floor(currentTime), progress).catch(() => {});
    }
  };

  const handleVideoEnd = () => {
    if (!isAuthenticated) return;
    reportPlay(parseInt(id, 10), video?.duration || 0, 100).catch(() => {});
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: video.title, url: window.location.href });
      return;
    }

    navigator.clipboard?.writeText(window.location.href);
    alert('链接已复制');
  };

  const handleSelectSubtitle = async (subtitleId) => {
    if (!subtitleId) {
      setCurrentSubtitle(null);
      setCurrentSubtitleText('');
      setShowSubtitleMenu(false);
      return;
    }

    try {
      const res = await getSubtitle(subtitleId);
      if (res.success && res.data) {
        setCurrentSubtitle(res.data);
      }
    } catch (err) {
      console.error('获取字幕详情失败:', err);
    }
    setShowSubtitleMenu(false);
  };

  const handleGenerateSubtitle = async () => {
    setGeneratingSubtitle(true);
    setShowSubtitleMenu(false);
    try {
      const res = await generateSubtitle(id, 'zh-CN');
      if (res.success) {
        alert('字幕生成成功！');
        fetchSubtitles();
      } else {
        throw new Error(res.message || '生成失败');
      }
    } catch (err) {
      console.error('生成字幕失败:', err);
      alert('生成字幕失败: ' + (err.message || '请稍后重试'));
    } finally {
      setGeneratingSubtitle(false);
    }
  };

  useEffect(() => {
    if (!currentSubtitle?.items || currentSubtitle.items.length === 0) {
      setCurrentSubtitleText('');
      return;
    }

    const currentTime = currentTimestamp;
    const currentItem = currentSubtitle.items.find(
      (item) => currentTime >= item.start_time_sec && currentTime <= item.end_time_sec
    );

    setCurrentSubtitleText(currentItem?.text || '');
  }, [currentTimestamp, currentSubtitle]);

  const relatedByCategory = relatedVideos.filter((item) => item.category_name === video.category_name);
  const recommendedNext = relatedByCategory.length > 0 ? relatedByCategory[0] : relatedVideos[0];
  const continueActions = [
    recommendedNext
      ? {
          key: 'next-video',
          title: '继续看下一条',
          description: recommendedNext.title,
          action: () => navigate(`/video/${recommendedNext.id}`),
          cta: '继续学习'
        }
      : null,
    {
      key: 'card',
      title: '提炼重点',
      description: '打开知识卡片，快速复习本视频要点',
      action: () => setShowCard(true),
      cta: '查看卡片'
    },
    {
      key: 'note',
      title: '记录灵感',
      description: currentTimestamp > 0 ? `在 ${formatDuration(currentTimestamp)} 处补充你的学习笔记` : '记录这条视频给你的关键收获',
      action: () => {
        if (!isAuthenticated) {
          redirectToLogin('登录后即可记录学习笔记');
          return;
        }
        setShowNotes(true);
      },
      cta: '去记笔记'
    },
    {
      key: 'review',
      title: '稍后复习',
      description: '去历史或笔记页继续消化已经学过的内容',
      action: () => {
        if (!isAuthenticated) {
          redirectToLogin('登录后即可查看学习历史');
          return;
        }
        navigate('/history');
      },
      cta: '查看历史'
    }
  ].filter(Boolean);

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <span>加载中...</span>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="player-page">
        <div className="empty-state">
          <div className="empty-state-icon">📺</div>
          <div className="empty-state-text">视频不存在或已被删除</div>
          <button className="btn btn-primary btn-sm player-back-btn" onClick={() => navigate('/')}>
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="player-page">
      <div className="player-shell">
        <div className="player-main">
          <section className="player-primary">
            <div className="video-player-panel">
              <div className="video-player-wrapper" style={{ position: 'relative' }}>
                <video
                  ref={videoRef}
                  src={video.video_url}
                  controls
                  playsInline
                  poster={video.cover_url}
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={handleVideoEnd}
                  className="player-video"
                />

                {currentSubtitleText && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '60px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      color: '#fff',
                      padding: '8px 16px',
                      borderRadius: '4px',
                      fontSize: '18px',
                      maxWidth: '80%',
                      textAlign: 'center',
                      zIndex: 10,
                      pointerEvents: 'none',
                      lineHeight: '1.5'
                    }}
                  >
                    {currentSubtitleText}
                  </div>
                )}

                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <button
                    className="video-action-btn"
                    style={{
                      position: 'absolute',
                      bottom: '12px',
                      right: '12px',
                      zIndex: 20,
                      fontSize: '12px',
                      padding: '6px 12px'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSubtitleMenu(!showSubtitleMenu);
                    }}
                  >
                    {generatingSubtitle ? '生成中...' : currentSubtitle ? `字幕: ${currentSubtitle.language}` : 'CC'}
                  </button>

                  {showSubtitleMenu && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '50px',
                        right: '12px',
                        zIndex: 30,
                        backgroundColor: 'rgba(16, 30, 49, 0.98)',
                        borderRadius: '12px',
                        border: '1px solid rgba(125, 218, 255, 0.2)',
                        padding: '8px 0',
                        minWidth: '160px',
                        boxShadow: 'var(--shadow-lg)'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div
                        style={{
                          padding: '8px 16px',
                          fontSize: '11px',
                          color: 'var(--text-light)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          fontWeight: '700',
                          borderBottom: '1px solid var(--border-subtle)',
                          marginBottom: '4px'
                        }}
                      >
                        字幕选项
                      </div>

                      <button
                        style={{
                          display: 'block',
                          width: '100%',
                          padding: '10px 16px',
                          background: 'none',
                          border: 'none',
                          textAlign: 'left',
                          color: !currentSubtitle ? 'var(--primary)' : 'var(--text-primary)',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                        onClick={() => handleSelectSubtitle(null)}
                      >
                        关闭字幕
                      </button>

                      {subtitles.length > 0 && (
                        <div style={{ marginTop: '4px' }}>
                          <div
                            style={{
                              padding: '4px 16px',
                              fontSize: '11px',
                              color: 'var(--text-light)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              fontWeight: '600',
                              marginTop: '4px'
                            }}
                          >
                            已有字幕
                          </div>
                          {subtitles.map((sub) => (
                            <button
                              key={sub.id}
                              style={{
                                display: 'block',
                                width: '100%',
                                padding: '8px 16px',
                                background: 'none',
                                border: 'none',
                                textAlign: 'left',
                                color: currentSubtitle?.id === sub.id ? 'var(--primary)' : 'var(--text-primary)',
                                cursor: 'pointer',
                                fontSize: '13px'
                              }}
                              onClick={() => handleSelectSubtitle(sub.id)}
                            >
                              {sub.language_display || sub.language}
                              {sub.is_auto && <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--text-light)' }}>(AI)</span>}
                            </button>
                          ))}
                        </div>
                      )}

                      <div style={{ marginTop: '4px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
                        <button
                          style={{
                            display: 'block',
                            width: '100%',
                            padding: '10px 16px',
                            background: 'none',
                            border: 'none',
                            textAlign: 'left',
                            color: 'var(--primary)',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: '600'
                          }}
                          onClick={handleGenerateSubtitle}
                          disabled={generatingSubtitle}
                        >
                          {generatingSubtitle ? '生成中...' : '+ 生成自动字幕'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="video-info">
                <h1>{video.title}</h1>

                <div className="player-topline">
                  <div className="video-meta player-meta-main">
                    <span>{formatCount(video.play_count)}次播放</span>
                    <span>{formatCount(likeCount)}次点赞</span>
                    <span>{video.category_name || '未分类'}</span>
                  </div>
                </div>

                <div className="player-section-card player-section">
                  <div className="panel-header">
                    <div>
                      <div className="page-kicker">Learning actions</div>
                      <div className="player-side-title" style={{ marginBottom: 0 }}>边看边学</div>
                      <div className="panel-subtitle">把当前视频转成收藏、知识卡片和时间点笔记。</div>
                    </div>
                  </div>

                  <div className="player-actions-grid">
                    {favoriteMessage && (
                      <div className="modal-muted-copy" style={{ marginBottom: 12 }}>{favoriteMessage}</div>
                    )}
                    <div className="player-actions-grid-main">
                      <button className={`video-action-btn ${favorited ? 'active' : ''}`} onClick={handleFavorite}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill={favorited ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                        </svg>
                        {favorited ? '已收藏' : '加入收藏'}
                      </button>

                      <button className={`video-action-btn ${showKnowledgePoints ? 'active' : ''}`} onClick={() => setShowKnowledgePoints(!showKnowledgePoints)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="3"></circle>
                          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                        </svg>
                        知识点 {knowledgePoints.length > 0 ? `(${knowledgePoints.length})` : ''}
                      </button>

                      <button className="video-action-btn active" onClick={() => setShowCard(true)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                          <line x1="8" y1="21" x2="16" y2="21"></line>
                          <line x1="12" y1="17" x2="12" y2="21"></line>
                        </svg>
                        查看知识卡片
                      </button>

                      <button
                        className="video-action-btn active"
                        onClick={() => {
                          if (!isAuthenticated) { navigate('/login'); return; }
                          setShowNotes(true);
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 20h9"></path>
                          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                        </svg>
                        记录笔记
                      </button>
                    </div>

                    <div className="player-actions-grid-secondary">
                      <button className={`video-action-btn ${liked ? 'liked' : ''}`} onClick={handleLike}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                        </svg>
                        {liked ? '已赞' : '点赞'}
                      </button>

                      <button className="video-action-btn" onClick={handleShare}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="18" cy="5" r="3"></circle>
                          <circle cx="6" cy="12" r="3"></circle>
                          <circle cx="18" cy="19" r="3"></circle>
                          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                        </svg>
                        分享
                      </button>
                    </div>
                  </div>
                </div>

                <div className="video-creator player-channel-row">
                  <div className="video-creator-avatar">
                    {video.creator?.nickname?.slice(0, 1) || 'U'}
                  </div>
                  <div className="player-channel-main">
                    <div className="video-creator-name">{video.creator?.nickname || '匿名创作者'}</div>
                    <div className="player-channel-sub">知识领域创作者</div>
                  </div>
                  <button
                    className="player-channel-btn"
                    onClick={() => alert('关注功能开发中，敬请期待')}
                  >
                    关注
                  </button>
                </div>

                <div className="player-section-card player-section">
                  <div className="panel-header">
                    <div>
                      <div className="page-kicker">About this lesson</div>
                      <div className="player-side-title" style={{ marginBottom: 0 }}>内容摘要</div>
                    </div>
                  </div>
                  <div className="video-description player-desc-box">{video.description}</div>

                  {video.tags && video.tags.length > 0 && (
                    <div className="video-tags player-tags-wrap">
                      {video.tags.map((tag, index) => (
                        <span key={index} className="tag">#{tag}</span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="player-section-card player-section">
                  <div className="panel-header">
                    <div>
                      <div className="page-kicker">Next move</div>
                      <div className="player-side-title" style={{ marginBottom: 0 }}>学完下一步</div>
                      <div className="panel-subtitle">别让这条内容停在已看过，把它继续变成复习、记录和下一条学习动作。</div>
                    </div>
                  </div>
                  <div className="player-next-list">
                    {continueActions.map((item) => (
                      <button
                        key={item.key}
                        className="related-item player-next-item"
                        onClick={item.action}
                      >
                        <div className="related-content" style={{ width: '100%' }}>
                          <div className="related-title">{item.title}</div>
                          <div className="related-meta">
                            <span>{item.description}</span>
                          </div>
                          <div className="action-link">{item.cta} →</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {showKnowledgePoints && (
                  <div className="player-section-card player-section">
                    <div className="panel-header">
                      <div>
                        <div className="page-kicker">Knowledge points</div>
                        <div className="player-side-title" style={{ marginBottom: 0 }}>知识点标记</div>
                        <div className="panel-subtitle">标记视频中的关键知识点，方便复习回顾。</div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={handleAddKnowledgePoint}
                          disabled={!isAuthenticated}
                        >
                          + 标记知识点
                        </button>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={handleGenerateKnowledgePoints}
                          disabled={generatingKP || !isAuthenticated}
                        >
                          {generatingKP ? '生成中...' : 'AI 自动生成'}
                        </button>
                      </div>
                    </div>

                    {knowledgePoints.length === 0 ? (
                      <div className="empty-state" style={{ padding: '32px 16px' }}>
                        <div className="empty-state-icon" style={{ fontSize: '36px', marginBottom: '12px' }}>📍</div>
                        <div className="empty-state-text">暂无知识点标记</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '8px' }}>
                          点击「标记知识点」或「AI 自动生成」来添加知识点
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {knowledgePoints
                          .sort((a, b) => a.start_time_sec - b.start_time_sec)
                          .map((kp) => {
                            const label = getImportanceLabel(kp.importance);
                            return (
                              <div
                                key={kp.id}
                                className="card"
                                style={{
                                  padding: '14px',
                                  cursor: 'pointer',
                                  borderLeft: `3px solid ${label.color}`
                                }}
                                onClick={() => handleJumpToKP(kp)}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                      <span
                                        style={{
                                          fontSize: '12px',
                                          fontWeight: '600',
                                          padding: '2px 8px',
                                          borderRadius: '4px',
                                          backgroundColor: `${label.color}20`,
                                          color: label.color
                                        }}
                                      >
                                        {label.text}
                                      </span>
                                      <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                                        ⏱ {formatDuration(kp.start_time_sec)} - {formatDuration(kp.end_time_sec)}
                                      </span>
                                    </div>
                                    <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
                                      {kp.title}
                                    </h4>
                                    {kp.description && (
                                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
                                        {kp.description}
                                      </p>
                                    )}
                                  </div>
                                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditKnowledgePoint(kp);
                                      }}
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        padding: '4px 8px',
                                        color: 'var(--primary)',
                                        fontSize: '12px'
                                      }}
                                    >
                                      编辑
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleAddReminder(kp);
                                      }}
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        padding: '4px 8px',
                                        color: 'var(--success)',
                                        fontSize: '12px'
                                      }}
                                    >
                                      复习
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteKnowledgePoint(kp);
                                      }}
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        padding: '4px 8px',
                                        color: 'var(--danger)',
                                        fontSize: '12px'
                                      }}
                                    >
                                      删除
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                )}

                {/* 评论区 */}
                <Comments videoId={parseInt(id, 10)} />
                </div>
              </div>
          </section>

          <aside className="player-side">
            <div className="player-side-card">
              <h3 className="player-side-title">接下来播放</h3>
              {relatedLoading ? (
                <div className="player-side-empty">加载中...</div>
              ) : relatedVideos.length === 0 ? (
                <div className="player-side-empty">暂无更多推荐</div>
              ) : (
                <div className="related-list">
                  {relatedVideos.map((item) => (
                    <button
                      key={item.id}
                      className="related-item"
                      onClick={() => navigate(`/video/${item.id}`)}
                    >
                      <div className="related-cover-wrap">
                        <img
                          className="related-cover"
                          src={item.cover_url || `https://via.placeholder.com/320x180/00B4D8/FFFFFF?text=${encodeURIComponent(item.title?.slice(0, 6) || '视频')}`}
                          alt={item.title}
                          loading="lazy"
                        />
                        <span className="related-duration">{formatDuration(item.duration)}</span>
                      </div>
                      <div className="related-content">
                        <div className="related-title">{item.title}</div>
                        <div className="related-meta">
                          <span>{item.category_name || '未分类'}</span>
                          <span>{formatCount(item.play_count)}播放</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      <KnowledgeCard
        videoId={parseInt(id, 10)}
        visible={showCard}
        favorited={favorited}
        favoriteId={favoriteId}
        onFavoriteChange={({ favorited: nextFavorited, favoriteId: nextFavoriteId }) => {
          setFavorited(nextFavorited);
          setFavoriteId(nextFavoriteId);
        }}
        onClose={() => setShowCard(false)}
        onOpenNotes={() => setShowNotes(true)}
      />

      <NotesModal
        videoId={parseInt(id, 10)}
        visible={showNotes}
        onClose={() => setShowNotes(false)}
        currentTimestamp={currentTimestamp}
      />

      {showAddKnowledgePoint && (
        <div
          className="knowledge-card-overlay"
          onClick={() => setShowAddKnowledgePoint(false)}
        >
          <div
            className="knowledge-card-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxHeight: '80vh', overflow: 'auto' }}
          >
            <button
              className="knowledge-card-close"
              onClick={() => setShowAddKnowledgePoint(false)}
            >
              ×
            </button>

            <h2>{editingKnowledgePoint ? '编辑知识点' : '标记知识点'}</h2>
            <div className="modal-muted-copy" style={{ marginBottom: '20px' }}>
              {editingKnowledgePoint
                ? '修改知识点的信息'
                : `在当前时间点 ${formatDuration(currentTimestamp)} 标记一个知识点`}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: 'var(--text-primary)'
                  }}
                >
                  标题 <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="请输入知识点标题"
                  value={newKPData.title}
                  onChange={(e) => setNewKPData((prev) => ({ ...prev, title: e.target.value }))}
                  maxLength={200}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: 'var(--text-primary)'
                  }}
                >
                  描述
                </label>
                <textarea
                  className="input"
                  placeholder="请输入知识点描述（可选）"
                  rows={3}
                  value={newKPData.description}
                  onChange={(e) => setNewKPData((prev) => ({ ...prev, description: e.target.value }))}
                  maxLength={1000}
                  style={{ resize: 'vertical', minHeight: '80px' }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: 'var(--text-primary)'
                  }}
                >
                  重要程度
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[
                    { value: 'critical', label: '关键', color: '#fb7185' },
                    { value: 'important', label: '重要', color: '#f59e0b' },
                    { value: 'normal', label: '普通', color: '#7ddaff' },
                    { value: 'optional', label: '了解', color: '#64748b' }
                  ].map((item) => (
                    <button
                      key={item.value}
                      onClick={() => setNewKPData((prev) => ({ ...prev, importance: item.value }))}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '20px',
                        border: newKPData.importance === item.value
                          ? `2px solid ${item.color}`
                          : '1px solid var(--border)',
                        background: newKPData.importance === item.value
                          ? `${item.color}20`
                          : 'transparent',
                        color: item.color,
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: 'var(--text-primary)'
                    }}
                  >
                    开始时间（秒）
                  </label>
                  <input
                    type="number"
                    className="input"
                    placeholder="0"
                    value={newKPData.start_time_sec}
                    onChange={(e) =>
                      setNewKPData((prev) => ({
                        ...prev,
                        start_time_sec: Math.max(0, parseInt(e.target.value) || 0)
                      }))
                    }
                    min={0}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: 'var(--text-primary)'
                    }}
                  >
                    结束时间（秒）
                  </label>
                  <input
                    type="number"
                    className="input"
                    placeholder="0"
                    value={newKPData.end_time_sec}
                    onChange={(e) =>
                      setNewKPData((prev) => ({
                        ...prev,
                        end_time_sec: Math.max(0, parseInt(e.target.value) || 0)
                      }))
                    }
                    min={0}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                className="btn btn-outline"
                style={{ flex: 1 }}
                onClick={() => setShowAddKnowledgePoint(false)}
              >
                取消
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={handleSaveKnowledgePoint}
                disabled={savingKP || !newKPData.title.trim()}
              >
                {savingKP ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Player;
