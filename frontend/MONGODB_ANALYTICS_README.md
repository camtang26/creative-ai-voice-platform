# MongoDB Analytics Integration

This document provides instructions for using the MongoDB-powered analytics dashboard in the ElevenLabs Outbound Calling project.

## Overview

The MongoDB Analytics integration enhances the existing analytics dashboard by connecting it to real data from the MongoDB database. This provides real-time insights into call performance, conversation quality, and campaign effectiveness.

## Key Features

1. **Real MongoDB Data**: The analytics dashboard now uses real data from the MongoDB database instead of mock data.
2. **Comprehensive Charts**: Visualize call volume, success rates, conversation quality, and topic distribution.
3. **Agent Performance Metrics**: Compare performance across different agent configurations.
4. **Date Range Filtering**: Filter analytics data by custom date ranges.
5. **Real-time Updates**: Receive real-time updates as new calls are made.

## Implementation Details

The MongoDB Analytics integration consists of the following components:

1. **MongoDB API Client**: Located in `/lib/analytics-api.ts`, this client communicates with the MongoDB API endpoints.
2. **MongoDB Analytics Adapter**: Located in `/lib/mongodb-analytics.ts`, this adapter transforms API responses into the format expected by chart components.
3. **Chart Components**: MongoDB-specific chart components in `/components/` that use the real data.
4. **Analytics MongoDB Page**: A dedicated page for MongoDB analytics at `/analytics-mongodb`.

## How to Use

### New Analytics Page

A new analytics page is available at `/analytics-mongodb`. This page provides all the same visualizations as the standard analytics page but uses real data from MongoDB.

To access this page:

1. Navigate to `/analytics-mongodb` in your browser
2. Or use the sidebar navigation "Analytics > MongoDB Analytics"

### Date Range Filtering

Filter the analytics data by date range using the date picker in the top-right corner. This sends the selected date range to the MongoDB API and updates all charts accordingly.

### Refreshing Data

Click the refresh button in the top-right corner to reload the latest data from MongoDB.

## Technical Implementation

The MongoDB Analytics integration works by:

1. Fetching data from MongoDB API endpoints like:
   - `/api/db/analytics/dashboard`
   - `/api/db/analytics/duration/:period`
   - `/api/db/analytics/outcomes`
   - `/api/db/analytics/sentiment`
   - `/api/db/analytics/agent-performance`

2. Transforming API responses into the format expected by chart components.

3. Properly handling loading states, errors, and empty data scenarios.

## Adding the MongoDB Sidebar

To use the MongoDB-enhanced sidebar with analytics dropdown:

1. Rename the existing `sidebar.tsx` to `sidebar.original.tsx`
2. Rename `sidebar-mongodb.tsx` to `sidebar.tsx`
3. Restart the frontend server

This will add a dropdown for Analytics with both Standard and MongoDB options.

## Troubleshooting

If you encounter issues with the MongoDB Analytics integration:

1. **No Data Displayed**: Ensure the MongoDB server is running and accessible.
2. **API Errors**: Check the browser console for API error messages.
3. **Loading Forever**: The MongoDB server might be unresponsive; try restarting it.
4. **Incorrect Data**: Verify that the date range filter is set correctly.

## Next Steps

The current implementation provides a solid foundation for MongoDB-powered analytics. Future enhancements could include:

1. Enhanced filtering options (by agent, campaign, etc.)
2. More advanced analytics (sentiment analysis, keyword extraction)
3. Predictive analytics using historical data
4. Custom report generation
5. Export functionality for analytics data

## Contributors

This MongoDB Analytics integration was implemented by the ElevenLabs development team as part of the ElevenLabs/Twilio Outbound Calling project.
