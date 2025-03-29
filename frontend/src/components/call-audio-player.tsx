"use client";

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, Volume1 } from 'lucide-react';

interface CallAudioPlayerProps {
  callSid: string;
  isActive: boolean;
}

export function CallAudioPlayer({ callSid, isActive }: CallAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamUrlRef = useRef<string | null>(null);

  // Set up audio streaming when the component becomes active
  useEffect(() => {
    if (isActive && !audioRef.current) {
      // Create audio element
      const audio = new Audio();
      audio.volume = volume;
      audioRef.current = audio;
      
      // Set up event listeners
      audio.addEventListener('error', (e) => {
        console.error('Audio playback error:', e);
        setError('Failed to stream audio');
      });
      
      audio.addEventListener('playing', () => {
        setIsPlaying(true);
      });
      
      audio.addEventListener('pause', () => {
        setIsPlaying(false);
      });
      
      audio.addEventListener('ended', () => {
        setIsPlaying(false);
      });
      
      // Clean up event listeners on unmount
      return () => {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = '';
          
          audio.removeEventListener('error', () => {});
          audio.removeEventListener('playing', () => {});
          audio.removeEventListener('pause', () => {});
          audio.removeEventListener('ended', () => {});
        }
      };
    }
  }, [isActive, volume]);

  // Connect to audio stream
  useEffect(() => {
    if (isActive && !streamUrlRef.current) {
      // In a real implementation, this would connect to a streaming endpoint
      // For now, we'll simulate this with a mock URL
      const streamUrl = `${window.location.origin}/api/calls/${callSid}/stream`;
      streamUrlRef.current = streamUrl;
      
      console.log(`Connecting to audio stream for call ${callSid}`);
      
      // In a real implementation, this would be an actual audio stream
      // For this demo, we're just setting a mock URL
      if (audioRef.current) {
        audioRef.current.src = streamUrl;
      }
    }
    
    // Disconnect from stream when component becomes inactive
    if (!isActive && streamUrlRef.current) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      streamUrlRef.current = null;
    }
  }, [isActive, callSid]);

  // Toggle audio playback
  function togglePlayback() {
    if (!audioRef.current || !streamUrlRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      // In a real implementation, we might need to reconnect to the stream
      audioRef.current.play().catch(err => {
        console.error('Failed to play audio:', err);
        setError('Failed to play audio stream');
      });
    }
  }

  // Adjust volume
  function handleVolumeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  }

  if (!isActive) return null;

  return (
    <div className="flex items-center space-x-2 p-3 border rounded-md bg-background">
      <Button 
        variant="ghost" 
        size="sm" 
        className="w-8 h-8 p-0" 
        onClick={togglePlayback}
        disabled={!!error}
      >
        {isPlaying ? (
          <VolumeX className="h-4 w-4" />
        ) : (
          <Volume2 className="h-4 w-4" />
        )}
      </Button>
      
      <div className="flex items-center flex-1 space-x-2">
        <Volume1 className="h-4 w-4 text-muted-foreground" />
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={handleVolumeChange}
          className="flex-1 h-2"
        />
      </div>
      
      {error && (
        <div className="text-xs text-red-500">{error}</div>
      )}
    </div>
  );
}
