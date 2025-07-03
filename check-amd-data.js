import mongoose from 'mongoose';
import Call from './db/models/call.model.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkAMDData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://aighostwriter001:bXKZasjqOIHWy7s7@aicluster01.bpmde.mongodb.net/twilio-elevenlabs?retryWrites=true&w=majority&appName=AICluster01');
    console.log('Connected to MongoDB');

    // Find recent calls
    const recentCalls = await Call.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .select('callSid answeredBy terminatedBy machineBehavior enhancedAnsweredBy amdConfidence terminationReason terminationSource createdAt status');

    console.log('\n=== Recent Calls AMD/Termination Data ===\n');
    
    recentCalls.forEach((call, index) => {
      console.log(`Call ${index + 1}: ${call.callSid}`);
      console.log(`  Created: ${call.createdAt}`);
      console.log(`  Status: ${call.status}`);
      console.log(`  AnsweredBy: ${call.answeredBy || 'NOT SET'}`);
      console.log(`  EnhancedAnsweredBy: ${call.enhancedAnsweredBy || 'NOT SET'}`);
      console.log(`  AMD Confidence: ${call.amdConfidence || 'NOT SET'}`);
      console.log(`  MachineBehavior: ${call.machineBehavior || 'NOT SET'}`);
      console.log(`  TerminatedBy: ${call.terminatedBy || 'NOT SET'}`);
      console.log(`  TerminationReason: ${call.terminationReason || 'NOT SET'}`);
      console.log(`  TerminationSource: ${call.terminationSource || 'NOT SET'}`);
      console.log('---');
    });

    // Count calls with AMD data
    const totalCalls = await Call.countDocuments();
    const callsWithAnsweredBy = await Call.countDocuments({ answeredBy: { $exists: true, $ne: null } });
    const callsWithTerminatedBy = await Call.countDocuments({ terminatedBy: { $exists: true, $ne: null } });

    console.log('\n=== Statistics ===');
    console.log(`Total calls: ${totalCalls}`);
    console.log(`Calls with answeredBy data: ${callsWithAnsweredBy} (${(callsWithAnsweredBy/totalCalls*100).toFixed(2)}%)`);
    console.log(`Calls with terminatedBy data: ${callsWithTerminatedBy} (${(callsWithTerminatedBy/totalCalls*100).toFixed(2)}%)`);

    // Check if fields exist in schema
    console.log('\n=== Schema Check ===');
    const schemaPaths = Call.schema.paths;
    console.log(`answeredBy in schema: ${!!schemaPaths.answeredBy}`);
    console.log(`terminatedBy in schema: ${!!schemaPaths.terminatedBy}`);
    console.log(`enhancedAnsweredBy in schema: ${!!schemaPaths.enhancedAnsweredBy}`);
    console.log(`amdConfidence in schema: ${!!schemaPaths.amdConfidence}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

checkAMDData();