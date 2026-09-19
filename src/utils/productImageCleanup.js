const fsPromises = require('fs').promises;
const path = require('path');
const ProductImage = require('../models/ProductImage');

/**
 * Safely delete a file from disk without throwing errors if the file doesn't exist
 * @param {string} filePath
 */
const safelyDeleteDiskFile = async (filePath) => {
  if (!filePath) return;
  try {
    await fsPromises.unlink(filePath);
  } catch (e) {
    if (e.code !== 'ENOENT') {
      console.error('[productImageCleanup] Error unlinking file:', e.message);
    }
  }
};

/**
 * Execute cleanup for ProductImage records
 *
 * Rules:
 * 1. ONLY delete records where status is 'temporary' (and older than 7 days)
 *    OR status is 'failed' (and older than 24 hours).
 * 2. NEVER delete records where status is 'active'.
 * 3. Safely unlink corresponding files in the uploads/ directory.
 */
const runProductImageCleanup = async () => {
  try {
    const now = Date.now();
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);

    // Strictly query candidate IDs that appear eligible
    const candidates = await ProductImage.find({
      $or: [
        { status: "temporary", createdAt: { $lt: sevenDaysAgo } },
        { status: "failed", createdAt: { $lt: oneDayAgo } }
      ]
    }).select('_id fileName url status').lean();

    if (!candidates || candidates.length === 0) {
      return { deletedCount: 0 };
    }

    const uploadDir = path.resolve(process.cwd(), 'uploads');
    let deletedCount = 0;

    for (const candidate of candidates) {
      // ATOMIC DB DELETION FIRST:
      // Guarantees we ONLY delete if the record is STILL "temporary" or "failed" at this precise instant.
      // If another request changed the status to "active" in the interim, findOneAndDelete returns null!
      const deletedDoc = await ProductImage.findOneAndDelete({
        _id: candidate._id,
        $or: [
          { status: "temporary", createdAt: { $lt: sevenDaysAgo } },
          { status: "failed", createdAt: { $lt: oneDayAgo } }
        ]
      });

      if (!deletedDoc) {
        // Record was promoted to "active" or modified concurrently; DO NOT touch any physical file!
        continue;
      }

      deletedCount++;

      // Safely determine filename
      let filename = deletedDoc.fileName;
      if (!filename && deletedDoc.url && deletedDoc.url.includes('/uploads/')) {
        try {
          const parsed = new URL(deletedDoc.url);
          filename = path.basename(parsed.pathname);
        } catch (_) {
          filename = path.basename(deletedDoc.url.split('/uploads/').pop().split('?')[0]);
        }
      }

      if (filename && typeof filename === 'string') {
        const sanitizedFilename = path.basename(filename);
        const resolvedPath = path.resolve(uploadDir, sanitizedFilename);

        // Security check: ensure path is strictly contained within uploadDir
        if (resolvedPath.startsWith(uploadDir + path.sep)) {
          // Check if any other existing ProductImage document references this exact filename/url
          const isStillReferenced = await ProductImage.exists({
            _id: { $ne: deletedDoc._id },
            $or: [
              { fileName: sanitizedFilename },
              { url: deletedDoc.url }
            ]
          });

          if (!isStillReferenced) {
            await safelyDeleteDiskFile(resolvedPath);
          }
        }
      }
    }

    if (deletedCount > 0) {
      console.log(`[productImageCleanup] Cleaned up ${deletedCount} expired temporary/failed images.`);
    }

    return { deletedCount };
  } catch (error) {
    console.error('[productImageCleanup] Cleanup job encountered an error:', error);
    return { error: error.message };
  }
};

/**
 * Initialize recurring cleanup scheduler (Zero external dependencies)
 * Runs immediately on start (unref'd) and once every 24 hours.
 */
const initProductImageCleanup = () => {
  // Run once on startup (deferred by 10 seconds to allow DB connection to complete)
  const initialTimeout = setTimeout(() => {
    runProductImageCleanup().catch(() => {});
  }, 10 * 1000);
  if (initialTimeout.unref) initialTimeout.unref();

  // Run every 24 hours
  const interval = setInterval(() => {
    runProductImageCleanup().catch(() => {});
  }, 24 * 60 * 60 * 1000);
  if (interval.unref) interval.unref();

  return { runProductImageCleanup, interval };
};

module.exports = {
  runProductImageCleanup,
  initProductImageCleanup,
  safelyDeleteDiskFile
};
