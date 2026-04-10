/**
 * VideoCard - 视频卡片组件
 * 显示封面图、标题、创作者、标签、播放数、点赞数
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';

function formatCount(count) {
  if (!count) return '0';
  if (count >= 10000) return `${(count / 10000).toFixed(1)}万`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return String(count);
}

function VideoCard({ video }) {
  const navigate = useNavigate();

  if (!video) return null;

  const handleClick = () => {
    navigate(`/video/${video.id}`);
  };

  return (
    <div className="card video-card" onClick={handleClick}>
      <div className="video-card-cover" style={{ position: 'relative' }}>
        <img
          src={video.cover_url || `https://via.placeholder.com/400x225/00B4D8/FFFFFF?text=${encodeURIComponent(video.title?.slice(0, 6) || '视频')}`}
          alt={video.title}
          style={{
            width: '100%',
            height: 100,
            objectFit: 'cover',
            display: 'block'
          }}
          loading="lazy"
        />
        {video.duration > 0 && (
          <span style={{
            position: 'absolute',
            bottom: 6,
            right: 6,
            background: 'rgba(0,0,0,0.7)',
            color: '#fff',
            fontSize: 11,
            padding: '1px 6px',
            borderRadius: 3
          }}>
            {Math.floor(video.duration / 60)}:{String(video.duration % 60).padStart(2, '0')}
          </span>
        )}
      </div>
      <div style={{ padding: '8px 10px 10px' }}>
        <h3 style={{
          fontSize: 13,
          fontWeight: 600,
          color: '#1B2838',
          lineHeight: 1.4,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          marginBottom: 6
        }}>
          {video.title}
        </h3>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 11,
          color: '#94A3B8'
        }}>
          <span>{video.category_name || '未分类'}</span>
          <span>
            <span style={{ marginRight: 8 }}>{formatCount(video.play_count)}播放</span>
            <span>{formatCount(video.like_count)}赞</span>
          </span>
        </div>
      </div>
    </div>
  );
}

export default VideoCard;
