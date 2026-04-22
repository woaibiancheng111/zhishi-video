import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { 
  getCreatorStats, 
  getCreatorVideos, 
  uploadVideo, 
  uploadCover, 
  saveVideo, 
  publishVideo, 
  deleteVideo,
  getVideoProgress,
  getVideoSubtitles,
  generateSubtitles,
  getKnowledgePoints,
  saveKnowledgePoint,
  deleteKnowledgePoint,
  getCategories
} from '../services/api';

const CreatorStudio = () => {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const coverInputRef = useRef(null);
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [processingStatus, setProcessingStatus] = useState(null);
  
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    category_id: '',
    tags: '',
    cover_url: ''
  });
  
  const [categories, setCategories] = useState([]);
  const [subtitles, setSubtitles] = useState([]);
  const [knowledgePoints, setKnowledgePoints] = useState([]);
  const [newKnowledgePoint, setNewKnowledgePoint] = useState({
    title: '',
    description: '',
    start_time_sec: 0,
    end_time_sec: 0,
    tags: ''
  });

  useEffect(() => {
    fetchCreatorData();
    fetchCategories();
  }, []);

  useEffect(() => {
    if (videoId) {
      setActiveTab('edit');
      loadVideoForEdit(videoId);
    }
  }, [videoId]);

  const fetchCreatorData = async () => {
    try {
      const [statsRes, videosRes] = await Promise.all([
        getCreatorStats(),
        getCreatorVideos({ page: 1, limit: 50 })
      ]);
      setStats(statsRes.data || null);
      setVideos(videosRes.data || []);
    } catch (err) {
      console.error('获取创作者数据失败:', err);
      setError('获取创作者数据失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await getCategories();
      setCategories(res.data || []);
    } catch (err) {
      console.error('获取分类失败:', err);
    }
  };

  const loadVideoForEdit = async (id) => {
    const video = videos.find(v => v.id === parseInt(id));
    if (video) {
      setCurrentVideo(video);
      setEditForm({
        title: video.title || '',
        description: video.description || '',
        category_id: video.category_id || '',
        tags: (video.tags || []).join(', '),
        cover_url: video.cover_url || ''
      });
      
      await Promise.all([
        loadSubtitles(id),
        loadKnowledgePoints(id),
        checkProcessingStatus(id)
      ]);
    }
  };

  const checkProcessingStatus = async (videoId) => {
    try {
      const res = await getVideoProgress(videoId);
      setProcessingStatus(res.data);
      
      if (res.data.status === 'processing') {
        setTimeout(() => checkProcessingStatus(videoId), 2000);
      }
    } catch (err) {
      console.error('获取处理状态失败:', err);
    }
  };

  const loadSubtitles = async (videoId) => {
    try {
      const res = await getVideoSubtitles(videoId);
      setSubtitles(res.data || []);
    } catch (err) {
      console.error('获取字幕失败:', err);
    }
  };

  const loadKnowledgePoints = async (videoId) => {
    try {
      const res = await getKnowledgePoints(videoId);
      setKnowledgePoints(res.data || []);
    } catch (err) {
      console.error('获取知识点失败:', err);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleUploadVideo(file);
    }
  };

  const handleUploadVideo = async (file) => {
    setUploading(true);
    setUploadProgress(0);
    
    try {
      const res = await uploadVideo(file, (progress) => {
        setUploadProgress(progress);
      });
      
      if (res.success) {
        const newVideo = {
          id: res.data.video_id,
          title: res.data.file_name,
          video_url: res.data.video_url,
          status: 'draft',
          processing_status: 'processing',
          created_at: new Date().toISOString()
        };
        
        setVideos(prev => [newVideo, ...prev]);
        setCurrentVideo(newVideo);
        setActiveTab('edit');
        navigate(`/creator/${newVideo.id}`);
        
        checkProcessingStatus(newVideo.id);
      }
    } catch (err) {
      console.error('上传视频失败:', err);
      alert('上传失败: ' + (err.message || '未知错误'));
    } finally {
      setUploading(false);
    }
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      const res = await uploadCover(file);
      if (res.success) {
        setEditForm(prev => ({ ...prev, cover_url: res.data.cover_url }));
      }
    } catch (err) {
      console.error('上传封面失败:', err);
      alert('上传封面失败');
    }
  };

  const handleSaveVideo = async () => {
    if (!currentVideo) return;
    
    try {
      const tagsArray = editForm.tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t);
      
      const res = await saveVideo({
        video_id: currentVideo.id,
        title: editForm.title,
        description: editForm.description,
        category_id: editForm.category_id || null,
        tags: tagsArray,
        cover_url: editForm.cover_url
      });
      
      if (res.success) {
        setVideos(prev => prev.map(v => 
          v.id === currentVideo.id ? { ...v, ...res.data } : v
        ));
        setCurrentVideo(res.data);
        alert('保存成功！');
      }
    } catch (err) {
      console.error('保存视频失败:', err);
      alert('保存失败: ' + (err.message || '未知错误'));
    }
  };

  const handlePublishVideo = async () => {
    if (!currentVideo) return;
    
    try {
      const res = await publishVideo(currentVideo.id);
      if (res.success) {
        setVideos(prev => prev.map(v => 
          v.id === currentVideo.id ? { ...v, status: 'published' } : v
        ));
        setCurrentVideo(prev => ({ ...prev, status: 'published' }));
        alert('发布成功！');
      }
    } catch (err) {
      console.error('发布视频失败:', err);
      alert('发布失败: ' + (err.message || '未知错误'));
    }
  };

  const handleDeleteVideo = async (videoId) => {
    if (!confirm('确定要删除这个视频吗？')) return;
    
    try {
      await deleteVideo(videoId);
      setVideos(prev => prev.filter(v => v.id !== videoId));
      if (currentVideo?.id === videoId) {
        setCurrentVideo(null);
        setActiveTab('dashboard');
        navigate('/creator');
      }
      alert('删除成功！');
    } catch (err) {
      console.error('删除视频失败:', err);
      alert('删除失败');
    }
  };

  const handleGenerateSubtitles = async () => {
    if (!currentVideo) return;
    
    try {
      const res = await generateSubtitles(currentVideo.id);
      if (res.success) {
        setSubtitles(prev => [...prev, res.data]);
        alert('字幕生成成功！');
      }
    } catch (err) {
      console.error('生成字幕失败:', err);
      alert('生成字幕失败: ' + (err.message || '未知错误'));
    }
  };

  const handleAddKnowledgePoint = async () => {
    if (!currentVideo || !newKnowledgePoint.title) return;
    
    try {
      const tagsArray = newKnowledgePoint.tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t);
      
      const res = await saveKnowledgePoint(currentVideo.id, {
        title: newKnowledgePoint.title,
        description: newKnowledgePoint.description,
        start_time_sec: parseInt(newKnowledgePoint.start_time_sec) || 0,
        end_time_sec: parseInt(newKnowledgePoint.end_time_sec) || 0,
        tags: tagsArray
      });
      
      if (res.success) {
        setKnowledgePoints(prev => [...prev, res.data]);
        setNewKnowledgePoint({
          title: '',
          description: '',
          start_time_sec: 0,
          end_time_sec: 0,
          tags: ''
        });
      }
    } catch (err) {
      console.error('添加知识点失败:', err);
      alert('添加失败: ' + (err.message || '未知错误'));
    }
  };

  const handleDeleteKnowledgePoint = async (pointId) => {
    if (!currentVideo || !confirm('确定要删除这个知识点吗？')) return;
    
    try {
      await deleteKnowledgePoint(currentVideo.id, pointId);
      setKnowledgePoints(prev => prev.filter(p => p.id !== pointId));
    } catch (err) {
      console.error('删除知识点失败:', err);
      alert('删除失败');
    }
  };

  const formatTime = (seconds) => {
    if (!seconds) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  if (loading && activeTab === 'dashboard') {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <span>加载中...</span>
      </div>
    );
  }

  return (
    <div className="page" style={{ padding: 0 }}>
      <div style={{ 
        display: 'flex', 
        minHeight: '100vh',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{ 
          width: '240px', 
          backgroundColor: 'white',
          borderRight: '1px solid #e5e5e5',
          padding: '20px 0'
        }}>
          <div style={{ padding: '0 20px 20px', borderBottom: '1px solid #e5e5e5' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>创作者中心</h2>
            <p style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>管理您的知识内容</p>
          </div>
          
          <nav style={{ marginTop: '20px' }}>
            {[
              { key: 'dashboard', label: '数据概览', icon: '📊' },
              { key: 'videos', label: '内容管理', icon: '🎬' },
              { key: 'upload', label: '上传视频', icon: '📤' },
            ].map(item => (
              <button
                key={item.key}
                onClick={() => {
                  setActiveTab(item.key);
                  if (item.key !== 'edit') {
                    setCurrentVideo(null);
                    navigate('/creator');
                  }
                }}
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  textAlign: 'left',
                  border: 'none',
                  background: activeTab === item.key ? '#f0f7ff' : 'transparent',
                  color: activeTab === item.key ? '#007bff' : '#333',
                  cursor: 'pointer',
                  fontSize: '14px',
                  borderLeft: activeTab === item.key ? '3px solid #007bff' : '3px solid transparent'
                }}
              >
                {item.icon} {item.label}
              </button>
            ))}
            
            {currentVideo && (
              <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e5e5e5' }}>
                <div style={{ padding: '0 20px 10px' }}>
                  <span style={{ fontSize: '12px', color: '#999' }}>当前编辑</span>
                </div>
                <button
                  onClick={() => setActiveTab('edit')}
                  style={{
                    width: '100%',
                    padding: '12px 20px',
                    textAlign: 'left',
                    border: 'none',
                    background: activeTab === 'edit' ? '#f0f7ff' : 'transparent',
                    color: activeTab === 'edit' ? '#007bff' : '#333',
                    cursor: 'pointer',
                    fontSize: '14px',
                    borderLeft: activeTab === 'edit' ? '3px solid #007bff' : '3px solid transparent',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  ✏️ {currentVideo.title?.slice(0, 15) || '未命名'}
                </button>
                
                {[
                  { key: 'subtitles', label: '字幕管理', icon: '📝' },
                  { key: 'knowledge', label: '知识点', icon: '💡' },
                ].map(item => (
                  <button
                    key={item.key}
                    onClick={() => setActiveTab(item.key)}
                    style={{
                      width: '100%',
                      padding: '10px 20px 10px 40px',
                      textAlign: 'left',
                      border: 'none',
                      background: activeTab === item.key ? '#f0f7ff' : 'transparent',
                      color: activeTab === item.key ? '#007bff' : '#666',
                      cursor: 'pointer',
                      fontSize: '13px',
                      borderLeft: activeTab === item.key ? '3px solid #007bff' : '3px solid transparent'
                    }}
                  >
                    {item.icon} {item.label}
                  </button>
                ))}
              </div>
            )}
          </nav>
        </div>

        <div style={{ flex: 1, padding: '24px' }}>
          {activeTab === 'dashboard' && (
            <div>
              <h1 style={{ fontSize: '24px', marginBottom: '24px', color: '#333' }}>数据概览</h1>
              
              {stats && (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: '16px', 
                  marginBottom: '32px' 
                }}>
                  <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', color: '#999', marginBottom: '8px' }}>总播放量</div>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#007bff' }}>
                      {stats.total_views?.toLocaleString() || 0}
                    </div>
                  </div>
                  <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', color: '#999', marginBottom: '8px' }}>总获赞数</div>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#dc3545' }}>
                      {stats.total_likes?.toLocaleString() || 0}
                    </div>
                  </div>
                  <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', color: '#999', marginBottom: '8px' }}>视频总数</div>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#333' }}>
                      {stats.total_videos || 0}
                    </div>
                  </div>
                  <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', color: '#999', marginBottom: '8px' }}>近30天发布</div>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#28a745' }}>
                      {stats.recent_videos || 0}
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '18px', color: '#333' }}>最新视频</h3>
                <button 
                  onClick={() => setActiveTab('upload')}
                  className="btn btn-primary"
                >
                  + 上传视频
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {videos.slice(0, 5).map(video => (
                  <div 
                    key={video.id} 
                    className="card" 
                    style={{ 
                      display: 'flex', 
                      padding: '16px', 
                      gap: '16px',
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      setCurrentVideo(video);
                      setActiveTab('edit');
                      navigate(`/creator/${video.id}`);
                    }}
                  >
                    <img 
                      src={video.cover_url || `https://picsum.photos/seed/${video.id}/160/100`} 
                      alt="cover" 
                      style={{ width: '140px', height: '90px', objectFit: 'cover', borderRadius: '8px' }} 
                    />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#333' }}>
                          {video.title}
                        </h4>
                        <div style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', 
                          backgroundColor: video.status === 'published' ? '#e8f5e9' : '#fff3e0', 
                          color: video.status === 'published' ? '#2e7d32' : '#f57c00' }}>
                          {video.status === 'published' ? '已发布' : video.status === 'draft' ? '草稿' : '处理中'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '16px', color: '#999', fontSize: '13px' }}>
                        <span>▶ {video.play_count || 0}</span>
                        <span>♥ {video.like_count || 0}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {videos.length === 0 && (
                  <div className="card" style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📸</div>
                    <div style={{ fontSize: '16px', marginBottom: '8px', color: '#333' }}>还没有视频</div>
                    <div>点击上方按钮开始上传您的第一个视频</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'videos' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 style={{ fontSize: '24px', color: '#333' }}>内容管理</h1>
                <button 
                  onClick={() => setActiveTab('upload')}
                  className="btn btn-primary"
                >
                  + 上传视频
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {videos.map(video => (
                  <div 
                    key={video.id} 
                    className="card" 
                    style={{ display: 'flex', padding: '16px', gap: '16px' }}
                  >
                    <img 
                      src={video.cover_url || `https://picsum.photos/seed/${video.id}/160/100`} 
                      alt="cover" 
                      style={{ width: '140px', height: '90px', objectFit: 'cover', borderRadius: '8px' }} 
                    />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}>
                      <div>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#333', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {video.title}
                        </h4>
                        <div style={{ display: 'inline-block', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', 
                          backgroundColor: video.status === 'published' ? '#e8f5e9' : '#fff3e0', 
                          color: video.status === 'published' ? '#2e7d32' : '#f57c00' }}>
                          {video.status === 'published' ? '已发布' : video.status === 'draft' ? '草稿' : '处理中'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                        <div style={{ display: 'flex', gap: '16px', color: '#999', fontSize: '13px' }}>
                          <span>▶ {video.play_count || 0}</span>
                          <span>♥ {video.like_count || 0}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            onClick={() => {
                              setCurrentVideo(video);
                              setActiveTab('edit');
                              navigate(`/creator/${video.id}`);
                            }}
                            style={{ background: 'none', border: 'none', color: '#007bff', fontSize: '14px', cursor: 'pointer' }}
                          >
                            编辑
                          </button>
                          <button 
                            onClick={() => handleDeleteVideo(video.id)}
                            style={{ background: 'none', border: 'none', color: '#dc3545', fontSize: '14px', cursor: 'pointer' }}
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {videos.length === 0 && (
                  <div className="card" style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📸</div>
                    <div style={{ fontSize: '16px', marginBottom: '8px', color: '#333' }}>还没有视频</div>
                    <div>点击上方按钮开始上传您的第一个视频</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'upload' && (
            <div>
              <h1 style={{ fontSize: '24px', marginBottom: '24px', color: '#333' }}>上传视频</h1>
              
              <div 
                className="card" 
                style={{ 
                  padding: '60px 20px', 
                  textAlign: 'center',
                  border: '2px dashed #ddd',
                  borderRadius: '12px',
                  cursor: uploading ? 'not-allowed' : 'pointer'
                }}
                onClick={() => !uploading && fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".mp4,.webm,.mov,.avi,.mkv"
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                />
                
                {uploading ? (
                  <div>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📤</div>
                    <h3 style={{ fontSize: '18px', marginBottom: '16px', color: '#333' }}>正在上传...</h3>
                    <div style={{ 
                      width: '100%', 
                      maxWidth: '400px', 
                      margin: '0 auto 16px',
                      backgroundColor: '#e5e5e5',
                      borderRadius: '8px',
                      overflow: 'hidden'
                    }}>
                      <div style={{ 
                        height: '8px', 
                        backgroundColor: '#007bff',
                        width: `${uploadProgress}%`,
                        transition: 'width 0.3s'
                      }} />
                    </div>
                    <p style={{ fontSize: '14px', color: '#999' }}>{uploadProgress}%</p>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎬</div>
                    <h3 style={{ fontSize: '18px', marginBottom: '8px', color: '#333' }}>点击或拖拽视频文件到这里</h3>
                    <p style={{ fontSize: '14px', color: '#999' }}>支持 MP4, WebM, MOV, AVI, MKV 格式，最大 500MB</p>
                  </div>
                )}
              </div>

              <div className="card" style={{ marginTop: '24px', padding: '20px' }}>
                <h4 style={{ fontSize: '16px', marginBottom: '12px', color: '#333' }}>上传提示</h4>
                <ul style={{ fontSize: '14px', color: '#666', lineHeight: '1.8' }}>
                  <li>• 建议使用 1080p 或更高分辨率的视频</li>
                  <li>• 视频时长建议在 1-15 分钟之间</li>
                  <li>• 上传后需要等待处理完成才能编辑和发布</li>
                  <li>• 请确保视频内容符合平台规范</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'edit' && currentVideo && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 style={{ fontSize: '24px', color: '#333' }}>编辑视频</h1>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    onClick={handleSaveVideo}
                    className="btn btn-outline"
                  >
                    保存草稿
                  </button>
                  <button 
                    onClick={handlePublishVideo}
                    className="btn btn-primary"
                    disabled={currentVideo.status === 'published'}
                  >
                    {currentVideo.status === 'published' ? '已发布' : '发布'}
                  </button>
                </div>
              </div>

              {processingStatus && processingStatus.status === 'processing' && (
                <div className="card" style={{ padding: '16px', marginBottom: '24px', backgroundColor: '#fff3e0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontSize: '24px' }}>⏳</div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#f57c00' }}>视频处理中</div>
                      <div style={{ fontSize: '12px', color: '#ff9800' }}>
                        处理进度: {processingStatus.progress}%
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', marginBottom: '20px', color: '#333' }}>视频预览</h3>
                <div style={{ 
                  aspectRatio: '16/9', 
                  backgroundColor: '#000', 
                  borderRadius: '8px',
                  overflow: 'hidden'
                }}>
                  {currentVideo.video_url ? (
                    <video 
                      src={currentVideo.video_url} 
                      controls 
                      style={{ width: '100%', height: '100%' }}
                    />
                  ) : (
                    <div style={{ 
                      width: '100%', 
                      height: '100%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      color: '#666'
                    }}>
                      暂无视频
                    </div>
                  )}
                </div>
              </div>

              <div className="card" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '16px', marginBottom: '20px', color: '#333' }}>基本信息</h3>
                
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#333' }}>
                    视频标题 <span style={{ color: '#dc3545' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="请输入视频标题"
                    style={{ 
                      width: '100%', 
                      padding: '10px 12px', 
                      border: '1px solid #ddd', 
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#333' }}>
                    视频描述
                  </label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="请输入视频描述，帮助用户更好地了解视频内容"
                    rows={4}
                    style={{ 
                      width: '100%', 
                      padding: '10px 12px', 
                      border: '1px solid #ddd', 
                      borderRadius: '6px',
                      fontSize: '14px',
                      resize: 'vertical'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#333' }}>
                      分类
                    </label>
                    <select
                      value={editForm.category_id}
                      onChange={(e) => setEditForm(prev => ({ ...prev, category_id: e.target.value }))}
                      style={{ 
                        width: '100%', 
                        padding: '10px 12px', 
                        border: '1px solid #ddd', 
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    >
                      <option value="">请选择分类</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#333' }}>
                      标签
                    </label>
                    <input
                      type="text"
                      value={editForm.tags}
                      onChange={(e) => setEditForm(prev => ({ ...prev, tags: e.target.value }))}
                      placeholder="多个标签用逗号分隔"
                      style={{ 
                        width: '100%', 
                        padding: '10px 12px', 
                        border: '1px solid #ddd', 
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#333' }}>
                    封面图
                  </label>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    <div 
                      style={{ 
                        width: '200px', 
                        aspectRatio: '16/9', 
                        backgroundColor: '#f5f5f5',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        border: '1px solid #ddd'
                      }}
                    >
                      {editForm.cover_url ? (
                        <img 
                          src={editForm.cover_url} 
                          alt="cover" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{ 
                          width: '100%', 
                          height: '100%', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          color: '#999',
                          fontSize: '12px'
                        }}>
                          暂无封面
                        </div>
                      )}
                    </div>
                    <div>
                      <input
                        ref={coverInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleCoverUpload}
                      />
                      <button 
                        onClick={() => coverInputRef.current?.click()}
                        className="btn btn-outline"
                        style={{ fontSize: '14px' }}
                      >
                        上传封面
                      </button>
                      <p style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
                        建议尺寸 1280x720，支持 JPG、PNG 格式
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'subtitles' && currentVideo && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 style={{ fontSize: '24px', color: '#333' }}>字幕管理</h1>
                <button 
                  onClick={handleGenerateSubtitles}
                  className="btn btn-primary"
                >
                  🔧 生成自动字幕
                </button>
              </div>

              {subtitles.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {subtitles.map((sub, index) => (
                    <div key={index} className="card" style={{ padding: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div>
                          <span style={{ 
                            display: 'inline-block', 
                            padding: '4px 12px', 
                            borderRadius: '4px', 
                            fontSize: '12px',
                            backgroundColor: sub.is_auto_generated ? '#e3f2fd' : '#f5f5f5',
                            color: sub.is_auto_generated ? '#1976d2' : '#666'
                          }}>
                            {sub.language === 'zh-CN' ? '简体中文' : sub.language}
                            {sub.is_auto_generated && ' (自动生成)'}
                          </span>
                        </div>
                        <span style={{ fontSize: '12px', color: '#999' }}>
                          创建时间: {new Date(sub.created_at).toLocaleString('zh-CN')}
                        </span>
                      </div>
                      
                      {Array.isArray(sub.content) && sub.content.length > 0 && (
                        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                          <table style={{ width: '100%', fontSize: '14px' }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid #ddd' }}>
                                <th style={{ textAlign: 'left', padding: '8px', color: '#999' }}>时间</th>
                                <th style={{ textAlign: 'left', padding: '8px', color: '#999' }}>内容</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sub.content.map((item, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid #f5f5f5' }}>
                                  <td style={{ padding: '8px', color: '#666', whiteSpace: 'nowrap' }}>
                                    {formatTime(item.start_time)} - {formatTime(item.end_time)}
                                  </td>
                                  <td style={{ padding: '8px', color: '#333' }}>
                                    {item.text}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="card" style={{ padding: '60px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '64px', marginBottom: '16px' }}>📝</div>
                  <h3 style={{ fontSize: '18px', marginBottom: '8px', color: '#333' }}>暂无字幕</h3>
                  <p style={{ fontSize: '14px', color: '#999', marginBottom: '16px' }}>
                    点击上方按钮为视频自动生成字幕
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'knowledge' && currentVideo && (
            <div>
              <h1 style={{ fontSize: '24px', marginBottom: '24px', color: '#333' }}>知识点标记</h1>
              
              <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', marginBottom: '16px', color: '#333' }}>添加知识点</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#666' }}>
                      知识点名称 <span style={{ color: '#dc3545' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={newKnowledgePoint.title}
                      onChange={(e) => setNewKnowledgePoint(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="例如：核心概念讲解"
                      style={{ 
                        width: '100%', 
                        padding: '8px 12px', 
                        border: '1px solid #ddd', 
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#666' }}>
                      时间范围 (秒)
                    </label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="number"
                        value={newKnowledgePoint.start_time_sec}
                        onChange={(e) => setNewKnowledgePoint(prev => ({ ...prev, start_time_sec: e.target.value }))}
                        placeholder="开始"
                        style={{ 
                          width: '80px', 
                          padding: '8px 12px', 
                          border: '1px solid #ddd', 
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      />
                      <span style={{ color: '#999' }}>-</span>
                      <input
                        type="number"
                        value={newKnowledgePoint.end_time_sec}
                        onChange={(e) => setNewKnowledgePoint(prev => ({ ...prev, end_time_sec: e.target.value }))}
                        placeholder="结束"
                        style={{ 
                          width: '80px', 
                          padding: '8px 12px', 
                          border: '1px solid #ddd', 
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#666' }}>
                      描述
                    </label>
                    <textarea
                      value={newKnowledgePoint.description}
                      onChange={(e) => setNewKnowledgePoint(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="简要描述这个知识点的内容"
                      rows={2}
                      style={{ 
                        width: '100%', 
                        padding: '8px 12px', 
                        border: '1px solid #ddd', 
                        borderRadius: '6px',
                        fontSize: '14px',
                        resize: 'vertical'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#666' }}>
                      标签
                    </label>
                    <input
                      type="text"
                      value={newKnowledgePoint.tags}
                      onChange={(e) => setNewKnowledgePoint(prev => ({ ...prev, tags: e.target.value }))}
                      placeholder="多个标签用逗号分隔"
                      style={{ 
                        width: '100%', 
                        padding: '8px 12px', 
                        border: '1px solid #ddd', 
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button 
                      onClick={handleAddKnowledgePoint}
                      className="btn btn-primary"
                      style={{ marginBottom: '0' }}
                    >
                      添加知识点
                    </button>
                  </div>
                </div>
              </div>

              {knowledgePoints.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {knowledgePoints.map((point, index) => (
                    <div key={point.id} className="card" style={{ padding: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <span style={{ 
                              display: 'inline-block', 
                              width: '24px', 
                              height: '24px', 
                              borderRadius: '50%', 
                              backgroundColor: '#007bff',
                              color: 'white',
                              fontSize: '14px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              {index + 1}
                            </span>
                            <h4 style={{ fontSize: '16px', margin: 0, color: '#333' }}>
                              {point.title}
                            </h4>
                            {(point.start_time_sec > 0 || point.end_time_sec > 0) && (
                              <span style={{ 
                                fontSize: '12px', 
                                color: '#666',
                                backgroundColor: '#f5f5f5',
                                padding: '2px 8px',
                                borderRadius: '4px'
                              }}>
                                {formatTime(point.start_time_sec)} - {formatTime(point.end_time_sec)}
                              </span>
                            )}
                          </div>
                          {point.description && (
                            <p style={{ fontSize: '14px', color: '#666', margin: '8px 0 0 36px' }}>
                              {point.description}
                            </p>
                          )}
                          {point.tags && point.tags.length > 0 && (
                            <div style={{ display: 'flex', gap: '8px', marginTop: '12px', marginLeft: '36px' }}>
                              {point.tags.map((tag, idx) => (
                                <span 
                                  key={idx}
                                  style={{ 
                                    fontSize: '12px', 
                                    color: '#007bff',
                                    backgroundColor: '#e3f2fd',
                                    padding: '2px 8px',
                                    borderRadius: '4px'
                                  }}
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <button 
                          onClick={() => handleDeleteKnowledgePoint(point.id)}
                          style={{ 
                            background: 'none', 
                            border: 'none', 
                            color: '#dc3545', 
                            fontSize: '14px', 
                            cursor: 'pointer',
                            padding: '4px 8px'
                          }}
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="card" style={{ padding: '60px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '64px', marginBottom: '16px' }}>💡</div>
                  <h3 style={{ fontSize: '18px', marginBottom: '8px', color: '#333' }}>暂无知识点</h3>
                  <p style={{ fontSize: '14px', color: '#999' }}>
                    为视频中的重要内容添加知识点标记，帮助学习者快速定位关键内容
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreatorStudio;
