import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getReminders,
  getReviewSchedules,
  getTodayReviews,
  createReminder,
  updateReminder,
  deleteReminder,
  createReviewSchedule,
  completeReview,
  cancelReviewSchedule
} from '../services/api';

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatTime(seconds) {
  if (!seconds) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function Reminders() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('today');
  const [todayReviews, setTodayReviews] = useState({ reminders: [], schedules: [], total: 0 });
  const [reminders, setReminders] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newReminder, setNewReminder] = useState({
    video_id: '',
    reminder_time: '',
    reminder_type: 'video'
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    
    try {
      if (activeTab === 'today') {
        const res = await getTodayReviews();
        if (res.success) {
          setTodayReviews(res.data);
        }
      } else if (activeTab === 'reminders') {
        const res = await getReminders({ status: 'pending' });
        if (res.success) {
          setReminders(res.data.list || []);
        }
      } else if (activeTab === 'schedules') {
        const res = await getReviewSchedules({});
        if (res.success) {
          setSchedules(res.data.list || []);
        }
      }
    } catch (err) {
      console.error('获取复习数据失败:', err);
      setError('获取数据失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReminder = async () => {
    if (!newReminder.video_id || !newReminder.reminder_time) {
      alert('请填写完整的提醒信息');
      return;
    }

    try {
      const res = await createReminder({
        video_id: parseInt(newReminder.video_id),
        reminder_time: new Date(newReminder.reminder_time).toISOString(),
        reminder_type: newReminder.reminder_type
      });

      if (res.success) {
        setShowCreateModal(false);
        setNewReminder({ video_id: '', reminder_time: '', reminder_type: 'video' });
        fetchData();
        alert('提醒创建成功！');
      }
    } catch (err) {
      console.error('创建提醒失败:', err);
      alert('创建失败: ' + (err.message || '未知错误'));
    }
  };

  const handleCompleteSchedule = async (scheduleId) => {
    try {
      const quality = prompt('请评价这次复习的记忆质量 (0-5):', '4');
      if (quality === null) return;
      
      const q = parseInt(quality);
      if (isNaN(q) || q < 0 || q > 5) {
        alert('请输入 0-5 之间的数字');
        return;
      }

      const res = await completeReview(scheduleId, q);
      if (res.success) {
        alert('复习进度已更新！');
        fetchData();
      }
    } catch (err) {
      console.error('完成复习失败:', err);
      alert('操作失败: ' + (err.message || '未知错误'));
    }
  };

  const handleDeleteReminder = async (reminderId) => {
    if (!confirm('确定要删除这个提醒吗？')) return;
    
    try {
      await deleteReminder(reminderId);
      fetchData();
      alert('删除成功！');
    } catch (err) {
      console.error('删除提醒失败:', err);
      alert('删除失败');
    }
  };

  const handleCancelSchedule = async (scheduleId) => {
    if (!confirm('确定要取消这个复习计划吗？')) return;
    
    try {
      await cancelReviewSchedule(scheduleId);
      fetchData();
      alert('复习计划已取消！');
    } catch (err) {
      console.error('取消复习计划失败:', err);
      alert('操作失败');
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <span>加载中...</span>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-main">
          <div className="page-kicker">Review System</div>
          <h1>复习提醒</h1>
          <p>基于艾宾浩斯遗忘曲线，科学安排复习时间，让学习更高效。</p>
        </div>
      </div>

      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        marginBottom: '24px',
        padding: '8px',
        backgroundColor: '#f8f9fa',
        borderRadius: '12px'
      }}>
        {[
          { key: 'today', label: '今日待复习', count: todayReviews.total },
          { key: 'reminders', label: '我的提醒' },
          { key: 'schedules', label: '复习计划' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer',
              backgroundColor: activeTab === tab.key ? '#007bff' : 'transparent',
              color: activeTab === tab.key ? 'white' : '#666',
              fontWeight: activeTab === tab.key ? '600' : 'normal'
            }}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span style={{ 
                marginLeft: '6px',
                backgroundColor: activeTab === tab.key ? 'rgba(255,255,255,0.3)' : '#dc3545',
                color: 'white',
                padding: '2px 8px',
                borderRadius: '10px',
                fontSize: '12px'
              }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
        
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            marginLeft: 'auto',
            padding: '10px 20px',
            border: '1px solid #007bff',
            borderRadius: '8px',
            fontSize: '14px',
            cursor: 'pointer',
            backgroundColor: 'transparent',
            color: '#007bff'
          }}
        >
          + 新建提醒
        </button>
      </div>

      {error && (
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <div className="empty-state-text">{error}</div>
          <button
            className="btn btn-outline btn-sm section-action"
            onClick={fetchData}
          >
            重试
          </button>
        </div>
      )}

      {activeTab === 'today' && !error && (
        <div>
          {todayReviews.total === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🎉</div>
              <div className="empty-state-text">今日没有待复习内容</div>
              <div style={{ fontSize: '13px', color: '#94A3B8', marginTop: '8px' }}>
                太棒了！保持学习的热情
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {todayReviews.reminders?.map(reminder => (
                <div key={reminder.id} className="card" style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ 
                          fontSize: '12px', 
                          color: '#007bff', 
                          backgroundColor: '#e3f2fd',
                          padding: '2px 8px',
                          borderRadius: '4px'
                        }}>
                          ⏰ 复习提醒
                        </span>
                        <span style={{ fontSize: '12px', color: '#999' }}>
                          {formatDate(reminder.reminder_time)}
                        </span>
                      </div>
                      {reminder.video_title && (
                        <h4 style={{ 
                          fontSize: '16px', 
                          margin: '0 0 8px 0', 
                          color: '#333',
                          cursor: 'pointer'
                        }} onClick={() => navigate(`/video/${reminder.video_id}`)}>
                          📹 {reminder.video_title}
                        </h4>
                      )}
                      {reminder.note_content && (
                        <p style={{ fontSize: '14px', color: '#666', margin: '0' }}>
                          📝 {reminder.note_content.slice(0, 100)}...
                        </p>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => navigate(`/video/${reminder.video_id}`)}
                        className="btn btn-primary"
                        style={{ fontSize: '13px', padding: '6px 16px' }}
                      >
                        去复习
                      </button>
                      <button
                        onClick={() => handleDeleteReminder(reminder.id)}
                        style={{ 
                          background: 'none', 
                          border: 'none', 
                          color: '#dc3545', 
                          fontSize: '13px', 
                          cursor: 'pointer',
                          padding: '6px 8px'
                        }}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {todayReviews.schedules?.map(schedule => (
                <div key={schedule.id} className="card" style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ 
                          fontSize: '12px', 
                          color: '#28a745', 
                          backgroundColor: '#e8f5e9',
                          padding: '2px 8px',
                          borderRadius: '4px'
                        }}>
                          🔄 艾宾浩斯复习计划
                        </span>
                        <span style={{ fontSize: '12px', color: '#999' }}>
                          下次复习: {formatDate(schedule.next_review_at)}
                        </span>
                      </div>
                      {schedule.video_title && (
                        <h4 style={{ 
                          fontSize: '16px', 
                          margin: '0 0 8px 0', 
                          color: '#333',
                          cursor: 'pointer'
                        }} onClick={() => navigate(`/video/${schedule.target_id}`)}>
                          📹 {schedule.video_title}
                        </h4>
                      )}
                      <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#666' }}>
                        <span>复习次数: {schedule.repetitions} 次</span>
                        <span>间隔天数: {schedule.interval_days} 天</span>
                        <span>难度系数: {schedule.ease_factor}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleCompleteSchedule(schedule.id)}
                        className="btn btn-primary"
                        style={{ fontSize: '13px', padding: '6px 16px' }}
                      >
                        完成复习
                      </button>
                      <button
                        onClick={() => handleCancelSchedule(schedule.id)}
                        style={{ 
                          background: 'none', 
                          border: 'none', 
                          color: '#dc3545', 
                          fontSize: '13px', 
                          cursor: 'pointer',
                          padding: '6px 8px'
                        }}
                      >
                        取消
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'reminders' && !error && (
        <div>
          {reminders.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">⏰</div>
              <div className="empty-state-text">暂无复习提醒</div>
              <div style={{ fontSize: '13px', color: '#94A3B8', marginTop: '8px' }}>
                点击上方按钮创建新的复习提醒
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {reminders.map(reminder => (
                <div key={reminder.id} className="card" style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ 
                          display: 'inline-block',
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: reminder.is_sent ? '#28a745' : 
                            (new Date(reminder.reminder_time) < new Date() ? '#dc3545' : '#ffc107')
                        }} />
                        <span style={{ fontSize: '14px', color: '#333' }}>
                          {formatDate(reminder.reminder_time)}
                        </span>
                        <span style={{ fontSize: '12px', color: '#999' }}>
                          {reminder.reminder_type === 'video' ? '视频复习' : 
                           reminder.reminder_type === 'note' ? '笔记复习' : '知识点复习'}
                        </span>
                      </div>
                      {reminder.video_title && (
                        <h4 style={{ 
                          fontSize: '16px', 
                          margin: '0 0 8px 0', 
                          color: '#333',
                          cursor: 'pointer'
                        }} onClick={() => navigate(`/video/${reminder.video_id}`)}>
                          {reminder.video_title}
                        </h4>
                      )}
                      <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#666' }}>
                        <span>状态: {reminder.is_completed ? '已完成' : reminder.is_sent ? '已提醒' : '待提醒'}</span>
                        {reminder.repeat_count > 0 && <span>重复: {reminder.repeat_count} 次</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {!reminder.is_completed && (
                        <button
                          onClick={() => navigate(`/video/${reminder.video_id}`)}
                          className="btn btn-outline"
                          style={{ fontSize: '13px', padding: '6px 16px' }}
                        >
                          复习
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteReminder(reminder.id)}
                        style={{ 
                          background: 'none', 
                          border: 'none', 
                          color: '#dc3545', 
                          fontSize: '13px', 
                          cursor: 'pointer',
                          padding: '6px 8px'
                        }}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'schedules' && !error && (
        <div>
          {schedules.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📅</div>
              <div className="empty-state-text">暂无复习计划</div>
              <div style={{ fontSize: '13px', color: '#94A3B8', marginTop: '8px' }}>
                为视频创建艾宾浩斯复习计划，科学记忆知识
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {schedules.map(schedule => (
                <div key={schedule.id} className="card" style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ 
                          fontSize: '12px', 
                          color: '#28a745', 
                          backgroundColor: '#e8f5e9',
                          padding: '2px 8px',
                          borderRadius: '4px'
                        }}>
                          🔄 艾宾浩斯
                        </span>
                        <span style={{ fontSize: '12px', color: '#999' }}>
                          下次复习: {formatDate(schedule.next_review_at)}
                        </span>
                      </div>
                      {schedule.video_title && (
                        <h4 style={{ 
                          fontSize: '16px', 
                          margin: '0 0 8px 0', 
                          color: '#333',
                          cursor: 'pointer'
                        }} onClick={() => navigate(`/video/${schedule.target_id}`)}>
                          {schedule.video_title}
                        </h4>
                      )}
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                        gap: '12px',
                        marginTop: '12px'
                      }}>
                        <div style={{ 
                          padding: '8px 12px', 
                          backgroundColor: '#f8f9fa',
                          borderRadius: '6px'
                        }}>
                          <div style={{ fontSize: '12px', color: '#999' }}>复习次数</div>
                          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>
                            {schedule.repetitions} 次
                          </div>
                        </div>
                        <div style={{ 
                          padding: '8px 12px', 
                          backgroundColor: '#f8f9fa',
                          borderRadius: '6px'
                        }}>
                          <div style={{ fontSize: '12px', color: '#999' }}>间隔天数</div>
                          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>
                            {schedule.interval_days} 天
                          </div>
                        </div>
                        <div style={{ 
                          padding: '8px 12px', 
                          backgroundColor: '#f8f9fa',
                          borderRadius: '6px'
                        }}>
                          <div style={{ fontSize: '12px', color: '#999' }}>难度系数</div>
                          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>
                            {schedule.ease_factor}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <button
                        onClick={() => handleCompleteSchedule(schedule.id)}
                        className="btn btn-primary"
                        style={{ fontSize: '13px', padding: '6px 16px' }}
                      >
                        完成复习
                      </button>
                      <button
                        onClick={() => handleCancelSchedule(schedule.id)}
                        style={{ 
                          background: 'none', 
                          border: 'none', 
                          color: '#dc3545', 
                          fontSize: '13px', 
                          cursor: 'pointer',
                          padding: '6px 8px'
                        }}
                      >
                        取消计划
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowCreateModal(false)}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            width: '100%',
            maxWidth: '400px',
            maxHeight: '90vh',
            overflow: 'auto'
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '18px', marginBottom: '20px', color: '#333' }}>新建复习提醒</h3>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#333' }}>
                视频ID <span style={{ color: '#dc3545' }}>*</span>
              </label>
              <input
                type="number"
                value={newReminder.video_id}
                onChange={(e) => setNewReminder(prev => ({ ...prev, video_id: e.target.value }))}
                placeholder="请输入视频ID"
                style={{ 
                  width: '100%', 
                  padding: '10px 12px', 
                  border: '1px solid #ddd', 
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#333' }}>
                提醒时间 <span style={{ color: '#dc3545' }}>*</span>
              </label>
              <input
                type="datetime-local"
                value={newReminder.reminder_time}
                onChange={(e) => setNewReminder(prev => ({ ...prev, reminder_time: e.target.value }))}
                style={{ 
                  width: '100%', 
                  padding: '10px 12px', 
                  border: '1px solid #ddd', 
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#333' }}>
                提醒类型
              </label>
              <select
                value={newReminder.reminder_type}
                onChange={(e) => setNewReminder(prev => ({ ...prev, reminder_type: e.target.value }))}
                style={{ 
                  width: '100%', 
                  padding: '10px 12px', 
                  border: '1px solid #ddd', 
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="video">视频复习</option>
                <option value="note">笔记复习</option>
                <option value="knowledge">知识点复习</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowCreateModal(false)}
                className="btn btn-outline"
                style={{ flex: 1 }}
              >
                取消
              </button>
              <button
                onClick={handleCreateReminder}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                创建提醒
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Reminders;
