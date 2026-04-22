/**
 * Notes - 学习笔记页
 * 展示用户所有的学习笔记，按视频分组，支持导出
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNotes, deleteNote, exportNotes } from '../services/api';

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatTimestamp(sec) {
  if (!sec) return '';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function Notes() {
  const navigate = useNavigate();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [exportFormat, setExportFormat] = useState('markdown');

  useEffect(() => {
    fetchNotes(1);
  }, []);

  const fetchNotes = async (pageNum) => {
    if (pageNum === 1) {
      setLoading(true);
      setError('');
    } else {
      setLoadingMore(true);
    }

    try {
      const res = await getNotes(undefined, pageNum);
      if (res.success && res.data) {
        if (pageNum === 1) {
          setNotes(res.data.list || []);
        } else {
          setNotes((prev) => [...prev, ...(res.data.list || [])]);
        }
        setTotal(res.data.pagination?.total || 0);
        setHasMore(pageNum < (res.data.pagination?.total_pages || 1));
      }
    } catch (err) {
      console.error('获取笔记失败:', err);
      if (pageNum === 1) {
        setError('获取笔记失败，请稍后重试');
        setNotes([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleDelete = async (noteId) => {
    try {
      await deleteNote(noteId);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      setTotal((t) => Math.max(t - 1, 0));
    } catch (err) {
      console.error('删除笔记失败:', err);
    }
  };

  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchNotes(nextPage);
  };

  const handleExport = async () => {
    try {
      const res = await exportNotes(exportFormat);
      
      if (exportFormat === 'json') {
        const dataStr = JSON.stringify(res.data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        downloadFile(blob, `notes_${Date.now()}.json`);
      } else {
        downloadFile(res, `notes_${Date.now()}.${exportFormat === 'markdown' ? 'md' : 'txt'}`);
      }
      
      alert('导出成功！');
    } catch (err) {
      console.error('导出笔记失败:', err);
      alert('导出失败: ' + (err.message || '未知错误'));
    }
  };

  const downloadFile = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-main">
          <div className="page-kicker">Knowledge notes</div>
          <h1>我的笔记</h1>
          <p>把视频里的关键片段、灵感和方法论沉淀成你自己的学习资产。</p>
        </div>
      </div>

      {notes.length > 0 && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px', 
          marginBottom: '16px',
          padding: '12px 16px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px'
        }}>
          <span style={{ fontSize: '14px', color: '#666' }}>导出笔记:</span>
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value)}
            style={{
              padding: '6px 12px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: 'white'
            }}
          >
            <option value="markdown">Markdown (.md)</option>
            <option value="txt">纯文本 (.txt)</option>
            <option value="json">JSON (.json)</option>
          </select>
          <button
            onClick={handleExport}
            className="btn btn-primary"
            style={{ fontSize: '14px', padding: '6px 16px' }}
          >
            📥 导出
          </button>
        </div>
      )}

      {loading && notes.length === 0 ? (
        <div className="loading">
          <div className="loading-spinner"></div>
          <span>加载中...</span>
        </div>
      ) : error && notes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <div className="empty-state-text">{error}</div>
          <button
            className="btn btn-outline btn-sm section-action"
            onClick={() => {
              setPage(1);
              fetchNotes(1);
            }}
          >
            重试
          </button>
        </div>
      ) : notes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📝</div>
          <div className="empty-state-text">还没有笔记</div>
          <div style={{ fontSize: 13, color: '#94A3B8', marginTop: 8 }}>
            观看视频时点击「笔记」按钮开始记录
          </div>
          <button
            className="btn btn-primary btn-sm"
            style={{ marginTop: 16 }}
            onClick={() => navigate('/')}
          >
            去看视频
          </button>
        </div>
      ) : (
        <>
          <div className="page-summary-bar">
            <span>共 <strong>{total}</strong> 条笔记</span>
            <span>按视频与时间点整理</span>
          </div>

          <div className="notes-page-list">
            {notes.map((note) => (
              <div key={note.id} className="notes-page-item">
                <div
                  className="notes-page-video-row"
                  onClick={() => navigate(`/video/${note.video_id}`)}
                >
                  <img
                    className="notes-page-cover"
                    src={
                      note.cover_url ||
                      `https://via.placeholder.com/120x68/00B4D8/FFFFFF?text=${encodeURIComponent(
                        (note.video_title || '').slice(0, 4)
                      )}`
                    }
                    alt={note.video_title}
                    loading="lazy"
                  />
                  <span className="notes-page-video-title">{note.video_title}</span>
                </div>

                <div className="note-item">
                  <div className="note-item-meta">
                    {note.timestamp_sec > 0 && (
                      <span className="note-timestamp">
                        ⏱ {formatTimestamp(note.timestamp_sec)}
                      </span>
                    )}
                    <span className="note-date">{formatDate(note.updated_at)}</span>
                  </div>
                  <p className="note-content">{note.content}</p>
                  <div className="note-actions">
                    <button
                      className="note-action-btn"
                      onClick={() => navigate(`/video/${note.video_id}${note.timestamp_sec > 0 ? `?t=${note.timestamp_sec}` : ''}`)}
                    >
                      {note.timestamp_sec > 0 ? '回看该片段' : '回看视频'}
                    </button>
                    <button
                      className="note-action-btn note-action-delete"
                      onClick={() => handleDelete(note.id)}
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {hasMore && (
            <button
              className="load-more-btn"
              onClick={handleLoadMore}
              disabled={loadingMore}
              style={{ width: '100%', marginTop: 12 }}
            >
              {loadingMore ? '加载中...' : '加载更多'}
            </button>
          )}

          {!hasMore && notes.length > 0 && (
            <div className="load-more">已经到底了</div>
          )}
        </>
      )}
    </div>
  );
}

export default Notes;
