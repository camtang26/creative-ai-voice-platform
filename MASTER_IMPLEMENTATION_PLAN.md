# 🎯 Creative AI Platform - Master Implementation Plan

## Executive Summary

This document serves as the definitive implementation guide for migrating the InvestorSignals codebase to become the Creative AI Voice Platform. Every task is broken down into <4 hour chunks with clear acceptance criteria, dependencies, and technical implementation details. Note: The frontend is already built with Next.js 14 - we're primarily adding authentication and connecting to production APIs.

**Project Timeline**: 12 weeks total
- Phase 1: Foundation & Infrastructure (Weeks 1-2)
- Phase 2: MVP Implementation (Weeks 3-6)  
- Phase 3: Advanced Features (Weeks 7-12)

**Technology Stack**:
- Frontend: Next.js 14 (already built with App Router)
- Backend: Fastify on Render.com (existing)
- Database: MongoDB Atlas + Supabase (auth only)
- Auth: Supabase
- Monitoring: Sentry + Datadog
- Voice: Twilio + ElevenLabs

---

## Phase 1: Foundation & Infrastructure (Weeks 1-2)

### Epic 1.1: Project Setup & Repository Structure

#### Story 1.1.1: Repository Initialization
**Goal**: Set up clean repository structure with proper configuration

##### Task 1.1.1.1: Fork and Clean Repository (2 hours)
- **Description**: Fork InvestorSignals codebase and remove legacy code
- **Dependencies**: Access to InvestorSignals repo
- **Acceptance Criteria**:
  - [ ] Repository forked to Creative AI GitHub org
  - [ ] All InvestorSignals branding removed
  - [ ] Legacy AWS SES code removed
  - [ ] Unused Firebase files deleted
  - [ ] Git history preserved for reference
- **Technical Notes**:
  ```bash
  git clone [investorsignals-repo] creative-ai-platform
  cd creative-ai-platform
  git remote set-url origin [creative-ai-repo]
  # Remove legacy files
  rm -rf email-tools/aws-ses-*
  rm -rf server-firebase.js
  git commit -m "chore: remove legacy InvestorSignals code"
  ```

##### Task 1.1.1.2: Initialize Monorepo Structure (3 hours)
- **Description**: Set up proper monorepo with backend/frontend separation
- **Dependencies**: Task 1.1.1.1
- **Acceptance Criteria**:
  - [ ] Monorepo structure created with workspaces
  - [ ] Backend in `/backend` directory
  - [ ] Frontend in `/frontend` directory
  - [ ] Shared types in `/shared` directory
  - [ ] Root package.json with workspace config
- **Technical Notes**:
  ```json
  // root package.json
  {
    "name": "creative-ai-platform",
    "private": true,
    "workspaces": [
      "backend",
      "frontend", 
      "shared"
    ],
    "scripts": {
      "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
      "dev:backend": "npm --workspace=backend run dev",
      "dev:frontend": "npm --workspace=frontend run dev"
    }
  }
  ```

##### Task 1.1.1.3: Environment Configuration Setup (2 hours)
- **Description**: Create environment templates and gitignore
- **Dependencies**: Task 1.1.1.2
- **Acceptance Criteria**:
  - [ ] `.env.example` created for all environments
  - [ ] `.gitignore` updated with all sensitive files
  - [ ] Environment variable documentation created
  - [ ] Secrets management plan documented
  - [ ] Runtime validation for required env vars
- **Technical Notes**:
  ```typescript
  // lib/env-config.ts
  const requiredEnvVars = [
    'MONGODB_URI',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'TWILIO_ACCOUNT_SID',
    'ELEVENLABS_API_KEY'
  ];
  
  // Validate on startup
  requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      throw new Error(`Missing required environment variable: ${varName}`);
    }
  });
  ```

#### Story 1.1.2: Development Environment Setup

##### Task 1.1.2.1: Docker Development Environment (4 hours)
- **Description**: Create Docker compose for local development
- **Dependencies**: Task 1.1.1.3
- **Acceptance Criteria**:
  - [ ] Docker compose file with all services
  - [ ] MongoDB local instance configured
  - [ ] Proper networking between services
  - [ ] Volume mounts for hot reloading
  - [ ] README with setup instructions
- **Technical Notes**:
  ```yaml
  # docker-compose.yml
  version: '3.8'
  services:
    mongodb:
      image: mongo:6
      ports:
        - "27017:27017"
      volumes:
        - mongodb_data:/data/db
    backend:
      build: ./backend
      ports:
        - "8000:8000"
      environment:
        - MONGODB_URI=mongodb://mongodb:27017/creative-ai
      depends_on:
        - mongodb
  ```

##### Task 1.1.2.2: VS Code Configuration (1 hour)
- **Description**: Set up consistent development environment
- **Dependencies**: Task 1.1.1.3
- **Acceptance Criteria**:
  - [ ] `.vscode/settings.json` with project settings
  - [ ] `.vscode/extensions.json` with recommended extensions
  - [ ] `.vscode/launch.json` for debugging
  - [ ] ESLint and Prettier configured
- **Technical Notes**:
  ```json
  // .vscode/extensions.json
  {
    "recommendations": [
      "dbaeumer.vscode-eslint",
      "esbenp.prettier-vscode",
      "mongodb.mongodb-vscode",
      "ms-azuretools.vscode-docker"
    ]
  }
  ```

#### Story 1.1.3: CI/CD Pipeline Setup

##### Task 1.1.3.1: GitHub Actions Basic Setup (3 hours)
- **Description**: Create CI pipeline for automated testing and linting
- **Dependencies**: Task 1.1.2.2
- **Acceptance Criteria**:
  - [ ] `.github/workflows/ci.yml` created
  - [ ] Runs on PR and main branch
  - [ ] Linting checks pass
  - [ ] Type checking configured
  - [ ] Build verification
- **Technical Notes**:
  ```yaml
  # .github/workflows/ci.yml
  name: CI
  on:
    push:
      branches: [main, develop]
    pull_request:
      branches: [main]
  jobs:
    lint-and-test:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v3
        - uses: actions/setup-node@v3
          with:
            node-version: '18'
            cache: 'npm'
        - run: npm ci
        - run: npm run lint
        - run: npm run type-check
        - run: npm run test
  ```

##### Task 1.1.3.2: Deployment Pipeline Setup (4 hours)
- **Description**: Create CD pipeline for automated deployments
- **Dependencies**: Task 1.1.3.1
- **Acceptance Criteria**:
  - [ ] Separate workflows for backend/frontend
  - [ ] Environment secrets configured
  - [ ] Render.com deployment for backend
  - [ ] Vercel deployment for frontend
  - [ ] Rollback capability documented
- **Technical Notes**:
  ```yaml
  # .github/workflows/deploy-backend.yml
  - name: Deploy to Render
    env:
      RENDER_API_KEY: ${{ secrets.RENDER_API_KEY }}
    run: |
      curl -X POST https://api.render.com/v1/services/$SERVICE_ID/deploys \
        -H "Authorization: Bearer $RENDER_API_KEY" \
        -H "Content-Type: application/json"
  ```

### Epic 1.2: Security Hardening

#### Story 1.2.1: Fix Critical Vulnerabilities

##### Task 1.2.1.1: Audit Current Security Issues (3 hours)
- **Description**: Comprehensive security audit of codebase
- **Dependencies**: Task 1.1.1.1
- **Acceptance Criteria**:
  - [ ] Run npm audit and document all vulnerabilities
  - [ ] Identify hardcoded secrets/credentials
  - [ ] Review CORS configuration issues
  - [ ] Document API endpoints without auth
  - [ ] Create security fix priority list
- **Technical Notes**:
  ```bash
  # Security audit commands
  npm audit --audit-level=moderate
  # Use git-secrets to scan for credentials
  git secrets --scan
  # Manual review of all .env usage
  grep -r "process.env" --include="*.js" .
  ```

##### Task 1.2.1.2: Fix Package Vulnerabilities (2 hours)
- **Description**: Update vulnerable dependencies
- **Dependencies**: Task 1.2.1.1
- **Acceptance Criteria**:
  - [ ] All high/critical vulnerabilities resolved
  - [ ] Package-lock.json updated
  - [ ] Regression testing completed
  - [ ] Changelog documented
