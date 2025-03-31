"use client";

import { useState, useEffect } from 'react';
import { DashboardHeader } from '@/components/dashboard-header';
import { RecordingItem } from '@/components/recording-item';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, FileDown, Calendar, RefreshCw } from 'lucide-react';
import { RecordingInfo, CallInfo } from '@/lib/types';
import { formatPhoneNumber } from '@/lib/utils';
import Link from 'next/link';
import { fetchCalls } from '@/lib/mongodb-api';

export default function RecordingsPage() {
  const [recordings, setRecordings] = useState<RecordingInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [callsWithRecordings, setCallsWithRecordings] = useState<CallInfo[]>([]);

  useEffect(() => {
    fetchRecordingsData();
  }, []);

  const fetchRecordingsData = async () => {
    setIsLoading(true);
    try {
      const response = await fetchCalls({ 
        limit: 50 // Fetch a decent amount of calls to filter for recordings
      });
      
      if (response.success && response.data) {
        let calls: CallInfo[];
        
        // Handle different response structures
        if (Array.isArray(response.data.calls)) {
          calls = response.data.calls;
        } else if (Array.isArray(response.data)) {
          calls = response.data;
        } else {
          throw new Error('Unexpected response format');
        }
        
        // Filter calls that have populated recordingIds
        // Use 'recordingIds' which is the actual field name populated by Mongoose
        const callsWithRecs = calls.filter(call =>
          call.recordingIds && Array.isArray(call.recordingIds) && call.recordingIds.length > 0);
        
        setCallsWithRecordings(callsWithRecs);
        
        // Flatten all recordings
        const allRecordings: RecordingInfo[] = [];
        callsWithRecs.forEach(call => {
          // Iterate over the populated 'recordingIds' field
          if (call.recordingIds && Array.isArray(call.recordingIds)) {
            call.recordingIds.forEach((recording: any) => { // Use populated recordingIds array and type recording
              // Ensure recording is an object before spreading
              if (recording && typeof recording === 'object') {
                allRecordings.push({
                  ...(recording as RecordingInfo), // Spread the actual recording document
                  callSid: call.callSid, // Use call.callSid (corrected field name)
                  // Correctly include callDetails within the pushed object
                  callDetails: {
                    from: call.from,
                    to: call.to,
                    startTime: call.startTime,
                    endTime: call.endTime
                  }
                });
              } // Close if (recording && typeof recording === 'object')
            }); // Close call.recordingIds.forEach
          }
        });
        
        setRecordings(allRecordings);
        setError(null);
      } else {
        setError(response.error || 'Failed to load recordings');
      }
    } catch (err) {
      console.error('Error fetching recordings:', err);
      setError('Failed to load recordings');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter recordings based on search query
  const filteredRecordings = recordings.filter(recording => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    
    // Search by phone number
    // @ts-ignore - callDetails is added to RecordingInfo
    if (recording.callDetails?.to?.toLowerCase().includes(query)) return true;
    // @ts-ignore
    if (recording.callDetails?.from?.toLowerCase().includes(query)) return true;
    
    // Search by recording ID
    if (recording.sid.toLowerCase().includes(query)) return true;
    
    // Search by call ID
    // @ts-ignore
    if (recording.callSid?.toLowerCase().includes(query)) return true;
    
    return false;
  });

  // Group recordings by date for the "By Date" tab
  const recordingsByDate = filteredRecordings.reduce((acc, recording) => {
    const date = new Date(recording.timestamp).toLocaleDateString();
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(recording);
    return acc;
  }, {} as Record<string, typeof filteredRecordings>);

  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader 
        title="Call Recordings" 
        description="Listen to and download call recordings"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchRecordingsData} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {/* Changed Button to Link for direct download */}
            <Button asChild> 
              <Link href="/api/db/recordings/actions/export" target="_blank"> {/* Updated path */}
                <FileDown className="mr-2 h-4 w-4" />
                Export All
              </Link>
            </Button>
          </div>
        }
      />
      
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search recordings..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Recordings</TabsTrigger>
          <TabsTrigger value="by-date">
            <Calendar className="mr-2 h-4 w-4" />
            By Date
          </TabsTrigger>
        </TabsList>
        
        {/* All Recordings Tab */}
        <TabsContent value="all" className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <div className="flex">
                <div>
                  <p className="text-red-700">{error}</p>
                  <button 
                    className="mt-2 text-sm text-red-700 hover:text-red-500"
                    onClick={fetchRecordingsData}
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          ) : filteredRecordings.length === 0 ? (
            <div className="text-center py-8 border rounded-lg">
              <h3 className="text-lg font-medium">No recordings found</h3>
              <p className="text-muted-foreground mt-1">
                {searchQuery ? 'Try a different search term' : 'Start making calls to generate recordings'}
              </p>
            </div>
          ) : (
            <div>
              {filteredRecordings.map((recording) => (
                <RecordingItem 
                  key={recording.sid} 
                  recording={recording} 
                  // @ts-ignore - callSid is added to RecordingInfo
                  callSid={recording.callSid}
                  // @ts-ignore - callDetails is added to RecordingInfo
                  callDetails={recording.callDetails} 
                />
              ))}
            </div>
          )}
        </TabsContent>
        
        {/* By Date Tab */}
        <TabsContent value="by-date" className="space-y-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <div className="flex">
                <div>
                  <p className="text-red-700">{error}</p>
                  <button 
                    className="mt-2 text-sm text-red-700 hover:text-red-500"
                    onClick={fetchRecordingsData}
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          ) : Object.keys(recordingsByDate).length === 0 ? (
            <div className="text-center py-8 border rounded-lg">
              <h3 className="text-lg font-medium">No recordings found</h3>
              <p className="text-muted-foreground mt-1">
                {searchQuery ? 'Try a different search term' : 'Start making calls to generate recordings'}
              </p>
            </div>
          ) : (
            Object.entries(recordingsByDate)
              .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
              .map(([date, dateRecordings]) => (
                <div key={date}>
                  <h3 className="text-lg font-medium mb-4 border-b pb-2">{date}</h3>
                  <div className="space-y-4">
                    {dateRecordings.map((recording) => (
                      <RecordingItem 
                        key={recording.sid} 
                        recording={recording} 
                        // @ts-ignore - callSid is added to RecordingInfo
                        callSid={recording.callSid}
                        // @ts-ignore - callDetails is added to RecordingInfo
                        callDetails={recording.callDetails} 
                      />
                    ))}
                  </div>
                </div>
              ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
