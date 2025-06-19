"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // Import useRouter
import { DashboardHeader } from '@/components/dashboard-header'
import { Button, buttonVariants } from '@/components/ui/button' // Import buttonVariants
import Link from 'next/link'
import { formatDate, formatPhoneNumber, formatDuration, cn } from '@/lib/utils'
// Removed duplicate import line below
import { Headphones, Download, PhoneCall, Eye, RefreshCw } from 'lucide-react'
import { fetchCalls } from '@/lib/mongodb-api';
import { CallInfo, CallStatus } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

export default function CallLogsPage() {
  const router = useRouter(); // Get router instance
  const [callLogsData, setCallLogsData] = useState<CallInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCalls, setTotalCalls] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  useEffect(() => {
    loadCallData();
  }, [page]);

  async function loadCallData() {
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchCalls({
        limit,
        page
      });

      console.log('Call logs API response:', result);

      if (result.success) {
        // Check the structure of the response
        if (result.data && Array.isArray(result.data.calls)) {
          setCallLogsData(result.data.calls);
          setTotalCalls(result.data.pagination?.total || result.data.calls.length);
        } else if (Array.isArray(result.data)) {
          // Fallback for older potential structures, though less likely now
          setCallLogsData(result.data);
          setTotalCalls(result.total || result.data.length);
        } else {
          console.error('Unexpected response structure:', result);
          setError('Unexpected response format from server');
          setCallLogsData([]); // Ensure it's an empty array on error
          setTotalCalls(0);
        }
      } else {
        setError(result.error || 'Failed to load call logs');
        setCallLogsData([]); // Ensure it's an empty array on error
        setTotalCalls(0);
      }
    } catch (err) {
      console.error('Error loading call logs:', err);
      setError('An unexpected error occurred');
      setCallLogsData([]); // Ensure it's an empty array on error
      setTotalCalls(0);
    } finally {
      setIsLoading(false);
    }
  }

  // Function to get appropriate status styles for the badge (dark theme)
  function getStatusStyles(status: CallStatus) {
    switch (status) {
      case 'in-progress':
        return 'bg-blue-900/50 text-blue-200 border border-blue-700/50';
      case 'completed':
        return 'bg-green-900/50 text-green-200 border border-green-700/50';
      case 'failed':
      case 'busy':
      case 'no-answer':
        return 'bg-red-900/50 text-red-200 border border-red-700/50';
      case 'canceled':
        return 'bg-orange-900/50 text-orange-200 border border-orange-700/50';
      case 'ringing':
        return 'bg-purple-900/50 text-purple-200 border border-purple-700/50';
      case 'initiated':
      case 'queued':
      default:
        return 'bg-gray-800/50 text-gray-300 border border-gray-600/50';
    }
  }

  function handleNextPage() {
    setPage(prev => prev + 1);
  }

  function handlePreviousPage() {
    setPage(prev => Math.max(1, prev - 1));
  }

  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader
        title="Call Logs"
        description="View and manage all your call history"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => loadCallData()} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {/* Changed Button to Link for direct download */}
            <Button asChild>
              <Link href="/api/db/calls/actions/export" target="_blank">  {/* Updated path */}
                <Download className="mr-2 h-4 w-4" />
                Export Logs
              </Link>
            </Button>
          </div>
        }
      />

      {error && (
        <div className="bg-red-900/50 border-l-4 border-red-700/50 p-4 rounded backdrop-blur-sm">
          <div className="flex">
            <div>
              <p className="text-red-200">{error}</p>
              <button
                className="mt-2 text-sm text-red-300 hover:text-red-100"
                onClick={() => loadCallData()}
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin h-8 w-8 border-2 border-gray-400 border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <div className="rounded-md border border-gray-700/50 bg-gray-900/50 backdrop-blur-sm">
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b border-gray-700/50">
                <tr className="border-b border-gray-700/50 transition-colors hover:bg-gray-800/50">
                  <th className="h-12 px-4 text-left align-middle font-medium text-gray-200">Name</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-gray-200">Call SID</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-gray-200">To</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-gray-200">From</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-gray-200">Status</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-gray-200">Duration</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-gray-200">Date & Time</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-gray-200">Actions</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {callLogsData.length > 0 ? (
                  callLogsData.map((call) => {
                    // --- DEBUG LOG ---
                    // Log the stringified object to ensure all properties are visible
                    // console.log('[CallLogsTable] Rendering row for call:', JSON.stringify(call)); // Keep commented out for now
                    // --- Removed SID check log ---
                    // --- END DEBUG LOG ---
                    return (
                      <tr
                        key={call.callSid || `call-${Math.random().toString(36).substring(2, 9)}`} // Use callSid as key if available
                        className="border-b border-gray-700/50 transition-colors hover:bg-gray-800/50"
                      >
                        <td className="p-4 align-middle font-medium text-gray-100">{call.contactName || 'Unknown'}</td>
                        <td className="p-4 align-middle text-gray-300">{call.callSid}</td>
                        <td className="p-4 align-middle text-gray-300">{formatPhoneNumber(call.to)}</td>
                        <td className="p-4 align-middle text-gray-300">{formatPhoneNumber(call.from)}</td>
                        <td className="p-4 align-middle">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusStyles(call.status)}`}>
                            {call.status}
                          </span>
                        </td>
                        <td className="p-4 align-middle text-gray-300">{call.duration !== undefined ? formatDuration(call.duration) : 'N/A'}</td>
                        <td className="p-4 align-middle text-gray-300">{formatDate(call.startTime)}</td>
                        <td className="p-4 align-middle">
                          {/* Restoring original structure, keeping onClick removed */}
                          <div className="flex items-center gap-2">
                            {/* Reverting to Link and using correct property call.callSid */}
                            <Link
                              href={call.callSid ? `/call-details/${call.callSid}` : '#'}
                              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "border-gray-600/50 hover:bg-gray-800/50 text-gray-300")}
                              aria-disabled={!call.callSid}
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                            
                            {Array.isArray(call.recordingIds) && call.recordingIds.length > 0 && (
                              <Link
                                href={call.callSid ? `/recordings/${call.callSid}` : '#'}
                                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "border-gray-600/50 hover:bg-gray-800/50 text-gray-300")}
                                aria-disabled={!call.callSid}
                              >
                                <Headphones className="h-4 w-4" />
                              </Link>
                            )}
                            <Link
                              href={call.to ? `/make-call?number=${call.to.replace('+', '')}&name=${encodeURIComponent(call.contactName || '')}` : '#'}
                              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "border-gray-600/50 hover:bg-gray-800/50 text-gray-300")}
                              aria-disabled={!call.to}
                            >
                              <PhoneCall className="h-4 w-4" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="p-4 text-center text-gray-400">
                      No call logs found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-400">
          Showing {callLogsData.length} of {totalCalls} calls
        </div>

        {totalCalls > limit && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousPage}
              disabled={page === 1 || isLoading}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={callLogsData.length < limit || isLoading}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
