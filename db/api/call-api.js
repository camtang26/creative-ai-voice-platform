/**
 * Call API Routes
 * Provides API endpoints for retrieving call data from MongoDB
 */
import {
  getCallBySid,
  getActiveCalls,
  getCallHistory,
  updateCallStatus,
  deleteCall,
  saveCall
} from '../repositories/call.repository.js';
import { invalidateCacheByPattern } from '../utils/cache.js';
import * as csv from 'fast-csv'; // Import fast-csv
import { Readable } from 'stream'; // Import Readable stream

/**
 * Register call API routes with Fastify
 * @param {Object} fastify - Fastify instance
 * @param {Object} options - Route options
 */
export async function registerCallApiRoutes(fastify, options = {}) {
  // Get call by SID
  fastify.get('/api/db/calls/:callSid', async (request, reply) => {
    const { callSid } = request.params;
    request.log.info(`[API /calls/:callSid] Received request for Call SID: ${callSid}`); // Log received SID
    try {
      if (!callSid) {
        return reply.code(400).send({
          success: false,
          error: 'Call SID is required',
          timestamp: new Date().toISOString()
        });
      }
      
      const call = await getCallBySid(callSid);
      request.log.info(`[API /calls/:callSid] Result from getCallBySid for ${callSid}: ${call ? 'Found' : 'Not Found'}`); // Log result
      
      if (!call) {
        return reply.code(404).send({
          success: false,
          error: `Call not found with SID: ${callSid}`,
          timestamp: new Date().toISOString()
        });
      }
      
      return {
        success: true,
        data: call,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[API] Error retrieving call:`, error);
      return reply.code(500).send({
        success: false,
        error: 'Error retrieving call',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Get active calls
  fastify.get('/api/db/calls/active', async (request, reply) => {
    try {
      const activeCalls = await getActiveCalls();
      
      return {
        success: true,
        data: {
          calls: activeCalls,
          count: activeCalls.length
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[API] Error retrieving active calls:`, error);
      return reply.code(500).send({
        success: false,
        error: 'Error retrieving active calls',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Get call history with filters and pagination
  fastify.get('/api/db/calls', async (request, reply) => {
    try {
      // Extract query parameters
      const { 
        status, from, to, agentId, campaignId, 
        startDate, endDate, page, limit 
      } = request.query;
      
      // Build filters
      const filters = {};
      
      if (status) filters.status = status;
      if (from) filters.from = from;
      if (to) filters.to = to;
      if (agentId) filters.agentId = agentId;
      if (campaignId) filters.campaignId = campaignId;
      if (startDate || endDate) {
        filters.startDate = startDate;
        filters.endDate = endDate;
      }
      
      // Build pagination
      const pagination = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20
      };
      
      // Get call history
      const result = await getCallHistory(filters, pagination);
      request.log.info({ data: result }, `[API /calls] Returning call history result.`); // Log the result being returned
      
      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[API] Error retrieving call history:`, error);
      return reply.code(500).send({
        success: false,
        error: 'Error retrieving call history',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Update call status
  fastify.put('/api/db/calls/:callSid/status', async (request, reply) => {
    try {
      const { callSid } = request.params;
      const { status, ...metadata } = request.body;
      
      if (!callSid) {
        return reply.code(400).send({
          success: false,
          error: 'Call SID is required',
          timestamp: new Date().toISOString()
        });
      }
      
      if (!status) {
        return reply.code(400).send({
          success: false,
          error: 'Status is required',
          timestamp: new Date().toISOString()
        });
      }
      
      const updatedCall = await updateCallStatus(callSid, status, metadata);
      
      // Invalidate related cache entries
      invalidateCacheByPattern(`call_details_${callSid}`);
      invalidateCacheByPattern('dashboard_');
      
      console.log(`[API] Invalidated cache for updated call ${callSid}`);
      
      return {
        success: true,
        data: updatedCall,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[API] Error updating call status:`, error);
      return reply.code(500).send({
        success: false,
        error: 'Error updating call status',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Get call statistics
  fastify.get('/api/db/calls/stats', async (request, reply) => {
    try {
      // Get all calls
      const { calls } = await getCallHistory({}, { page: 1, limit: 1000 });
      
      // Calculate statistics
      const stats = {
        totalCalls: calls.length,
        callsByStatus: {},
        callsByOutcome: {},
        averageDuration: 0,
        totalDuration: 0
      };
      
      // Count calls by status and outcome
      calls.forEach(call => {
        // Count by status
        if (!stats.callsByStatus[call.status]) {
          stats.callsByStatus[call.status] = 0;
        }
        stats.callsByStatus[call.status]++;
        
        // Count by outcome
        if (call.outcome) {
          if (!stats.callsByOutcome[call.outcome]) {
            stats.callsByOutcome[call.outcome] = 0;
          }
          stats.callsByOutcome[call.outcome]++;
        }
        
        // Calculate duration statistics
        if (call.duration) {
          stats.totalDuration += call.duration;
        }
      });
      
      // Calculate average duration
      if (calls.length > 0 && stats.totalDuration > 0) {
        stats.averageDuration = Math.round(stats.totalDuration / calls.length);
      }
      
      return {
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[API] Error retrieving call statistics:`, error);
      return reply.code(500).send({
        success: false,
        error: 'Error retrieving call statistics',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Create call
  fastify.post('/api/db/calls', async (request, reply) => {
    try {
      const callData = request.body;
      
      if (!callData) {
        return reply.code(400).send({
          success: false,
          error: 'Call data is required',
          timestamp: new Date().toISOString()
        });
      }
      
      if (!callData.callSid) {
        return reply.code(400).send({
          success: false,
          error: 'Call SID is required',
          timestamp: new Date().toISOString()
        });
      }
      
      // Save call
      const savedCall = await saveCall(callData);
      
      // Invalidate dashboard cache entries
      invalidateCacheByPattern('dashboard_');
      
      console.log(`[API] Invalidated cache for new call ${callData.callSid}`);
      
      return {
        success: true,
        data: {
          call: savedCall
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[API] Error creating call:`, error);
      return reply.code(500).send({
        success: false,
        error: 'Error creating call',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Delete call
  fastify.delete('/api/db/calls/:callSid', async (request, reply) => {
    try {
      const { callSid } = request.params;
      
      if (!callSid) {
        return reply.code(400).send({
          success: false,
          error: 'Call SID is required',
          timestamp: new Date().toISOString()
        });
      }
      
      // Delete the call
      const result = await deleteCall(callSid);
      
      if (result) {
        // Invalidate related cache entries
        invalidateCacheByPattern(`call_details_${callSid}`);
        invalidateCacheByPattern('dashboard_');
        
        console.log(`[API] Invalidated cache for deleted call ${callSid}`);
        
        return {
          success: true,
          message: `Call ${callSid} deleted successfully`,
          timestamp: new Date().toISOString()
        };
      } else {
        return reply.code(404).send({
          success: false,
          error: `Call ${callSid} not found or could not be deleted`,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error(`[API] Error deleting call:`, error);
      return reply.code(500).send({
        success: false,
        error: 'Error deleting call',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Export call logs as CSV
  fastify.get('/api/db/calls/actions/export', async (request, reply) => { // Changed path
    try {
      console.log('[API] Starting call log export');
      // Fetch all calls (consider adding filters based on request.query if needed later)
      // Using a large limit for now, but ideally this should stream or paginate large datasets
      const { calls } = await getCallHistory({}, { page: 1, limit: 10000 }); 
      console.log(`[API] Fetched ${calls.length} calls for export`);

      if (!calls || calls.length === 0) {
        return reply.code(404).send({ success: false, error: 'No call logs found to export' });
      }

      // Define CSV headers based on Call model fields
      const headers = [
        'callSid', 'conversationId', 'status', 'from', 'to', 'direction', 
        'startTime', 'answerTime', 'endTime', 'duration', 'billableDuration', 
        'region', 'callerId', 'answeredBy', 'machineBehavior', 'outcome', 
        'terminatedBy', 'agentId', 'prompt', 'firstMessage', 'contactName', 
        'campaignId', 'tags', 'createdAt', 'updatedAt'
        // Add qualityMetrics fields if needed, e.g., 'qualityMetrics.mos'
        // Add recording URL if available (might need modification if multiple recordings)
      ];

      // Set headers for CSV download using Fastify's reply.raw
      reply.raw.setHeader('Content-Type', 'text/csv');
      reply.raw.setHeader('Content-Disposition', 'attachment; filename="call_logs_export.csv"');

      // Create a readable stream for the CSV data
      const readableStream = new Readable();
      readableStream._read = () => {}; // No-op _read is needed for Readable stream

      // Pipe the stream to fast-csv formatter and then to the reply
      const csvStream = csv.format({ headers, writeHeaders: true });
      csvStream.pipe(reply.raw); // Pipe directly to the underlying response stream

      // Write data row by row
      calls.forEach(call => {
        // Flatten or select data as needed for CSV columns
        const row = {
          callSid: call.callSid,
          conversationId: call.conversationId,
          status: call.status,
          from: call.from,
          to: call.to,
          direction: call.direction,
          startTime: call.startTime?.toISOString(),
          answerTime: call.answerTime?.toISOString(),
          endTime: call.endTime?.toISOString(),
          duration: call.duration,
          billableDuration: call.billableDuration,
          region: call.region,
          callerId: call.callerId,
          answeredBy: call.answeredBy,
          machineBehavior: call.machineBehavior,
          outcome: call.outcome,
          terminatedBy: call.terminatedBy,
          agentId: call.agentId,
          prompt: call.prompt, // Be cautious with potentially long text
          firstMessage: call.firstMessage, // Be cautious with potentially long text
          contactName: call.contactName,
          campaignId: call.campaignId, // Assuming this is stored directly
          tags: Array.isArray(call.tags) ? call.tags.join(',') : '', // Join tags array
          createdAt: call.createdAt?.toISOString(),
          updatedAt: call.updatedAt?.toISOString(),
        };
        csvStream.write(row);
      });

      // End the CSV stream
      csvStream.end();
      console.log('[API] Finished streaming call log export');

      // Note: We don't explicitly call reply.send() when streaming
      // The stream piping handles sending the response.

    } catch (error) {
      console.error(`[API] Error exporting call logs:`, error);
      // If headers haven't been sent, send an error response
      if (!reply.sent) {
        reply.code(500).send({
          success: false,
          error: 'Error exporting call logs',
          details: error.message,
          timestamp: new Date().toISOString()
        });
      } else {
        // If headers were sent, we can't send a JSON error, just end the response abruptly.
        console.error('[API] Headers already sent, could not send JSON error for export failure.');
        reply.raw.end(); // End the response stream if possible
      }
    }
  });
}

export default {
  registerCallApiRoutes
};
