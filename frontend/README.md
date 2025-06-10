# ElevenLabs Calling Dashboard

A comprehensive frontend dashboard for the ElevenLabs Twilio integration that allows for call monitoring, management, and analytics.

## Features

- **Dashboard Overview**: Key metrics and call activity visualization
- **Call Logs**: Complete history of all outbound calls
- **Live Call Monitoring**: Real-time monitoring of active calls
- **Recording Management**: Listen to and download call recordings
- **Make Call**: Initiate outbound calls through the UI
- **Google Sheets Integration**: Make calls from contact lists in Google Sheets
- **CSV Upload**: Upload contact lists for batch calling

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Backend server running (ElevenLabs Twilio server)

### Installation

1. Install dependencies:

```bash
cd frontend
npm install
```

2. Configure the environment:

The application is configured to proxy API requests to the backend server running on port 8000. If your backend is running on a different port, update the `next.config.js` file.

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

### Building for Production

Build the application:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

## Project Structure

```
frontend/
├── src/
│   ├── app/               # Next.js pages
│   ├── components/        # React components
│   │   ├── ui/            # UI components library
│   │   └── ...            # Feature components
│   └── lib/               # Utility functions and services
├── public/                # Static assets
└── package.json          # Dependencies and scripts
```

## Integration with Backend

The dashboard integrates with the ElevenLabs Twilio server API to:

1. Fetch call statistics and history
2. Initiate new outbound calls
3. Stream call audio in real-time
4. Access call recordings
5. Monitor call quality metrics

API communication is handled through service functions in the `src/lib/api.ts` file.

## Technology Stack

- **Next.js 14**: React framework with App Router
- **TypeScript**: For type safety
- **Tailwind CSS**: For styling
- **Shadcn UI**: Component library
- **Recharts**: For data visualization
- **Wavesurfer.js**: For audio waveform visualization
- **Socket.io**: For real-time updates (planned)

## Implementation Progress

This project is being implemented in phases:

1. **Phase 1** (Completed): Core UI components, layouts, and navigation
2. **Phase 2** (Completed): Live call monitoring with real-time WebSocket updates
3. **Phase 3** (Planned): Recording management and enhanced analytics
4. **Phase 4** (Planned): Advanced features like campaign management

See the Implementation Reports for detailed progress information:
- [Phase 1 Report](./IMPLEMENTATION_REPORT_PHASE1.md)
- [Phase 2 Report](./IMPLEMENTATION_REPORT_PHASE2.md)

## License

MIT
