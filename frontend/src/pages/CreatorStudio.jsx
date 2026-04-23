import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  getCreatorStats,
  getCreatorVideos,
  uploadVideo as uploadVideoApi,
  uploadCover as uploadCoverApi,
  createVideo,
  updateVideo,
  publishVideo,
  deleteVideo,
  getCategories
} from '../services/api';

function formatDuration(seconds) {
  if (!seconds || Number.isNaN(Number(seconds))) return '0:00';
  const total = Number(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const CreatorStudio = () => {
  const [stats, setStats] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingVideo, setEditingVideo] = useState(null);

  const [categories, setCategories] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStep, setUploadStep] = useState(1);

  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoDuration, setVideoDuration] = useState(0);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [coverUrl, setCoverUrl] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category_id: '',
    tags: []
  });

  const videoInputRef = useRef(null);
  const coverInputRef = useRef(null);

  useEffect(() => {
    fetchCreatorData();
    fetchCategories();
  }, []);

  const fetchCreatorData = async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, videosRes] = await Promise.all([
        getCreatorStats(),
        getCreatorVideos()
      ]);
      setStats(statsRes.data || null);
      setVideos(videosRes.data || []);
    } catch (err) {
      console.error('获取创作者数据失败:', err);
      setError('获取创作者数据失败，请稍后重试');
      setStats(null);
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await getCategories();
      if (res.success) {
        setCategories(res.data || []);
      }
    } catch (err) {
      console.error('获取分类失败:', err);
    }
  };

  const resetUploadState = () => {
    setVideoFile(null);
    setVideoPreview(null);
    setVideoUrl('');
    setVideoDuration(0);
    setCoverFile(null);
    setCoverPreview(null);
    setCoverUrl('');
    setUploadProgress(0);
    setUploadStep(1);
    setFormData({
      title: '',
      description: '',
      category_id: '',
      tags: []
    });
  };

  const handleVideoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      alert('请选择视频文件');
      return;
    }

    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));

    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      setVideoDuration(Math.floor(video.duration));
    };
    video.src = URL.createObjectURL(file);
  };

  const handleCoverSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }

    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleUploadVideo = async () => {
    if (!videoFile) {
      alert('请先选择视频文件');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const res = await uploadVideoApi(videoFile, (progress) => {
        setUploadProgress(progress);
      });

      if (res.success) {
        setVideoUrl(res.data.url);
        setUploadStep(2);
      } else {
        throw new Error(res.message || '上传失败');
      }
    } catch (err) {
      console.error('上传视频失败:', err);
      alert(err.message || '上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const handleUploadCover = async () => {
    if (!coverFile) {
      alert('请先选择封面图片');
      return;
    }

    setUploading(true);

    try {
      const res = await uploadCoverApi(coverFile);

      if (res.success) {
        setCoverUrl(res.data.url);
        setUploadStep(3);
      } else {
        throw new Error(res.message || '上传失败');
      }
    } catch (err) {
      console.error('上传封面失败:', err);
      alert(err.message || '上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const handleCreateVideo = async () => {
    if (!formData.title.trim()) {
      alert('请输入视频标题');
      return;
    }

    if (!videoUrl) {
      alert('请先上传视频文件');
      return;
    }

    setUploading(true);

    try {
      const videoData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        video_url: videoUrl,
        cover_url: coverUrl || '',
        category_id: formData.category_id ? parseInt(formData.category_id, 10) : null,
        tags: formData.tags,
        duration: videoDuration
      };

      const res = await createVideo(videoData);

      if (res.success) {
        alert('视频创建成功！可以继续编辑或发布。');
        setShowUploadModal(false);
        resetUploadState();
        fetchCreatorData();
      } else {
        throw new Error(res.message || '创建失败');
      }
    } catch (err) {
      console.error('创建视频失败:', err);
      alert(err.message || '创建失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const handleOpenEditModal = async (video) => {
    setEditingVideo(video);
    setFormData({
      title: video.title || '',
      description: video.description || '',
      category_id: video.category_id ? String(video.category_id) : '',
      tags: video.tags || []
    });
    setVideoUrl(video.video_url || '');
    setCoverUrl(video.cover_url || '');
    setCoverPreview(video.cover_url || null);
    setShowEditModal(true);
  };

  const handleUpdateVideo = async () => {
    if (!editingVideo) return;
    if (!formData.title.trim()) {
      alert('请输入视频标题');
      return;
    }

    setUploading(true);

    try {
      const updateData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category_id: formData.category_id ? parseInt(formData.category_id, 10) : null,
        tags: formData.tags
      };

      if (coverUrl && coverUrl !== editingVideo.cover_url) {
        updateData.cover_url = coverUrl;
      }

      const res = await updateVideo(editingVideo.id, updateData);

      if (res.success) {
        alert('视频更新成功！');
        setShowEditModal(false);
        setEditingVideo(null);
        fetchCreatorData();
      } else {
        throw new Error(res.message || '更新失败');
      }
    } catch (err) {
      console.error('更新视频失败:', err);
      alert(err.message || '更新失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const handlePublishVideo = async (video) => {
    if (!confirm('确定要发布这个视频吗？发布后将对所有用户可见。')) {
      return;
    }

    try {
      const res = await publishVideo(video.id);
      if (res.success) {
        alert('视频发布成功！');
        fetchCreatorData();
      } else {
        throw new Error(res.message || '发布失败');
      }
    } catch (err) {
      console.error('发布视频失败:', err);
      alert(err.message || '发布失败，请重试');
    }
  };

  const handleDeleteVideo = async (video) => {
    if (!confirm(`确定要删除视频"${video.title}"吗？此操作不可恢复。`)) {
      return;
    }

    try {
      const res = await deleteVideo(video.id);
      if (res.success) {
        alert('视频删除成功！');
        fetchCreatorData();
      } else {
        throw new Error(res.message || '删除失败');
      }
    } catch (err) {
      console.error('删除视频失败:', err);
      alert(err.message || '删除失败，请重试');
    }
  };

  const handleTagInput = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const tag = e.target.value.trim().replace(',', '');
      if (tag && !formData.tags.includes(tag)) {
        setFormData(prev => ({
          ...prev,
          tags: [...prev.tags, tag]
        }));
      }
      e.target.value = '';
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const getStatusLabel = (status) => {
    const labels = {
      'draft': { text: '草稿', color: '#fff3e0', textColor: '#f57c00' },
      'published': { text: '已发布', color: '#e8f5e9', textColor: 'var(--success)' },
      'archived': { text: '已归档', color: '#f5f5f5', textColor: 'var(--text-secondary)' }
    };
    return labels[status] || { text: status, color: '#f5f5f5', textColor: 'var(--text-secondary)' };
  };

  if (loading) return <div className="loading"><div className="loading-spinner"></div><span>加载中...</span></div>;
  if (error) return <div className="page" style={{ padding: '40px', color: 'var(--danger)', textAlign: 'center' }}>{error}</div>;

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', gap: '15px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--text-secondary)', padding: '0 8px 0 0' }}>←</button>
        <div>
            <h1 style={{ fontSize: '24px', marginBottom: '8px', color: 'var(--dark)' }}>创作者中心</h1>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>管理您的知识内容，查看数据表现</p>
        </div>
      </div>

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>总播放量</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--primary)', fontFamily: 'system-ui' }}>{stats.total_views || 0}</div>
          </div>
          <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>总获赞数</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--danger)', fontFamily: 'system-ui' }}>{stats.total_likes || 0}</div>
          </div>
          <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>视频总数</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--dark)', fontFamily: 'system-ui' }}>{stats.total_videos || 0}</div>
          </div>
          <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>近30天发布</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--success)', fontFamily: 'system-ui' }}>{stats.recent_videos || 0}</div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '18px', color: 'var(--dark)', fontWeight: '600' }}>内容管理</h3>
        <button
          onClick={() => {
            resetUploadState();
            setShowUploadModal(true);
          }}
          className="btn btn-primary"
          style={{ padding: '8px 16px', fontSize: '14px', borderRadius: '20px' }}
        >
          + 上传视频
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '40px' }}>
        {videos.length === 0 ? (
          <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-light)' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📸</div>
            <div style={{ fontSize: '16px', marginBottom: '8px', color: 'var(--dark)' }}>空空如也</div>
            <div>您还没有上传过视频，快去分享知识吧</div>
            <button
              onClick={() => {
                resetUploadState();
                setShowUploadModal(true);
              }}
              className="btn btn-primary"
              style={{ marginTop: '20px', padding: '10px 24px', borderRadius: '20px' }}
            >
              开始上传
            </button>
          </div>
        ) : (
          videos.map(video => {
            const statusInfo = getStatusLabel(video.status);
            return (
              <div key={video.id} className="card" style={{ display: 'flex', padding: '16px', gap: '16px' }}>
                <div style={{ position: 'relative' }}>
                  <img
                    src={video.cover_url || `https://picsum.photos/seed/${video.id}/160/100`}
                    alt="cover"
                    style={{ width: '160px', height: '90px', objectFit: 'cover', borderRadius: '8px', backgroundColor: 'var(--bg-primary)', cursor: 'pointer' }}
                    onClick={() => navigate(`/video/${video.id}`)}
                  />
                  {video.duration > 0 && (
                    <span style={{
                      position: 'absolute',
                      bottom: '4px',
                      right: '4px',
                      backgroundColor: 'rgba(0,0,0,0.7)',
                      color: '#fff',
                      fontSize: '11px',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}>
                      {formatDuration(video.duration)}
                    </span>
                  )}
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}>
                  <div>
                    <h4
                      style={{ margin: '0 0 8px 0', fontSize: '16px', color: 'var(--dark)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', cursor: 'pointer' }}
                      onClick={() => navigate(`/video/${video.id}`)}
                    >
                      {video.title}
                    </h4>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <div style={{ display: 'inline-block', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', backgroundColor: statusInfo.color, color: statusInfo.textColor }}>
                        {statusInfo.text}
                      </div>
                      {video.category_name && (
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {video.category_name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                    <div style={{ display: 'flex', gap: '16px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                      <span>▶ {video.play_count || 0}</span>
                      <span>♥ {video.like_count || 0}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {video.status === 'draft' && (
                        <button
                          onClick={() => handlePublishVideo(video)}
                          style={{ background: 'var(--success)', border: 'none', color: '#fff', fontSize: '13px', cursor: 'pointer', padding: '4px 12px', borderRadius: '4px' }}
                        >
                          发布
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenEditModal(video)}
                        style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '14px', cursor: 'pointer', padding: '4px 8px' }}
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDeleteVideo(video)}
                        style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '14px', cursor: 'pointer', padding: '4px 8px' }}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showUploadModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="card" style={{
            width: '100%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'auto',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, fontSize: '20px', color: 'var(--dark)' }}>上传视频</h3>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  resetUploadState();
                }}
                style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', marginBottom: '24px', gap: '8px' }}>
              {[1, 2, 3, 4].map(step => (
                <div key={step} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 4px',
                    backgroundColor: uploadStep >= step ? 'var(--primary)' : 'var(--bg-primary)',
                    color: uploadStep >= step ? '#fff' : 'var(--text-secondary)',
                    fontWeight: uploadStep >= step ? 'bold' : 'normal'
                  }}>
                    {step}
                  </div>
                  <span style={{ fontSize: '12px', color: uploadStep >= step ? 'var(--primary)' : 'var(--text-secondary)' }}>
                    {step === 1 ? '上传视频' : step === 2 ? '上传封面' : step === 3 ? '填写信息' : '完成创建'}
                  </span>
                </div>
              ))}
            </div>

            {uploadStep === 1 && (
              <div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--dark)' }}>
                    选择视频文件 <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleVideoSelect}
                    style={{ display: 'none' }}
                  />
                  <div
                    onClick={() => videoInputRef.current?.click()}
                    style={{
                      border: '2px dashed var(--primary)',
                      borderRadius: '8px',
                      padding: '40px 20px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      backgroundColor: '#f5f7ff'
                    }}
                  >
                    {videoPreview ? (
                      <div>
                        <video
                          src={videoPreview}
                          controls
                          style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px' }}
                        />
                        <div style={{ marginTop: '12px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                          {videoFile?.name} · {videoDuration > 0 ? formatDuration(videoDuration) : '获取时长中...'}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: '48px', marginBottom: '12px' }}>📹</div>
                        <div style={{ fontSize: '16px', color: 'var(--dark)', marginBottom: '8px' }}>
                          点击选择视频文件
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                          支持 MP4, WebM, MOV 等格式，最大 500MB
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {uploading ? (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>上传中...</span>
                      <span style={{ fontSize: '14px', color: 'var(--primary)' }}>{uploadProgress}%</span>
                    </div>
                    <div style={{
                      height: '8px',
                      backgroundColor: 'var(--bg-primary)',
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%',
                        backgroundColor: 'var(--primary)',
                        width: `${uploadProgress}%`,
                        transition: 'width 0.3s'
                      }} />
                    </div>
                  </div>
                ) : videoPreview ? (
                  <button
                    onClick={handleUploadVideo}
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', fontSize: '16px' }}
                  >
                    开始上传
                  </button>
                ) : null}
              </div>
            )}

            {uploadStep === 2 && (
              <div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--dark)' }}>
                    选择封面图片
                  </label>
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleCoverSelect}
                    style={{ display: 'none' }}
                  />
                  <div
                    onClick={() => coverInputRef.current?.click()}
                    style={{
                      border: '2px dashed var(--text-secondary)',
                      borderRadius: '8px',
                      padding: '30px 20px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      backgroundColor: '#fafafa'
                    }}
                  >
                    {coverPreview ? (
                      <div>
                        <img
                          src={coverPreview}
                          alt="cover"
                          style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px' }}
                        />
                        <div style={{ marginTop: '12px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                          {coverFile?.name}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: '48px', marginBottom: '12px' }}>🖼️</div>
                        <div style={{ fontSize: '16px', color: 'var(--dark)', marginBottom: '8px' }}>
                          点击选择封面图片（可选）
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                          支持 JPG, PNG, GIF, WebP 等格式
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => setUploadStep(1)}
                    className="btn btn-outline"
                    style={{ flex: 1, padding: '12px', borderRadius: '8px' }}
                  >
                    上一步
                  </button>
                  <button
                    onClick={async () => {
                      if (coverFile) {
                        setUploading(true);
                        try {
                          const res = await uploadCoverApi(coverFile);
                          if (res.success) {
                            setCoverUrl(res.data.url);
                            setUploadStep(3);
                          }
                        } catch (err) {
                          alert(err.message || '上传失败');
                        } finally {
                          setUploading(false);
                        }
                      } else {
                        setUploadStep(3);
                      }
                    }}
                    className="btn btn-primary"
                    style={{ flex: 1, padding: '12px', borderRadius: '8px' }}
                    disabled={uploading}
                  >
                    {uploading ? '上传中...' : coverFile ? '上传并继续' : '跳过'}
                  </button>
                </div>
              </div>
            )}

            {uploadStep === 3 && (
              <div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--dark)' }}>
                    视频标题 <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="请输入视频标题（不超过200字）"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                    maxLength={200}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--dark)' }}>
                    视频描述
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="请输入视频描述（不超过2000字）"
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      resize: 'vertical'
                    }}
                    maxLength={2000}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--dark)' }}>
                    分类
                  </label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="">请选择分类</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--dark)' }}>
                    标签
                  </label>
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                    marginBottom: '8px'
                  }}>
                    {formData.tags.map((tag, index) => (
                      <span
                        key={index}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 10px',
                          backgroundColor: '#e3f2fd',
                          color: 'var(--primary)',
                          borderRadius: '16px',
                          fontSize: '13px'
                        }}
                      >
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                            color: 'var(--primary)',
                            fontSize: '14px'
                          }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="输入标签后按回车添加"
                    onKeyDown={handleTagInput}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => setUploadStep(2)}
                    className="btn btn-outline"
                    style={{ flex: 1, padding: '12px', borderRadius: '8px' }}
                  >
                    上一步
                  </button>
                  <button
                    onClick={handleCreateVideo}
                    className="btn btn-primary"
                    style={{ flex: 1, padding: '12px', borderRadius: '8px' }}
                    disabled={uploading || !formData.title.trim()}
                  >
                    {uploading ? '创建中...' : '创建视频'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showEditModal && editingVideo && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="card" style={{
            width: '100%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflow: 'auto',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, fontSize: '20px', color: 'var(--dark)' }}>编辑视频</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingVideo(null);
                }}
                style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--dark)' }}>
                视频标题 <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="请输入视频标题"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
                maxLength={200}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--dark)' }}>
                视频描述
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="请输入视频描述"
                rows={4}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  resize: 'vertical'
                }}
                maxLength={2000}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--dark)' }}>
                分类
              </label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              >
                <option value="">请选择分类</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--dark)' }}>
                标签
              </label>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                marginBottom: '8px'
              }}>
                {formData.tags.map((tag, index) => (
                  <span
                    key={index}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      backgroundColor: '#e3f2fd',
                      color: 'var(--primary)',
                      borderRadius: '16px',
                      fontSize: '13px'
                    }}
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        color: 'var(--primary)',
                        fontSize: '14px'
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                placeholder="输入标签后按回车添加"
                onKeyDown={handleTagInput}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingVideo(null);
                }}
                className="btn btn-outline"
                style={{ flex: 1, padding: '12px', borderRadius: '8px' }}
              >
                取消
              </button>
              <button
                onClick={handleUpdateVideo}
                className="btn btn-primary"
                style={{ flex: 1, padding: '12px', borderRadius: '8px' }}
                disabled={uploading || !formData.title.trim()}
              >
                {uploading ? '保存中...' : '保存更改'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreatorStudio;
