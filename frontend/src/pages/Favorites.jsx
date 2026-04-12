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
      setFolders([]);
      setItems([]);
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
      alert(err?.message || '创建收藏夹失败，请稍后重试');
    }
  };

  // 取消收藏
  const handleRemoveFavorite = async (favoriteId) => {
    try {
      await removeFavorite(favoriteId);
      fetchFavorites();
    } catch (err) {
      console.error('取消收藏失败:', err);
      alert(err?.message || '取消收藏失败，请稍后重试');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-row">
          <h1>我的收藏</h1>
          <button
            className="btn btn-sm btn-outline"
            onClick={() => setShowCreateFolder(!showCreateFolder)}
          >
            {showCreateFolder ? '取消' : '+ 新建收藏夹'}
          </button>
        </div>
      </div>

      {/* 创建收藏夹 */}
      {showCreateFolder && (
        <div className="folder-create-bar">
          <input
            type="text"
            className="input folder-create-input"
            placeholder="收藏夹名称"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
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
            className="btn btn-primary btn-sm section-action"
            onClick={() => navigate('/')}
          >
            去发现好内容
          </button>
        </div>
      ) : (
        <div className="folder-content">
          {items.map((item) => (
            <div
              key={item.favorite_id}
              className="favorite-item"
              onClick={() => navigate(`/video/${item.video_id}`)}
            >
              <img
                src={item.cover_url || `https://via.placeholder.com/160x90/00B4D8/FFFFFF?text=视频`}
                alt={item.title}
                className="favorite-item-cover"
                loading="lazy"
              />
              <div className="favorite-item-body">
                <div>
                  <h3 className="favorite-item-title">{item.title}</h3>
                </div>
                <div className="favorite-item-footer">
                  <span className="favorite-item-meta">
                    {item.category_name || '未分类'}
                  </span>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/video/${item.video_id}`);
                      }}
                    >
                      去复习
                    </button>
                    <button
                      className="btn btn-sm btn-danger-soft"
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Favorites;
