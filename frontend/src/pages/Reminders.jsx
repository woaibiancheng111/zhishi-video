/**
 * Reminders - 复习提醒页
 * 展示用户的复习提醒，基于艾宾浩斯遗忘曲线，支持标记完成/取消
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getReminders,
  getTodayReminders,
  completeReminder,
  cancelReminder,
  deleteReminder,
  getReminderIntervals
} from '../services/api';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((date - now) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return '今天';
  } else if (diffDays === 1) {
    return '明天';
  } else if (diffDays > 0 && diffDays <= 7) {
    return `${diffDays}天后`;
  }
  return date.toLocaleDateString('zh-CN', {
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

const STATUS_LABELS = {
  pending: { text: '待复习', color: '#7ddaff' },
  completed: { text: '已完成', color: '#34d399' },
  missed: { text: '已过期', color: '#fb7185' },
  cancelled: { text: '已取消', color: '#64748b' }
};

const EBBINGHAUS_LEVELS = {
  1: { label: '第1次复习', interval: '1天' },
  2: { label: '第2次复习', interval: '2天' },
  3: { label: '第3次复习', interval: '4天' },
  4: { label: '第4次复习', interval: '7天' },
  5: { label: '第5次复习', interval: '15天' }
};

function Reminders() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('today');
  const [reminders, setReminders] = useState([]);
  const [todayReminders, setTodayReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [intervals, setIntervals] = useState(null);

  useEffect(() => {
    fetchIntervals();
  }, []);

  useEffect(() => {
    if (activeTab === 'today') {
      fetchTodayReminders();
    } else {
      fetchReminders(1);
    }
  }, [activeTab]);

  const fetchIntervals = async () => {
    try {
      const res = await getReminderIntervals();
      if (res.success && res.data) {
        setIntervals(res.data);
      }
    } catch (err) {
      console.error('获取复习间隔配置失败:', err);
    }
  };

  const fetchTodayReminders = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getTodayReminders();
      if (res.success && res.data) {
        setTodayReminders(res.data || []);
      }
    } catch (err) {
      console.error('获取今日提醒失败:', err);
      setError('获取今日提醒失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const fetchReminders = async (pageNum) => {
    if (pageNum === 1) {
      setLoading(true);
      setError('');
    } else {
      setLoadingMore(true);
    }

    try {
      const params = { page: pageNum, limit: 20 };
      if (activeTab === 'pending') {
        params.status = 'pending';
      } else if (activeTab === 'completed') {
        params.status = 'completed';
      }
      
      const res = await getReminders(params);
      if (res.success && res.data) {
        if (pageNum === 1) {
          setReminders(res.data.list || []);
        } else {
          setReminders((prev) => [...prev, ...(res.data.list || [])]);
        }
        setTotal(res.data.pagination?.total || 0);
        setHasMore(pageNum < (res.data.pagination?.total_pages || 1));
      }
    } catch (err) {
      console.error('获取提醒列表失败:', err);
      if (pageNum === 1) {
        setError('获取提醒列表失败，请稍后重试');
        setReminders([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleComplete = async (reminderId) => {
    try {
      await completeReminder(reminderId);
      if (activeTab === 'today') {
        setTodayReminders((prev) =>
          prev.map((r) => (r.id === reminderId ? { ...r, status: 'completed' } : r))
        );
      } else {
        setReminders((prev) =>
          prev.map((r) => (r.id === reminderId ? { ...r, status: 'completed' } : r))
        );
      }
    } catch (err) {
      console.error('标记完成失败:', err);
      alert('操作失败，请稍后重试');
    }
  };

  const handleCancel = async (reminderId) => {
    try {
      await cancelReminder(reminderId);
      if (activeTab === 'today') {
        setTodayReminders((prev) =>
          prev.map((r) => (r.id === reminderId ? { ...r, status: 'cancelled' } : r))
        );
      } else {
        setReminders((prev) =>
          prev.map((r) => (r.id === reminderId ? { ...r, status: 'cancelled' } : r))
        );
      }
    } catch (err) {
      console.error('取消提醒失败:', err);
      alert('操作失败，请稍后重试');
    }
  };

  const handleDelete = async (reminderId) => {
    if (!confirm('确定要删除这个提醒吗？')) return;
    try {
      await deleteReminder(reminderId);
      if (activeTab === 'today') {
        setTodayReminders((prev) => prev.filter((r) => r.id !== reminderId));
      } else {
        setReminders((prev) => prev.filter((r) => r.id !== reminderId));
        setTotal((t) => Math.max(t - 1, 0));
      }
    } catch (err) {
      console.error('删除提醒失败:', err);
      alert('操作失败，请稍后重试');
    }
  };

  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchReminders(nextPage);
  };

  const currentReminders = activeTab === 'today' ? todayReminders : reminders;

  const renderReminderItem = (reminder) => {
    const status = STATUS_LABELS[reminder.status] || STATUS_LABELS.pending;
    const ebbinghausInfo = reminder.ebbinghaus_level
      ? EBBINGHAUS_LEVELS[reminder.ebbinghaus_level]
      : null;

    return (
      <div
        key={reminder.id}
        className="card"
        style={{
          padding: '16px',
          marginBottom: '12px',
          borderLeft: `3px solid ${status.color}`,
          opacity: reminder.status === 'completed' || reminder.status === 'cancelled' ? 0.6 : 1
        }}
      >
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          {reminder.video_cover_url && (
            <div
              style={{ flexShrink: 0, cursor: 'pointer' }}
              onClick={() =>
                navigate(
                  `/video/${reminder.video_id}${reminder.knowledge_point_start_sec ? `?t=${reminder.knowledge_point_start_sec}` : ''}`
                )
              }
            >
              <img
                src={
                  reminder.video_cover_url ||
                  `https://picsum.photos/seed/${reminder.video_id}/120/68`
                }
                alt={reminder.video_title}
                style={{
                  width: '120px',
                  height: '68px',
                  objectFit: 'cover',
                  borderRadius: '8px'
                }}
              />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: `${status.color}20`,
                      color: status.color
                    }}
                  >
                    {status.text}
                  </span>
                  {ebbinghausInfo && (
                    <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                      🧠 {ebbinghausInfo.label}
                    </span>
                  )}
                </div>
                <h4
                  style={{
                    fontSize: '14px',
                    fontWeight: '700',
                    color: 'var(--text-primary)',
                    marginBottom: '4px',
                    cursor: 'pointer'
                  }}
                  onClick={() =>
                    navigate(
                      `/video/${reminder.video_id}${reminder.knowledge_point_start_sec ? `?t=${reminder.knowledge_point_start_sec}` : ''}`
                    )
                  }
                >
                  {reminder.title || reminder.video_title || '复习提醒'}
                </h4>
                {reminder.reminder_note && (
                  <p
                    style={{
                      fontSize: '13px',
                      color: 'var(--text-secondary)',
                      margin: 0,
                      marginBottom: '6px',
                      lineHeight: '1.5'
                    }}
                  >
                    {reminder.reminder_note}
                  </p>
                )}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                    ⏰ {formatDate(reminder.reminder_time)}
                  </span>
                  {reminder.knowledge_point_start_sec !== undefined && (
                    <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                      ⏱ {formatTimestamp(reminder.knowledge_point_start_sec)} - {formatTimestamp(reminder.knowledge_point_end_sec || reminder.knowledge_point_start_sec)}
                    </span>
                  )}
                  {reminder.video_title && reminder.video_title !== reminder.title && (
                    <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                      📹 {reminder.video_title}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {reminder.status === 'pending' && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() =>
                    navigate(
                      `/video/${reminder.video_id}${reminder.knowledge_point_start_sec ? `?t=${reminder.knowledge_point_start_sec}` : ''}`
                    )
                  }
                >
                  开始复习
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => handleComplete(reminder.id)}
                >
                  标记已完成
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                  onClick={() => handleCancel(reminder.id)}
                >
                  取消
                </button>
              </div>
            )}

            {reminder.status === 'completed' && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() =>
                    navigate(
                      `/video/${reminder.video_id}${reminder.knowledge_point_start_sec ? `?t=${reminder.knowledge_point_start_sec}` : ''}`
                    )
                  }
                >
                  再复习一遍
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                  onClick={() => handleDelete(reminder.id)}
                >
                  删除
                </button>
              </div>
            )}

            {(reminder.status === 'cancelled' || reminder.status === 'missed') && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button
                  className="btn btn-outline btn-sm"
                  style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                  onClick={() => handleDelete(reminder.id)}
                >
                  删除
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const stats = {
    today: {
      total: todayReminders.length,
      pending: todayReminders.filter((r) => r.status === 'pending').length,
      completed: todayReminders.filter((r) => r.status === 'completed').length
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-main">
          <div className="page-kicker">Review system</div>
          <h1>复习提醒</h1>
          <p>基于艾宾浩斯遗忘曲线，智能提醒你复习知识点，让学习更高效。</p>
        </div>
      </div>

      {activeTab === 'today' && (
        <div
          className="card"
          style={{
            padding: '16px',
            marginBottom: '16px',
            background: 'linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 100%)'
          }}
        >
          <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#fff', marginBottom: '4px' }}>
                {stats.today.total}
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>今日提醒总数</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#fb7185', marginBottom: '4px' }}>
                {stats.today.pending}
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>待复习</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#34d399', marginBottom: '4px' }}>
                {stats.today.completed}
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>已完成</div>
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '16px',
          padding: '4px',
          background: 'var(--panel-gradient)',
          borderRadius: '12px'
        }}
      >
        {[
          { key: 'today', label: '今日', icon: '☀️' },
          { key: 'pending', label: '待复习', icon: '⏳' },
          { key: 'completed', label: '已完成', icon: '✅' },
          { key: 'all', label: '全部', icon: '📋' }
        ].map((tab) => (
          <button
            key={tab.key}
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === tab.key ? 'var(--primary)' : 'transparent',
              color: activeTab === tab.key ? '#000' : 'var(--text-secondary)',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onClick={() => setActiveTab(tab.key)}
          >
            <span style={{ marginRight: '4px' }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {intervals && (
        <div
          className="card"
          style={{ padding: '16px', marginBottom: '16px', background: 'var(--panel-gradient)' }}
        >
          <div style={{ marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-light)' }}>
              🧠 艾宾浩斯遗忘曲线复习间隔
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {intervals.map((item, index) => (
              <span
                key={index}
                style={{
                  fontSize: '11px',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  background: 'rgba(125,218,255,0.1)',
                  color: 'var(--primary)',
                  border: '1px solid rgba(125,218,255,0.2)'
                }}
              >
                第{index + 1}次: {item.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {loading && currentReminders.length === 0 ? (
        <div className="loading">
          <div className="loading-spinner"></div>
          <span>加载中...</span>
        </div>
      ) : error && currentReminders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <div className="empty-state-text">{error}</div>
          <button
            className="btn btn-outline btn-sm section-action"
            onClick={() => {
              if (activeTab === 'today') {
                fetchTodayReminders();
              } else {
                setPage(1);
                fetchReminders(1);
              }
            }}
          >
            重试
          </button>
        </div>
      ) : currentReminders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔔</div>
          <div className="empty-state-text">
            {activeTab === 'today'
              ? '今日暂无复习提醒'
              : activeTab === 'pending'
              ? '暂无待复习的提醒'
              : activeTab === 'completed'
              ? '暂无已完成的复习记录'
              : '暂无复习提醒'}
          </div>
          <div style={{ fontSize: 13, color: '#94A3B8', marginTop: 8 }}>
            {activeTab === 'today' || activeTab === 'pending'
              ? '观看视频时标记知识点并设置复习提醒'
              : '快去学习新的内容吧'}
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
          {activeTab !== 'today' && (
            <div className="page-summary-bar">
              <span>
                共 <strong>{total}</strong> 条
                {activeTab === 'pending' && ' 待复习'}
                {activeTab === 'completed' && ' 已完成'}
                提醒
              </span>
              <span>按时间排序</span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {currentReminders.map(renderReminderItem)}
          </div>

          {activeTab !== 'today' && hasMore && (
            <button
              className="load-more-btn"
              onClick={handleLoadMore}
              disabled={loadingMore}
              style={{ width: '100%', marginTop: 12 }}
            >
              {loadingMore ? '加载中...' : '加载更多'}
            </button>
          )}

          {activeTab !== 'today' && !hasMore && currentReminders.length > 0 && (
            <div className="load-more">已经到底了</div>
          )}
        </>
      )}
    </div>
  );
}

export default Reminders;
