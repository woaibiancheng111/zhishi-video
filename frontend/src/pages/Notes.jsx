/**
 * Notes - 学习笔记页
 * 展示用户所有的学习笔记，按视频分组，支持多选导出
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getNotes,
  deleteNote,
  exportNotesAsMarkdown,
  exportNotesAsJson,
  exportNotesAsTxt,
  exportSingleNote
} from '../services/api';

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

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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

  const [selectedNotes, setSelectedNotes] = useState(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [exporting, setExporting] = useState(false);

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
      setSelectedNotes((prev) => {
        const next = new Set(prev);
        next.delete(noteId);
        return next;
      });
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

  const toggleSelect = (noteId) => {
    setSelectedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(noteId)) {
        next.delete(noteId);
      } else {
        next.add(noteId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedNotes.size === notes.length && notes.length > 0) {
      setSelectedNotes(new Set());
    } else {
      setSelectedNotes(new Set(notes.map((n) => n.id)));
    }
  };

  const handleExport = async (format) => {
    if (selectedNotes.size === 0) {
      alert('请先选择要导出的笔记');
      return;
    }

    setExporting(true);
    const noteIds = Array.from(selectedNotes);
    const timestamp = new Date().toISOString().slice(0, 10);

    try {
      let blob;
      let filename;

      switch (format) {
        case 'markdown':
          blob = await exportNotesAsMarkdown(noteIds);
          filename = `notes_${timestamp}.md`;
          break;
        case 'json':
          const jsonRes = await exportNotesAsJson(noteIds);
          blob = new Blob([JSON.stringify(jsonRes.data, null, 2)], {
            type: 'application/json'
          });
          filename = `notes_${timestamp}.json`;
          break;
        case 'txt':
          blob = await exportNotesAsTxt(noteIds);
          filename = `notes_${timestamp}.txt`;
          break;
        default:
          return;
      }

      downloadBlob(blob, filename);
      setSelectMode(false);
      setSelectedNotes(new Set());
    } catch (err) {
      console.error('导出失败:', err);
      alert('导出失败，请稍后重试');
    } finally {
      setExporting(false);
    }
  };

  const handleExportSingle = async (noteId, format) => {
    setExporting(true);
    const timestamp = new Date().toISOString().slice(0, 10);

    try {
      const blob = await exportSingleNote(noteId, format);
      let filename;
      if (format === 'markdown') {
        filename = `note_${noteId}_${timestamp}.md`;
      } else if (format === 'txt') {
        filename = `note_${noteId}_${timestamp}.txt`;
      } else {
        filename = `note_${noteId}_${timestamp}.json`;
      }
      downloadBlob(blob, filename);
    } catch (err) {
      console.error('导出失败:', err);
      alert('导出失败，请稍后重试');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-main">
          <div className="page-kicker">Knowledge notes</div>
          <h1>我的笔记</h1>
          <p>把视频里的关键片段、灵感和方法论沉淀成你自己的学习资产。</p>
        </div>
        {notes.length > 0 && (
          <div className="page-header-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {selectMode ? (
              <>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={toggleSelectAll}
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                  {selectedNotes.size === notes.length ? '取消全选' : '全选'}
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => handleExport('markdown')}
                  disabled={exporting || selectedNotes.size === 0}
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                  {exporting ? '导出中...' : `导出 Markdown (${selectedNotes.size})`}
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => handleExport('txt')}
                  disabled={exporting || selectedNotes.size === 0}
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                  导出 TXT
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => handleExport('json')}
                  disabled={exporting || selectedNotes.size === 0}
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                  导出 JSON
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    setSelectMode(false);
                    setSelectedNotes(new Set());
                  }}
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                  取消
                </button>
              </>
            ) : (
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setSelectMode(true)}
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                选择导出
              </button>
            )}
          </div>
        )}
      </div>

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
              <div
                key={note.id}
                className="notes-page-item"
                style={{
                  position: 'relative',
                  border: selectMode && selectedNotes.has(note.id)
                    ? '2px solid var(--primary)'
                    : undefined
                }}
              >
                {selectMode && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelect(note.id);
                    }}
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      zIndex: 10,
                      cursor: 'pointer',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: selectedNotes.has(note.id)
                        ? 'var(--primary)'
                        : 'rgba(255,255,255,0.1)',
                      border: selectedNotes.has(note.id)
                        ? 'none'
                        : '2px solid rgba(125,218,255,0.3)',
                      color: selectedNotes.has(note.id) ? '#000' : 'var(--text-light)',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}
                  >
                    {selectedNotes.has(note.id) ? '✓' : ''}
                  </div>
                )}

                <div
                  className="notes-page-video-row"
                  onClick={() => !selectMode && navigate(`/video/${note.video_id}`)}
                  style={{ cursor: selectMode ? 'default' : 'pointer' }}
                >
                  <img
                    className="notes-page-cover"
                    src={
                      note.cover_url ||
                      `https://picsum.photos/seed/${note.video_id || note.id}/120/68`
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
                    {!selectMode && (
                      <>
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                          <button
                            className="note-action-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              const menu = e.currentTarget.nextElementSibling;
                              menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
                            }}
                          >
                            导出
                          </button>
                          <div
                            style={{
                              display: 'none',
                              position: 'absolute',
                              top: '100%',
                              right: 0,
                              marginTop: '4px',
                              padding: '8px 0',
                              background: 'var(--panel-gradient)',
                              borderRadius: '12px',
                              border: '1px solid var(--border)',
                              zIndex: 100,
                              minWidth: '120px'
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              style={{
                                display: 'block',
                                width: '100%',
                                padding: '8px 16px',
                                background: 'none',
                                border: 'none',
                                textAlign: 'left',
                                color: 'var(--text-primary)',
                                cursor: 'pointer',
                                fontSize: '13px'
                              }}
                              onClick={() => handleExportSingle(note.id, 'markdown')}
                            >
                              导出为 Markdown
                            </button>
                            <button
                              style={{
                                display: 'block',
                                width: '100%',
                                padding: '8px 16px',
                                background: 'none',
                                border: 'none',
                                textAlign: 'left',
                                color: 'var(--text-primary)',
                                cursor: 'pointer',
                                fontSize: '13px'
                              }}
                              onClick={() => handleExportSingle(note.id, 'txt')}
                            >
                              导出为 TXT
                            </button>
                            <button
                              style={{
                                display: 'block',
                                width: '100%',
                                padding: '8px 16px',
                                background: 'none',
                                border: 'none',
                                textAlign: 'left',
                                color: 'var(--text-primary)',
                                cursor: 'pointer',
                                fontSize: '13px'
                              }}
                              onClick={() => handleExportSingle(note.id, 'json')}
                            >
                              导出为 JSON
                            </button>
                          </div>
                        </div>
                        <button
                          className="note-action-btn note-action-delete"
                          onClick={() => handleDelete(note.id)}
                        >
                          删除
                        </button>
                      </>
                    )}
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
