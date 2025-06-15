/**
 * Recording Cache Utility
 * Provides server-side caching of Twilio recording files
 */
import fs from 'fs';
import path from 'path';
import { promises as fsPromises } from 'fs';
// Removed node-fetch import - using native fetch
import os from 'os';

// Define cache directory - use tmp folder for platforms that clear tmp on restart (like Render)
const CACHE_DIR = path.join(os.tmpdir(), 'twilio-recording-cache');

// Ensure cache directory exists
try {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    console.log(`[RecordingCache] Created cache directory: ${CACHE_DIR}`);
  }
} catch (err) {
  console.error(`[RecordingCache] Error ensuring cache directory: ${err.message}`);
}

/**
 * Get cached recording file path
 * @param {string} recordingSid - Twilio Recording SID
 * @param {string} fileExtension - File extension (mp3 or wav)
 * @returns {string} Full file path
 */
export function getCachedFilePath(recordingSid, fileExtension = 'mp3') {
  return path.join(CACHE_DIR, `recording_${recordingSid}.${fileExtension}`);
}

/**
 * Check if recording is cached
 * @param {string} recordingSid - Twilio Recording SID
 * @param {string} fileExtension - File extension (mp3 or wav)
 * @returns {Promise<boolean>} True if cached
 */
export async function isRecordingCached(recordingSid, fileExtension = 'mp3') {
  try {
    const filePath = getCachedFilePath(recordingSid, fileExtension);
    await fsPromises.access(filePath, fs.constants.F_OK);
    
    // Also check file size is more than 0 bytes to ensure it's valid
    const stats = await fsPromises.stat(filePath);
    return stats.size > 0;
  } catch (err) {
    return false;
  }
}

/**
 * Download and cache a recording from Twilio
 * @param {string} twilioUrl - Twilio recording URL
 * @param {string} recordingSid - Twilio Recording SID
 * @param {string} accountSid - Twilio Account SID
 * @param {string} authToken - Twilio Auth Token
 * @param {string} fileExtension - File extension (mp3 or wav)
 * @returns {Promise<string>} Path to cached file
 */
export async function cacheRecording(twilioUrl, recordingSid, accountSid, authToken, fileExtension = 'mp3') {
  // 1. Determine file path in cache
  const filePath = getCachedFilePath(recordingSid, fileExtension);
  
  // 2. Check if already cached
  if (await isRecordingCached(recordingSid, fileExtension)) {
    console.log(`[RecordingCache] Using cached recording: ${recordingSid}`);
    return filePath;
  }
  
  console.log(`[RecordingCache] Caching recording ${recordingSid} from ${twilioUrl}`);
  
  try {
    // 3. Fetch from Twilio
    const response = await fetch(twilioUrl, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch from Twilio: ${response.status} ${response.statusText}`);
    }
    
    // 4. Create write stream and pipe response to file
    const fileStream = fs.createWriteStream(filePath);
    
    return new Promise((resolve, reject) => {
      // Pipe the response body to the file
      response.body.pipe(fileStream);
      
      // Handle stream events
      response.body.on('error', (err) => {
        // Clean up failed file
        fileStream.close();
        fs.unlink(filePath, () => {}); // Delete file, ignore potential error
        reject(new Error(`Download stream error: ${err.message}`));
      });
      
      fileStream.on('finish', () => {
        // Check file size to ensure it's not empty
        fs.stat(filePath, (err, stats) => {
          if (err || stats.size === 0) {
            // Handle zero-byte file as error
            fs.unlink(filePath, () => {}); // Delete zero-byte file
            reject(new Error('Download resulted in empty file'));
          } else {
            console.log(`[RecordingCache] Successfully cached ${recordingSid} (${stats.size} bytes)`);
            resolve(filePath);
          }
        });
      });
      
      fileStream.on('error', (err) => {
        // Clean up
        fileStream.close();
        fs.unlink(filePath, () => {}); // Delete file, ignore potential error
        reject(new Error(`File write error: ${err.message}`));
      });
    });
  } catch (err) {
    console.error(`[RecordingCache] Error caching recording ${recordingSid}:`, err);
    throw err;
  }
}

/**
 * Get recording file - caches it if not already cached
 * @param {string} twilioUrl - Twilio recording URL
 * @param {string} recordingSid - Twilio Recording SID
 * @param {string} accountSid - Twilio Account SID
 * @param {string} authToken - Twilio Auth Token
 * @param {string} fileExtension - File extension (mp3 or wav)
 * @returns {Promise<string>} Path to cached file
 */
export async function getRecordingFile(twilioUrl, recordingSid, accountSid, authToken, fileExtension = 'mp3') {
  // Ensure URL has appropriate extension
  const urlWithExt = twilioUrl.endsWith(`.${fileExtension}`) ? twilioUrl : `${twilioUrl}.${fileExtension}`;
  
  // Get or cache the file
  return cacheRecording(urlWithExt, recordingSid, accountSid, authToken, fileExtension);
}

/**
 * Get MIME type for audio file extension
 * @param {string} fileExtension - File extension (mp3 or wav)
 * @returns {string} MIME type
 */
export function getAudioMimeType(fileExtension) {
  switch (fileExtension.toLowerCase()) {
    case 'mp3':
      return 'audio/mpeg';
    case 'wav':
      return 'audio/wav';
    case 'ogg':
      return 'audio/ogg';
    case 'm4a':
      return 'audio/mp4';
    default:
      return 'audio/mpeg'; // Default to MP3
  }
}

export default {
  getRecordingFile,
  isRecordingCached,
  getCachedFilePath,
  getAudioMimeType
};
