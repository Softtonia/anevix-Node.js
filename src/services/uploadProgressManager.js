const EventEmitter = require('events');

class UploadProgressManager extends EventEmitter {
  constructor() {
    super();
    // Maximum listeners per uploadId to avoid node memory leak warnings on spikes
    this.setMaxListeners(50);

    // Map: uploadId -> state object
    // {
    //   uploadId: string,
    //   bytesLoaded: number,
    //   totalBytes: number | null,
    //   progress: number | null,
    //   status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed' | 'aborted',
    //   images: string[],
    //   videos: string[],
    //   error: string | null,
    //   createdAt: number,
    //   updatedAt: number,
    //   completedAt: number | null
    // }
    this.uploads = new Map();

    // Map: uploadId -> Set of active SSE HTTP response objects (res)
    this.subscribers = new Map();

    // Routine safety cleanup of stale or abandoned upload sessions (every 5 minutes)
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleSessions();
    }, 5 * 60 * 1000);
    // Unref so timer doesn't prevent Node process termination in scripts/tests
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Initialize or reset tracking for an upload session
   */
  initUpload(uploadId, totalBytes = null) {
    if (!uploadId) return null;

    const existing = this.uploads.get(uploadId);
    // If existing session is already active and not completed/failed, keep its current progress
    if (existing && existing.status === 'uploading' && existing.bytesLoaded > 0) {
      return existing;
    }

    const state = {
      uploadId,
      bytesLoaded: 0,
      totalBytes: (typeof totalBytes === 'number' && totalBytes > 0) ? totalBytes : null,
      progress: (typeof totalBytes === 'number' && totalBytes > 0) ? 0 : null,
      status: 'uploading',
      images: [],
      videos: [],
      error: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      completedAt: null
    };

    this.uploads.set(uploadId, state);
    this.broadcastEvent(uploadId, 'progress', state);
    return state;
  }

  /**
   * Update chunk progress as bytes arrive over HTTP socket
   */
  updateProgress(uploadId, bytesChunk, totalBytesOverride = null) {
    let state = this.uploads.get(uploadId);
    if (!state) {
      state = this.initUpload(uploadId, totalBytesOverride);
    }

    state.bytesLoaded += bytesChunk;
    state.updatedAt = Date.now();

    if (totalBytesOverride && !state.totalBytes) {
      state.totalBytes = totalBytesOverride;
    }

    if (state.totalBytes && state.totalBytes > 0) {
      // Cap at 99% until storage processing is 100% finished
      state.progress = Math.min(99, Math.floor((state.bytesLoaded / state.totalBytes) * 100));
    } else {
      state.progress = null; // Indeterminate when Content-Length is chunked
    }

    state.status = 'uploading';
    this.broadcastEvent(uploadId, 'progress', state);
  }

  /**
   * Transition state to processing (all request bytes arrived, Multer writing to disk)
   */
  markProcessing(uploadId) {
    const state = this.uploads.get(uploadId);
    if (!state || state.status === 'completed') return;

    state.status = 'processing';
    state.updatedAt = Date.now();
    this.broadcastEvent(uploadId, 'progress', state);
  }

  /**
   * Mark upload session complete with final URLs
   */
  markComplete(uploadId, { images = [], videos = [] } = {}) {
    let state = this.uploads.get(uploadId);
    if (!state) {
      state = {
        uploadId,
        bytesLoaded: 0,
        totalBytes: 0,
        progress: 100,
        status: 'completed',
        images: [],
        videos: [],
        error: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        completedAt: Date.now()
      };
      this.uploads.set(uploadId, state);
    }

    state.status = 'completed';
    state.progress = 100;
    state.images = images;
    state.videos = videos;
    state.completedAt = Date.now();
    state.updatedAt = Date.now();

    // Broadcast complete event
    this.broadcastEvent(uploadId, 'complete', state);

    // Cleanly close all connected SSE streams after complete event
    this.closeSubscribers(uploadId);

    // Auto cleanup state record after 60 seconds
    setTimeout(() => {
      this.uploads.delete(uploadId);
    }, 60 * 1000);
  }

  /**
   * Mark upload session failed or validation rejected
   */
  markError(uploadId, errorMessage) {
    const state = this.uploads.get(uploadId);
    if (!state) return;

    state.status = 'failed';
    state.error = errorMessage || 'Upload failed';
    state.updatedAt = Date.now();

    this.broadcastEvent(uploadId, 'error', state);
    this.closeSubscribers(uploadId);

    setTimeout(() => {
      this.uploads.delete(uploadId);
    }, 60 * 1000);
  }

  /**
   * Handle client abort / connection dropped
   */
  markAborted(uploadId) {
    const state = this.uploads.get(uploadId);
    if (!state || state.status === 'completed') return;

    state.status = 'aborted';
    state.error = 'Upload was cancelled or connection closed';
    state.updatedAt = Date.now();

    this.broadcastEvent(uploadId, 'error', state);
    this.closeSubscribers(uploadId);

    setTimeout(() => {
      this.uploads.delete(uploadId);
    }, 30 * 1000);
  }

  /**
   * Get current state snapshot
   */
  getState(uploadId) {
    return this.uploads.get(uploadId) || null;
  }

  /**
   * Subscribe an HTTP response object to Server-Sent Events for this uploadId
   */
  subscribeClient(uploadId, res) {
    if (!this.subscribers.has(uploadId)) {
      this.subscribers.set(uploadId, new Set());
    }
    const set = this.subscribers.get(uploadId);
    set.add(res);

    // When client closes SSE connection, remove from subscriber set
    res.on('close', () => {
      set.delete(res);
      if (set.size === 0) {
        this.subscribers.delete(uploadId);
      }
    });

    // Send immediate snapshot upon connection
    const currentState = this.getState(uploadId) || {
      uploadId,
      bytesLoaded: 0,
      totalBytes: null,
      progress: 0,
      status: 'pending',
      images: [],
      videos: [],
      error: null
    };

    this.sendSseEvent(res, currentState.status === 'completed' ? 'complete' : 'progress', currentState);

    // If already complete or failed, close the connection immediately
    if (currentState.status === 'completed' || currentState.status === 'failed' || currentState.status === 'aborted') {
      res.end();
    }
  }

  /**
   * Push an SSE event to all active subscribers for an uploadId
   */
  broadcastEvent(uploadId, eventName, data) {
    const set = this.subscribers.get(uploadId);
    if (!set || set.size === 0) return;

    for (const res of set) {
      this.sendSseEvent(res, eventName, data);
    }
  }

  /**
   * Format and write SSE frame
   */
  sendSseEvent(res, eventName, data) {
    try {
      if (!res.writableEnded && res.writable) {
        res.write(`event: ${eventName}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
        if (typeof res.flush === 'function') {
          res.flush(); // support compression / proxy buffering flushing
        }
      }
    } catch (err) {
      // Ignored: client disconnected
    }
  }

  /**
   * Gracefully close all subscriber streams for an uploadId
   */
  closeSubscribers(uploadId) {
    const set = this.subscribers.get(uploadId);
    if (!set) return;

    for (const res of set) {
      try {
        if (!res.writableEnded) {
          res.end();
        }
      } catch (e) {
        // Ignored
      }
    }
    this.subscribers.delete(uploadId);
  }

  /**
   * Clean up stale sessions older than 15 minutes
   */
  cleanupStaleSessions() {
    const now = Date.now();
    const maxAge = 15 * 60 * 1000;

    for (const [uploadId, state] of this.uploads.entries()) {
      if (now - state.updatedAt > maxAge) {
        this.closeSubscribers(uploadId);
        this.uploads.delete(uploadId);
      }
    }
  }
}

// Singleton instance
// NOTE: For multi-instance/load-balanced deployment, this in-memory state
// must move to a shared message broker/pub-sub system such as Redis.
const uploadProgressManager = new UploadProgressManager();

module.exports = uploadProgressManager;
