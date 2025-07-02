/**
 * Enhanced Analytics API with AI-powered analysis
 * Provides advanced analytics for selected calls with AI insights
 */
import { Router } from 'express';
import { getCallRepository, getRecordingRepository, getEventRepository } from '../index.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Anthropic } from '@anthropic-ai/sdk';

const router = Router();

/**
 * Analyze selected calls with comprehensive metrics
 * POST /api/db/analytics/analyze-calls
 * Body: { callSids: string[], reportType: 'detailed' | 'summary' }
 */
router.post('/analyze-calls', async (req, res) => {
  try {
    const { callSids, reportType = 'detailed' } = req.body;
    
    if (!callSids || !Array.isArray(callSids) || callSids.length === 0) {
      return res.status(400).json({ error: 'Please provide an array of call SIDs' });
    }
    
    console.log(`[Analytics] Analyzing ${callSids.length} calls...`);
    
    // Get repositories
    const callRepository = getCallRepository();
    const recordingRepository = getRecordingRepository();
    const eventRepository = getEventRepository();
    
    // Fetch all call data
    const calls = await Promise.all(
      callSids.map(async (callSid) => {
        const call = await callRepository.getCallBySid(callSid);
        if (!call) return null;
        
        // Get recordings and events for each call
        const recordings = await recordingRepository.getRecordingsByCallSid(callSid);
        const events = await eventRepository.getEventsByCallSid(callSid);
        
        return { ...call.toObject(), recordings, events };
      })
    );
    
    // Filter out null calls
    const validCalls = calls.filter(call => call !== null);
    
    // Calculate basic metrics
    const metrics = calculateCallMetrics(validCalls);
    
    // Get AI analysis if requested
    let aiAnalysis = null;
    if (reportType === 'detailed') {
      aiAnalysis = await generateAIAnalysis(validCalls, metrics);
    }
    
    res.json({
      success: true,
      data: {
        metrics,
        aiAnalysis,
        callCount: validCalls.length,
        reportGeneratedAt: new Date()
      }
    });
    
  } catch (error) {
    console.error('[Analytics] Error analyzing calls:', error);
    res.status(500).json({ error: 'Failed to analyze calls' });
  }
});

/**
 * Generate comprehensive report for campaign or time period
 * POST /api/db/analytics/generate-report
 * Body: { 
 *   campaignId?: string,
 *   startDate?: string,
 *   endDate?: string,
 *   format: 'json' | 'html' | 'pdf',
 *   includeTranscripts: boolean
 * }
 */
