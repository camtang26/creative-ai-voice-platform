/**
 * Socket-IO Event Handlers and Utilities
 * This file provides enhanced event handling for the Socket.IO connections
 */

import { Socket } from 'socket.io-client';

// Define event types
export type EventCallback = (data: any) => void;

// Event Categories
export type CallEventType = 
  | 'new_call'
  | 'status_update'
  | 'call_ended'
  | 'recording_update'
  | 'transcript_update'
  | 'transcript_message'
  | 'quality_update';

export type CampaignEventType =
  | 'status_update'
  | 'progress_update'
  | 'call_update'
  | 'campaign_completed'
  | 'campaign_paused'
  | 'campaign_resumed'
  | 'campaign_cancelled';

// Enhanced event subscription manager
export class SocketEventManager {
  private socket: Socket;
  private eventHandlers: Map<string, Set<EventCallback>>;
  private resourceSubscriptions: Map<string, Set<string>>;
  private connectionRetryCount: number = 0;
  private maxRetries: number = 10;
  private retryDelay: number = 1000;
  private verboseLogging: boolean = false;

  constructor(socket: Socket, options?: { 
    maxRetries?: number, 
    retryDelay?: number,
    verboseLogging?: boolean 
  }) {
    this.socket = socket;
    this.eventHandlers = new Map();
    this.resourceSubscriptions = new Map();
    
    if (options) {
      this.maxRetries = options.maxRetries || this.maxRetries;
      this.retryDelay = options.retryDelay || this.retryDelay;
      this.verboseLogging = options.verboseLogging || this.verboseLogging;
    }
    
    // Setup core connection event handlers
    this.setupConnectionHandlers();
  }

  // Set up connection event handlers
  private setupConnectionHandlers() {
    this.socket.on('connect', () => {
      this.log('Socket connected');
      this.connectionRetryCount = 0;
      
      // Resubscribe to all resources
      this.resubscribeAll();
    });

    this.socket.on('disconnect', (reason) => {
      this.log(`Socket disconnected: ${reason}`);
      
      // Handle different disconnect reasons
      if (reason === 'io server disconnect') {
        // The server has forcefully disconnected the socket
        this.reconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      this.log(`Connection error: ${error.message}`);
      this.connectionRetryCount++;
      
      if (this.connectionRetryCount < this.maxRetries) {
        const delay = Math.min(10000, this.retryDelay * Math.pow(1.5, this.connectionRetryCount));
        this.log(`Attempting reconnection in ${delay}ms (attempt ${this.connectionRetryCount})`);
        
        setTimeout(() => {
          this.socket.connect();
        }, delay);
      } else {
        this.log('Maximum reconnection attempts reached');
      }
    });
  }

  // Log method with verbose control
  private log(message: string, ...args: any[]) {
    if (this.verboseLogging) {
      console.log(`[Socket] ${message}`, ...args);
    }
  }

  // Attempt to reconnect
  private reconnect() {
    if (this.connectionRetryCount < this.maxRetries) {
      this.connectionRetryCount++;
      const delay = Math.min(10000, this.retryDelay * Math.pow(1.5, this.connectionRetryCount));
      
      this.log(`Attempting to reconnect in ${delay}ms (attempt ${this.connectionRetryCount})`);
      
      setTimeout(() => {
        this.socket.connect();
      }, delay);
    } else {
      this.log('Maximum reconnection attempts reached');
    }
  }

  // Resubscribe to all resources
  private resubscribeAll() {
    this.log('Resubscribing to all resources');
    
    // Resubscribe to calls
    if (this.resourceSubscriptions.has('calls')) {
      this.socket.emit('subscribe_to_calls');
      this.log('Resubscribed to all calls');
    }
    
    // Resubscribe to individual calls
    if (this.resourceSubscriptions.has('call')) {
      const callSids = this.resourceSubscriptions.get('call') || new Set<string>();
      callSids.forEach(callSid => {
        this.socket.emit('subscribe_to_call', callSid);
        this.log(`Resubscribed to call ${callSid}`);
      });
    }
    
    // Resubscribe to campaigns
    if (this.resourceSubscriptions.has('campaigns')) {
      this.socket.emit('subscribe_to_campaigns');
      this.log('Resubscribed to all campaigns');
    }
    
    // Resubscribe to individual campaigns
    if (this.resourceSubscriptions.has('campaign')) {
      const campaignIds = this.resourceSubscriptions.get('campaign') || new Set<string>();
      campaignIds.forEach(campaignId => {
        this.socket.emit('subscribe_to_campaign', campaignId);
        this.log(`Resubscribed to campaign ${campaignId}`);
      });
    }
  }

  // Subscribe to all calls
  public subscribeToCalls(callback?: EventCallback) {
    if (!this.resourceSubscriptions.has('calls')) {
      this.resourceSubscriptions.set('calls', new Set<string>());
    }
    
    this.socket.emit('subscribe_to_calls');
    this.log('Subscribed to all calls');
    
    if (callback) {
      this.on('active_calls', callback);
    }
    
    return this;
  }

  // Subscribe to a specific call
  public subscribeToCall(callSid: string, callUpdateCallback?: EventCallback, transcriptCallback?: EventCallback) {
    if (!this.resourceSubscriptions.has('call')) {
      this.resourceSubscriptions.set('call', new Set<string>());
    }
    
    const callSids = this.resourceSubscriptions.get('call')!;
    callSids.add(callSid);
    
    this.socket.emit('subscribe_to_call', callSid);
    this.log(`Subscribed to call ${callSid}`);
    
    if (callUpdateCallback) {
      this.on(`call_update:${callSid}`, callUpdateCallback);
    }
    
    if (transcriptCallback) {
      this.on(`transcript_update:${callSid}`, transcriptCallback);
    }
    
    return this;
  }

  // Subscribe to all campaigns
  public subscribeToCampaigns(callback?: EventCallback) {
    if (!this.resourceSubscriptions.has('campaigns')) {
      this.resourceSubscriptions.set('campaigns', new Set<string>());
    }
    
    this.socket.emit('subscribe_to_campaigns');
    this.log('Subscribed to all campaigns');
    
    if (callback) {
      this.on('active_campaigns', callback);
    }
    
    return this;
  }

  // Subscribe to a specific campaign
  public subscribeToCampaign(campaignId: string, campaignUpdateCallback?: EventCallback) {
    if (!this.resourceSubscriptions.has('campaign')) {
      this.resourceSubscriptions.set('campaign', new Set<string>());
    }
    
    const campaignIds = this.resourceSubscriptions.get('campaign')!;
    campaignIds.add(campaignId);
    
    this.socket.emit('subscribe_to_campaign', campaignId);
    this.log(`Subscribed to campaign ${campaignId}`);
    
    if (campaignUpdateCallback) {
      this.on(`campaign_update:${campaignId}`, campaignUpdateCallback);
    }
    
    return this;
  }

  // Unsubscribe from all calls
  public unsubscribeFromCalls() {
    this.socket.emit('unsubscribe_from_calls');
    this.resourceSubscriptions.delete('calls');
    this.log('Unsubscribed from all calls');
    
    return this;
  }

  // Unsubscribe from a specific call
  public unsubscribeFromCall(callSid: string) {
    this.socket.emit('unsubscribe_from_call', callSid);
    
    const callSids = this.resourceSubscriptions.get('call');
    if (callSids) {
      callSids.delete(callSid);
      if (callSids.size === 0) {
        this.resourceSubscriptions.delete('call');
      }
    }
    
    this.log(`Unsubscribed from call ${callSid}`);
    
    // Remove specific event handlers
    this.off(`call_update:${callSid}`);
    this.off(`transcript_update:${callSid}`);
    
    return this;
  }

  // Unsubscribe from all campaigns
  public unsubscribeFromCampaigns() {
    this.socket.emit('unsubscribe_from_campaigns');
    this.resourceSubscriptions.delete('campaigns');
    this.log('Unsubscribed from all campaigns');
    
    return this;
  }

  // Unsubscribe from a specific campaign
  public unsubscribeFromCampaign(campaignId: string) {
    this.socket.emit('unsubscribe_from_campaign', campaignId);
    
    const campaignIds = this.resourceSubscriptions.get('campaign');
    if (campaignIds) {
      campaignIds.delete(campaignId);
      if (campaignIds.size === 0) {
        this.resourceSubscriptions.delete('campaign');
      }
    }
    
    this.log(`Unsubscribed from campaign ${campaignId}`);
    
    // Remove specific event handlers
    this.off(`campaign_update:${campaignId}`);
    
    return this;
  }

  // Register event listener
  public on(event: string, callback: EventCallback) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set<EventCallback>());
      
