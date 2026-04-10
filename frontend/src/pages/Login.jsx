/**
 * Login - 登录页面
 * 手机号输入 + 验证码输入（验证码固定1234）
 * 登录后跳转首页，首次登录引导设置职业方向
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { updateCareerProfile } from '../services/api';

// 职业方向选项
const CAREER_OPTIONS = [
  { value: '产品经理', icon: '📋', label: '产品经理' },
  { value: '运营', icon: '📢', label: '运营' },
  { value: '技术/开发', icon: '💻', label: '技术/开发' },
  { value: '设计', icon: '🎨', label: '设计' },
  { value: '数据分析', icon: '📊', label: '数据分析' },
  { value: '项目管理', icon: '📁', label: '项目管理' },
  { value: '通用职场', icon: '💼', label: '通用职场' },
];

// 职业方向对应的技能标签
const CAREER_SKILLS = {
  '产品经理': ['需求分析', '产品设计', '用户调研', 'Axure', 'PRD'],
  '运营': ['用户运营', '内容运营', '活动运营', '数据分析', '增长黑客'],
  '技术/开发': ['React', 'Node.js', 'Python', '系统架构', '前端开发'],
  '设计': ['UI设计', 'UX设计', 'Figma', '视觉设计', '交互设计'],
  '数据分析': ['SQL', 'Python', 'Excel', '数据可视化', '统计学'],
  '项目管理': ['Scrum', '敏捷开发', '团队管理', '沟通协调', '风险管控'],
  '通用职场': ['沟通表达', '时间管理', '职业规划', '汇报技巧', '团队协作'],
};

function Login() {
  const navigate = useNavigate();
  const { login, updateUser } = useAuth();

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [step, setStep] = useState('login'); // login -> career
  const [selectedCareer, setSelectedCareer] = useState(null);

  // 发送验证码（模拟）
  const handleSendCode = () => {
    if (!phone || !/^1\d{10}$/.test(phone)) {
      setError('请输入正确的手机号');
      return;
    }
    setError('');
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // 登录
  const handleLogin = async () => {
    if (!phone || !/^1\d{10}$/.test(phone)) {
      setError('请输入正确的手机号');
      return;
    }
    if (!code) {
      setError('请输入验证码');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const userData = await login(phone, code);
      if (userData.is_new_user) {
        // 新用户，引导设置职业方向
        setStep('career');
      } else {
        // 老用户，直接进入首页
        navigate('/');
      }
    } catch (err) {
      setError(err.message || '登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 完成职业设置
  const handleCareerComplete = async () => {
    if (!selectedCareer) return;

    setLoading(true);
    try {
      const skills = CAREER_SKILLS[selectedCareer] || [];
      const res = await updateCareerProfile(selectedCareer, skills);
      if (res.success) {
        updateUser(res.data);
        navigate('/');
      }
    } catch (err) {
      console.error('更新职业方向失败:', err);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  // 跳过职业设置
  const handleSkip = () => {
    navigate('/');
  };

  return (
    <div className="login-page">
      {step === 'login' ? (
        <div className="login-card">
          <div className="login-logo">
            <h1>知视</h1>
            <p>面向职场人的知识短视频平台</p>
          </div>

          <div className="login-form">
            <div className="form-group">
              <label>手机号</label>
              <input
                type="tel"
                className="input"
                placeholder="请输入手机号"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={11}
              />
            </div>

            <div className="form-group">
              <label>验证码</label>
              <div className="code-input-wrapper">
                <input
                  type="text"
                  className="input"
                  placeholder="请输入验证码"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  maxLength={6}
                />
                <button
                  className="code-btn"
                  onClick={handleSendCode}
                  disabled={countdown > 0}
                >
                  {countdown > 0 ? `${countdown}s` : '获取验证码'}
                </button>
              </div>
            </div>

            <div className="login-error">{error}</div>

            <button
              className="btn btn-primary btn-block btn-lg"
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? '登录中...' : '登录'}
            </button>

            <p style={{ textAlign: 'center', fontSize: 12, color: '#94A3B8', marginTop: 12 }}>
              MVP测试阶段，验证码固定为 1234
            </p>
          </div>
        </div>
      ) : (
        <div className="login-card">
          <div className="login-logo">
            <h1>选择你的职业方向</h1>
            <p>我们将为你推荐更精准的学习内容</p>
          </div>

          <div className="career-select">
            <div className="career-options">
              {CAREER_OPTIONS.map((option) => (
                <div
                  key={option.value}
                  className={`career-option ${selectedCareer === option.value ? 'selected' : ''}`}
                  onClick={() => setSelectedCareer(option.value)}
                >
                  <div className="career-option-icon">{option.icon}</div>
                  <div className="career-option-name">{option.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 24 }}>
            <button
              className="btn btn-primary btn-block btn-lg"
              onClick={handleCareerComplete}
              disabled={!selectedCareer || loading}
            >
              {loading ? '设置中...' : '开始学习'}
            </button>
            <button
              className="btn btn-outline btn-block"
              onClick={handleSkip}
              disabled={loading}
            >
              稍后再说
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;
