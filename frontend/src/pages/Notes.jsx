/**
 * Notes - 学习笔记页
 * 展示用户所有的学习笔记，按视频分组
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNotes, deleteNote } from '../services/api';

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
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchNotes(1);
  }, []);

  const fetchNotes = async (pageNum) => {
    setLoading(true);
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
    } finally {
      setLoading(false);
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
    const nextPage = page + 1;
    setPage(nextPage);
    fetchNotes(nextPage);
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>我的笔记</h1>
      </div>

      {loading && notes.length === 0 ? (
        <div className="loading">
          <div className="loading-spinner"></div>
          <span>加载中...</span>
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
          <div style={{ padding: '8px 0', fontSize: 13, color: '#94A3B8' }}>
            共 {total} 条笔记
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
                      onClick={() => navigate(`/video/${note.video_id}`)}
                    >
                      回看视频
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
              disabled={loading}
              style={{ width: '100%', marginTop: 12 }}
            >
              {loading ? '加载中...' : '加载更多'}
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
