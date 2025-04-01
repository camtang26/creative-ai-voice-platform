/**
 * Recording API Routes
 * Provides API endpoints for retrieving recording data from MongoDB
 */
import fetch from 'node-fetch'; // Import fetch
import Recording from '../models/recording.model.js'; // Import the model directly
import {
  getRecordingsByCallSid,
  getRecordingBySid,
  updateProcessingStatus,
  updateTranscriptionStatus
  // Removed incorrect getAllRecordings import
} from '../repositories/recording.repository.js';
import * as csv from 'fast-csv'; // Import fast-csv
import { Readable } from 'stream'; // Import Readable stream

/**
 * Register recording API routes with Fastify
 * @param {Object} fastify - Fastify instance
 * @param {Object} options - Route options
 */
export async function registerRecordingApiRoutes(fastify, options = {}) {
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

  // Download recording proxy
  fastify.get('/api/recordings/:recordingSid/download', async (request, reply) => { // Original path
    const { recordingSid } = request.params;
    // ADDED log at the very start
    console.log(`[API Download Handler] Route hit for recordingSid: ${recordingSid}`); // Reverted log message
    request.log.info(`[API Download] Received request for Recording SID: ${recordingSid}`); // Reverted log message
    
    try {
      if (!recordingSid) {
        return reply.code(400).send({ success: false, error: 'Recording SID is required' });
      }
      
      // 1. Fetch recording details from DB
      const recording = await getRecordingBySid(recordingSid);
      if (!recording || !recording.url) {
        request.log.warn(`[API Download] Recording not found or URL missing for SID: ${recordingSid}`); // Reverted log message
        return reply.code(404).send({ success: false, error: 'Recording not found or URL missing' });
      }
      
      // 2. Fetch audio data from Twilio URL
      // IMPORTANT: This uses basic auth with Account SID and Auth Token
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      if (!accountSid || !authToken) {
        request.log.error('[API Download] Missing Twilio credentials for download'); // Reverted log message
        return reply.code(500).send({ success: false, error: 'Server configuration error' });
      }
      
      const twilioUrl = recording.url.endsWith('.mp3') ? recording.url : `${recording.url}.mp3`; // Prefer MP3 if available
      request.log.info(`[API Download] Fetching audio from Twilio URL: ${twilioUrl}`); // Reverted log message
      
      const response = await fetch(twilioUrl, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`
        }
      });
      
      if (!response.ok) {
        request.log.error(`[API Download] Failed to fetch audio from Twilio. Status: ${response.status} ${response.statusText}`); // Reverted log message
        return reply.code(502).send({ success: false, error: 'Failed to retrieve audio from source' });
      }
      
      // 3. Stream response back to client
      const contentType = response.headers.get('content-type') || 'audio/mpeg'; // Default to MP3
      const fileExtension = contentType.includes('wav') ? 'wav' : 'mp3';
      
      // Set headers using the standard reply object
      reply.header('Content-Type', contentType);
      reply.header('Content-Disposition', `attachment; filename="recording_${recordingSid}.${fileExtension}"`);

      // Send the stream using reply.send() - Fastify handles piping
      request.log.info(`[API Download] Sending stream via reply.send() for ${recordingSid}`); // Reverted log message
      return reply.send(response.body);
      
    } catch (error) {
      request.log.error(`[API Download] Error processing download for ${recordingSid}:`, error); // Reverted log message
      if (!reply.sent) {
        reply.code(500).send({
          success: false,
          error: 'Error processing recording download',
          details: error.message
        });
      }
    }
  });

  // Export all recordings as CSV
  fastify.get('/api/db/recordings/actions/export', async (request, reply) => { // Changed path
    try {
      console.log('[API] Starting recording log export');
      // Fetch all recordings directly from the model
      // Consider adding filtering or pagination here if needed for performance
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