      // Set up the actual socket event listener
      this.socket.on(event, (data: any) => {
        // Broadcast to all registered handlers
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
          handlers.forEach(handler => handler(data));
        }
        
        // Handle special events that need routing to specific resources
        if (event === 'call_update' && data.callSid) {
          // Route to specific call handler
          const specificEvent = `call_update:${data.callSid}`;
          const specificHandlers = this.eventHandlers.get(specificEvent);
          if (specificHandlers) {
            specificHandlers.forEach(handler => handler(data));
          }
        } else if (event === 'transcript_update' && data.callSid) {
          // Route to specific transcript handler
          const specificEvent = `transcript_update:${data.callSid}`;
          const specificHandlers = this.eventHandlers.get(specificEvent);
          if (specificHandlers) {
            specificHandlers.forEach(handler => handler(data));
          }
        } else if (event === 'campaign_update' && data.campaignId) {
          // Route to specific campaign handler
          const specificEvent = `campaign_update:${data.campaignId}`;
          const specificHandlers = this.eventHandlers.get(specificEvent);
          if (specificHandlers) {
            specificHandlers.forEach(handler => handler(data));
          }
        }
      });
    }
    
    // Add the callback to the set of handlers
    const handlers = this.eventHandlers.get(event)!;
    handlers.add(callback);
    
    return this;
  }

  // Remove event listener
  public off(event: string, callback?: EventCallback) {
    if (!this.eventHandlers.has(event)) {
      return this;
    }
    
    if (callback) {
      // Remove specific callback
      const handlers = this.eventHandlers.get(event)!;
      handlers.delete(callback);
      
      if (handlers.size === 0) {
        this.eventHandlers.delete(event);
        this.socket.off(event);
      }
    } else {
      // Remove all callbacks for this event
      this.eventHandlers.delete(event);
      this.socket.off(event);
    }
    
    return this;
  }

  // Check if connected
  public isConnected(): boolean {
    return this.socket.connected;
  }

  // Force reconnection
  public forceReconnect() {
    this.socket.disconnect();
    this.connectionRetryCount = 0;
    setTimeout(() => {
      this.socket.connect();
    }, 100);
    
    return this;
  }
}

// Function to create socket event manager
export function createSocketEventManager(socket: Socket, options?: { 
  maxRetries?: number, 
  retryDelay?: number,
  verboseLogging?: boolean 
}): SocketEventManager {
  return new SocketEventManager(socket, options);
}

// Export a function to enhance Socket.IO event handling
export default function enhanceSocketEvents(socket: Socket): SocketEventManager {
  return createSocketEventManager(socket);
}
