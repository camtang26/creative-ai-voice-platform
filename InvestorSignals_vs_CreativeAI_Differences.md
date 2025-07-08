# InvestorSignals vs Creative AI - Key Differences

This document highlights the critical differences between the original InvestorSignals implementation and the Creative AI platform configuration.

## Tool Implementation Differences

### InvestorSignals Tools (LEGACY - Not Used)
- **Email Tool**: AWS SES integration via custom REST API
- **Location**: `/email-tools/` directory in main codebase
- **Architecture**: Server-side API endpoints in Fastify
- **Authentication**: Bearer token from environment variable
- **Status**: ❌ Legacy code, not used in Creative AI

### Creative AI Tools (ACTIVE)
- **Email Tool**: Microsoft Outlook via Graph API
- **Booking Tool**: Cal.com integration for consultations
- **Time Tool**: Timezone-aware helper
- **Location**: Separate Netlify deployment
- **Architecture**: Edge Functions (zero cold start)
- **URL**: `https://cre8tiveai-elevenlabs-webhooks.netlify.app/`
- **Status**: ✅ Active and production-ready

## Architecture Differences

### Tool Deployment
| Aspect | InvestorSignals | Creative AI |
|--------|----------------|-------------|
| Platform | Render.com with main app | Netlify Edge Functions |
| Cold Start | 10-40 seconds | 0ms (always warm) |
| Global Performance | Single region | Edge locations worldwide |
| Complexity | Integrated with backend | Standalone functions |

### Email System
| Feature | InvestorSignals | Creative AI |
|---------|----------------|-------------|
| Provider | AWS SES | Microsoft Outlook |
| API | Custom REST wrapper | Microsoft Graph API |
| Authentication | Simple bearer token | OAuth2 flow |
| Templates | Server-side | HTML wrapper in function |

### Booking System
| Feature | InvestorSignals | Creative AI |
|---------|----------------|-------------|
| Implementation | None found | Cal.com API v2 |
| Functionality | N/A | 30-min consultations |
| Time Handling | N/A | UTC conversion, timezone aware |

## Configuration Differences

### Environment Variables
**InvestorSignals**:
```
EMAIL_API_KEY=<bearer-token>
EMAIL_SERVICE_URL=<investor-signals-api>
AWS_ACCESS_KEY_ID=<aws-key>
AWS_SECRET_ACCESS_KEY=<aws-secret>
```

**Creative AI**:
```
# Microsoft Graph (Email)
AZURE_TENANT_ID=<tenant-id>
AZURE_CLIENT_ID=<client-id>
AZURE_CLIENT_SECRET=<secret>
SENDER_UPN=stuart@cre8tive.ai

# Cal.com (Booking)
CAL_COM_API_KEY=<api-key>
DEFAULT_EVENT_TYPE_ID=1837761
```

## Agent Configuration

Both platforms follow the same principle:
- **Agent behavior**: Configured in ElevenLabs platform UI
- **System prompts**: NOT in code
- **Tools**: Registered in ElevenLabs, implemented as webhooks
- **Dynamic variables**: Passed at conversation start

## Migration Considerations

When migrating from InvestorSignals to Creative AI:

1. **Remove Legacy Code**:
   - `/email-tools/` directory
   - AWS SES configuration
   - InvestorSignals API references

2. **Update Documentation**:
   - Remove references to AWS email system
   - Update tool endpoint URLs
   - Document Netlify deployment

3. **Environment Setup**:
   - Remove AWS credentials
   - Add Azure AD credentials
   - Add Cal.com API key

4. **Tool Registration**:
   - Update webhook URLs in ElevenLabs platform
   - Point to Netlify endpoints
   - Test all tool integrations

## Summary

The Creative AI implementation represents a significant architectural improvement:
- **Better Performance**: Edge functions eliminate cold starts
- **Simpler Architecture**: Standalone tool deployment
- **Modern Integrations**: Microsoft Graph API, Cal.com
- **Global Scale**: Edge computing for worldwide performance

The InvestorSignals code remains in the codebase but should be considered legacy and eventually removed to avoid confusion.