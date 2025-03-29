/**
 * MongoDB Database Integration Module
 * Main entry point for MongoDB integration with the ElevenLabs/Twilio application
 */
import { connectToDatabase, closeConnection, getConnectionStatus } from './mongodb-connection.js';
import Call from './models/call.model.js';
import Recording from './models/recording.model.js';
import Transcript from './models/transcript.model.js';
import CallEvent from './models/callEvent.model.js';
import Campaign from './models/campaign.model.js';
import Contact from './models/contact.model.js';
import * as callRepository from './repositories/call.repository.js';
import * as recordingRepository from './repositories/recording.repository.js';
import * as transcriptRepository from './repositories/transcript.repository.js';
import * as callEventRepository from './repositories/callEvent.repository.js';
import * as analyticsRepository from './repositories/analytics.repository.js';
import * as campaignRepository from './repositories/campaign.repository.js';
import * as contactRepository from './repositories/contact.repository.js';
import * as webhookHandler from './webhook-handler-db.js';
import { registerCallApiRoutes } from './api/call-api.js';
import { registerRecordingApiRoutes } from './api/recording-api.js';
import { registerTranscriptApiRoutes } from './api/transcript-api.js';
import { registerAnalyticsApiRoutes } from './api/analytics-api.js';
import { registerCallEventApiRoutes } from './api/callEvent-api.js';
import { registerDashboardApiRoutes } from './api/dashboard-api.js';
import { registerCampaignApiRoutes } from './api/campaign-api.js';
import { registerContactApiRoutes } from './api/contact-api.js';

/**
 * Initialize MongoDB integration
 * @param {Object} fastify - Fastify instance
 * @param {Object} options - Initialization options
 * @returns {Promise<Object>} Initialization result
 */
export async function initializeMongoDB(fastify, options = {}) {
  try {
    console.log('[MongoDB] Initializing MongoDB integration');
    
    // Connect to MongoDB
    const connection = await connectToDatabase();
    
    // Register API routes if fastify instance is provided
    if (fastify) {
      // Register call API routes
      registerCallApiRoutes(fastify, options);
      console.log('[MongoDB] Registered call API routes');
      
      // Register recording API routes
      registerRecordingApiRoutes(fastify, options);
      console.log('[MongoDB] Registered recording API routes');
      
      // Register transcript API routes
      registerTranscriptApiRoutes(fastify, options);
      console.log('[MongoDB] Registered transcript API routes');
      
      // Register analytics API routes
      registerAnalyticsApiRoutes(fastify, options);
      console.log('[MongoDB] Registered analytics API routes');
      
      // Register call event API routes
      registerCallEventApiRoutes(fastify, options);
      console.log('[MongoDB] Registered call event API routes');
      
      // Register dashboard API routes
      registerDashboardApiRoutes(fastify, options);
      console.log('[MongoDB] Registered dashboard API routes');
      
      // Register campaign API routes
      registerCampaignApiRoutes(fastify, options);
      console.log('[MongoDB] Registered campaign API routes');
      
      // Register contact API routes
      registerContactApiRoutes(fastify, options);
      console.log('[MongoDB] Registered contact API routes');
    }
    
    // Set up active calls reference if provided
    if (options.activeCalls) {
      webhookHandler.setActiveCallsReference(options.activeCalls);
      console.log('[MongoDB] Set active calls reference');
      
      // Sync existing active calls to MongoDB
      if (options.syncExistingCalls) {
        await syncActiveCallsToMongoDB(options.activeCalls);
      }
    }
    
    console.log('[MongoDB] Initialization complete');
    
    return {
      success: true,
      connection,
      models: {
        Call,
        Recording,
        Transcript,
        CallEvent,
        Campaign,
        Contact
      },
      repositories: {
        call: callRepository,
        recording: recordingRepository,
        transcript: transcriptRepository,
        callEvent: callEventRepository,
        analytics: analyticsRepository,
        campaign: campaignRepository,
        contact: contactRepository
      },
      webhookHandler,
      closeConnection
    };
  } catch (error) {
    console.error('[MongoDB] Initialization error:', error);
    throw error;
  }
}

/**
 * Sync existing active calls to MongoDB
 * @param {Map} activeCalls - Map of active calls
 * @returns {Promise<void>}
 */
async function syncActiveCallsToMongoDB(activeCalls) {
  if (!activeCalls || activeCalls.size === 0) {
    console.log('[MongoDB] No active calls to sync');
    return;
  }
  
  console.log(`[MongoDB] Syncing ${activeCalls.size} active calls to MongoDB`);
  
  const promises = [];
  
  for (const [callSid, callInfo] of activeCalls.entries()) {
    // Format call data for MongoDB
    const callData = {
      callSid,
      conversationId: callInfo.conversation_id || callInfo.conversationId,
      status: callInfo.status || 'in-progress',
      from: callInfo.from,
      to: callInfo.to,
      startTime: callInfo.startTime,
      endTime: callInfo.endTime,
      duration: callInfo.duration,
      answeredBy: callInfo.answeredBy,
      machineBehavior: callInfo.machineBehavior,
      agentId: process.env.ELEVENLABS_AGENT_ID,
      contactName: callInfo.name || callInfo.contactName
    };
    
    // Save to MongoDB
    promises.push(callRepository.saveCall(callData));
    
    // If the call has recordings, sync those too
    if (callInfo.recordings && callInfo.recordings.length > 0) {
      for (const recording of callInfo.recordings) {
        const recordingData = {
          recordingSid: recording.sid || recording.recordingSid,
          callSid,
          url: recording.url || recording.recordingUrl,
          duration: recording.duration,
          status: recording.status || 'completed'
        };
        
        promises.push(recordingRepository.saveRecording(recordingData));
      }
    }
  }
  
  try {
    await Promise.all(promises);
    console.log(`[MongoDB] Successfully synced ${promises.length} items (calls and recordings)`);
  } catch (error) {
    console.error('[MongoDB] Error syncing active calls:', error);
  }
}

/**
 * Get enhanced webhook handler with MongoDB integration
 * @returns {Object} Enhanced webhook handler
 */
export function getEnhancedWebhookHandler() {
  return webhookHandler;
}

/**
 * Get call repository
 * @returns {Object} Call repository
 */
export function getCallRepository() {
  return callRepository;
}

/**
 * Get recording repository
 * @returns {Object} Recording repository
 */
export function getRecordingRepository() {
  return recordingRepository;
}

/**
 * Get transcript repository
 * @returns {Object} Transcript repository
 */
export function getTranscriptRepository() {
  return transcriptRepository;
}

/**
 * Get call event repository
 * @returns {Object} Call event repository
 */
export function getCallEventRepository() {
  return callEventRepository;
}

/**
 * Get analytics repository
 * @returns {Object} Analytics repository
 */
export function getAnalyticsRepository() {
  return analyticsRepository;
}

/**
 * Get campaign repository
 * @returns {Object} Campaign repository
 */
export function getCampaignRepository() {
  return campaignRepository;
}

/**
 * Get contact repository
 * @returns {Object} Contact repository
 */
export function getContactRepository() {
  return contactRepository;
}

export {
  connectToDatabase,
  closeConnection,
  getConnectionStatus
};

export default {
  initializeMongoDB,
  connectToDatabase,
  closeConnection,
  getConnectionStatus,
  getEnhancedWebhookHandler,
  getCallRepository,
  getRecordingRepository,
  getTranscriptRepository,
  getCallEventRepository,
  getAnalyticsRepository,
  getCampaignRepository,
  getContactRepository,
  models: {
    Call,
    Recording,
    Transcript,
    CallEvent,
    Campaign,
    Contact
  }
};