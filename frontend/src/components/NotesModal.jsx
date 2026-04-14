/**
 * NotesModal - 学习笔记弹窗组件
 * 支持查看、新建、编辑、删除笔记
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNotes, createNote, updateNote, deleteNote } from '../services/api';
import { useAuth } from '../hooks/useAuth';

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
  const { isAuthenticated } = useAuth();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');

  const redirectToLogin = (message) => {
    sessionStorage.setItem('auth_prompt_message', message);
    onClose?.();
    navigate('/login');
  };

  useEffect(() => {
    if (visible && videoId && isAuthenticated) {
      fetchNotes();
    }
  }, [visible, videoId, isAuthenticated]);

  const fetchNotes = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getNotes(videoId);
      if (res.success && res.data) {
        setNotes(res.data.list || []);
      }
    } catch (err) {
      console.error('获取笔记失败:', err);
      setError('获取笔记失败，请稍后重试');
      setNotes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!isAuthenticated) {
      redirectToLogin('登录后即可保存学习笔记');
      return;
    }
    if (!inputValue.trim()) return;

    setSubmitting(true);
    setFeedbackMessage('');
    try {
      const res = await createNote(videoId, inputValue.trim(), currentTimestamp);
      if (res.success && res.data) {
        setNotes((prev) => [res.data, ...prev]);
        setInputValue('');
        setFeedbackMessage('笔记已保存');
      }
    } catch (err) {
      console.error('创建笔记失败:', err);
      setFeedbackMessage(err?.message || '保存笔记失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (id) => {
    if (!isAuthenticated) {
      redirectToLogin('登录后即可编辑学习笔记');
      return;
    }
    if (!editValue.trim()) return;

    setFeedbackMessage('');
    try {
      const res = await updateNote(id, editValue.trim());
      if (res.success) {
        setNotes((prev) =>
          prev.map((n) => (n.id === id ? { ...n, content: editValue.trim() } : n))
        );
        setEditingId(null);
        setEditValue('');
        setFeedbackMessage('笔记已更新');
      }
    } catch (err) {
      console.error('更新笔记失败:', err);
      setFeedbackMessage(err?.message || '更新笔记失败，请稍后重试');
    }
  };

  const handleDelete = async (id) => {
    if (!isAuthenticated) {
      redirectToLogin('登录后即可删除学习笔记');
      return;
    }
    setFeedbackMessage('');
    try {
      const res = await deleteNote(id);
      if (res.success) {
        setNotes((prev) => prev.filter((n) => n.id !== id));
        setFeedbackMessage('笔记已删除');
      }
    } catch (err) {
      console.error('删除笔记失败:', err);
      setFeedbackMessage(err?.message || '删除笔记失败，请稍后重试');
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
          <h2>我的学习笔记</h2>
          <button className="knowledge-card-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-muted-copy">
          {isAuthenticated ? '在当前时间点记录想法，之后可以一键跳回对应片段继续复盘。' : '登录后即可保存、编辑和管理你的学习笔记。'}
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

        {feedbackMessage && (
          <div className="modal-muted-copy">{feedbackMessage}</div>
        )}

        {/* 笔记列表 */}
        {loading ? (
          <div className="loading inline-loading">
            <div className="loading-spinner"></div>
            <span>加载笔记...</span>
          </div>
        ) : error ? (
          <div className="empty-state">
            <div className="empty-state-icon">⚠️</div>
            <div className="empty-state-text">{error}</div>
            <button className="btn btn-outline btn-sm section-action" onClick={fetchNotes}>
              重试
            </button>
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
                    <div className="notes-modal-toolbar" style={{ marginTop: 10 }}>
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
