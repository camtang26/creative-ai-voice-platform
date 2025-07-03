/**
 * Test script to see what data Twilio actually provides for calls
 */

import twilio from 'twilio';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Call from './db/models/call.model.js';

dotenv.config();

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

async function testTwilioCallData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[MongoDB] Connected');
    
    // Get a sample call from the database
    const sampleCall = await Call.findOne({ 
      callSid: 'CA017a0d86bc615185f64a560957ddd213' // The specific call you mentioned
    });
    
    if (!sampleCall) {
      console.log('[Error] Sample call not found in database');
      return;
    }
    
    console.log('\n[Database Record]');
    console.log(`Call SID: ${sampleCall.callSid}`);
    console.log(`Status: ${sampleCall.status}`);
    console.log(`Terminated By: ${sampleCall.terminatedBy}`);
    console.log(`Duration: ${sampleCall.duration}`);
    
    // Fetch call details from Twilio
    console.log('\n[Fetching Twilio Call Details...]');
    const callDetails = await twilioClient.calls(sampleCall.callSid).fetch();
    
    console.log('\n[Twilio Call Details]');
    console.log(`Direction: ${callDetails.direction}`);
    console.log(`Duration: ${callDetails.duration}`);
    console.log(`Status: ${callDetails.status}`);
    console.log(`Price: ${callDetails.price}`);
    console.log(`AnsweredBy: ${callDetails.answeredBy}`);
    console.log(`From: ${callDetails.from}`);
    console.log(`To: ${callDetails.to}`);
    console.log(`Start Time: ${callDetails.startTime}`);
    console.log(`End Time: ${callDetails.endTime}`);
    
    // Check for additional properties
    console.log('\n[All Available Properties]');
    Object.keys(callDetails).forEach(key => {
      if (!['_solution', '_uri', '_context'].includes(key)) {
        console.log(`${key}: ${JSON.stringify(callDetails[key])}`);
      }
    });
    
    // Check subresource URIs
    console.log('\n[Subresource URIs]');
    if (callDetails.subresourceUris) {
      Object.keys(callDetails.subresourceUris).forEach(key => {
        console.log(`${key}: ${callDetails.subresourceUris[key]}`);
      });
    }
    
    // Try to fetch events
    console.log('\n[Fetching Call Events...]');
    try {
      const events = await twilioClient.calls(sampleCall.callSid).events.list({ limit: 10 });
      console.log(`Found ${events.length} events`);
      events.forEach(event => {
        console.log(`- ${event.timestamp}: ${event.eventType} - ${JSON.stringify(event.eventData)}`);
      });
    } catch (error) {
      console.log('Events not available:', error.message);
    }
    
    // Try Voice Insights Summary endpoint
    console.log('\n[Trying Voice Insights Summary...]');
    try {
      // Construct the URL manually
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const insightsUrl = `https://insights.twilio.com/v1/Voice/${sampleCall.callSid}/Summary`;
      
      const response = await fetch(insightsUrl, {
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64')
        }
      });
      
      if (response.ok) {
        const insightsData = await response.json();
        console.log('Voice Insights available!');
        console.log(JSON.stringify(insightsData, null, 2));
      } else {
        console.log(`Voice Insights not available: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.log('Voice Insights error:', error.message);
    }
    
  } catch (error) {
    console.error('[Error]', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n[MongoDB] Connection closed');
  }
}

testTwilioCallData();