- **Technical Notes**:
  ```bash
  # Fix vulnerabilities
  npm audit fix
  # For breaking changes
  npm update [package-name] --save
  # Test after updates
  npm test
  ```

##### Task 1.2.1.3: Implement Input Validation (4 hours)
- **Description**: Add comprehensive input validation
- **Dependencies**: Task 1.2.1.2
- **Acceptance Criteria**:
  - [ ] Joi/Zod validation schemas created
  - [ ] All API endpoints have validation
  - [ ] Phone number validation enhanced
  - [ ] SQL/NoSQL injection prevention
  - [ ] XSS prevention measures
- **Technical Notes**:
  ```javascript
  // Example validation schema
  import { z } from 'zod';
  
  const callSchema = z.object({
    to: z.string().regex(/^\+[1-9]\d{1,14}$/),
    prompt: z.string().max(1000),
    firstMessage: z.string().max(500).optional()
  });
  
  // Apply to routes
  fastify.post('/outbound-call', {
    schema: {
      body: callSchema
    }
  }, handler);
  ```

##### Task 1.2.1.4: Configure CORS Properly (2 hours)
- **Description**: Fix CORS configuration for production
- **Dependencies**: Task 1.2.1.3
- **Acceptance Criteria**:
  - [ ] Remove wildcard CORS origins
  - [ ] Whitelist specific domains only
  - [ ] Configure credentials properly
  - [ ] Test cross-origin requests
  - [ ] Document CORS policy
- **Technical Notes**:
  ```javascript
  // cors-middleware.js
  const corsOptions = {
    origin: (origin, callback) => {
      const allowedOrigins = [
        'https://creativeai.com',
        'https://app.creativeai.com',
        process.env.NODE_ENV === 'development' && 'http://localhost:3000'
      ].filter(Boolean);
      
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  };
  ```

#### Story 1.2.2: API Authentication Setup

##### Task 1.2.2.1: Implement API Key Management (3 hours)
- **Description**: Create secure API key system
- **Dependencies**: Task 1.2.1.4
- **Acceptance Criteria**:
  - [ ] API key generation endpoint
  - [ ] Key storage with hashing
  - [ ] Key rotation capability
  - [ ] Rate limiting per key
  - [ ] Usage tracking
- **Technical Notes**:
  ```javascript
  // API key model
  const ApiKeySchema = new Schema({
    key: { type: String, required: true, unique: true },
    hashedKey: { type: String, required: true },
    userId: { type: ObjectId, ref: 'User' },
    name: String,
    permissions: [String],
    lastUsed: Date,
    expiresAt: Date,
    isActive: { type: Boolean, default: true }
  });
  
  // Hash API keys before storage
  import { createHash } from 'crypto';
  const hashedKey = createHash('sha256').update(apiKey).digest('hex');
  ```

##### Task 1.2.2.2: Add Bearer Token Validation (2 hours)
- **Description**: Enhance existing bearer token auth
- **Dependencies**: Task 1.2.2.1
- **Acceptance Criteria**:
  - [ ] Token validation middleware updated
  - [ ] Supabase JWT verification
  - [ ] Token expiry handling
  - [ ] Refresh token support
  - [ ] Unauthorized response standardized
- **Technical Notes**:
  ```javascript
  // auth-middleware.js
  import { createClient } from '@supabase/supabase-js';
  
  const verifyToken = async (request, reply) => {
    const token = request.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return reply.code(401).send({ error: 'No token provided' });
    }
    
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error) throw error;
      
      request.user = user;
    } catch (err) {
      return reply.code(401).send({ error: 'Invalid token' });
    }
  };
  ```

##### Task 1.2.2.3: Implement Rate Limiting (3 hours)
- **Description**: Add comprehensive rate limiting
- **Dependencies**: Task 1.2.2.2
- **Acceptance Criteria**:
  - [ ] Global rate limit configured
  - [ ] Per-user rate limits
  - [ ] Per-endpoint limits
  - [ ] Rate limit headers added
  - [ ] 429 responses handled
- **Technical Notes**:
  ```javascript
  // Rate limiting setup
  import rateLimit from '@fastify/rate-limit';
  
  await fastify.register(rateLimit, {
    global: true,
    max: 100, // requests per window
    timeWindow: '1 minute',
    redis: redisClient, // Use Redis for distributed systems
    keyGenerator: (req) => {
      return req.user?.id || req.ip;
    },
    errorResponseBuilder: (req, context) => {
      return {
        error: 'Too many requests',
        retryAfter: context.after,
        limit: context.max
      };
    }
  });
  ```

### Epic 1.3: Monitoring & Observability

#### Story 1.3.0: Feature Flag System

##### Task 1.3.0.1: Implement Feature Flags (3 hours)
- **Description**: Set up feature flag system for safe deployments
- **Dependencies**: Task 1.2.2.3
- **Acceptance Criteria**:
  - [ ] LaunchDarkly or Unleash integration
  - [ ] Feature flag middleware
  - [ ] Dashboard for flag management
  - [ ] A/B testing capability
  - [ ] Emergency kill switches
- **Technical Notes**:
  ```javascript
  // feature-flags.js
  import { createClient } from 'launchdarkly-node-server-sdk';
  
  const ldClient = createClient(process.env.LAUNCHDARKLY_SDK_KEY);
  
  export const FEATURE_FLAGS = {
    NEW_CALL_UI: 'new-call-ui',
    VECTOR_SEARCH: 'vector-search-enabled',
    RATE_LIMIT_OVERRIDE: 'rate-limit-override'
  };
  
  export async function checkFeature(flagKey, userId, defaultValue = false) {
    try {
      const user = { key: userId };
      return await ldClient.variation(flagKey, user, defaultValue);
    } catch (error) {
      console.error('Feature flag error:', error);
      return defaultValue; // Fail safe
    }
  }
  ```

#### Story 1.3.1: Error Tracking Setup

##### Task 1.3.1.1: Integrate Sentry (3 hours)
- **Description**: Set up Sentry for error tracking
- **Dependencies**: Task 1.2.2.3
- **Acceptance Criteria**:
  - [ ] Sentry SDK installed and configured
  - [ ] DSN configured via environment
  - [ ] Error boundaries in frontend
  - [ ] Backend error capture
  - [ ] Source maps uploaded
- **Technical Notes**:
  ```javascript
  // Backend Sentry setup
  import * as Sentry from "@sentry/node";
  
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Mongo(),
    ],
    tracesSampleRate: 1.0,
    beforeSend(event, hint) {
      // Scrub sensitive data
      if (event.request) {
        delete event.request.cookies;
        delete event.request.headers?.authorization;
      }
      return event;
    }
  });
  
  // Fastify error handler integration
  fastify.setErrorHandler((error, request, reply) => {
    Sentry.captureException(error, {
      contexts: {
        request: {
          url: request.url,
          method: request.method,
          userId: request.user?.id
        }
      }
    });
    // ... handle error response
  });
  ```

##### Task 1.3.1.2: Configure Sentry Alerts (2 hours)
- **Description**: Set up alerting rules in Sentry
- **Dependencies**: Task 1.3.1.1
- **Acceptance Criteria**:
  - [ ] Error rate alerts configured
  - [ ] Performance alerts set up
  - [ ] Slack/email notifications
  - [ ] Issue assignment rules
  - [ ] Alert documentation
- **Technical Notes**:
  ```yaml
  # Sentry alert rules
  - New error types: Immediate alert
  - Error rate > 5%: Alert after 5 minutes
  - Performance regression: P95 > 1s
  - Crash rate > 1%: Critical alert
  ```

#### Story 1.3.2: Logging Infrastructure

##### Task 1.3.2.1: Enhance Pino Logger Configuration (2 hours)
- **Description**: Improve structured logging setup
- **Dependencies**: Task 1.3.1.2
- **Acceptance Criteria**:
  - [ ] Log levels properly configured
  - [ ] Request ID tracking added
  - [ ] Correlation ID implementation
  - [ ] Sensitive data redaction
  - [ ] Log formatting standardized
  - [ ] Performance logging added
  - [ ] Log retention policy defined
