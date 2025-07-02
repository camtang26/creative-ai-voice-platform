/**
 * Analytics API
 * Provides API endpoints for analytics and reporting
 */
import { getAnalyticsRepository, getCallRepository, getCampaignRepository } from '../index.js';
import { getCacheValue, setCacheValue } from '../utils/cache.js';
import enhancedAnalyticsRouter from './analytics-enhanced.js';

// Cache TTL in milliseconds
const CACHE_TTL = 60000; // 1 minute
const SHORT_CACHE_TTL = 30000; // 30 seconds

/**
 * Register analytics API routes
 * @param {Object} fastify - Fastify instance
 * @param {Object} options - Options
 */
export function registerAnalyticsApiRoutes(fastify, options = {}) {
  const analyticsRepository = getAnalyticsRepository();
  const callRepository = getCallRepository();
  const campaignRepository = getCampaignRepository();
  
  // Get call duration statistics
  fastify.get('/api/db/analytics/duration/:period', async (request, reply) => {
    try {
      const { period } = request.params;
      const { startDate, endDate, limit } = request.query;
      
      // Validate period
      if (!['day', 'week', 'month'].includes(period)) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid period. Must be one of: day, week, month'
        });
      }
      
      const stats = await analyticsRepository.getCallDurationStats(period, {
        startDate,
        endDate,
        limit: limit ? parseInt(limit) : 10
      });
      
      return {
        success: true,
        data: stats
      };
    } catch (error) {
      console.error('[API] Error getting call duration stats:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get call duration statistics',
        details: error.message
      });
    }
  });
  
  // Get call outcome distribution
  fastify.get('/api/db/analytics/outcomes', async (request, reply) => {
    try {
      const { startDate, endDate, period } = request.query;
      
      // Generate cache key
      const cacheKey = `outcomes_${startDate || 'all'}_${endDate || 'all'}_${period || 'all'}`;
      
      // Try to get data from cache
      const cachedData = getCacheValue(cacheKey);
      if (cachedData) {
        console.log('[MongoDB] Using cached outcome distribution data');
        return {
          success: true,
          data: cachedData,
          cached: true
        };
      }
      
      // If period is provided, get success rate analytics over time
      if (period) {
        const successRateData = await analyticsRepository.getSuccessRateAnalytics({
          startDate,
          endDate,
          period
        });
        
        // Cache the data
        setCacheValue(cacheKey, successRateData, CACHE_TTL);
        
        return {
          success: true,
          data: successRateData
        };
      }
      
      // Otherwise, get standard outcome distribution
      const distribution = await analyticsRepository.getCallOutcomeDistribution({
        startDate,
        endDate
      });
      
      // Cache the data
      setCacheValue(cacheKey, distribution, CACHE_TTL);
      
      return {
        success: true,
        data: distribution
      };
    } catch (error) {
      console.error('[API] Error getting call outcome distribution:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get call outcome distribution',
        details: error.message
      });
    }
  });
  
  // Get machine detection statistics
  fastify.get('/api/db/analytics/machine-detection', async (request, reply) => {
    try {
      const { startDate, endDate } = request.query;
      
      const stats = await analyticsRepository.getMachineDetectionStats({
        startDate,
        endDate
      });
      
      return {
        success: true,
        data: stats
      };
    } catch (error) {
      console.error('[API] Error getting machine detection stats:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get machine detection statistics',
        details: error.message
      });
    }
  });
  
  // Get conversation sentiment analysis
  fastify.get('/api/db/analytics/sentiment', async (request, reply) => {
    try {
      const { startDate, endDate } = request.query;
      
      const sentiment = await analyticsRepository.getConversationSentiment({
        startDate,
        endDate
      });
      
      return {
        success: true,
        data: sentiment
      };
    } catch (error) {
      console.error('[API] Error getting conversation sentiment:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get conversation sentiment analysis',
        details: error.message
      });
    }
  });
  
  // Get call events timeline
  fastify.get('/api/db/analytics/events/:callSid', async (request, reply) => {
    try {
      const { callSid } = request.params;
      
      if (!callSid) {
        return reply.code(400).send({
          success: false,
          error: 'Call SID is required'
        });
      }
      
      const timeline = await analyticsRepository.getCallEventsTimeline(callSid);
      
      return {
        success: true,
        data: timeline
      };
    } catch (error) {
      console.error('[API] Error getting call events timeline:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get call events timeline',
        details: error.message
      });
    }
  });
  
  // Get dashboard summary
  fastify.get('/api/db/analytics/dashboard', async (request, reply) => {
    try {
      const { period, days } = request.query;
      
      const summary = await analyticsRepository.getDashboardSummary({
        period: period || 'day',
        days: days ? parseInt(days) : 7
      });
      
      return {
        success: true,
        data: summary
      };
    } catch (error) {
      console.error('[API] Error getting dashboard summary:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get dashboard summary',
        details: error.message
      });
    }
  });
  
  // NEW ENDPOINTS
  
  // Get real-time analytics
  fastify.get('/api/db/analytics/real-time', async (request, reply) => {
    try {
      // Generate cache key
      const cacheKey = 'analytics_realtime';
      
      // Try to get data from cache
      const cachedData = getCacheValue(cacheKey);
      if (cachedData) {
        console.log('[MongoDB] Using cached real-time analytics data');
        return {
          success: true,
          data: {
            ...cachedData,
            timestamp: new Date().toISOString(),
            cached: true
          }
        };
      }
      
      console.log('[MongoDB] Generating real-time analytics data');
      
      // Get active calls
      const activeCalls = await callRepository.getActiveCalls();
      
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
      
      // Get recent calls
      const recentCalls = todayCalls.calls.slice(0, 5);
      
      // Prepare response data
      const responseData = {
        activeCallCount: activeCalls.length,
        activeCalls: activeCalls,
        recentCalls: recentCalls,
        todayStats: {
          totalCalls: todayCalls.pagination.total,
          completedCalls,
          failedCalls,
          totalDuration,
          avgDuration
        },
        timestamp: new Date().toISOString()
      };
      
      // Cache the data
      setCacheValue(cacheKey, responseData, SHORT_CACHE_TTL);
      
      return {
        success: true,
        data: responseData
      };
    } catch (error) {
      console.error('[API] Error getting real-time analytics:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get real-time analytics',
        details: error.message
      });
    }
  });
  
  // Get agent performance data
  fastify.get('/api/db/analytics/agents', async (request, reply) => {
    try {
      const { startDate, endDate } = request.query;
      
      // Generate cache key
      const cacheKey = `agents_${startDate || 'all'}_${endDate || 'all'}`;
      
      // Try to get data from cache
      const cachedData = getCacheValue(cacheKey);
      if (cachedData) {
        console.log('[MongoDB] Using cached agent performance data');
        return {
          success: true,
          data: cachedData,
          cached: true
        };
      }
      
      // Get agent performance data
      const agentPerformance = await analyticsRepository.getAgentPerformance({
        startDate,
        endDate
      });
      
      // Cache the data
      setCacheValue(cacheKey, agentPerformance, CACHE_TTL);
      
      return {
        success: true,
        data: agentPerformance
      };
    } catch (error) {
      console.error('[API] Error getting agent performance:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get agent performance data',
        details: error.message
      });
    }
  });
  
  // Get topic distribution data
  fastify.get('/api/db/analytics/topics', async (request, reply) => {
    try {
      const { startDate, endDate } = request.query;
      
      // Generate cache key
      const cacheKey = `topics_${startDate || 'all'}_${endDate || 'all'}`;
      
      // Try to get data from cache
      const cachedData = getCacheValue(cacheKey);
      if (cachedData) {
        console.log('[MongoDB] Using cached topic distribution data');
        return {
          success: true,
          data: cachedData,
          cached: true
        };
      }
      
      // Get topic distribution data
      const topicDistribution = await analyticsRepository.getTopicDistribution({
        startDate,
        endDate
      });
      
      // Cache the data
      setCacheValue(cacheKey, topicDistribution, CACHE_TTL);
      
      return {
        success: true,
        data: topicDistribution
      };
    } catch (error) {
      console.error('[API] Error getting topic distribution:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get topic distribution data',
        details: error.message
      });
    }
  });
  
  // Get campaign performance data
  fastify.get('/api/db/analytics/campaign/:campaignId/performance', async (request, reply) => {
    try {
      const { campaignId } = request.params;
      
      if (!campaignId) {
        return reply.code(400).send({
          success: false,
          error: 'Campaign ID is required'
        });
      }
      
      // Generate cache key
      const cacheKey = `campaign_performance_${campaignId}`;
      
      // Try to get data from cache
      const cachedData = getCacheValue(cacheKey);
      if (cachedData) {
        console.log(`[MongoDB] Using cached campaign performance data for ${campaignId}`);
        return {
          success: true,
          data: cachedData,
          cached: true
        };
      }
      
      // Get campaign
      const campaign = await campaignRepository.getCampaignById(campaignId);
      
      if (!campaign) {
        return reply.code(404).send({
          success: false,
          error: `Campaign not found with ID: ${campaignId}`
        });
      }
      
      // Get campaign calls
      const campaignCalls = await callRepository.getCallHistory({
        campaignId
      }, {
        limit: 1000,
        page: 1
      });
      
      // Calculate performance metrics
      const totalCalls = campaignCalls.pagination.total;
      const completedCalls = campaignCalls.calls.filter(call => call.status === 'completed').length;
      const successRate = totalCalls > 0 ? (completedCalls / totalCalls) * 100 : 0;
      const totalDuration = campaignCalls.calls.reduce((sum, call) => sum + (call.duration || 0), 0);
      const avgDuration = completedCalls > 0 ? Math.round(totalDuration / completedCalls) : 0;
      
      // Calculate calls per day
      const startDate = campaign.startDate ? new Date(campaign.startDate) : new Date(campaign.createdAt);
      const endDate = campaign.endDate || new Date();
      const daysDiff = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));
      const callsPerDay = Math.round(totalCalls / daysDiff);
      
      // Prepare performance data
      const performanceData = {
        campaignId,
        name: campaign.name,
        totalCalls,
        completedCalls,
        successRate: parseFloat(successRate.toFixed(1)),
        avgDuration,
        callsPerDay,
        status: campaign.status
      };
      
      // Cache the data
      setCacheValue(cacheKey, performanceData, CACHE_TTL);
      
      return {
        success: true,
        data: performanceData
      };
    } catch (error) {
      console.error('[API] Error getting campaign performance:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get campaign performance',
        details: error.message
      });
    }
  });
  
  // Generate analytics report
  fastify.post('/api/db/analytics/report', async (request, reply) => {
    try {
      const { type, startDate, endDate, format } = request.body;
      
      if (!type) {
        return reply.code(400).send({
          success: false,
          error: 'Report type is required'
        });
      }
      
      // Generate report based on type
      let reportData;
      
      switch (type) {
        case 'call_summary':
          reportData = await analyticsRepository.generateCallSummaryReport({
            startDate,
            endDate,
            format: format || 'json'
          });
          break;
        case 'agent_performance':
          reportData = await analyticsRepository.generateAgentPerformanceReport({
            startDate,
            endDate,
            format: format || 'json'
          });
          break;
        case 'campaign_performance':
          reportData = await analyticsRepository.generateCampaignPerformanceReport({
            startDate,
            endDate,
            format: format || 'json'
          });
          break;
        default:
          return reply.code(400).send({
            success: false,
            error: `Invalid report type: ${type}`
          });
      }
      
      return {
        success: true,
        data: reportData
      };
    } catch (error) {
      console.error('[API] Error generating analytics report:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to generate analytics report',
        details: error.message
      });
    }
  });
  
  // Get call volume data
  fastify.get('/api/db/analytics/call-volume', async (request, reply) => {
    try {
      const { startDate, endDate, period, groupBy } = request.query;
      
      // Generate cache key
      const cacheKey = `call_volume_${startDate || 'all'}_${endDate || 'all'}_${period || 'day'}_${groupBy || 'none'}`;
      
      // Try to get data from cache
      const cachedData = getCacheValue(cacheKey);
      if (cachedData) {
        console.log('[MongoDB] Using cached call volume data');
        return {
          success: true,
          data: cachedData,
          cached: true
        };
      }
      
      // Get call volume data
      const callVolumeData = await analyticsRepository.getCallVolumeData({
        startDate,
        endDate,
        period: period || 'day',
        groupBy: groupBy || 'status'
      });
      
      // Cache the data
      setCacheValue(cacheKey, callVolumeData, CACHE_TTL);
      
      return {
        success: true,
        data: callVolumeData
      };
    } catch (error) {
      console.error('[API] Error getting call volume data:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get call volume data',
        details: error.message
      });
    }
  });
  
  // Register enhanced analytics routes
  fastify.register(enhancedAnalyticsRouter);
  
  console.log('[MongoDB] Registered analytics API routes');
}

export default {
  registerAnalyticsApiRoutes
};