router.post('/generate-report', async (req, res) => {
  try {
    const { campaignId, startDate, endDate, format = 'json', includeTranscripts = false } = req.body;
    
    // Build query
    const query = {};
    if (campaignId) query.campaignId = campaignId;
    if (startDate || endDate) {
      query.startTime = {};
      if (startDate) query.startTime.$gte = new Date(startDate);
      if (endDate) query.startTime.$lte = new Date(endDate);
    }
    
    // Get calls
    const callRepository = getCallRepository();
    const callsResult = await callRepository.getCalls(query, { limit: 1000 });
    const calls = callsResult.calls;
    
    if (calls.length === 0) {
      return res.json({
        success: true,
        data: {
          message: 'No calls found for the specified criteria',
          metrics: {},
          callCount: 0
        }
      });
    }
    
    // Enhance calls with recordings and events
    const enhancedCalls = await Promise.all(
      calls.map(async (call) => {
        const recordings = await getRecordingRepository().getRecordingsByCallSid(call.callSid);
        const events = await getEventRepository().getEventsByCallSid(call.callSid);
        return { ...call.toObject(), recordings, events };
      })
    );
    
    // Calculate comprehensive metrics
    const metrics = calculateCallMetrics(enhancedCalls);
    const conversationAnalysis = analyzeConversations(enhancedCalls);
    
    // Generate AI insights
    const aiInsights = await generateAIInsights(enhancedCalls, metrics, conversationAnalysis);
    
    // Format report based on requested format
    let report;
    switch (format) {
      case 'html':
        report = generateHTMLReport(metrics, conversationAnalysis, aiInsights, enhancedCalls);
        res.setHeader('Content-Type', 'text/html');
        res.send(report);
        break;
      case 'pdf':
        // TODO: Implement PDF generation
        res.status(501).json({ error: 'PDF generation not yet implemented' });
        break;
      default:
        report = {
          success: true,
          data: {
            metrics,
            conversationAnalysis,
            aiInsights,
            callDetails: includeTranscripts ? enhancedCalls : undefined,
            generatedAt: new Date(),
            criteria: { campaignId, startDate, endDate }
          }
        };
        res.json(report);
    }
    
  } catch (error) {
    console.error('[Analytics] Error generating report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

/**
 * Get conversation quality metrics
 * POST /api/db/analytics/conversation-quality
 */
router.post('/conversation-quality', async (req, res) => {
  try {
    const { callSids } = req.body;
    
    if (!callSids || !Array.isArray(callSids)) {
      return res.status(400).json({ error: 'Please provide an array of call SIDs' });
    }
    
    const qualityMetrics = await analyzeConversationQuality(callSids);
    
    res.json({
      success: true,
      data: qualityMetrics
    });
    
  } catch (error) {
    console.error('[Analytics] Error analyzing conversation quality:', error);
    res.status(500).json({ error: 'Failed to analyze conversation quality' });
  }
});

// Helper Functions

function calculateCallMetrics(calls) {
  const totalCalls = calls.length;
  
  // Call outcome metrics
  const outcomes = {
    answered: 0,
    answeredByHuman: 0,
    answeredByMachine: 0,
    noAnswer: 0,
    busy: 0,
    failed: 0,
    completed: 0
  };
  
  // Duration metrics
  let totalDuration = 0;
  let totalAnsweredDuration = 0;
  let answeredCalls = 0;
  const durations = [];
  
  // Conversation metrics
  let totalTranscriptEvents = 0;
  let callsWithTranscripts = 0;
  
  calls.forEach(call => {
    // Outcome tracking
    if (call.status === 'completed') outcomes.completed++;
    if (call.status === 'failed') outcomes.failed++;
    if (call.status === 'busy') outcomes.busy++;
    if (call.status === 'no-answer') outcomes.noAnswer++;
    
    if (call.answeredBy) {
      outcomes.answered++;
      if (call.answeredBy === 'human') {
        outcomes.answeredByHuman++;
      } else if (call.answeredBy.includes('machine')) {
        outcomes.answeredByMachine++;
      }
    }
    
    // Duration tracking
    if (call.duration && call.duration > 0) {
      totalDuration += call.duration;
      durations.push(call.duration);
      
      if (call.answeredBy === 'human') {
        totalAnsweredDuration += call.duration;
        answeredCalls++;
      }
    }
    
    // Transcript analysis
    const transcriptEvents = call.events?.filter(e => 
      e.type === 'transcript' || 
      e.type === 'user_transcript' || 
      e.type === 'agent_transcript'
    ) || [];
    
    if (transcriptEvents.length > 0) {
      callsWithTranscripts++;
      totalTranscriptEvents += transcriptEvents.length;
    }
  });
  
  // Calculate rates
  const answerRate = totalCalls > 0 ? (outcomes.answered / totalCalls) * 100 : 0;
  const humanAnswerRate = totalCalls > 0 ? (outcomes.answeredByHuman / totalCalls) * 100 : 0;
  const machineDetectionRate = outcomes.answered > 0 ? (outcomes.answeredByMachine / outcomes.answered) * 100 : 0;
  const completionRate = outcomes.answeredByHuman > 0 ? (outcomes.completed / outcomes.answeredByHuman) * 100 : 0;
  
  // Duration statistics
  const avgDuration = durations.length > 0 ? totalDuration / durations.length : 0;
  const avgHumanCallDuration = answeredCalls > 0 ? totalAnsweredDuration / answeredCalls : 0;
  const medianDuration = durations.length > 0 ? getMedian(durations) : 0;
  
  // Conversation depth
  const avgConversationTurns = callsWithTranscripts > 0 ? totalTranscriptEvents / callsWithTranscripts : 0;
  
  return {
    summary: {
      totalCalls,
      answeredCalls: outcomes.answered,
      humanAnsweredCalls: outcomes.answeredByHuman,
      completedConversations: outcomes.completed
    },
    rates: {
      answerRate: Math.round(answerRate * 100) / 100,
      humanAnswerRate: Math.round(humanAnswerRate * 100) / 100,
      machineDetectionRate: Math.round(machineDetectionRate * 100) / 100,
      completionRate: Math.round(completionRate * 100) / 100
    },
    outcomes,
    duration: {
      total: Math.round(totalDuration),
      average: Math.round(avgDuration),
      averageHumanCall: Math.round(avgHumanCallDuration),
      median: Math.round(medianDuration),
      shortest: durations.length > 0 ? Math.min(...durations) : 0,
      longest: durations.length > 0 ? Math.max(...durations) : 0
    },
    conversation: {
      callsWithTranscripts,
      averageTurns: Math.round(avgConversationTurns * 10) / 10,
      transcriptCoverage: totalCalls > 0 ? Math.round((callsWithTranscripts / totalCalls) * 100) : 0
    }
  };
}

function analyzeConversations(calls) {
  const analysis = {
    totalConversations: 0,
    avgConversationLength: 0,
    topicsDiscussed: {},
    sentimentBreakdown: {
      positive: 0,
      neutral: 0,
      negative: 0
    },
    agentPerformance: {
      avgResponseTime: 0,
      questionsAsked: 0,
      objectionsHandled: 0
    }
  };
  
  // Analyze each call's transcript events
  calls.forEach(call => {
    const transcriptEvents = call.events?.filter(e => 
      ['transcript', 'user_transcript', 'agent_transcript'].includes(e.type)
    ) || [];
    
    if (transcriptEvents.length > 0) {
      analysis.totalConversations++;
      
      // Analyze conversation flow
      let conversationText = '';
      transcriptEvents.forEach(event => {
        if (event.data?.text) {
          conversationText += event.data.text + ' ';
        }
      });
      
      // Simple topic extraction (could be enhanced with NLP)
      const commonTopics = ['price', 'features', 'demo', 'trial', 'contract', 'support', 'integration'];
      commonTopics.forEach(topic => {
        if (conversationText.toLowerCase().includes(topic)) {
          analysis.topicsDiscussed[topic] = (analysis.topicsDiscussed[topic] || 0) + 1;
        }
      });
      
      // Simple sentiment analysis (could be enhanced with ML)
      const positiveWords = ['great', 'excellent', 'good', 'interested', 'yes', 'sure', 'perfect'];
      const negativeWords = ['not interested', 'no', 'bad', 'expensive', 'difficult', 'problem'];
      
      let sentiment = 'neutral';
      const lowerText = conversationText.toLowerCase();
      const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
      const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
      
      if (positiveCount > negativeCount) sentiment = 'positive';
      else if (negativeCount > positiveCount) sentiment = 'negative';
      
      analysis.sentimentBreakdown[sentiment]++;
    }
  });
  
  return analysis;
}

async function generateAIAnalysis(calls, metrics) {
  try {
    // Prepare data for AI analysis
    const analysisData = {
      callCount: calls.length,
      metrics: metrics,
      sampleConversations: calls.slice(0, 5).map(call => ({
        duration: call.duration,
        outcome: call.status,
        answeredBy: call.answeredBy,
        transcriptCount: call.events?.filter(e => e.type.includes('transcript')).length || 0
      }))
    };
    
    // Use Gemini for analysis (you can switch to Claude if preferred)
    if (process.env.GEMINI_API_KEY) {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
      
      const prompt = `Analyze this call campaign data and provide insights:
      
      ${JSON.stringify(analysisData, null, 2)}
      
      Please provide:
      1. Key performance insights
      2. Areas for improvement
      3. Recommendations for better conversion rates
      4. Notable patterns or anomalies
      
      Format as a professional report with clear sections.`;
      
      const result = await model.generateContent(prompt);
      return result.response.text();
    }
    
    // Fallback to rule-based insights if no AI API key
    return generateRuleBasedInsights(metrics);
    
  } catch (error) {
    console.error('[Analytics] AI analysis error:', error);
    return generateRuleBasedInsights(metrics);
  }
}

async function generateAIInsights(calls, metrics, conversationAnalysis) {
  try {
    const insights = {
      performanceSummary: '',
      recommendations: [],
      anomalies: [],
      predictiveAnalysis: ''
    };
    
    // Generate performance summary
    if (metrics.rates.humanAnswerRate < 20) {
      insights.recommendations.push('Low human answer rate detected. Consider calling during different hours or verifying phone number quality.');
    }
    
    if (metrics.duration.averageHumanCall < 30) {
      insights.recommendations.push('Very short average call duration. Calls may be ending prematurely.');
    }
    
    if (metrics.rates.machineDetectionRate > 40) {
      insights.recommendations.push('High percentage of answering machines. Consider time-of-day optimization.');
    }
    
    // Set performance summary
    const performance = metrics.rates.humanAnswerRate >= 30 ? 'good' : 
                       metrics.rates.humanAnswerRate >= 20 ? 'moderate' : 'needs improvement';
    
    insights.performanceSummary = `Campaign performance is ${performance} with ${metrics.rates.humanAnswerRate}% human answer rate and ${metrics.rates.completionRate}% completion rate.`;
    
    return insights;
    
  } catch (error) {
    console.error('[Analytics] Error generating AI insights:', error);
    return null;
  }
}

async function analyzeConversationQuality(callSids) {
  const callRepository = getCallRepository();
  const eventRepository = getEventRepository();
  
  const qualityMetrics = await Promise.all(
    callSids.map(async (callSid) => {
      const call = await callRepository.getCallBySid(callSid);
      const events = await eventRepository.getEventsByCallSid(callSid);
      
      const transcripts = events.filter(e => e.type.includes('transcript'));
      
      return {
        callSid,
        conversationLength: transcripts.length,
        avgResponseTime: calculateAvgResponseTime(events),
        completionStatus: call?.terminatedBy || 'unknown',
        duration: call?.duration || 0
      };
    })
  );
  
  return qualityMetrics;
}

function calculateAvgResponseTime(events) {
  // Calculate average time between user and agent messages
  let totalResponseTime = 0;
  let responseCount = 0;
  
  for (let i = 1; i < events.length; i++) {
    if (events[i].type === 'agent_transcript' && events[i-1].type === 'user_transcript') {
      const timeDiff = new Date(events[i].timestamp) - new Date(events[i-1].timestamp);
      totalResponseTime += timeDiff;
      responseCount++;
    }
  }
  
  return responseCount > 0 ? Math.round(totalResponseTime / responseCount / 1000) : 0; // in seconds
}

function generateHTMLReport(metrics, conversationAnalysis, aiInsights, calls) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Call Analytics Report</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .metric-card { background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .metric-value { font-size: 2em; font-weight: bold; color: #2563eb; }
        .section { margin-bottom: 40px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        th { background: #f9fafb; font-weight: bold; }
        .chart { height: 300px; background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Call Analytics Report</h1>
        <p>Generated on ${new Date().toLocaleDateString()}</p>
      </div>
      
      <div class="section">
        <h2>Executive Summary</h2>
        <div class="metric-card">
          <p>${aiInsights?.performanceSummary || 'No summary available'}</p>
        </div>
      </div>
      
      <div class="section">
        <h2>Key Metrics</h2>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
          <div class="metric-card">
            <div class="metric-value">${metrics.summary.totalCalls}</div>
            <div>Total Calls</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${metrics.rates.humanAnswerRate}%</div>
            <div>Human Answer Rate</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${Math.round(metrics.duration.averageHumanCall)}s</div>
            <div>Avg Call Duration</div>
          </div>
        </div>
      </div>
      
      <div class="section">
        <h2>Call Outcomes</h2>
        <table>
          <tr>
            <th>Outcome</th>
            <th>Count</th>
            <th>Percentage</th>
          </tr>
          <tr>
            <td>Answered by Human</td>
            <td>${metrics.outcomes.answeredByHuman}</td>
            <td>${Math.round((metrics.outcomes.answeredByHuman / metrics.summary.totalCalls) * 100)}%</td>
          </tr>
          <tr>
            <td>Answered by Machine</td>
            <td>${metrics.outcomes.answeredByMachine}</td>
            <td>${Math.round((metrics.outcomes.answeredByMachine / metrics.summary.totalCalls) * 100)}%</td>
          </tr>
          <tr>
            <td>No Answer</td>
            <td>${metrics.outcomes.noAnswer}</td>
            <td>${Math.round((metrics.outcomes.noAnswer / metrics.summary.totalCalls) * 100)}%</td>
          </tr>
          <tr>
            <td>Busy</td>
            <td>${metrics.outcomes.busy}</td>
            <td>${Math.round((metrics.outcomes.busy / metrics.summary.totalCalls) * 100)}%</td>
          </tr>
        </table>
      </div>
      
      <div class="section">
        <h2>Conversation Analysis</h2>
        <div class="metric-card">
          <p>Total Conversations: ${conversationAnalysis.totalConversations}</p>
          <p>Average Conversation Turns: ${conversationAnalysis.averageTurns || 0}</p>
          <h3>Topics Discussed:</h3>
          <ul>
            ${Object.entries(conversationAnalysis.topicsDiscussed)
              .map(([topic, count]) => `<li>${topic}: ${count} mentions</li>`)
              .join('')}
          </ul>
        </div>
      </div>
      
      <div class="section">
        <h2>Recommendations</h2>
        <ul>
          ${aiInsights?.recommendations?.map(rec => `<li>${rec}</li>`).join('') || '<li>No recommendations available</li>'}
        </ul>
      </div>
    </body>
    </html>
  `;
}

function generateRuleBasedInsights(metrics) {
  const insights = [];
  
  if (metrics.rates.humanAnswerRate < 20) {
    insights.push('• Low human answer rate detected. Consider optimizing call times.');
  }
  
  if (metrics.rates.machineDetectionRate > 50) {
    insights.push('• High machine detection rate. Many calls reaching voicemail.');
  }
  
  if (metrics.duration.averageHumanCall < 30) {
    insights.push('• Short average call duration may indicate early hang-ups.');
  }
  
  if (metrics.rates.completionRate < 50) {
    insights.push('• Low completion rate suggests conversations are not reaching natural conclusion.');
  }
  
  return insights.join('\n');
}

function getMedian(values) {
  if (values.length === 0) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
}

export default router;