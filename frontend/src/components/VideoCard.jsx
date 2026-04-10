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
      <div className="video-card-cover">
        <img
          className="video-card-image"
          src={video.cover_url || `https://via.placeholder.com/400x225/00B4D8/FFFFFF?text=${encodeURIComponent(video.title?.slice(0, 6) || '视频')}`}
          alt={video.title}
          loading="lazy"
        />
        {video.duration > 0 && (
          <span className="video-card-duration">
            {Math.floor(video.duration / 60)}:{String(video.duration % 60).padStart(2, '0')}
          </span>
        )}
      </div>
      <div className="video-card-body">
        <h3 className="video-card-title">
          {video.title}
        </h3>
        <div className="video-card-meta">
          <span className="video-card-category">{video.category_name || '未分类'}</span>
          <span className="video-card-stats">
            <span>{formatCount(video.play_count)}播放</span>
            <span>{formatCount(video.like_count)}赞</span>
          </span>
        </div>
      </div>
    </div>
  );
}

export default VideoCard;