- **Technical Notes**:
  ```javascript
  // Enhanced Pino configuration
  import pino from 'pino';
  import { randomUUID } from 'crypto';
  
  const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    redact: {
      paths: ['req.headers.authorization', 'req.body.password'],
      censor: '[REDACTED]'
    },
    serializers: {
      req: (req) => ({
        id: req.id,
        method: req.method,
        url: req.url,
        userId: req.user?.id
      }),
      res: (res) => ({
        statusCode: res.statusCode,
        responseTime: res.responseTime
      })
    },
    formatters: {
      level: (label) => ({ level: label }),
      bindings: (bindings) => ({ 
        pid: bindings.pid,
        host: bindings.hostname,
        node_version: process.version 
      })
    }
  });
  
  // Request ID middleware
  fastify.addHook('onRequest', (req, reply, done) => {
    req.id = req.headers['x-request-id'] || randomUUID();
    reply.header('x-request-id', req.id);
    done();
  });
  ```

##### Task 1.3.2.2: Set Up Log Aggregation (3 hours)
- **Description**: Configure centralized log collection
- **Dependencies**: Task 1.3.2.1
- **Acceptance Criteria**:
  - [ ] CloudWatch/Datadog agent configured
  - [ ] Log shipping from Render
  - [ ] Log retention policies
  - [ ] Search and filtering setup
  - [ ] Dashboard created
- **Technical Notes**:
  ```javascript
  // Datadog Winston transport
  import { createLogger, transports, format } from 'winston';
  
  const logger = createLogger({
    format: format.combine(
      format.timestamp(),
      format.errors({ stack: true }),
      format.json()
    ),
    defaultMeta: { 
      service: 'creative-ai-platform',
      version: process.env.APP_VERSION 
    },
    transports: [
      new transports.Console(),
      new transports.Http({
        host: 'http-intake.logs.datadoghq.com',
        path: `/api/v2/logs?dd-api-key=${process.env.DATADOG_API_KEY}`,
        ssl: true
      })
    ]
  });
  ```

#### Story 1.3.3: Health Monitoring

##### Task 1.3.3.1: Create Health Check Endpoints (2 hours)
- **Description**: Implement comprehensive health checks
- **Dependencies**: Task 1.3.2.2
- **Acceptance Criteria**:
  - [ ] `/health` endpoint returns system status
  - [ ] `/health/ready` checks all dependencies
  - [ ] Database connectivity verified
  - [ ] External service checks
  - [ ] Response time included
- **Technical Notes**:
  ```javascript
  // Health check implementation
  fastify.get('/health', async (request, reply) => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.APP_VERSION
    };
  });
  
  fastify.get('/health/ready', async (request, reply) => {
    const checks = {
      database: false,
      elevenlabs: false,
      twilio: false,
      redis: false
    };
    
    try {
      // Check MongoDB
      await mongoose.connection.db.admin().ping();
      checks.database = true;
      
      // Check ElevenLabs
      const elResponse = await fetch('https://api.elevenlabs.io/v1/user');
      checks.elevenlabs = elResponse.ok;
      
      // Check Twilio
      const twilioClient = require('twilio')(accountSid, authToken);
      await twilioClient.api.accounts(accountSid).fetch();
      checks.twilio = true;
      
      const allHealthy = Object.values(checks).every(v => v);
      reply.code(allHealthy ? 200 : 503);
      
      return {
        status: allHealthy ? 'ready' : 'degraded',
        checks,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      reply.code(503);
      return { status: 'unhealthy', checks, error: error.message };
    }
  });
  ```

### Epic 1.4: Database Configuration

#### Story 1.4.0: Disaster Recovery & Backup

##### Task 1.4.0.1: Database Backup Strategy (3 hours)
- **Description**: Implement automated backup and recovery
- **Dependencies**: MongoDB Atlas access
- **Acceptance Criteria**:
  - [ ] Daily automated backups configured
  - [ ] Point-in-time recovery enabled
  - [ ] Backup retention policy (30 days)
  - [ ] Restore procedure documented
  - [ ] Backup monitoring alerts
- **Technical Notes**:
  ```javascript
  // backup-config.js
  const backupConfig = {
    schedule: '0 2 * * *', // 2 AM daily
    retention: {
      daily: 7,
      weekly: 4,
      monthly: 12
    },
    notifications: {
      success: process.env.BACKUP_SUCCESS_WEBHOOK,
      failure: process.env.BACKUP_FAILURE_WEBHOOK
    }
  };
  ```

#### Story 1.4.1: MongoDB Atlas Setup

##### Task 1.4.1.1: Create MongoDB Atlas Cluster (2 hours)
- **Description**: Set up production MongoDB cluster
- **Dependencies**: Cameron provides MongoDB MCP or access
- **Acceptance Criteria**:
  - [ ] M10 cluster created (for vector search)
  - [ ] Network access configured
  - [ ] Database user created
  - [ ] Connection string obtained
  - [ ] Backup configured
- **Technical Notes**:
  ```javascript
  // MongoDB connection with retry logic
  const connectDB = async () => {
    const options = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,
      retryWrites: true,
      w: 'majority'
    };
    
    let retries = 5;
    while (retries) {
      try {
        await mongoose.connect(process.env.MONGODB_URI, options);
        console.log('MongoDB connected successfully');
        break;
      } catch (err) {
        console.error(`MongoDB connection failed, retries left: ${retries}`);
        retries--;
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  };
  ```

##### Task 1.4.1.2: Configure Indexes (3 hours)
- **Description**: Create all required indexes
- **Dependencies**: Task 1.4.1.1
- **Acceptance Criteria**:
  - [ ] All existing indexes reviewed
  - [ ] Missing indexes added
  - [ ] Compound indexes optimized
  - [ ] Vector search index prepared
  - [ ] Index performance tested
- **Technical Notes**:
  ```javascript
  // Index creation script
  async function createIndexes() {
    // Calls collection
    await Call.collection.createIndex({ callSid: 1 }, { unique: true });
    await Call.collection.createIndex({ userId: 1, createdAt: -1 });
    await Call.collection.createIndex({ status: 1, createdAt: -1 });
    
    // Users collection
    await User.collection.createIndex({ email: 1 }, { unique: true });
    await User.collection.createIndex({ 'supabaseId': 1 }, { unique: true });
    
    // Future vector search index
    await ConversationMemory.collection.createIndex({
      embedding: "2dsphere"
    });
    
    // Text search indexes
    await Transcript.collection.createIndex({
      'transcript.message': 'text'
    });
  }
  ```

#### Story 1.4.2: Schema Design & Migration

##### Task 1.4.2.1: Design User Schema (3 hours)
- **Description**: Create user and organization schemas
- **Dependencies**: Task 1.4.1.2
- **Acceptance Criteria**:
  - [ ] User schema with Supabase integration
  - [ ] Organization schema for teams
  - [ ] Subscription/billing fields
  - [ ] Future vector fields included
  - [ ] Migration scripts created
- **Technical Notes**:
  ```javascript
  // User schema
  const UserSchema = new mongoose.Schema({
    supabaseId: { 
      type: String, 
      required: true, 
      unique: true,
      index: true 
    },
    email: { 
      type: String, 
      required: true, 
      unique: true,
      lowercase: true 
    },
    profile: {
      name: String,
      company: String,
      phone: String,
      timezone: { type: String, default: 'UTC' },
      avatar: String
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization'
    },
    subscription: {
      plan: { 
        type: String, 
        enum: ['free', 'starter', 'pro', 'enterprise'],
        default: 'free' 
      },
      status: { 
        type: String, 
        enum: ['active', 'canceled', 'past_due'],
        default: 'active' 
      },
      currentPeriodEnd: Date,
      callsUsed: { type: Number, default: 0 },
      callsLimit: { type: Number, default: 100 }
    },
    settings: {
      defaultCallerId: String,
      webhookUrl: String,
      notifications: {
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: false }
      }
    },
    // Future fields for advanced features
    aiSettings: {
      defaultAgentId: String,
      customPrompts: Map,
      voicePreferences: Object
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  });
  
  // Organization schema
  const OrganizationSchema = new mongoose.Schema({
    name: { type: String, required: true },
    ownerId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
      required: true 
    },
    members: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      role: { 
        type: String, 
        enum: ['owner', 'admin', 'member'],
        default: 'member' 
      },
      joinedAt: { type: Date, default: Date.now }
    }],
    subscription: {
      plan: String,
      seats: Number,
      billingEmail: String
    },
    settings: {
      allowedDomains: [String],
      ssoEnabled: { type: Boolean, default: false }
    },
    createdAt: { type: Date, default: Date.now }
  });
  ```

