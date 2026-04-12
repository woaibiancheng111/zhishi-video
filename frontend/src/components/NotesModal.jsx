/**
 * NotesModal - 学习笔记弹窗组件
 * 支持查看、新建、编辑、删除笔记
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNotes, createNote, updateNote, deleteNote } from '../services/api';

function formatTimestamp(sec) {
  if (!sec) return '';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function NotesModal({ videoId, visible, onClose, currentTimestamp = 0 }) {
  const navigate = useNavigate();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    if (visible && videoId) {
      fetchNotes();
    }
  }, [visible, videoId]);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const res = await getNotes(videoId);
      if (res.success && res.data) {
        setNotes(res.data.list || []);
      }
    } catch (err) {
      console.error('获取笔记失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!inputValue.trim()) return;

    setSubmitting(true);
    try {
      const res = await createNote(videoId, inputValue.trim(), currentTimestamp);
      if (res.success && res.data) {
        setNotes((prev) => [res.data, ...prev]);
        setInputValue('');
      }
    } catch (err) {
      console.error('创建笔记失败:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (id) => {
    if (!editValue.trim()) return;

    try {
      const res = await updateNote(id, editValue.trim());
      if (res.success) {
        setNotes((prev) =>
          prev.map((n) => (n.id === id ? { ...n, content: editValue.trim() } : n))
        );
        setEditingId(null);
        setEditValue('');
      }
    } catch (err) {
      console.error('更新笔记失败:', err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteNote(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error('删除笔记失败:', err);
    }
  };

  const startEdit = (note) => {
    setEditingId(note.id);
    setEditValue(note.content);
  };

  if (!visible) return null;

  return (
    <div className="knowledge-card-overlay" onClick={onClose}>
      <div className="knowledge-card-modal notes-modal" onClick={(e) => e.stopPropagation()}>
        <div className="notes-modal-header">
          <h2>📝 我的学习笔记</h2>
          <button className="knowledge-card-close" onClick={onClose}>×</button>
        </div>

        {/* 新建笔记 */}
        <div className="notes-create-area">
          {currentTimestamp > 0 && (
            <div className="notes-timestamp-hint">
              📍 当前进度 {formatTimestamp(currentTimestamp)}
            </div>
          )}
          <textarea
            className="notes-textarea"
            placeholder="记录此刻的学习感悟..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            maxLength={2000}
            rows={3}
          />
          <div className="notes-create-footer">
            <span className="comment-char-count">{inputValue.length}/2000</span>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleCreate}
              disabled={!inputValue.trim() || submitting}
            >
              {submitting ? '保存中...' : '保存笔记'}
            </button>
          </div>
        </div>

        {/* 笔记列表 */}
        {loading ? (
          <div className="loading" style={{ padding: '20px 0' }}>
            <div className="loading-spinner" style={{ width: 20, height: 20, borderWidth: 2 }}></div>
            <span style={{ fontSize: 13 }}>加载笔记...</span>
          </div>
        ) : notes.length === 0 ? (
          <div className="notes-empty">还没有笔记，快来记录学习内容吧！</div>
        ) : (
          <div className="notes-list">
            {notes.map((note) => (
              <div key={note.id} className="note-item">
                <div className="note-item-meta">
                  {note.timestamp_sec > 0 && (
                    <button
                      type="button"
                      className="note-timestamp"
                      style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer' }}
                      onClick={() => navigate(`/video/${videoId}?t=${note.timestamp_sec}`)}
                    >
                      ⏱ {formatTimestamp(note.timestamp_sec)} · 回看片段
                    </button>
                  )}
                  <span className="note-date">{formatDate(note.updated_at)}</span>
                </div>

                {editingId === note.id ? (
                  <div className="note-edit-area">
                    <textarea
                      className="notes-textarea"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      maxLength={2000}
                      rows={3}
                      autoFocus
                    />
                    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleEdit(note.id)}
                      >
                        保存
                      </button>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => setEditingId(null)}
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="note-content">{note.content}</p>
                    <div className="note-actions">
                      <button className="note-action-btn" onClick={() => startEdit(note)}>
                        编辑
                      </button>
                      <button
                        className="note-action-btn note-action-delete"
                        onClick={() => handleDelete(note.id)}
                      >
                        删除
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default NotesModal;
