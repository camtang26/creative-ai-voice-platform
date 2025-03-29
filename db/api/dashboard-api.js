/**
 * Dashboard API
 * Provides API endpoints for the dashboard with combined data from multiple sources
 */
import { getAnalyticsRepository, getCallRepository, getTranscriptRepository } from '../index.js';
import { getCacheValue, setCacheValue } from '../utils/cache.js';

// Cache TTL in milliseconds (1 minute)
const CACHE_TTL = 60000;

/**
 * Register dashboard API routes
 * @param {Object} fastify - Fastify instance
 * @param {Object} options - Options
 */
export function registerDashboardApiRoutes(fastify, options = {}) {
  const analyticsRepository = getAnalyticsRepository();
  const callRepository = getCallRepository();
  const transcriptRepository = getTranscriptRepository();
  
  // Get dashboard overview data
  fastify.get('/api/db/dashboard/overview', async (request, reply) => {
    try {
      const { days } = request.query;
      const daysToFetch = days ? parseInt(days) : 7;
      
      // Generate cache key based on query parameters
      const cacheKey = `dashboard_overview_${daysToFetch}`;
      
      // Try to get data from cache
      const cachedData = getCacheValue(cacheKey);
      if (cachedData) {
        console.log(`[MongoDB] Using cached dashboard overview data for ${daysToFetch} days`);
        return {
          success: true,
          data: cachedData,
          cached: true,
          timestamp: new Date().toISOString()
        };
      }
      
      console.log(`[MongoDB] Generating dashboard summary for last ${daysToFetch} days`);
      
      // Get dashboard summary data from repository
      const repoSummaryData = await analyticsRepository.getDashboardSummary({
        days: daysToFetch
      });
      
      // Get recent calls
      const recentCallsData = await callRepository.getCallHistory({}, {
        limit: 5,
        page: 1
      });
      
      // Get sentiment distribution
      const sentimentData = await analyticsRepository.getConversationSentiment();

      // --- Restructure the summary to match frontend expectations ---
      const formattedSummary = {
        totalCalls: repoSummaryData.calls.total,
        // Assuming active calls count needs to be fetched separately or is part of another metric
        // For now, let's use total - completed - failed as a rough estimate if needed, or fetch realtime
        activeCalls: repoSummaryData.calls.byStatus.find(s => ['initiated', 'ringing', 'in-progress'].includes(s.status))?.count || 0, 
        completedCalls: repoSummaryData.calls.byStatus.find(s => s.status === 'completed')?.count || 0,
        failedCalls: repoSummaryData.calls.byStatus.filter(s => ['failed', 'busy', 'no-answer', 'canceled'].includes(s.status)).reduce((sum, s) => sum + s.count, 0),
        totalDuration: repoSummaryData.calls.totalDuration,
        averageDuration: repoSummaryData.calls.avgDuration,
        successRate: repoSummaryData.calls.successRate,
        trend: repoSummaryData.calls.trend // Trend is now directly under summary
      };
      
      // Prepare response data according to DashboardOverview interface
      const responseData = {
        summary: formattedSummary,
        // Assuming callVolume, callDuration, callOutcomes are needed based on DashboardOverview type
        // Fetching them here or adjusting the frontend might be necessary if they are strictly required by the component using this overview
        callVolume: [], // Placeholder - Fetch if needed
        callDuration: [], // Placeholder - Fetch if needed
        callOutcomes: repoSummaryData.calls.byOutcome.map(o => ({ ...o, percentage: repoSummaryData.calls.total > 0 ? Math.round((o.count / repoSummaryData.calls.total) * 100) : 0 })), // Map outcomes
        recentCalls: recentCallsData.calls, // Add recent calls here if needed by overview component
        sentimentAnalysis: { // Map sentiment data
           positive: sentimentData.distribution.find(s => s.sentiment === 'positive')?.count || 0,
           neutral: sentimentData.distribution.find(s => s.sentiment === 'neutral')?.count || 0,
           negative: sentimentData.distribution.find(s => s.sentiment === 'negative')?.count || 0,
        }
      };
      
      // Cache the data
      setCacheValue(cacheKey, responseData, CACHE_TTL);
      
      return {
        success: true,
        data: responseData,
        cached: false,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('[API] Error getting dashboard overview:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get dashboard overview',
        details: error.message
      });
    }
  });
  
  // Get call activity data
  fastify.get('/api/db/dashboard/activity', async (request, reply) => {
    try {
      const { period, days } = request.query;
      
      // Get call duration stats
      const durationStats = await analyticsRepository.getCallDurationStats(
        period || 'day',
        { limit: days ? parseInt(days) : 7 }
      );
      
      // Get call outcome distribution
      const outcomeDistribution = await analyticsRepository.getCallOutcomeDistribution();
      
      return {
        success: true,
        data: {
          durationStats,
          outcomeDistribution
        }
      };
    } catch (error) {
      console.error('[API] Error getting call activity data:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get call activity data',
        details: error.message
      });
    }
  });
  
  // Get call details with combined data
  fastify.get('/api/db/dashboard/call/:callSid', async (request, reply) => {
    try {
      const { callSid } = request.params;
      
      if (!callSid) {
        return reply.code(400).send({
          success: false,
          error: 'Call SID is required'
        });
      }
      
      // Generate cache key
      const cacheKey = `call_details_${callSid}`;
      
      // Use a medium TTL for call details (30 seconds)
      const CALL_DETAILS_CACHE_TTL = 30000;
      
      // Try to get data from cache
      const cachedData = getCacheValue(cacheKey);
      if (cachedData) {
        console.log(`[MongoDB] Using cached call details for ${callSid}`);
        return {
          success: true,
          data: cachedData,
          cached: true,
          timestamp: new Date().toISOString()
        };
      }
      
      console.log(`[MongoDB] Retrieving call details for ${callSid}`);
      
      // Get call details
      const call = await callRepository.getCallBySid(callSid);
      
      if (!call) {
        return reply.code(404).send({
          success: false,
          error: 'Call not found'
        });
      }
      
      // Get transcript
      const transcript = await transcriptRepository.getTranscriptByCallSid(callSid);
      
      // Get events timeline
      const events = await analyticsRepository.getCallEventsTimeline(callSid);
      
      // Prepare response data
      const responseData = {
        call,
        transcript,
        events: events.events,
        timestamp: new Date().toISOString()
      };
      
      // Cache the data
      setCacheValue(cacheKey, responseData, CALL_DETAILS_CACHE_TTL);
      
      return {
        success: true,
        data: responseData,
        cached: false
      };
    } catch (error) {
      console.error('[API] Error getting call details:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get call details',
        details: error.message
      });
    }
  });
  
  // Get real-time dashboard data
  fastify.get('/api/db/dashboard/realtime', async (request, reply) => {
    try {
      // Generate cache key
      const cacheKey = 'dashboard_realtime';
      
      // Use a shorter TTL for real-time data (15 seconds)
      const REALTIME_CACHE_TTL = 15000;
      
      // Try to get data from cache
      const cachedData = getCacheValue(cacheKey);
      if (cachedData) {
        console.log('[MongoDB] Using cached real-time dashboard data');
        return {
          success: true,
          data: {
            ...cachedData,
            timestamp: new Date().toISOString(),
            cached: true
          }
        };
      }
      
      console.log('[MongoDB] Generating real-time dashboard data');
      
      // Get active calls
      const activeCalls = await callRepository.getCallHistory({
        status: { $in: ['initiated', 'ringing', 'in-progress'] }
      }, {
        limit: 100,
        page: 1
      });
      
      // Get today's call stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayCalls = await callRepository.getCallHistory({
        createdAt: { $gte: today }
      }, {
        limit: 1000,
        page: 1
      });
      
      // Calculate today's stats
      const completedCalls = todayCalls.calls.filter(call => call.status === 'completed').length;
      const failedCalls = todayCalls.calls.filter(call => ['failed', 'busy', 'no-answer'].includes(call.status)).length;
      const totalDuration = todayCalls.calls.reduce((sum, call) => sum + (call.duration || 0), 0);
      const avgDuration = completedCalls > 0 ? Math.round(totalDuration / completedCalls) : 0;
      
      // Prepare response data
      const responseData = {
        activeCalls: activeCalls.calls,
        activeCallCount: activeCalls.pagination.total,
        todayStats: {
          totalCalls: todayCalls.pagination.total,
          completedCalls,
          failedCalls,
          totalDuration,
          avgDuration
        },
        timestamp: new Date().toISOString(),
        cached: false
      };
      
      // Cache the data
      setCacheValue(cacheKey, responseData, REALTIME_CACHE_TTL);
      
      return {
        success: true,
        data: responseData
      };
    } catch (error) {
      console.error('[API] Error getting real-time dashboard data:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get real-time dashboard data',
        details: error.message
      });
    }
  });
  
  console.log('[MongoDB] Registered dashboard API routes');
}

export default {
  registerDashboardApiRoutes
};