##### Task 1.4.2.2: Update Call Schema (2 hours)
- **Description**: Enhance call schema for Creative AI
- **Dependencies**: Task 1.4.2.1
- **Acceptance Criteria**:
  - [ ] User association added
  - [ ] Organization tracking
  - [ ] Metadata fields expanded
  - [ ] Future stateful fields
  - [ ] Backward compatible
- **Technical Notes**:
  ```javascript
  // Enhanced Call schema
  const CallSchema = new mongoose.Schema({
    // Existing fields
    callSid: { type: String, required: true, unique: true },
    to: { type: String, required: true },
    from: String,
    status: String,
    duration: Number,
    
    // New user association
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
      required: true,
      index: true 
    },
    organizationId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Organization',
      index: true 
    },
    
    // Enhanced metadata
    metadata: {
      agentId: String,
      agentVersion: String,
      conversationId: String,
      campaignId: mongoose.Schema.Types.ObjectId,
      tags: [String],
      customData: Map,
      
      // Future stateful fields
      callerId: String, // For repeat caller identification
      conversationThreadId: String,
      previousCallSids: [String]
    },
    
    // Cost tracking
    billing: {
      twilioCharges: Number,
      elevenLabsCharges: Number,
      totalCost: Number
    },
    
    createdAt: { type: Date, default: Date.now, index: true }
  });
  ```

### Epic 1.5: Authentication Setup

#### Story 1.5.1: Supabase Integration

##### Task 1.5.1.1: Initialize Supabase Project (2 hours)
- **Description**: Set up Supabase project via MCP
- **Dependencies**: Supabase MCP enabled
- **Acceptance Criteria**:
  - [ ] Supabase project created
  - [ ] Auth settings configured
  - [ ] Email templates customized
  - [ ] OAuth providers setup
  - [ ] API keys obtained
- **Technical Notes**:
  ```javascript
  // Using Supabase MCP
  // 1. Create project
  // 2. Enable email auth
  // 3. Configure OAuth (Google, GitHub)
  // 4. Set redirect URLs
  // 5. Customize email templates
  
  // Environment variables needed:
  SUPABASE_URL=https://xxxxx.supabase.co
  SUPABASE_ANON_KEY=xxxxx
  SUPABASE_SERVICE_KEY=xxxxx
  ```

##### Task 1.5.1.2: Create Auth Middleware (3 hours)
- **Description**: Implement Supabase auth for backend
- **Dependencies**: Task 1.5.1.1
- **Acceptance Criteria**:
  - [ ] JWT verification middleware
  - [ ] User context injection
  - [ ] Role-based access control
  - [ ] API key fallback
  - [ ] Error handling
- **Technical Notes**:
  ```javascript
  // auth-middleware.js
  import { createClient } from '@supabase/supabase-js';
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
  
  export const authMiddleware = async (request, reply) => {
    try {
      // Check for API key first
      const apiKey = request.headers['x-api-key'];
      if (apiKey) {
        const keyDoc = await ApiKey.findOne({ 
          key: apiKey, 
          isActive: true 
        });
        if (keyDoc) {
          request.user = await User.findById(keyDoc.userId);
          return;
        }
      }
      
      // Check for Bearer token
      const token = request.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        throw new Error('No authentication provided');
      }
      
      // Verify with Supabase
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error) throw error;
      
      // Get or create user in MongoDB
      request.user = await User.findOneAndUpdate(
        { supabaseId: user.id },
        { 
          email: user.email,
          lastLogin: new Date()
        },
        { upsert: true, new: true }
      );
      
    } catch (error) {
      reply.code(401).send({ 
        error: 'Unauthorized',
        message: error.message 
      });
    }
  };
  
  // Apply to protected routes
  fastify.register(async function protectedRoutes(fastify) {
    fastify.addHook('preHandler', authMiddleware);
    
    // All routes here require auth
    fastify.get('/api/user/profile', getUserProfile);
    fastify.post('/api/calls/outbound', makeCall);
    // ... etc
  });
  ```

---

## Phase 2: MVP Implementation (Weeks 3-6)

### Epic 2.1: Frontend Authentication Integration

#### Story 2.1.1: Add Authentication to Existing Next.js App

##### Task 2.1.1.1: Install Supabase Auth Dependencies (0.5 hours)
- **Description**: Add auth packages to existing Next.js app
- **Dependencies**: Phase 1 completion
- **Acceptance Criteria**:
  - [ ] Install @supabase/auth-helpers-nextjs
  - [ ] Install @supabase/supabase-js
  - [ ] Update package.json
  - [ ] Verify no version conflicts
  - [ ] Update .env.local with Supabase keys
- **Technical Notes**:
  ```bash
  # Frontend already has Next.js 14 with:
  # - TypeScript ✅
  # - Tailwind CSS ✅
  # - shadcn/ui ✅
  # - All pages built ✅
  # - All components ready ✅
  
  # Just need to add auth:
  cd frontend
  npm install @supabase/auth-helpers-nextjs @supabase/supabase-js
  ```

##### Task 2.1.1.2: Create Auth Provider Component (1 hour)
- **Description**: Add Supabase provider to existing app
- **Dependencies**: Task 2.1.1.1
- **Acceptance Criteria**:
  - [ ] Create providers/supabase-provider.tsx
  - [ ] Add to existing root layout.tsx
  - [ ] Configure session handling
  - [ ] Add user context hook
  - [ ] Test auth state persistence
- **Technical Notes**:
  ```typescript
  // app/providers/supabase-provider.tsx
  'use client';
  
  import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
  import { SessionContextProvider } from '@supabase/auth-helpers-react';
  import { useState } from 'react';
  
  export function SupabaseProvider({
    children,
    session,
  }: {
    children: React.ReactNode;
    session: Session | null;
  }) {
    const [supabase] = useState(() => createClientComponentClient());
    
    return (
      <SessionContextProvider
        supabaseClient={supabase}
        initialSession={session}
      >
        {children}
      </SessionContextProvider>
    );
  }
  ```

##### Task 2.1.1.3: Update API Client Auth Headers (2 hours)
- **Description**: Add authentication headers to existing API clients
- **Dependencies**: Task 2.1.1.2
- **Acceptance Criteria**:
  - [ ] Update all API client files to include auth
  - [ ] Add token refresh logic
  - [ ] Handle auth errors properly
  - [ ] Test authenticated requests
  - [ ] Update mock data handlers
- **Technical Notes**:
  ```typescript
  // Update existing API clients in lib/
  // - api.ts
  // - api-enhanced.ts  
  // - mongodb-api.ts
  // - analytics-api.ts
  // - dashboard-api.ts
  
  // Add auth header to fetch calls:
  const token = await supabase.auth.getSession();
  headers: {
    'Authorization': `Bearer ${token?.access_token}`,
    'Content-Type': 'application/json',
  }
  ```

#### Story 2.1.2: Authentication UI

##### Task 2.1.2.1: Create Auth Layout (3 hours)
- **Description**: Add authentication to existing page layouts
- **Dependencies**: Task 2.1.1.3
- **Acceptance Criteria**:
  - [ ] Login page with form
  - [ ] Signup page with validation
  - [ ] Password reset flow
  - [ ] OAuth buttons (Google/GitHub)
  - [ ] Loading states
