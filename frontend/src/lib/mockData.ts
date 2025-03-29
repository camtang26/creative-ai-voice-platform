// Mock data for frontend development while backend integration is completed

export const mockCallStats = {
  success: true,
  stats: {
    totalCalls: 32,
    callsByStatus: {
      'in-progress': 3,
      'completed': 24,
      'failed': 3,
      'busy': 1,
      'no-answer': 1
    },
    activeCalls: [
      {
        sid: 'CA8c7f9b5efdee0a93d536b32e3865112c',
        status: 'in-progress',
        to: '+61400000000',
        from: '+61499999999',
        startTime: new Date(Date.now() - 123000).toISOString(),
        duration: 123,
        recordingCount: 1,
        answeredBy: 'human'
      },
      {
        sid: 'CA9d8e0c6fee1f1b04e647c43f4976223d',
        status: 'in-progress',
        to: '+61411111111',
        from: '+61499999999',
        startTime: new Date(Date.now() - 67000).toISOString(),
        duration: 67,
        recordingCount: 1,
        answeredBy: 'human'
      },
      {
        sid: 'CA0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5',
        status: 'ringing',
        to: '+61422222222',
        from: '+61499999999',
        startTime: new Date(Date.now() - 15000).toISOString(),
        duration: 15,
        recordingCount: 0,
        answeredBy: null
      }
    ],
    completedCalls: [
      // Mock data for completed calls would go here
    ]
  },
  timestamp: new Date().toISOString()
};

export const mockCallDetail = (callSid: string) => ({
  success: true,
  callInfo: {
    sid: callSid,
    status: 'in-progress',
    from: '+61499999999',
    to: '+61400000000',
    duration: 120,
    startTime: new Date(Date.now() - 120000).toISOString(),
    endTime: null,
    recordings: [
      {
        sid: 'RE1a2b3c4d5e6f7g8h9i0j',
        url: 'https://api.twilio.com/2010-04-01/Accounts/AC1234567890/Recordings/RE1a2b3c4d5e6f7g8h9i0j.mp3',
        duration: 60,
        timestamp: new Date(Date.now() - 60000).toISOString()
      }
    ]
  }
});

export const mockRecordings = (callSid: string) => ({
  success: true,
  callSid,
  recordingCount: 1,
  recordings: [
    {
      sid: 'RE1a2b3c4d5e6f7g8h9i0j',
      url: 'https://api.twilio.com/2010-04-01/Accounts/AC1234567890/Recordings/RE1a2b3c4d5e6f7g8h9i0j.mp3',
      mp3Url: 'https://api.twilio.com/2010-04-01/Accounts/AC1234567890/Recordings/RE1a2b3c4d5e6f7g8h9i0j.mp3',
      wavUrl: 'https://api.twilio.com/2010-04-01/Accounts/AC1234567890/Recordings/RE1a2b3c4d5e6f7g8h9i0j.wav',
      duration: 60,
      channels: 'dual',
      status: 'completed',
      timestamp: new Date(Date.now() - 60000).toISOString()
    }
  ],
  fromCache: true
});

export const mockCallMetrics = (callSid: string) => ({
  success: true,
  callSid,
  metrics: {
    available: true,
    basic: {
      duration: 120,
      startTime: new Date(Date.now() - 120000).toISOString(),
      endTime: new Date().toISOString(),
      status: 'completed',
      direction: 'outbound-api',
      answeredBy: 'human',
      from: '+61499999999',
      to: '+61400000000'
    },
    advanced: {
      jitter: 15,
      mos: 4.2,
      latency: 120,
      packetLoss: 0.01,
      warnings: []
    }
  },
  fromCache: true
});

export const mockTerminateResponse = {
  success: true,
  message: 'Call terminated successfully'
};

export const mockMakeCallResponse = {
  success: true,
  message: 'Call initiated',
  callSid: 'CA' + Math.random().toString(36).substring(2, 15),
  timing: {
    total: 1200,
    signedUrl: 300,
    dynamicVars: 100,
    twilioCall: 800
  }
};

// Mock data for analytics
export const mockConversationAnalytics = {
  success: true,
  data: Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - 13 + i);
    
    return {
      conversation_id: `conv-${i}`,
      call_sid: `CA${i}`,
      quality_score: 80 + Math.random() * 10,
      duration: 120 + Math.floor(Math.random() * 240),
      date: date.toISOString(),
      agent_id: 'agent-1',
      success_rate: 65 + Math.random() * 15,
      completion_rate: 75 + Math.random() * 10,
      messages_count: {
        user: 5 + Math.floor(Math.random() * 10),
        agent: 6 + Math.floor(Math.random() * 10),
        total: 11 + Math.floor(Math.random() * 20)
      },
      sentiment_analysis: {
        overall: 0.6 + Math.random() * 0.3,
        user: 0.5 + Math.random() * 0.4,
        agent: 0.7 + Math.random() * 0.2
      },
      topics: ['pricing', 'features', 'support']
    };
  })
};

// Mock campaign data
export const mockCampaigns = {
  success: true,
  campaigns: Array.from({ length: 5 }, (_, i) => ({
    id: `campaign-${i}`,
    name: `Test Campaign ${i+1}`,
    description: `Description for campaign ${i+1}`,
    sheet_id: `sheet-${i}`,
    prompt_template: 'You are a sales agent for our company...',
    first_message_template: 'Hello, this is an AI assistant calling from...',
    status: ['draft', 'scheduled', 'in-progress', 'completed', 'paused'][i],
    created_at: new Date(Date.now() - i * 86400000).toISOString()
  }))
};

// Mock report data
export const mockReports = {
  success: true,
  reports: Array.from({ length: 3 }, (_, i) => ({
    id: `report-${i}`,
    name: `Report ${i+1}`,
    description: `Description for report ${i+1}`,
    type: ['analytics', 'campaign', 'custom'][i % 3],
    timeframe: {
      start_date: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
      end_date: new Date().toISOString().split('T')[0],
      resolution: 'day'
    },
    metrics: ['quality_score', 'success_rate', 'duration'],
    visualization_type: ['table', 'bar', 'line'][i % 3],
    created_at: new Date(Date.now() - i * 86400000).toISOString()
  }))
};
