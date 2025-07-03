import twilio from 'twilio';
import Call from './db/models/call.model.js';
import { initializeMongoDB } from './db/connection.js';
import dotenv from 'dotenv';

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

/**
 * Determine who terminated the call based on Twilio data
 * Unfortunately, Twilio doesn't provide a direct "who hung up" field in the standard API
 * We need to use heuristics based on call duration, status, and other factors
 */
function determineTerminator(twilioCall) {
  // If call wasn't answered, it was system terminated
  if (!twilioCall.answeredBy || twilioCall.answeredBy === 'machine_start' || 
      twilioCall.status === 'no-answer' || twilioCall.status === 'busy' || 
      twilioCall.status === 'failed') {
    return 'system';
  }
  
  // For very short calls (under 5 seconds), likely the callee hung up immediately
  if (twilioCall.duration && parseInt(twilioCall.duration) < 5) {
    return 'callee';
  }
  
  // For calls that completed normally, we need to check other factors
  // Since we can't get the actual "who hung up" from standard API,
  // we'll need to look at the conversation context or default to a reasonable assumption
  
  // Default assumption: if call lasted more than 30 seconds, likely ended naturally
  // This is not accurate but without Voice Insights, it's our best guess
  if (twilioCall.duration && parseInt(twilioCall.duration) > 30) {
    return 'agent';  // Assume AI agent completed the conversation
  }
  
  // For medium duration calls (5-30 seconds), harder to determine
  // Default to callee as people often hang up on AI
  return 'callee';
}

async function updateCallsWithTwilioData() {
  console.log('Starting Twilio data fetch for terminated by field...');
  
  try {
    await initializeMongoDB();
    
    // Get the specific call the user mentioned
    const testCallSid = 'CA017a0d86bc615185f64a560957ddd213';
    
    console.log(`\nFetching detailed data for test call ${testCallSid}...`);
    
    try {
      // Fetch the call from Twilio
      const twilioCall = await client.calls(testCallSid).fetch();
      
      console.log('\nTwilio Call Data:');
      console.log('================');
      console.log(`SID: ${twilioCall.sid}`);
      console.log(`Status: ${twilioCall.status}`);
      console.log(`Direction: ${twilioCall.direction}`);
      console.log(`Duration: ${twilioCall.duration}s`);
      console.log(`Answered By: ${twilioCall.answeredBy}`);
      console.log(`From: ${twilioCall.from}`);
      console.log(`To: ${twilioCall.to}`);
      console.log(`Start Time: ${twilioCall.startTime}`);
      console.log(`End Time: ${twilioCall.endTime}`);
      console.log(`Price: ${twilioCall.price}`);
      
      // Log all available properties
      console.log('\nAll available properties:');
      console.log(Object.keys(twilioCall).join(', '));
      
      // Check if there are any subresources we can access
      console.log('\nChecking for call events...');
      try {
        const events = await client.monitor.v1.events.list({
          resourceSid: testCallSid,
          limit: 20
        });
        
        if (events.length > 0) {
          console.log(`\nFound ${events.length} events:`);
          events.forEach(event => {
            console.log(`- ${event.eventDate}: ${event.eventType} - ${event.description}`);
            if (event.eventData) {
              console.log(`  Data: ${JSON.stringify(event.eventData)}`);
            }
          });
        } else {
          console.log('No events found for this call');
        }
      } catch (eventError) {
        console.log('Could not fetch events:', eventError.message);
      }
      
      // Try to access call feedback if available
      console.log('\nChecking for call feedback...');
      try {
        const feedback = await client.calls(testCallSid).feedback.fetch();
        console.log('Feedback found:', feedback);
      } catch (feedbackError) {
        console.log('No feedback available:', feedbackError.message);
      }
      
      // Determine who terminated based on available data
      const terminator = determineTerminator(twilioCall);
      console.log(`\nBased on available data, determined terminator: ${terminator}`);
      console.log('Note: This is a heuristic guess since Twilio standard API does not provide "who hung up" data');
      
      // Update in database
      const dbCall = await Call.findOne({ callSid: testCallSid });
      if (dbCall) {
        console.log(`\nCurrent DB value: ${dbCall.terminatedBy}`);
        console.log('The user said Twilio shows this was terminated by: callee');
        console.log('This confirms we need Voice Insights or another method to get accurate data');
      }
      
    } catch (error) {
      console.error('Error fetching call:', error);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

updateCallsWithTwilioData();