- **Technical Notes**:
  ```typescript
  // app/(auth)/login/page.tsx
  'use client';
  
  import { useState } from 'react';
  import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
  import { Button } from '@/components/ui/button';
  import { Input } from '@/components/ui/input';
  import { Label } from '@/components/ui/label';
  import { useRouter } from 'next/navigation';
  
  export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const supabase = createClientComponentClient();
    const router = useRouter();
    
    const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError(null);
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    };
    
    const handleOAuth = async (provider: 'google' | 'github') => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${location.origin}/auth/callback`,
        },
      });
      
      if (error) {
        setError(error.message);
      }
    };
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold">Sign in to Creative AI</h2>
            <p className="mt-2 text-gray-600">
              Or{' '}
              <Link href="/signup" className="text-blue-600 hover:underline">
                create a new account
              </Link>
            </p>
          </div>
          
          <form onSubmit={handleLogin} className="mt-8 space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                {error}
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                />
              </div>
              
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                />
              </div>
            </div>
            
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-gray-50 px-2 text-gray-500">
                  Or continue with
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOAuth('google')}
              >
                Google
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOAuth('github')}
              >
                GitHub
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }
  ```

##### Task 2.1.2.2: Implement Supabase Auth Provider (3 hours)
- **Description**: Set up Supabase auth context and hooks
- **Dependencies**: Task 2.1.2.1
- **Acceptance Criteria**:
  - [ ] Auth context provider created
  - [ ] Session management working
  - [ ] Auto-refresh tokens
  - [ ] User profile sync
  - [ ] Logout functionality
- **Technical Notes**:
  ```typescript
  // app/providers/supabase-provider.tsx
  'use client';
  
  import { createContext, useContext, useEffect, useState } from 'react';
  import { Session, User } from '@supabase/supabase-js';
  import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
  import { useRouter } from 'next/navigation';
  
  interface SupabaseContext {
    user: User | null;
    session: Session | null;
    signOut: () => Promise<void>;
    loading: boolean;
  }
  
  const Context = createContext<SupabaseContext | undefined>(undefined);
  
  export function SupabaseProvider({ 
    children,
    session,
  }: { 
    children: React.ReactNode;
    session: Session | null;
  }) {
    const [user, setUser] = useState<User | null>(session?.user ?? null);
    const [currentSession, setSession] = useState<Session | null>(session);
    const [loading, setLoading] = useState(!session);
    const router = useRouter();
    const supabase = createClientComponentClient();
    
    useEffect(() => {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        if (event === 'SIGNED_IN') {
          router.refresh();
        } else if (event === 'SIGNED_OUT') {
          router.push('/login');
        }
      });
      
      return () => subscription.unsubscribe();
    }, [router, supabase]);
    
    const signOut = async () => {
      await supabase.auth.signOut();
      router.push('/');
    };
    
    return (
      <Context.Provider value={{ user, session: currentSession, signOut, loading }}>
        {children}
      </Context.Provider>
    );
  }
  
  export const useSupabase = () => {
    const context = useContext(Context);
    if (context === undefined) {
      throw new Error('useSupabase must be used inside SupabaseProvider');
    }
    return context;
  };
  ```

##### Task 2.1.2.3: Create Protected Route Middleware (2 hours)
- **Description**: Implement route protection
- **Dependencies**: Task 2.1.2.2
- **Acceptance Criteria**:
  - [ ] Middleware checks auth status
  - [ ] Redirects to login if needed
  - [ ] Public routes allowed
  - [ ] Loading states handled
  - [ ] Remember redirect URL
- **Technical Notes**:
  ```typescript
  // middleware.ts
  import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
  import { NextResponse } from 'next/server';
  import type { NextRequest } from 'next/server';
  
  export async function middleware(req: NextRequest) {
    const res = NextResponse.next();
    const supabase = createMiddlewareClient({ req, res });
    
    const {
      data: { session },
    } = await supabase.auth.getSession();
    
    // Protected routes
    const protectedPaths = ['/dashboard', '/calls', '/settings'];
    const isProtectedPath = protectedPaths.some(path => 
      req.nextUrl.pathname.startsWith(path)
    );
    
    // Auth routes
    const authPaths = ['/login', '/signup'];
    const isAuthPath = authPaths.some(path => 
      req.nextUrl.pathname.startsWith(path)
    );
    
    // Redirect logic
    if (!session && isProtectedPath) {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = '/login';
      redirectUrl.searchParams.set('redirectedFrom', req.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }
    
    if (session && isAuthPath) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    
    return res;
  }
  
  export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
  };
  ```

### Epic 2.2: Core Dashboard Implementation

#### Story 2.2.1: Dashboard Layout

##### Task 2.2.1.1: Add Auth to Dashboard Shell (3 hours)
- **Description**: Integrate authentication into existing dashboard layout
- **Dependencies**: Task 2.1.2.3
- **Acceptance Criteria**:
  - [ ] Sidebar navigation
  - [ ] Header with user menu
  - [ ] Responsive design
  - [ ] Active route highlighting
  - [ ] Logout functionality
- **Technical Notes**:
  ```typescript
  // app/(dashboard)/layout.tsx
  import { Sidebar } from '@/components/dashboard/sidebar';
  import { Header } from '@/components/dashboard/header';
  
  export default function DashboardLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return (
      <div className="h-screen flex overflow-hidden bg-gray-100">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    );
  }
  
  // components/dashboard/sidebar.tsx
  'use client';
  
  import Link from 'next/link';
  import { usePathname } from 'next/navigation';
  import { cn } from '@/lib/utils';
  import { 
    Phone, 
    BarChart3, 
    Users, 
    Settings,
    Home
  } from 'lucide-react';
  
  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Calls', href: '/dashboard/calls', icon: Phone },
    { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
    { name: 'Contacts', href: '/dashboard/contacts', icon: Users },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];
  
  export function Sidebar() {
    const pathname = usePathname();
    
    return (
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col flex-grow bg-white border-r">
            <div className="flex items-center flex-shrink-0 px-4 py-4">
              <h1 className="text-xl font-semibold">Creative AI</h1>
            </div>
            <nav className="mt-5 flex-1 px-2 space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      isActive
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                      'group flex items-center px-2 py-2 text-sm font-medium rounded-md'
                    )}
                  >
                    <item.icon
                      className={cn(
                        isActive
                          ? 'text-gray-500'
                          : 'text-gray-400 group-hover:text-gray-500',
                        'mr-3 h-5 w-5'
                      )}
                    />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>
    );
  }
  ```
##### Task 2.2.1.2: Integrate Dashboard with Auth & Backend (3 hours)
- **Description**: Connect existing dashboard to authenticated backend API
- **Dependencies**: Task 2.2.1.1
- **Acceptance Criteria**:
  - [ ] Call statistics cards
  - [ ] Recent calls list
  - [ ] Quick actions section
  - [ ] Real-time updates via Socket.io
  - [ ] Loading skeletons
- **Technical Notes**:
  ```typescript
  // app/(dashboard)/dashboard/page.tsx
  'use client';
  
  import { useEffect, useState } from 'react';
  import { useRouter } from 'next/navigation';
  import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
  import { Skeleton } from '@/components/ui/skeleton';
  import { Button } from '@/components/ui/button';
  import { Alert, AlertDescription } from '@/components/ui/alert';
  import { Phone, Users, Clock, TrendingUp, AlertCircle } from 'lucide-react';
  import { useApi } from '@/hooks/use-api';
  import { useSocket } from '@/hooks/use-socket';
  import { RecentCallsTable } from '@/components/recent-calls-table';
  
  interface DashboardStats {
    totalCalls: number;
    activeCalls: number;
    totalDuration: number;
    successRate: number;
  }
  
  export default function DashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [recentCalls, setRecentCalls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { fetchStats, fetchRecentCalls } = useApi();
    const socket = useSocket();
    const router = useRouter();
    
    useEffect(() => {
      loadDashboardData();
      
      // Subscribe to real-time updates
      socket.on('call_update', handleCallUpdate);
      
      return () => {
        socket.off('call_update', handleCallUpdate); // Fix: Pass handler reference
        socket.removeAllListeners('call_update'); // Fix: Ensure cleanup
      };
    }, [socket]); // Fix: Add socket dependency
    
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [statsData, callsData] = await Promise.all([
          fetchStats(),
          fetchRecentCalls()
        ]);
        
        setStats(statsData);
        setRecentCalls(callsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
        console.error('Dashboard data error:', err);
      } finally {
        setLoading(false);
      }
    };
    
    const handleCallUpdate = (update: any) => {
      // Update stats and recent calls based on real-time events
      if (update.type === 'call_ended') {
        loadDashboardData();
      }
    };
    
    const statCards = [
      {
        title: 'Total Calls',
        value: stats?.totalCalls || 0,
        icon: Phone,
        color: 'text-blue-600'
      },
      {
        title: 'Active Calls',
        value: stats?.activeCalls || 0,
        icon: Users,
        color: 'text-green-600'
      },
      {
        title: 'Total Duration',
        value: `${Math.round((stats?.totalDuration || 0) / 60)}m`,
        icon: Clock,
        color: 'text-purple-600'
      },
      {
        title: 'Success Rate',
        value: `${stats?.successRate || 0}%`,
        icon: TrendingUp,
        color: 'text-orange-600'
      }
    ];
    
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <Button onClick={() => router.push('/dashboard/calls/new')}>
            <Phone className="mr-2 h-4 w-4" />
            New Call
          </Button>
        </div>
        
        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                {stats ? (
                  <div className="text-2xl font-bold">{stat.value}</div>
                ) : (
                  <Skeleton className="h-8 w-20" />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Recent Calls */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Calls</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentCallsTable calls={recentCalls} loading={!recentCalls.length} />
          </CardContent>
        </Card>
      </div>
    );
  }
  ```

#### Story 2.2.2: Calls Management Interface

##### Task 2.2.2.1: Port Calls List Page to Production API (4 hours)
- **Description**: Update existing calls page to use production API endpoints
- **Dependencies**: Task 2.2.1.2
- **Acceptance Criteria**:
  - [ ] Paginated calls table
  - [ ] Search functionality
  - [ ] Status filters
  - [ ] Date range picker
  - [ ] Export to CSV
- **Technical Notes**:
  ```typescript
  // app/(dashboard)/dashboard/calls/page.tsx
  'use client';
  
  import { useState, useEffect } from 'react';
  import { useRouter } from 'next/navigation';
  import { DataTable } from '@/components/ui/data-table';
  import { DateRangePicker } from '@/components/ui/date-range-picker';
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
  import { Input } from '@/components/ui/input';
  import { Button } from '@/components/ui/button';
  import { Card, CardContent } from '@/components/ui/card';
  import { Alert, AlertDescription } from '@/components/ui/alert';
  import { Download, Phone, AlertCircle } from 'lucide-react';
  
  // Utility function
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const columns = [
    {
      accessorKey: 'to',
      header: 'Phone Number',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status');
        const colors = {
          completed: 'bg-green-100 text-green-800',
          failed: 'bg-red-100 text-red-800',
          'in-progress': 'bg-blue-100 text-blue-800'
        };
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status]}`}>
            {status}
          </span>
        );
      }
    },
    {
      accessorKey: 'duration',
      header: 'Duration',
      cell: ({ row }) => {
        const duration = row.getValue('duration');
        return formatDuration(duration);
      }
    },
    {
      accessorKey: 'createdAt',
      header: 'Date',
      cell: ({ row }) => {
        return new Date(row.getValue('createdAt')).toLocaleString();
      }
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const call = row.original;
        return (
          <div className="flex gap-2">
            <Button size="sm" variant="outline"
              onClick={() => router.push(`/dashboard/calls/${call.callSid}`)}>
              View
            </Button>
          </div>
        );
      }
    }
  ];
  
  export default function CallsPage() {
    const [calls, setCalls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filters, setFilters] = useState({
      status: 'all',
      search: '',
      dateRange: { from: null, to: null }
    });
    // Fix: Extract magic numbers
  const ITEMS_PER_PAGE = 20;
  const DEFAULT_PAGE = 1;
  
  const [pagination, setPagination] = useState({
      page: DEFAULT_PAGE,
      limit: ITEMS_PER_PAGE,
      total: 0
    });
    const router = useRouter();
    
    useEffect(() => {
      fetchCalls();
    }, [filters, pagination.page]);
    
    const fetchCalls = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const params = new URLSearchParams({
          page: pagination.page.toString(),
          limit: pagination.limit.toString(),
          ...(filters.status !== 'all' && { status: filters.status }),
          ...(filters.search && { search: filters.search }),
          ...(filters.dateRange.from && { from: filters.dateRange.from.toISOString() }),
          ...(filters.dateRange.to && { to: filters.dateRange.to.toISOString() })
        });
        
        const response = await fetch(`/api/calls?${params}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch calls: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        setCalls(data.calls || []);
        setPagination(prev => ({ ...prev, total: data.total || 0 }));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch calls');
        console.error('Fetch calls error:', err);
        setCalls([]);
      } finally {
        setLoading(false);
      }
    };
    
    const exportCalls = async () => {
      try {
        const response = await fetch('/api/calls/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(filters)
        });
        
        if (!response.ok) {
          throw new Error('Failed to export calls');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `calls-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } catch (err) {
        setError('Failed to export calls. Please try again.');
        console.error('Export error:', err);
      }
    };
    
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Calls</h1>
          <Button onClick={() => router.push('/dashboard/calls/new')}>
            <Phone className="mr-2 h-4 w-4" />
            New Call
          </Button>
        </div>
        
        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="grid gap-4 md:grid-cols-4">
              <Input
                placeholder="Search by phone number..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                </SelectContent>
              </Select>
              <DateRangePicker
                value={filters.dateRange}
                onChange={(range) => setFilters(prev => ({ ...prev, dateRange: range }))}
              />
              <Button onClick={exportCalls} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Calls Table */}
        <Card>
          <CardContent>
            <DataTable
              columns={columns}
              data={calls}
              loading={loading}
              pagination={{
                pageIndex: pagination.page - 1,
                pageSize: pagination.limit,
                pageCount: Math.ceil(pagination.total / pagination.limit),
                onPageChange: (page) => setPagination(prev => ({ ...prev, page: page + 1 }))
              }}
            />
          </CardContent>
        </Card>
      </div>
    );
  }
  ```

##### Task 2.2.2.2: Connect Call Details Page to Backend (4 hours)
- **Description**: Wire up existing call details page to production APIs
- **Dependencies**: Task 2.2.2.1
- **Acceptance Criteria**:
  - [ ] Call metadata display
  - [ ] Real-time transcript with typewriter effect
  - [ ] Recording playback
  - [ ] Call timeline visualization
  - [ ] Download options
- **Technical Notes**:
  ```typescript
  // app/(dashboard)/dashboard/calls/[callSid]/page.tsx
  'use client';
  
  import { useEffect, useState } from 'react';
  import { useParams } from 'next/navigation';
  import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
  import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
  import { Badge } from '@/components/ui/badge';
  import { Button } from '@/components/ui/button';
  import { Skeleton } from '@/components/ui/skeleton';
  import { Alert, AlertDescription } from '@/components/ui/alert';
  import { 
    Phone, Clock, Calendar, Download, Play, Pause, 
    User, Mic, AlertCircle 
  } from 'lucide-react';
  import { AudioPlayer } from '@/components/audio-player';
  import { TranscriptViewer } from '@/components/transcript-viewer';
  import { useSocket } from '@/hooks/use-socket';
  
  interface CallDetails {
    callSid: string;
    to: string;
    from: string;
    status: string;
    duration: number;
    startTime: string;
    endTime: string;
    recordingUrl?: string;
    transcript?: TranscriptMessage[];
    metadata?: {
      agentId: string;
      conversationId: string;
    };
  }
  
  interface TranscriptMessage {
    role: 'user' | 'assistant';
    message: string;
    timestamp: string;
  }
  
  export default function CallDetailsPage() {
    const { callSid } = useParams();
    const [call, setCall] = useState<CallDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [transcriptMessages, setTranscriptMessages] = useState<TranscriptMessage[]>([]);
    const socket = useSocket();
    
    useEffect(() => {
      if (callSid) {
        fetchCallDetails();
        subscribeToUpdates();
      }
      
      return () => {
        // Fix: Properly cleanup all listeners
        socket.off(`call_update:${callSid}`);
        socket.off(`transcript_update:${callSid}`);
        socket.removeAllListeners(`call_update:${callSid}`);
        socket.removeAllListeners(`transcript_update:${callSid}`);
      };
    }, [callSid]);
    
    const fetchCallDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/calls/${callSid}`);
        if (!response.ok) {
          throw new Error('Failed to fetch call details');
        }
        
        const data = await response.json();
        setCall(data);
        setTranscriptMessages(data.transcript || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load call details');
        console.error('Call details error:', err);
      } finally {
        setLoading(false);
      }
    };
    
    const subscribeToUpdates = () => {
      // Subscribe to call status updates
      socket.on(`call_update:${callSid}`, (update: any) => {
        setCall(prev => prev ? { ...prev, ...update } : null);
      });
      
      // Subscribe to transcript updates with typewriter effect
      socket.on(`transcript_update:${callSid}`, (update: any) => {
        if (update.type === 'message') {
          setTranscriptMessages(prev => [...prev, update.data]);
        }
      });
    };
    
    const downloadRecording = async () => {
      if (!call?.recordingUrl) return;
      
      try {
        const response = await fetch(call.recordingUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `call-${callSid}-recording.mp3`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } catch (err) {
        console.error('Download error:', err);
      }
    };
    
    const downloadTranscript = () => {
      // Fix: Sanitize messages to prevent XSS
      const content = transcriptMessages
        .map(msg => {
          const sanitizedMessage = DOMPurify.sanitize(msg.message, { ALLOWED_TAGS: [] });
          return `[${msg.timestamp}] ${msg.role}: ${sanitizedMessage}`;
        })
        .join('\n');
      
      const blob = new Blob([content], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `call-${callSid}-transcript.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    };
    
    if (loading) {
      return (
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      );
    }
    
    if (error || !call) {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error || 'Call not found'}
          </AlertDescription>
        </Alert>
      );
    }
    
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">Call Details</h1>
            <p className="text-gray-500 mt-1">{call.callSid}</p>
          </div>
          <Badge variant={call.status === 'completed' ? 'default' : 'destructive'}>
            {call.status}
          </Badge>
        </div>
        
        {/* Metadata Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone Number
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">{call.to}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Duration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">
                {Math.floor(call.duration / 60)}:{(call.duration % 60).toString().padStart(2, '0')}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date & Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">
                {new Date(call.startTime).toLocaleString()}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                Agent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">
                {call.metadata?.agentId || 'Default Agent'}
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* Main Content Tabs */}
        <Tabs defaultValue="transcript" className="space-y-4">
          <TabsList>
            <TabsTrigger value="transcript">Transcript</TabsTrigger>
            <TabsTrigger value="recording" disabled={!call.recordingUrl}>
              Recording
            </TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>
          
          <TabsContent value="transcript" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Conversation Transcript</CardTitle>
                <Button size="sm" variant="outline" onClick={downloadTranscript}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </CardHeader>
              <CardContent>
                <TranscriptViewer 
                  messages={transcriptMessages}
                  isLive={call.status === 'in-progress'}
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="recording" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Call Recording</CardTitle>
                <Button size="sm" variant="outline" onClick={downloadRecording}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </CardHeader>
              <CardContent>
                {call.recordingUrl ? (
                  <AudioPlayer src={call.recordingUrl} />
                ) : (
                  <p className="text-gray-500">No recording available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Call Metadata</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Call SID</dt>
                    <dd className="text-sm">{call.callSid}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">From Number</dt>
                    <dd className="text-sm">{call.from}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Start Time</dt>
                    <dd className="text-sm">{new Date(call.startTime).toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">End Time</dt>
                    <dd className="text-sm">
                      {call.endTime ? new Date(call.endTime).toLocaleString() : 'Ongoing'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Conversation ID</dt>
                    <dd className="text-sm">{call.metadata?.conversationId || 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Status</dt>
                    <dd className="text-sm">
                      <Badge variant={call.status === 'completed' ? 'default' : 'destructive'}>
                        {call.status}
                      </Badge>
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }
  ```

##### Task 2.2.2.3: Integrate Make Call Page (3 hours)
- **Description**: Connect existing make-call page to backend API
- **Dependencies**: Task 2.2.2.2
- **Acceptance Criteria**:
  - [ ] Phone number input with validation
  - [ ] Agent selection dropdown
  - [ ] Custom prompt textarea
  - [ ] First message input
  - [ ] Call initiation with loading state
- **Technical Notes**:
  ```typescript
  // app/(dashboard)/dashboard/calls/new/page.tsx
  import { useForm } from 'react-hook-form';
  import { zodResolver } from '@hookform/resolvers/zod';
  import * as z from 'zod';
  
  const callFormSchema = z.object({
    phoneNumber: z.string()
      .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
    agentId: z.string().optional(),
    prompt: z.string().max(1000).optional(),
    firstMessage: z.string().max(500).optional(),
  });
  
  type CallFormData = z.infer<typeof callFormSchema>;
  ```

### Epic 2.3: API Integration

#### Story 2.3.0: Circuit Breaker Implementation

##### Task 2.3.0.1: External Service Circuit Breakers (4 hours)
- **Description**: Implement circuit breakers for external services
- **Dependencies**: Phase 1 completion
- **Acceptance Criteria**:
  - [ ] Circuit breaker for ElevenLabs API
  - [ ] Circuit breaker for Twilio API
  - [ ] Fallback strategies defined
  - [ ] Health check endpoints
  - [ ] Auto-recovery logic
- **Technical Notes**:
  ```typescript
  // lib/circuit-breaker.ts
  import CircuitBreaker from 'opossum';
  
  const options = {
    timeout: 3000,
    errorThresholdPercentage: 50,
    resetTimeout: 30000,
    volumeThreshold: 10
  };
  
  // ElevenLabs circuit breaker with fallback
  export const elevenLabsBreaker = new CircuitBreaker(
    elevenLabsAPICall,
    options
  );
  
  elevenLabsBreaker.fallback(() => {
    // Return cached agent response or graceful error
    return {
      error: 'AI service temporarily unavailable',
      fallback: true
    };
  });
  
  elevenLabsBreaker.on('open', () => {
    logger.error('ElevenLabs circuit breaker opened');
    // Send alert to ops team
  });
  ```

#### Story 2.3.1: Backend API Client

##### Task 2.3.1.1: Consolidate API Client Services (3 hours)
- **Description**: Refactor existing API clients into unified service with auth
- **Dependencies**: Task 2.2.2.3
- **Acceptance Criteria**:
  - [ ] Axios/Fetch wrapper with interceptors
  - [ ] Automatic auth token injection
  - [ ] CSRF token handling
  - [ ] Request/response logging
  - [ ] Error handling and retry logic
  - [ ] TypeScript interfaces for all endpoints

##### Task 2.3.1.2: Update Existing API Hooks (3 hours)
- **Description**: Add authentication to existing React hooks
- **Dependencies**: Task 2.3.1.1
- **Acceptance Criteria**:
  - [ ] useCalls hook with pagination
  - [ ] useCall hook for single call
  - [ ] useMakeCall hook with optimistic updates
  - [ ] useTranscript hook with real-time updates
  - [ ] Loading and error states

### Epic 2.4: Real-time Features

#### Story 2.4.0: WebSocket Debugging Tools

##### Task 2.4.0.1: WebSocket Event Replay System (3 hours)
- **Description**: Build debugging tools for WebSocket issues
- **Dependencies**: Task 2.3.1.2
- **Acceptance Criteria**:
  - [ ] Event recording mechanism
  - [ ] Event replay capability
  - [ ] Connection health metrics
  - [ ] Debug dashboard
  - [ ] Production-safe logging
- **Technical Notes**:
  ```typescript
  // lib/websocket-debugger.ts
  class WebSocketDebugger {
    private eventLog: Array<{
      timestamp: Date;
      event: string;
      data: any;
      connectionId: string;
    }> = [];
    
    recordEvent(event: string, data: any, connectionId: string) {
      if (process.env.WS_DEBUG_ENABLED === 'true') {
        this.eventLog.push({
          timestamp: new Date(),
          event,
          data: this.sanitizeData(data),
          connectionId
        });
        
        // Keep only last 1000 events in memory
        if (this.eventLog.length > 1000) {
          this.eventLog.shift();
        }
      }
    }
    
    getConnectionHealth() {
      return {
        activeConnections: this.getActiveConnections(),
        eventsPerMinute: this.calculateEventRate(),
        errorRate: this.calculateErrorRate(),
        avgLatency: this.calculateAvgLatency()
      };
    }
  }
  ```

#### Story 2.4.1: Socket.io Integration

##### Task 2.4.1.1: Socket Client Setup (2 hours)
- **Description**: Configure Socket.io client with auth
- **Dependencies**: Task 2.3.1.2
- **Acceptance Criteria**:
  - [ ] Socket connection with JWT auth
  - [ ] Automatic reconnection logic
  - [ ] Connection status indicator
  - [ ] Event type definitions
  - [ ] Debug logging

##### Task 2.4.1.2: Real-time Updates Implementation (3 hours)
- **Description**: Implement live call and transcript updates
- **Dependencies**: Task 2.4.1.1
- **Acceptance Criteria**:
  - [ ] Live call status updates
  - [ ] Transcript typewriter effect
  - [ ] Active calls counter
  - [ ] Notification system
  - [ ] Optimistic UI updates

### Epic 2.5: Deployment Configuration

#### Story 2.5.1: Frontend Deployment

##### Task 2.5.1.1: Configure Vercel Deployment (2 hours)
- **Description**: Set up Vercel for Next.js hosting
- **Dependencies**: All frontend tasks
- **Acceptance Criteria**:
  - [ ] Vercel project created
  - [ ] Environment variables configured
  - [ ] Custom domain setup
  - [ ] Build optimization
  - [ ] Preview deployments

##### Task 2.5.1.2: Backend API Updates (3 hours)
- **Description**: Update backend for production frontend
- **Dependencies**: Task 2.5.1.1
- **Acceptance Criteria**:
  - [ ] CORS updated for Vercel domains
  - [ ] API documentation updated
  - [ ] Rate limiting configured
  - [ ] Health check endpoints
  - [ ] Webhook retry logic implemented
  - [ ] Monitoring setup
- **Technical Notes**:
  ```javascript
  // webhook-retry.js
  const retryConfig = {
    maxAttempts: 3,
    backoffMultiplier: 2,
    initialDelay: 1000,
    maxDelay: 10000
  };
  
  async function sendWebhookWithRetry(url, payload, attempt = 1) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        timeout: 5000
      });
      
      if (!response.ok && attempt < retryConfig.maxAttempts) {
        const delay = Math.min(
          retryConfig.initialDelay * Math.pow(retryConfig.backoffMultiplier, attempt - 1),
          retryConfig.maxDelay
        );
        await sleep(delay);
        return sendWebhookWithRetry(url, payload, attempt + 1);
      }
      
      return response;
    } catch (error) {
      logger.error('Webhook failed', { url, attempt, error });
      if (attempt < retryConfig.maxAttempts) {
        return sendWebhookWithRetry(url, payload, attempt + 1);
      }
      throw error;
    }
  }
  ```

---

## Phase 3: Advanced Features (Weeks 7-12)

### Epic 3.1: Memory & Context System

#### Story 3.1.1: Vector Database Integration
- **Goal**: Implement conversation memory using vector search
- **Duration**: 2 weeks
- **Key Tasks**:
  - Research and select vector DB (Pinecone/Weaviate/MongoDB Atlas)
  - Design conversation embeddings schema
  - Implement embedding generation pipeline
  - Create similarity search endpoints
  - Implement conversation context retrieval

#### Story 3.1.2: Stateful Conversations
- **Goal**: Enable multi-call conversation continuity
- **Duration**: 1 week
- **Key Tasks**:
  - Implement caller identification system
  - Create conversation threading logic
  - Implement context injection for ElevenLabs
  - Add conversation history UI
  - Test cross-call memory retention

### Epic 3.2: Campaign Management

#### Story 3.2.1: Advanced Campaign Features
- **Goal**: Enhance campaign tools with advanced features
- **Duration**: 1.5 weeks
- **Key Tasks**:
  - Campaign templates system
  - A/B testing framework
  - Advanced scheduling with timezones
  - Call outcome tracking
  - Campaign analytics dashboard

#### Story 3.2.2: Bulk Operations
- **Goal**: Enable large-scale calling operations
- **Duration**: 1 week
- **Key Tasks**:
  - CSV/Excel import with validation
  - Batch processing queue
  - Progress tracking UI
  - Error handling and retries
  - Export functionality

### Epic 3.3: Analytics & Insights

#### Story 3.3.1: Advanced Analytics
- **Goal**: Provide deep insights into call performance
- **Duration**: 1.5 weeks
- **Key Tasks**:
  - Sentiment analysis integration
  - Call outcome classification
  - Conversion tracking
  - Custom report builder
  - Data visualization components

#### Story 3.3.2: Real-time Dashboard
- **Goal**: Build executive dashboard
- **Duration**: 1 week
- **Key Tasks**:
  - Real-time metrics streaming
  - Customizable widgets
  - Export to PDF/Excel
  - Scheduled reports
  - Mobile responsive design

### Epic 3.4: Integration Ecosystem

#### Story 3.4.1: CRM Integrations
- **Goal**: Connect with popular CRM systems
- **Duration**: 2 weeks
- **Key Tasks**:
  - Salesforce integration
  - HubSpot connector
  - Webhook framework
  - Field mapping UI
  - Sync error handling

#### Story 3.4.2: Automation Tools
- **Goal**: Enable workflow automation
- **Duration**: 1 week
- **Key Tasks**:
  - Zapier integration
  - Make.com connector
  - API webhook triggers
  - Custom automation builder
  - Testing framework

---

## Implementation Guidelines

### Development Workflow
1. **Daily Standup**: Review todo list, update progress
2. **Code Review**: All PRs require review before merge
3. **Testing**: Minimum 80% coverage for new code
4. **Documentation**: Update docs with each feature
5. **Deployment**: Feature branches → staging → production

### Quality Standards
- **TypeScript**: Strict mode, no any types
- **Testing**: Unit + integration tests required
- **Accessibility**: WCAG 2.1 AA compliance
- **Performance**: Core Web Vitals targets
- **Security**: OWASP Top 10 compliance

### Communication
- **Slack**: Daily updates in #creative-ai-dev
- **Jira**: Task tracking and sprint planning
- **Confluence**: Technical documentation
- **Figma**: Design collaboration

### Risk Mitigation
1. **Technical Debt**: Allocate 20% time for refactoring
2. **Scope Creep**: Weekly scope reviews
3. **Dependencies**: Early API mocking
4. **Performance**: Regular load testing
5. **Security**: Monthly security audits

---

## Success Metrics

### Phase 1 (Foundation)
- [ ] All security vulnerabilities patched
- [ ] 100% test coverage for critical paths
- [ ] <200ms API response times
- [ ] Zero downtime deployment achieved

### Phase 2 (MVP)
- [ ] First successful call through platform
- [ ] 5 beta users onboarded
- [ ] <3s page load times
- [ ] 99.9% uptime achieved

### Phase 3 (Advanced)
- [ ] 1000+ calls processed
- [ ] <1% error rate
- [ ] 90% user satisfaction score
- [ ] 5 integration partners

---

## Appendices

### A. Technology Decisions
- **Frontend**: Next.js 14 (App Router for better performance)
- **Styling**: Tailwind CSS + Shadcn UI (consistent design system)
- **State**: Zustand (simpler than Redux for this scale)
- **Backend**: Keep existing Fastify (already optimized)
- **Database**: MongoDB Atlas (vector search ready)
- **Auth**: Supabase (generous free tier)

### B. Deferred Decisions
- **Vector Database**: Evaluate after MVP based on usage patterns
- **Inbound Calls**: Architecture design after outbound stability
- **Mobile App**: Consider after web platform success
- **White-label**: Design system preparation only
- **Backend Migration**: Render.com adequate for MVP, revisit at scale

### C. Production Readiness Checklist
- **Feature Flags**: All new features behind flags
- **Circuit Breakers**: External service protection
- **Observability**: Correlation IDs, structured logging
- **Disaster Recovery**: Database backups, runbooks
- **Configuration**: All hardcoded values extracted
- **Monitoring**: Health checks, alerts, dashboards
- **Security**: CSRF, XSS protection, rate limiting
- **Documentation**: API docs, deployment guides

### D. Resource Requirements
- **Development**: 1 full-stack developer (Cameron + Claude)
- **Design**: UI/UX consultation as needed
- **DevOps**: Minimal (using managed services)
- **QA**: Automated testing + user acceptance testing

---

*This document is version 1.0 and will be updated as the project progresses.*
