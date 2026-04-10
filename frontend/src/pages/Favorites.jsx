/**
 * Favorites - 收藏夹页
 * 收藏夹列表（横向切换）
 * 收藏的视频和知识卡片
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import VideoCard from '../components/VideoCard';
import { getFavorites, createFolder, removeFavorite } from '../services/api';

function Favorites() {
  const navigate = useNavigate();
  const [folders, setFolders] = useState([]);
  const [items, setItems] = useState([]);
  const [activeFolder, setActiveFolder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // 加载收藏数据
  useEffect(() => {
    fetchFavorites();
  }, [activeFolder]);

  const fetchFavorites = async () => {
    setLoading(true);
    try {
      const res = await getFavorites(activeFolder);
      if (res.success && res.data) {
        setFolders(res.data.folders || []);
        setItems(res.data.items || []);
      }
    } catch (err) {
      console.error('获取收藏列表失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 创建收藏夹
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      const res = await createFolder(newFolderName.trim());
      if (res.success) {
        setNewFolderName('');
        setShowCreateFolder(false);
        fetchFavorites();
      }
    } catch (err) {
      console.error('创建收藏夹失败:', err);
    }
  };

  // 取消收藏
  const handleRemoveFavorite = async (favoriteId) => {
    try {
      await removeFavorite(favoriteId);
      fetchFavorites();
    } catch (err) {
      console.error('取消收藏失败:', err);
    }
  };

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1>我的收藏</h1>
        <button
          className="btn btn-sm btn-outline"
          onClick={() => setShowCreateFolder(!showCreateFolder)}
        >
          {showCreateFolder ? '取消' : '+ 新建收藏夹'}
        </button>
      </div>

      {/* 创建收藏夹 */}
      {showCreateFolder && (
        <div style={{
          display: 'flex',
          gap: 8,
          padding: '12px 0',
          background: '#F8FAFC',
          borderRadius: 8,
          marginBottom: 12
        }}>
          <input
            type="text"
            className="input"
            placeholder="收藏夹名称"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            style={{ flex: 1, padding: '8px 12px' }}
          />
          <button className="btn btn-primary btn-sm" onClick={handleCreateFolder}>
            创建
          </button>
        </div>
      )}

      {/* 收藏夹标签 */}
      {folders.length > 0 && (
        <div className="folder-tabs">
          <div
            className={`folder-tab ${activeFolder === null ? 'active' : ''}`}
            onClick={() => setActiveFolder(null)}
          >
            全部
          </div>
          {folders.map((folder) => (
            <div
              key={folder.id}
              className={`folder-tab ${activeFolder === folder.id ? 'active' : ''}`}
              onClick={() => setActiveFolder(folder.id)}
            >
              {folder.name}
            </div>
          ))}
        </div>
      )}

      {/* 收藏内容 */}
      {loading ? (
        <div className="loading">
          <div className="loading-spinner"></div>
          <span>加载中...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📑</div>
          <div className="empty-state-text">暂无收藏内容</div>
          <button
            className="btn btn-primary btn-sm"
            style={{ marginTop: 16 }}
            onClick={() => navigate('/')}
          >
            去发现好内容
          </button>
        </div>
      ) : (
        <div style={{ paddingTop: 12 }}>
          {items.map((item) => (
            <div
              key={item.favorite_id}
              style={{
                display: 'flex',
                gap: 12,
                padding: 12,
                background: '#fff',
                borderRadius: 12,
                marginBottom: 8,
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                cursor: 'pointer'
              }}
              onClick={() => navigate(`/video/${item.video_id}`)}
            >
              <img
                src={item.cover_url || `https://via.placeholder.com/160x90/00B4D8/FFFFFF?text=视频`}
                alt={item.title}
                style={{
                  width: 140,
                  height: 80,
                  objectFit: 'cover',
                  borderRadius: 8,
                  flexShrink: 0
                }}
                loading="lazy"
              />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#1B2838',
                    lineHeight: 1.4,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {item.title}
                  </h3>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <span style={{ fontSize: 11, color: '#94A3B8' }}>
                    {item.category_name || '未分类'}
                  </span>
                  <button
                    className="btn btn-sm"
                    style={{
                      padding: '4px 10px',
                      fontSize: 11,
                      color: '#EF4444',
                      border: '1px solid #FCA5A5',
                      background: '#FEF2F2',
                      borderRadius: 12
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFavorite(item.favorite_id);
                    }}
                  >
                    取消收藏
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Favorites;
