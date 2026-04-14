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
  const [feedbackMessage, setFeedbackMessage] = useState('');
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
        setFeedbackMessage('收藏夹创建成功');
        fetchFavorites();
      }
    } catch (err) {
      console.error('创建收藏夹失败:', err);
      setFeedbackMessage(err?.message || '创建收藏夹失败，请稍后重试');
    }
  };

  // 取消收藏
  const handleRemoveFavorite = async (favoriteId) => {
    setFeedbackMessage('');
    try {
      const res = await removeFavorite(favoriteId);
      if (res.success) {
        setItems((prev) => prev.filter((item) => item.favorite_id !== favoriteId));
        setFeedbackMessage('已取消收藏');
      }
    } catch (err) {
      console.error('取消收藏失败:', err);
      setFeedbackMessage(err?.message || '取消收藏失败，请稍后重试');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-row">
          <div className="page-header-main">
            <div className="page-kicker">Review library</div>
            <h1>我的收藏</h1>
            <p>把值得反复回看的内容收进自己的复习资料夹，按主题持续消化。</p>
          </div>
          <div className="page-header-actions">
            <button
              className="btn btn-sm btn-outline"
              onClick={() => setShowCreateFolder(!showCreateFolder)}
            >
              {showCreateFolder ? '取消' : '+ 新建收藏夹'}
            </button>
          </div>
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

      <div className="page-summary-bar">
        <span>{activeFolder === null ? '全部收藏内容' : '当前收藏夹内容'}</span>
        <span>{items.length} 条可复习内容</span>
      </div>

      {feedbackMessage && (
        <div className="modal-muted-copy" style={{ marginBottom: 12 }}>{feedbackMessage}</div>
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
