const express = require('express');
const config = require('../config');

const router = express.Router();

router.get('/cards/:videoId', async (req, res) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(`${config.aiServiceUrl}/api/v1/cards/${req.params.videoId}`, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        message: data?.detail || data?.message || '知识卡片服务暂时不可用'
      });
    }

    return res.json(data);
  } catch (error) {
    const message = error.name === 'AbortError'
      ? '知识卡片服务请求超时'
      : '知识卡片服务暂时不可用';

    return res.status(502).json({
      success: false,
      message
    });
  } finally {
    clearTimeout(timeout);
  }
});

module.exports = router;
