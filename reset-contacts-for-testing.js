/**
 * Reset Contacts for Testing
 * 
 * This script resets all contacts with your phone number to allow testing
 * Run this to clear the callCount and status so campaigns can call again
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Contact from './db/models/contact.model.js';

dotenv.config();

async function resetContacts() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Find all contacts with Cameron's number
    const phoneNumbers = [
      '61404713440',  // Without +
      '+61404713440', // With +
      '0404713440'    // Local format
    ];
    
    for (const phoneNumber of phoneNumbers) {
      const result = await Contact.updateMany(
        { phoneNumber: phoneNumber },
        { 
          $set: { 
            callCount: 0,
            status: 'pending',
            lastCallResult: null,
            lastCallDate: null,
            lastCallError: null
          }
        }
      );
      
      if (result.modifiedCount > 0) {
        console.log(`Reset ${result.modifiedCount} contact(s) with phone number: ${phoneNumber}`);
      }
    }
    
    // Also find any contacts with high callCount
    const highCallContacts = await Contact.find({ callCount: { $gt: 0 } });
    console.log(`\nFound ${highCallContacts.length} contacts with callCount > 0:`);
    
    for (const contact of highCallContacts) {
      console.log(`- ${contact.name || 'Unknown'} (${contact.phoneNumber}): callCount=${contact.callCount}, status=${contact.status}`);
      
      // Reset them
      await Contact.updateOne(
        { _id: contact._id },
        { 
          $set: { 
            callCount: 0,
            status: 'pending',
            lastCallResult: null,
            lastCallDate: null,
            lastCallError: null
          }
        }
      );
    }
    
    console.log('\n✅ All contacts have been reset for testing');
    
  } catch (error) {
    console.error('Error resetting contacts:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the reset
resetContacts();