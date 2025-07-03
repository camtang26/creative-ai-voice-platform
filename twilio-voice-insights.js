import axios from 'axios';

/**
 * Get Voice Insights data from Twilio
 * Voice Insights provides detailed metrics about calls including who hung up
 */
export async function getTerminationFromVoiceInsights(twilioClient, callSid) {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    // Voice Insights API endpoint
    const url = `https://insights.twilio.com/v1/Voice/${callSid}/Summary`;
    
    console.log(`[Voice Insights] Fetching data for ${callSid}...`);
    
    const response = await axios.get(url, {
      auth: {
        username: accountSid,
        password: authToken
      }
    });
    
    console.log(`[Voice Insights] Response for ${callSid}:`, JSON.stringify(response.data, null, 2));
    
    // Extract who hung up from Voice Insights
    const whoHungUp = response.data?.call_state?.who_hung_up || 
                      response.data?.attributes?.who_hung_up ||
                      response.data?.who_hung_up;
    
    if (whoHungUp) {
      console.log(`[Voice Insights] Found who hung up: ${whoHungUp}`);
      return {
        available: true,
        whoHungUp: whoHungUp.toLowerCase() // Normalize to lowercase
      };
    }
    
    return {
      available: false,
      whoHungUp: null
    };
    
  } catch (error) {
    console.error(`[Voice Insights] Error fetching data for ${callSid}:`, error.message);
    
    // If it's a 404, Voice Insights might not be available for this call
    if (error.response && error.response.status === 404) {
      console.log(`[Voice Insights] No data available for ${callSid}`);
    }
    
    return {
      available: false,
      whoHungUp: null,
      error: error.message
    };
  }
}

/**
 * Alternative approach: Use the regular Twilio API to check for additional call properties
 */
export async function getCallDetailsFromTwilio(twilioClient, callSid) {
  try {
    console.log(`[Twilio API] Fetching call details for ${callSid}...`);
    
    // Fetch the call
    const call = await twilioClient.calls(callSid).fetch();
    
    // Log all available properties
    console.log(`[Twilio API] Call properties:`, Object.keys(call));
    
    // Check if there's any termination info in the call object
    const possibleTerminationFields = [
      'whoHungUp',
      'who_hung_up',
      'terminatedBy',
      'terminated_by',
      'endedBy',
      'ended_by',
      'disconnectedBy',
      'disconnected_by'
    ];
    
    for (const field of possibleTerminationFields) {
      if (call[field]) {
        console.log(`[Twilio API] Found termination field ${field}: ${call[field]}`);
        return {
          available: true,
          whoHungUp: call[field].toLowerCase()
        };
      }
    }
    
    // Try to fetch call events which might contain termination info
    try {
      const events = await twilioClient.calls(callSid).events.list({ limit: 50 });
      console.log(`[Twilio API] Found ${events.length} events for call`);
      
      // Look for termination-related events
      const terminationEvent = events.find(event => 
        event.name && (
          event.name.toLowerCase().includes('disconnect') ||
          event.name.toLowerCase().includes('hangup') ||
          event.name.toLowerCase().includes('complete') ||
          event.name.toLowerCase().includes('terminate')
        )
      );
      
      if (terminationEvent) {
        console.log(`[Twilio API] Found termination event:`, terminationEvent);
        // Try to extract who initiated from event data
        if (terminationEvent.data) {
          const data = typeof terminationEvent.data === 'string' ? 
            JSON.parse(terminationEvent.data) : terminationEvent.data;
          
          if (data.initiated_by || data.initiatedBy || data.who_hung_up || data.whoHungUp) {
            const whoHungUp = data.initiated_by || data.initiatedBy || data.who_hung_up || data.whoHungUp;
            return {
              available: true,
              whoHungUp: whoHungUp.toLowerCase()
            };
          }
        }
      }
    } catch (eventError) {
      console.log(`[Twilio API] Could not fetch events:`, eventError.message);
    }
    
    return {
      available: false,
      whoHungUp: null
    };
    
  } catch (error) {
    console.error(`[Twilio API] Error fetching call details:`, error.message);
    return {
      available: false,
      whoHungUp: null,
      error: error.message
    };
  }
}