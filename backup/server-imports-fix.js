/**
 * Enhanced Server with Improved Twilio Integration
 * 
 * Key Improvements:
 * 1. Enhanced Twilio data collection
 * 2. Robust call recording
 * 3. Automatic call termination
 * 4. Improved architecture
 * 5. Socket.IO real-time updates
 */
import 'dotenv/config';
import fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import fastifyFormBody from '@fastify/formbody';
import fetch from 'node-fetch';
import crypto from 'crypto';
import Twilio from 'twilio';
import { registerOutboundRoutes, activeCalls } from './outbound.js';
import { sendEmail } from './email-tools/api-email-service.js';
import { sendSESEmail } from './email-tools/aws-ses-email.js';
import { handleElevenLabsWebhook, setActiveCallsReference } from './webhook-handler.js';
import enhancedCallHandler from './enhanced-call-handler.js';
import recordingHandler from './recording-handler.js';
import callQualityMetrics from './call-quality-metrics.js';
import { registerApiRoutes } from './api-routes.js';
import { 
  initializeSocketServer, 
  emitCallUpdate, 
  emitActiveCallsList, 
  handleCallStatusChange 
} from './socket-server.js';
