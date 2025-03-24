import crypto from 'crypto';
import fetch from 'node-fetch';

// Helper function to verify the webhook signature from ElevenLabs
export function verifyWebhookSignature(payload, signature, secret) {
  try {
    if (!secret || !signature) {
      console.log('[Webhook] No secret or signature provided, skipping validation');
      return true; // Skip validation if no secret provided
    }
    
    // Extract timestamp and hash from the signature
    const [timestampPart, hashPart] = signature.split(',');
    const timestamp = timestampPart.replace('t=', '');
    const receivedHash = hashPart.replace('v0=', '');
    
    // Calculate the expected hash
    const fullPayloadToSign = `${timestamp}.${typeof payload === 'string' ? payload : JSON.stringify(payload)}`;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(fullPayloadToSign);
    const calculatedHash = 'v0=' + hmac.digest('hex');
    
    // Verify the hash
    return receivedHash === calculatedHash;
  } catch (error) {
    console.error('[Webhook] Signature verification error:', error.message);
    return false;
  }
}

// Helper function to determine call status
export function determineCallStatus(webhookData) {
  try {
    const { transcript, analysis } = webhookData.data || {};
    
    // If analysis has a call_successful field, use that
    if (analysis && analysis.call_successful) {
      return analysis.call_successful === 'success' ? 'held' : 'failed';
    }
    
    // If there are user messages in the transcript, the call was held
    if (transcript && transcript.some(msg => msg.role === 'user' && msg.message)) {
      return 'held';
    }
    
    // Check for voicemail or no answer
    const voicemailIndicators = ['voicemail', 'leave a message', 'after the tone'];
    const lastAgentMessage = transcript ? 
      transcript.filter(msg => msg.role === 'agent').pop()?.message : '';
    
    if (lastAgentMessage && 
        voicemailIndicators.some(indicator => 
          lastAgentMessage.toLowerCase().includes(indicator))) {
      return 'voicemail';
    }
    
    // If there are no user messages and it's not identified as voicemail, it's no answer
    return 'no answer';
  } catch (error) {
    console.error('[Webhook] Error determining call status:', error);
    return 'unknown';
  }
}

// Helper function to extract the name from conversation data
export function extractName(webhookData) {
  try {
    // Try to get name from dynamic variables
    const dynamicVars = webhookData.data?.conversation_initiation_client_data?.dynamic_variables;
    if (dynamicVars && dynamicVars.name) {
      return dynamicVars.name;
    }
    
    if (dynamicVars && dynamicVars.contact_name) {
      return dynamicVars.contact_name;
    }
    
    // Fall back to extracting name from transcript
    if (webhookData.data?.transcript) {
      // Look for greeting patterns like "Hello, John" in the agent messages
      for (const message of webhookData.data.transcript) {
        if (message.role === 'agent' && message.message) {
          // Simple regex to try to find names in greetings
          const nameMatch = message.message.match(/(?:hello|hi|hey|greetings)[,\s]+([a-zA-Z]+)/i);
          if (nameMatch && nameMatch[1]) {
            return nameMatch[1];
          }
        }
      }
    }
    
    return 'Unknown';
  } catch (error) {
    console.error('[Webhook] Error extracting name:', error);
    return 'Unknown';
  }
}

// Helper function to extract phone number from conversation data
export function extractPhoneNumber(webhookData) {
  try {
    // Try to get phone from dynamic variables
    const dynamicVars = webhookData.data?.conversation_initiation_client_data?.dynamic_variables;
    if (dynamicVars && dynamicVars.phone_number) {
      return dynamicVars.phone_number;
    }
    
    // If we don't have it, return unknown
    return 'Unknown';
  } catch (error) {
    console.error('[Webhook] Error extracting phone number:', error);
    return 'Unknown';
  }
}

// Main function to handle webhooks
export async function handleElevenLabsWebhook(request, secret, crmEndpoint) {
  try {
    // Get the signature header
    const signature = request.headers['elevenlabs-signature'];
    
    // Log the received webhook
    console.log('[Webhook] Processing webhook from ElevenLabs');
    console.log('[Webhook] Signature:', signature ? 'Present' : 'Missing');
    
    // Get the body
    const webhookData = request.body;
    
    // Verify the signature if a secret is provided
    if (secret && signature) {
      const isValid = verifyWebhookSignature(webhookData, signature, secret);
      if (!isValid) {
        console.error('[Webhook] Invalid signature');
        return { success: false, error: 'Invalid signature' };
      }
      console.log('[Webhook] Signature verified successfully');
    } else {
      console.log('[Webhook] Skipping signature verification (no secret or signature)');
    }
    
    // Skip if this is not a post-call transcription event
    if (webhookData.type !== 'post_call_transcription') {
      console.log(`[Webhook] Ignoring event type: ${webhookData.type}`);
      return { success: true, message: 'Event type ignored' };
    }
    
    // Extract the required data
    const status = determineCallStatus(webhookData);
    const name = extractName(webhookData);
    const phoneNumber = extractPhoneNumber(webhookData);
    const summary = webhookData.data?.analysis?.transcript_summary || 'No summary available';
    const duration = webhookData.data?.metadata?.call_duration_secs || 0;
    
    // Construct the payload for Craig's endpoint
    const crmPayload = {
      "type": "conversationAICall",
      "subject": "Invitation to re-trial",
      "to": phoneNumber,
      "name": name,
      "summary": summary,
      "status": status,
      "duration": duration
    };
    
    console.log('[Webhook] Sending to CRM endpoint:', JSON.stringify(crmPayload, null, 2));
    
    try {
      // Send to Craig's endpoint
      const response = await fetch(crmEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(crmPayload)
      });
      
      let responseText = '';
      try {
        responseText = await response.text();
      } catch (e) {
        responseText = 'No response body';
      }
      
      if (!response.ok) {
        console.error(`[Webhook] CRM endpoint error (${response.status}): ${responseText}`);
        return { 
          success: false, 
          error: 'CRM endpoint error', 
          status: response.status,
          details: responseText
        };
      }
      
      console.log('[Webhook] Successfully sent to CRM endpoint. Response:', responseText);
      
      return { 
        success: true, 
        message: 'Successfully processed webhook and sent to CRM',
        crmResponse: responseText
      };
    } catch (fetchError) {
      console.error('[Webhook] Error sending to CRM endpoint:', fetchError);
      return {
        success: false,
        error: 'Failed to send to CRM endpoint',
        details: fetchError.message
      };
    }
  } catch (error) {
    console.error('[Webhook] Processing error:', error);
    return { success: false, error: error.message };
  }
}