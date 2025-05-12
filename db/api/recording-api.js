/**
 * Recording API Routes
 * Provides API endpoints for retrieving recording data from MongoDB
 * Now with server-side file caching to handle platform streaming limitations
 */
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import Recording from '../models/recording.model.js';
import {
  getRecordingsByCallSid,
  getRecordingBySid,
  updateProcessingStatus,
  updateTranscriptionStatus
} from '../repositories/recording.repository.js';
import * as csv from 'fast-csv';
import { Readable } from 'stream';
import recordingCache from '../utils/recording-cache.js';

/**
 * Register recording API routes with Fastify
 * @param {Object} fastify - Fastify instance
 * @param {Object} options - Route options
 */
export async function registerRecordingApiRoutes(fastify, options = {}) {
  // Initialize recording cache
  console.log(`[RecordingAPI] Initializing recording routes with server-side file caching`);
  
// Simple test route
  fastify.get('/api/ping-recordings', async (request, reply) => {
    request.log.info('[API Ping Recordings] Test route /api/ping-recordings hit');
    return reply.send({ success: true, message: 'Recording API is alive - PONG!', timestamp: new Date().toISOString() });
  });
  console.log('[RecordingAPI] Registered test route /api/ping-recordings');
  // Get recordings for a call
  fastify.get('/api/db/calls/:callSid/recordings', async (request, reply) => {
    try {
      const { callSid } = request.params;
      
      if (!callSid) {
        return reply.code(400).send({
          success: false,
          error: 'Call SID is required',
          timestamp: new Date().toISOString()
        });
      }
      
      const recordings = await getRecordingsByCallSid(callSid);
      
      return {
        success: true,
        data: {
          recordings,
          count: recordings.length,
          callSid
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[API] Error retrieving recordings:`, error);
      return reply.code(500).send({
        success: false,
        error: 'Error retrieving recordings',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Get a recording by SID
  fastify.get('/api/db/recordings/:recordingSid', async (request, reply) => {
    try {
      const { recordingSid } = request.params;
      
      if (!recordingSid) {
        return reply.code(400).send({
          success: false,
          error: 'Recording SID is required',
          timestamp: new Date().toISOString()
        });
      }
      
      const recording = await getRecordingBySid(recordingSid);
      
      if (!recording) {
        return reply.code(404).send({
          success: false,
          error: `Recording not found with SID: ${recordingSid}`,
          timestamp: new Date().toISOString()
        });
      }
      
      return {
        success: true,
        data: recording,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[API] Error retrieving recording:`, error);
      return reply.code(500).send({
        success: false,
        error: 'Error retrieving recording',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Update recording processing status
  fastify.put('/api/db/recordings/:recordingSid/processing-status', async (request, reply) => {
    try {
      const { recordingSid } = request.params;
      const { status } = request.body;
      
      if (!recordingSid) {
        return reply.code(400).send({
          success: false,
          error: 'Recording SID is required',
          timestamp: new Date().toISOString()
        });
      }
      
      if (!status || !['pending', 'processing', 'completed', 'failed'].includes(status)) {
        return reply.code(400).send({
          success: false,
          error: 'Valid processing status is required (pending, processing, completed, failed)',
          timestamp: new Date().toISOString()
        });
      }
      
      const updatedRecording = await updateProcessingStatus(recordingSid, status);
      
      if (!updatedRecording) {
        return reply.code(404).send({
          success: false,
          error: `Recording not found with SID: ${recordingSid}`,
          timestamp: new Date().toISOString()
        });
      }
      
      return {
        success: true,
        data: updatedRecording,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[API] Error updating recording processing status:`, error);
      return reply.code(500).send({
        success: false,
        error: 'Error updating recording processing status',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Update recording transcription status
  fastify.put('/api/db/recordings/:recordingSid/transcription-status', async (request, reply) => {
    try {
      const { recordingSid } = request.params;
      const { status } = request.body;
      
      if (!recordingSid) {
        return reply.code(400).send({
          success: false,
          error: 'Recording SID is required',
          timestamp: new Date().toISOString()
        });
      }
      
      if (!status || !['pending', 'in-progress', 'completed', 'failed', 'not-requested'].includes(status)) {
        return reply.code(400).send({
          success: false,
          error: 'Valid transcription status is required (pending, in-progress, completed, failed, not-requested)',
          timestamp: new Date().toISOString()
        });
      }
      
      const updatedRecording = await updateTranscriptionStatus(recordingSid, status);
      
      if (!updatedRecording) {
        return reply.code(404).send({
          success: false,
          error: `Recording not found with SID: ${recordingSid}`,
          timestamp: new Date().toISOString()
        });
      }
      
      return {
        success: true,
        data: updatedRecording,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[API] Error updating recording transcription status:`, error);
      return reply.code(500).send({
        success: false,
        error: 'Error updating recording transcription status',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // DIRECT STREAMING DOWNLOAD ROUTE: Fetches from Twilio and streams directly
  fastify.get('/api/recordings/:recordingSid/download', async (request, reply) => {
    const { recordingSid } = request.params;
    // ADD EXTRA LOGGING to see the exact parameter received by the handler
    request.log.info(`[API Download] Handler received request. Params: ${JSON.stringify(request.params)}, Parsed recordingSid: '${recordingSid}'`);

    try {
      if (!recordingSid) {
        return reply.code(400).send({ success: false, error: 'Recording SID is required' });
      }

      // 1. Fetch recording details from DB
      const recording = await getRecordingBySid(recordingSid);
      if (!recording || !recording.url) {
        request.log.warn(`[API Download] Recording not found or URL missing for SID: ${recordingSid}`);
        return reply.code(404).send({ success: false, error: 'Recording not found or URL missing' });
      }

      // 2. Get credentials needed for Twilio API access
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      if (!accountSid || !authToken) {
        request.log.error('[API Download] Missing Twilio credentials for download');
        return reply.code(500).send({ success: false, error: 'Server configuration error' });
      }

      // 3. Determine the correct Twilio URL and expected file extension
      let twilioUrl = recording.url; // Start with the URL from the DB
      let fileExtension = 'mp3'; // Default to mp3

      // Check if the DB URL already has a valid extension
      if (twilioUrl.toLowerCase().endsWith('.wav')) {
          fileExtension = 'wav';
          // No need to modify twilioUrl if it already ends in .wav
      } else if (twilioUrl.toLowerCase().endsWith('.mp3')) {
          fileExtension = 'mp3';
          // No need to modify twilioUrl if it already ends in .mp3
      } else {
          // If no extension, assume it's the base URL and append .mp3 (Twilio's default)
          twilioUrl = `${recording.url}.mp3`;
          fileExtension = 'mp3';
          request.log.info(`[API Download] Recording URL from DB has no extension, appending .mp3: ${twilioUrl}`);
      }


      // 4. Fetch audio data directly from Twilio URL
      request.log.info(`[API Download] Fetching audio directly from Twilio URL: ${twilioUrl}`);
      const response = await fetch(twilioUrl, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`
        }
      });

      if (!response.ok) {
        request.log.error(`[API Download] Failed to fetch audio from Twilio. Status: ${response.status} ${response.statusText}, URL: ${twilioUrl}`);
        // Attempt to fetch the other format if the first failed (e.g., try WAV if MP3 failed)
        if (fileExtension === 'mp3') {
            const wavUrl = twilioUrl.replace('.mp3', '.wav');
            request.log.warn(`[API Download] MP3 fetch failed, attempting WAV fetch from: ${wavUrl}`);
            const wavResponse = await fetch(wavUrl, { headers: { 'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}` } });
            if (wavResponse.ok) {
                request.log.info(`[API Download] WAV fetch successful after MP3 failed.`);
                fileExtension = 'wav';
                const contentType = wavResponse.headers.get('content-type') || 'audio/wav';
                reply.header('Content-Type', contentType);
                reply.header('Content-Disposition', `attachment; filename="recording_${recordingSid}.${fileExtension}"`);
                request.log.info(`[API Download] Sending WAV stream via reply.send() for ${recordingSid}`);
                return reply.send(wavResponse.body);
            } else {
                 request.log.error(`[API Download] WAV fetch also failed. Status: ${wavResponse.status} ${wavResponse.statusText}`);
            }
        }
        // If fallback also failed or wasn't attempted, return error
        return reply.code(502).send({ success: false, error: 'Failed to retrieve audio from source after attempting available formats' });
      }

      // 5. Buffer entire response and send with Content-Length (for debugging playback)
      request.log.info(`[API Download] Buffering entire response for ${recordingSid}...`);
      const audioBuffer = await response.buffer(); // Read entire response into buffer
      request.log.info(`[API Download] Buffer created (${audioBuffer.length} bytes). Sending...`);

      const contentType = response.headers.get('content-type') || (fileExtension === 'wav' ? 'audio/wav' : 'audio/mpeg');

      // Set headers including Content-Length
      reply.header('Content-Type', contentType);
      reply.header('Content-Disposition', `attachment; filename="recording_${recordingSid}.${fileExtension}"`);
      reply.header('Content-Length', audioBuffer.length); // Explicitly set length

      // Send the complete buffer
      return reply.send(audioBuffer);

    } catch (error) {
      request.log.error(`[API Download] Error processing direct stream download for ${recordingSid}:`, error);
      if (!reply.sent) {
        reply.code(500).send({
          success: false,
          error: 'Error processing recording download',
          details: error.message
        });
      }
    }
  });
          // REMOVED Orphaned catch block from previous caching implementation
      // REMOVED extra closing brace and orphaned catch block below
    // } catch (error) {
    //   request.log.error(`[API Download] Error processing download for ${recordingSid}:`, error);
    //   if (!reply.sent) {
    //     reply.code(500).send({
    //       success: false,
    //       error: 'Error processing recording download',
    //       details: error.message
    //     });
    //   }
    // }
  // }); // REMOVED extra closing }); - This belongs to the outer route definition
  
  // ENHANCED MEDIA ROUTE: Alternative path with file caching (avoiding "download" word)
  fastify.get('/api/media/recordings/:recordingSid', async (request, reply) => {
    const { recordingSid } = request.params;
    console.log(`[API Media] Route hit for recordingSid: ${recordingSid}`);
    
    try {
      if (!recordingSid) {
        return reply.code(400).send({ success: false, error: 'Recording SID is required' });
      }
      
      // 1. Fetch recording details from DB
      const recording = await getRecordingBySid(recordingSid);
      if (!recording || !recording.url) {
        request.log.warn(`[API Media] Recording not found or URL missing for SID: ${recordingSid}`);
        return reply.code(404).send({ success: false, error: 'Recording not found or URL missing' });
      }
      
      // 2. Get credentials needed for Twilio API access
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      if (!accountSid || !authToken) {
        request.log.error('[API Media] Missing Twilio credentials for download');
        return reply.code(500).send({ success: false, error: 'Server configuration error' });
      }
      
      // Determine file extension from URL or default to MP3
      const fileExtension = recording.url.endsWith('.wav') ? 'wav' : 'mp3';
      
      try {
        // 3. Get or cache the recording file
        request.log.info(`[API Media] Getting cached file for ${recordingSid}`);
        const filePath = await recordingCache.getRecordingFile(
          recording.url, 
          recordingSid, 
          accountSid, 
          authToken, 
          fileExtension
        );
        
        // 4. Check if the file exists
        if (!fs.existsSync(filePath)) {
          request.log.error(`[API Media] Cached file not found: ${filePath}`);
          return reply.code(500).send({ success: false, error: 'Cached file not found' });
        }
        
        // 5. Get MIME type from file extension
        const contentType = recordingCache.getAudioMimeType(fileExtension);
        
        // 6. Send the file with minimal headers (more compatible)
        request.log.info(`[API Media] Sending file from cache: ${filePath}`);
        
        // Set only Content-Type header, avoid Content-Disposition for better streaming
        reply.header('Content-Type', contentType);
        
        // Create read stream from file and send it
        const fileStream = fs.createReadStream(filePath);
        return reply.send(fileStream);
        
      } catch (cacheError) {
        request.log.error(`[API Media] Cache error for ${recordingSid}:`, cacheError);
        return reply.code(500).send({
          success: false,
          error: 'Error with cached recording',
          details: cacheError.message
        });
      }
    } catch (error) {
      request.log.error(`[API Media] Error processing media for ${recordingSid}:`, error);
      if (!reply.sent) {
        reply.code(500).send({
          success: false,
          error: 'Error processing recording media',
          details: error.message
        });
      }
    }
  });
  
  // Keep the query parameter approach (also with file caching)
  fastify.get('/api/recordings/download', async (request, reply) => {
    const { recordingSid } = request.query;
    console.log(`[API Download Query] Route hit with query param recordingSid: ${recordingSid}`);
    
    try {
      if (!recordingSid) {
        return reply.code(400).send({ success: false, error: 'Recording SID is required as a query parameter' });
      }
      
      // 1. Fetch recording details from DB
      const recording = await getRecordingBySid(recordingSid);
      if (!recording || !recording.url) {
        request.log.warn(`[API Download Query] Recording not found or URL missing for SID: ${recordingSid}`);
        return reply.code(404).send({ success: false, error: 'Recording not found or URL missing' });
      }
      
      // 2. Get credentials needed for Twilio API access
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      if (!accountSid || !authToken) {
        request.log.error('[API Download Query] Missing Twilio credentials for download');
        return reply.code(500).send({ success: false, error: 'Server configuration error' });
      }
      
      // Determine file extension from URL or default to MP3
      const fileExtension = recording.url.endsWith('.wav') ? 'wav' : 'mp3';
      
      try {
        // 3. Get or cache the recording file
        request.log.info(`[API Download Query] Getting cached file for ${recordingSid}`);
        const filePath = await recordingCache.getRecordingFile(
          recording.url, 
          recordingSid, 
          accountSid, 
          authToken, 
          fileExtension
        );
        
        // 4. Check if the file exists
        if (!fs.existsSync(filePath)) {
          request.log.error(`[API Download Query] Cached file not found: ${filePath}`);
          return reply.code(500).send({ success: false, error: 'Cached file not found' });
        }
        
        // 5. Get MIME type from file extension
        const contentType = recordingCache.getAudioMimeType(fileExtension);
        
        // 6. Send the file using reply.sendFile()
        request.log.info(`[API Download Query] Sending file from cache: ${filePath}`);
        
        // Set appropriate headers
        reply.header('Content-Type', contentType);
        reply.header('Content-Disposition', `attachment; filename="recording_${recordingSid}.${fileExtension}"`);
        
        // Create read stream from file and send it
        const fileStream = fs.createReadStream(filePath);
        return reply.send(fileStream);
        
      } catch (cacheError) {
        request.log.error(`[API Download Query] Cache error for ${recordingSid}:`, cacheError);
        return reply.code(500).send({
          success: false,
          error: 'Error with cached recording',
          details: cacheError.message
        });
      }
    } catch (error) {
      request.log.error(`[API Download Query] Error processing download for ${recordingSid}:`, error);
      if (!reply.sent) {
        reply.code(500).send({
          success: false,
          error: 'Error processing recording download',
          details: error.message
        });
      }
    }
  });

  // NEW ALTERNATIVE PATH 3: Base64 encoded data endpoint (kept for backward compatibility)
  fastify.get('/api/recordings/data/:recordingSid', async (request, reply) => {
    const { recordingSid } = request.params;
    console.log(`[API Base64] Route hit for recordingSid: ${recordingSid}`);
    
    try {
      if (!recordingSid) {
        return reply.code(400).send({ 
          success: false, 
          error: 'Recording SID is required' 
        });
      }
      
      // 1. Fetch recording details from DB
      const recording = await getRecordingBySid(recordingSid);
      if (!recording || !recording.url) {
        request.log.warn(`[API Base64] Recording not found or URL missing for SID: ${recordingSid}`);
        return reply.code(404).send({ 
          success: false, 
          error: 'Recording not found or URL missing' 
        });
      }
      
      // 2. Fetch audio data from Twilio URL
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      if (!accountSid || !authToken) {
        request.log.error('[API Base64] Missing Twilio credentials for download');
        return reply.code(500).send({ 
          success: false, 
          error: 'Server configuration error' 
        });
      }
      
      const twilioUrl = recording.url.endsWith('.mp3') ? recording.url : `${recording.url}.mp3`;
      request.log.info(`[API Base64] Fetching audio from Twilio URL: ${twilioUrl}`);
      
      const response = await fetch(twilioUrl, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`
        }
      });
      
      if (!response.ok) {
        request.log.error(`[API Base64] Failed to fetch audio from Twilio. Status: ${response.status} ${response.statusText}`);
        return reply.code(502).send({ 
          success: false, 
          error: 'Failed to retrieve audio from source' 
        });
      }
      
      // 3. Get the audio buffer and convert to base64
      const contentType = response.headers.get('content-type') || 'audio/mpeg';
      const fileExtension = contentType.includes('wav') ? 'wav' : 'mp3';
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64Data = buffer.toString('base64');
      
      // 4. Return JSON with base64 encoded data and metadata
      request.log.info(`[API Base64] Sending base64 encoded data for ${recordingSid} (${buffer.length} bytes)`);
      
      return {
        success: true,
        data: {
          recordingSid,
          contentType,
          fileExtension,
          filename: `recording_${recordingSid}.${fileExtension}`,
          duration: recording.duration || 0,
          sizeBytes: buffer.length,
          base64Data: base64Data
        },
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      request.log.error(`[API Base64] Error processing download for ${recordingSid}:`, error);
      return reply.code(500).send({
        success: false,
        error: 'Error processing recording download',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Export all recordings as CSV
  fastify.get('/api/db/recordings/actions/export', async (request, reply) => {
    try {
      console.log('[API] Starting recording log export');
      const recordings = await Recording.find({}).sort({ createdAt: -1 });
      console.log(`[API] Fetched ${recordings.length} recordings for export`);

      if (!recordings || recordings.length === 0) {
        return reply.code(404).send({ success: false, error: 'No recordings found to export' });
      }

      // Define CSV headers based on Recording model fields
      const headers = [
        'recordingSid', 'callSid', 'status', 'duration', 'channels', 
        'url', 'processingStatus', 'transcriptionStatus', 'createdAt', 'updatedAt'
      ];

      // Set headers for CSV download using Fastify's reply.raw
      reply.raw.setHeader('Content-Type', 'text/csv');
      reply.raw.setHeader('Content-Disposition', 'attachment; filename="recordings_export.csv"');

      // Create a readable stream for the CSV data
      const readableStream = new Readable();
      readableStream._read = () => {}; // No-op _read

      // Pipe the stream to fast-csv formatter and then to the reply
      const csvStream = csv.format({ headers, writeHeaders: true });
      csvStream.pipe(reply.raw);

      // Write data row by row
      recordings.forEach(rec => {
        const row = {
          recordingSid: rec.recordingSid,
          callSid: rec.callSid,
          status: rec.status,
          duration: rec.duration,
          channels: rec.channels,
          url: rec.url, // Direct download URL
          processingStatus: rec.processingStatus,
          transcriptionStatus: rec.transcriptionStatus,
          createdAt: rec.createdAt?.toISOString(),
          updatedAt: rec.updatedAt?.toISOString(),
        };
        csvStream.write(row);
      });

      // End the CSV stream
      csvStream.end();
      console.log('[API] Finished streaming recording log export');

    } catch (error) {
      console.error(`[API] Error exporting recordings:`, error);
      if (!reply.sent) {
        reply.code(500).send({
          success: false,
          error: 'Error exporting recordings',
          details: error.message,
          timestamp: new Date().toISOString()
        });
      } else {
        console.error('[API] Headers already sent, could not send JSON error for export failure.');
        reply.raw.end();
      }
    }
  });
}

export default {
  registerRecordingApiRoutes
};
