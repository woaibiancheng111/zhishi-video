/**
 * 文件上传中间件
 * 使用 multer 处理视频和图片上传
 */
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

/**
 * 确保上传目录存在
 */
function ensureUploadDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const subDirs = ['videos', 'covers', 'subtitles', 'temp'];
  subDirs.forEach(subDir => {
    const fullPath = path.join(dir, subDir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  });
}

/**
 * 生成文件名
 */
function generateFilename(originalname) {
  const ext = path.extname(originalname);
  return `${uuidv4()}${ext}`;
}

/**
 * 视频上传存储配置
 */
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = config.upload.uploadDir;
    ensureUploadDir(uploadDir);
    cb(null, path.join(uploadDir, 'videos'));
  },
  filename: (req, file, cb) => {
    cb(null, generateFilename(file.originalname));
  }
});

/**
 * 封面图片上传存储配置
 */
const coverStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = config.upload.uploadDir;
    ensureUploadDir(uploadDir);
    cb(null, path.join(uploadDir, 'covers'));
  },
  filename: (req, file, cb) => {
    cb(null, generateFilename(file.originalname));
  }
});

/**
 * 字幕文件上传存储配置
 */
const subtitleStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = config.upload.uploadDir;
    ensureUploadDir(uploadDir);
    cb(null, path.join(uploadDir, 'subtitles'));
  },
  filename: (req, file, cb) => {
    cb(null, generateFilename(file.originalname));
  }
});

/**
 * 视频文件过滤器
 */
const videoFileFilter = (req, file, cb) => {
  const allowedTypes = config.upload.allowedVideoTypes;
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`不支持的视频格式: ${file.mimetype}。支持的格式: ${allowedTypes.join(', ')}`), false);
  }
};

/**
 * 图片文件过滤器
 */
const imageFileFilter = (req, file, cb) => {
  const allowedTypes = config.upload.allowedImageTypes;
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`不支持的图片格式: ${file.mimetype}。支持的格式: ${allowedTypes.join(', ')}`), false);
  }
};

/**
 * 字幕文件过滤器
 */
const subtitleFileFilter = (req, file, cb) => {
  const allowedExts = ['.vtt', '.srt', '.json'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExts.includes(ext) || file.mimetype === 'application/json' || file.mimetype === 'text/plain') {
    cb(null, true);
  } else {
    cb(new Error(`不支持的字幕格式: ${ext}。支持的格式: ${allowedExts.join(', ')}`), false);
  }
};

/**
 * 视频上传中间件
 */
const uploadVideo = multer({
  storage: videoStorage,
  limits: {
    fileSize: config.upload.maxFileSize
  },
  fileFilter: videoFileFilter
}).single('video');

/**
 * 封面图片上传中间件
 */
const uploadCover = multer({
  storage: coverStorage,
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: imageFileFilter
}).single('cover');

/**
 * 字幕文件上传中间件
 */
const uploadSubtitle = multer({
  storage: subtitleStorage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: subtitleFileFilter
}).single('subtitle');

/**
 * 多文件上传（视频 + 封面）
 */
const uploadVideoAndCover = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = config.upload.uploadDir;
      ensureUploadDir(uploadDir);
      const subDir = file.fieldname === 'video' ? 'videos' : 'covers';
      cb(null, path.join(uploadDir, subDir));
    },
    filename: (req, file, cb) => {
      cb(null, generateFilename(file.originalname));
    }
  }),
  limits: {
    fileSize: config.upload.maxFileSize
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'video') {
      videoFileFilter(req, file, cb);
    } else if (file.fieldname === 'cover') {
      imageFileFilter(req, file, cb);
    } else {
      cb(new Error(`不支持的字段: ${file.fieldname}`), false);
    }
  }
}).fields([
  { name: 'video', maxCount: 1 },
  { name: 'cover', maxCount: 1 }
]);

module.exports = {
  uploadVideo,
  uploadCover,
  uploadSubtitle,
  uploadVideoAndCover,
  ensureUploadDir,
  generateFilename
};
