const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit to support videos
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type! Please upload only images or videos.'), false);
    }
  }
});

// @desc    Upload thumbnail image
// @route   POST /api/upload/thumbnail
// @access  Public
router.post(
  '/thumbnail',
  upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'image', maxCount: 1 }
  ]),
  (req, res) => {
    try {
      const file = req.files?.thumbnail?.[0] || req.files?.image?.[0];
      if (!file) {
        return res.status(400).json({ message: 'No thumbnail file uploaded' });
      }
      
      const protocol = req.protocol;
      const host = req.get('host');
      const thumbnailUrl = `${protocol}://${host}/uploads/${file.filename}`;
      
      res.status(201).json({
        success: true,
        thumbnail: thumbnailUrl,
        url: thumbnailUrl,
        filename: file.filename
      });
    } catch (error) {
      res.status(500).json({ message: 'Server Error', error: error.message });
    }
  }
);

// @desc    Upload a single image or video
// @route   POST /api/upload/image
// @access  Public
router.post(
  '/image',
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
    { name: 'file', maxCount: 1 }
  ]),
  (req, res) => {
    try {
      const file = req.files?.image?.[0] || req.files?.thumbnail?.[0] || req.files?.file?.[0];
      if (!file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      
      const protocol = req.protocol;
      const host = req.get('host');
      const mediaUrl = `${protocol}://${host}/uploads/${file.filename}`;
      
      res.status(201).json({
        success: true,
        url: mediaUrl,
        thumbnail: mediaUrl,
        filename: file.filename
      });
    } catch (error) {
      res.status(500).json({ message: 'Server Error', error: error.message });
    }
  }
);

const uploadProgressManager = require('../services/uploadProgressManager');

// Stream tracking middleware: tracks exact incoming bytes without consuming or interfering with Multer
const trackUploadStream = (req, res, next) => {
  const uploadId = req.headers['x-upload-id'] || req.query.uploadId;
  const totalLength = parseInt(req.headers['content-length'], 10);
  const totalBytes = (!isNaN(totalLength) && totalLength > 0) ? totalLength : null;

  if (uploadId) {
    uploadProgressManager.initUpload(uploadId, totalBytes);

    req.on('data', (chunk) => {
      uploadProgressManager.updateProgress(uploadId, chunk.length, totalBytes);
    });

    req.on('end', () => {
      uploadProgressManager.markProcessing(uploadId);
    });

    req.on('aborted', () => {
      uploadProgressManager.markAborted(uploadId);
    });

    req.on('error', (err) => {
      uploadProgressManager.markError(uploadId, err.message);
    });
  }

  next();
};

// @desc    Generate / Initialize an upload session ID
// @route   POST /api/upload/init
// @access  Public
router.post('/init', (req, res) => {
  const uploadId = 'up_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  const state = uploadProgressManager.initUpload(uploadId);
  res.status(200).json({
    success: true,
    uploadId,
    message: 'Upload session initialized',
    state
  });
});

// @desc    Get Current Bytes & Progress as standard JSON (Polling / Verification)
// @route   GET /api/upload/progress/:uploadId
// @access  Public
router.get('/progress/:uploadId', (req, res) => {
  const { uploadId } = req.params;
  const state = uploadProgressManager.getState(uploadId);

  if (!state) {
    return res.status(404).json({
      success: false,
      message: 'Upload session not found or expired',
      uploadId
    });
  }

  res.status(200).json({
    success: true,
    ...state
  });
});

// @desc    Server-Sent Events (SSE) Live Upload Progress Stream
// @route   GET /api/upload/stream/:uploadId
// @access  Public
router.get('/stream/:uploadId', (req, res) => {
  const { uploadId } = req.params;

  if (!uploadId) {
    return res.status(400).json({ message: 'uploadId parameter is required' });
  }

  // Set mandatory SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no' // Prevent Nginx / proxy buffering
  });

  // Subscribe this client response to the manager
  uploadProgressManager.subscribeClient(uploadId, res);
});

// @desc    Upload multiple images or videos (batch) with live progress tracking
// @route   POST /api/upload/images/batch or /api/upload/media/batch
// @access  Public
const batchMediaHandler = (req, res) => {
  const uploadId = req.headers['x-upload-id'] || req.query.uploadId;
  try {
    const files = [
      ...(req.files?.images || []),
      ...(req.files?.image || []),
      ...(req.files?.videos || []),
      ...(req.files?.video || []),
      ...(req.files?.media || [])
    ];

    if (!files || files.length === 0) {
      if (uploadId) uploadProgressManager.markError(uploadId, 'No image or video files uploaded');
      return res.status(400).json({ message: 'No image or video files uploaded' });
    }
    
    const protocol = req.protocol;
    const host = req.get('host');
    
    const images = [];
    const videos = [];

    files.forEach(file => {
      const fileUrl = `${protocol}://${host}/uploads/${file.filename}`;
      if (file.mimetype.startsWith('video/')) {
        videos.push(fileUrl);
      } else {
        images.push(fileUrl);
      }
    });

    // Notify all listening SSE streams of completion
    if (uploadId) {
      uploadProgressManager.markComplete(uploadId, { images, videos });
    }
    
    res.status(201).json({
      success: true,
      uploadId: uploadId || null,
      images,
      videos
    });
  } catch (error) {
    if (uploadId) uploadProgressManager.markError(uploadId, error.message);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

const batchMediaUpload = upload.fields([
  { name: 'images', maxCount: 50 },
  { name: 'image', maxCount: 50 },
  { name: 'videos', maxCount: 20 },
  { name: 'video', maxCount: 20 },
  { name: 'media', maxCount: 50 }
]);

router.post('/images/batch', trackUploadStream, batchMediaUpload, batchMediaHandler);
router.post('/media/batch', trackUploadStream, batchMediaUpload, batchMediaHandler);

module.exports = { router, upload };




