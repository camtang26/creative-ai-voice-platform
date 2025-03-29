# Call Logs and Recordings Mock Data Fix

I've identified the issue with your call logs and recordings pages showing mock data instead of real MongoDB data.

## The Problem

1. The MongoDB backend server isn't running properly
2. The API endpoints at `/api/db/calls` and other MongoDB endpoints aren't accessible
3. The frontend is correctly set up to use MongoDB data, but it can't connect to the server

## The Solution

To fix this issue:

1. Start the MongoDB server by running the `start-mongodb-server.bat` batch file:
   ```
   .\start-mongodb-server.bat
   ```

   This script will:
   - Start ngrok (if not already running)
   - Configure the environment with the ngrok URL
   - Start the MongoDB-enhanced server

2. Make sure the server is running on port 8000 and serving the API endpoints at `/api/db/calls`

3. The Next.js frontend is already configured to proxy requests from `/api/db/*` to `http://localhost:8000/api/db/*` in the next.config.js file

## Verifying the Fix

After starting the MongoDB server:

1. Check if you can access the API endpoint in your browser at:
   ```
   http://localhost:8000/api/db/calls
   ```

2. Refresh the call logs page in your application
   
3. The real call data from MongoDB should now appear instead of the mock data

## Additional Information

The call logs and recordings pages we've implemented are correctly using the MongoDB API:

- Call logs page imports and uses `fetchCalls` from `/lib/mongodb-api.ts`
- Recordings page is set up to fetch data from the MongoDB API
- The API base URL is properly set to `/api/db` in the mongodb-api.ts file

The issue is simply that the MongoDB server needs to be running to serve these API endpoints.
