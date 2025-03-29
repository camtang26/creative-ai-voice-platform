"use client";

import { RecordingItem } from '@/components/recording-item';
import { RecordingInfo } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface RecordingsListProps {
  recordings: RecordingInfo[];
  callSid: string;
  callDetails?: {
    from: string;
    to: string;
    startTime: string;
    endTime?: string;
  };
}

export function RecordingsList({ recordings, callSid, callDetails }: RecordingsListProps) {
  if (recordings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Recordings Available</CardTitle>
          <CardDescription>
            This call does not have any recordings available.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Recordings may not be available for several reasons:
          </p>
          <ul className="text-sm text-muted-foreground mt-2 list-disc list-inside">
            <li>Recording was not enabled for this call</li>
            <li>The call was too short to generate a recording</li>
            <li>The recording is still being processed</li>
            <li>There was an error during the recording process</li>
          </ul>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">
          {recordings.length} Recording{recordings.length !== 1 ? 's' : ''}
        </h3>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Download All
        </Button>
      </div>
      
      <div className="space-y-4">
        {recordings.map((recording) => (
          <RecordingItem 
            key={recording.sid} 
            recording={recording} 
            callSid={callSid}
            callDetails={callDetails} 
          />
        ))}
      </div>
    </div>
  );
}
