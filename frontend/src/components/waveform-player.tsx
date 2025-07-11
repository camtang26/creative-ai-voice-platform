"use client";

import { useRef, useEffect, useState, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { formatDuration } from "@/lib/utils";
import { Play, Pause, Download, RotateCcw, SkipBack, SkipForward, Volume2 } from 'lucide-react';

interface WaveformPlayerProps {
  audioUrl: string;
  title?: string;
  downloadUrl?: string;
  onPlaybackComplete?: () => void;
}

export function WaveformPlayer({ audioUrl, title, downloadUrl, onPlaybackComplete }: WaveformPlayerProps) {
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  // Fetch audio data and create blob URL
  const fetchAudioData = useCallback(async (sourceUrl: string) => {
    if (!sourceUrl) return null;
    
    // Don't re-fetch if we already have a blob URL
    if (blobUrl) return blobUrl;
    
    try {
      console.log(`[WaveformPlayer] Fetching audio from: ${sourceUrl}`);
      setIsLoading(true);
      
      const response = await fetch(sourceUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch audio: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.arrayBuffer();
      const blob = new Blob([data], { type: 'audio/mpeg' });
      const newBlobUrl = URL.createObjectURL(blob);
      
      setBlobUrl(newBlobUrl);
      return newBlobUrl;
    } catch (error) {
      console.error('Error fetching audio data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load audio');
      return null;
    }
  }, []);

  // Initialize WaveSurfer
  useEffect(() => {
    if (!waveformRef.current || !audioUrl) return;
    
    setIsLoading(true);
    setError(null);
    
    let localBlobUrl: string | null = null;

    const initWaveSurfer = async () => {
      try {
        // Fetch audio and create blob URL
        localBlobUrl = await fetchAudioData(audioUrl);
        if (!localBlobUrl) {
          setIsLoading(false);
          return;
        }
        
        // Create WaveSurfer instance with type-safe options
        const wavesurfer = WaveSurfer.create({
          container: waveformRef.current!,
          waveColor: '#CBD5E0',
          progressColor: '#3B82F6',
          cursorColor: '#4F46E5',
          barWidth: 2,
          barGap: 1,
          barRadius: 2,
          height: 80,
          normalize: true
        });

        // Set the audio file using the blob URL
        wavesurfer.load(localBlobUrl);

        // Event listeners
        wavesurfer.on('ready', () => {
          wavesurferRef.current = wavesurfer;
          setDuration(wavesurfer.getDuration());
          setIsLoading(false);
          wavesurfer.setVolume(volume / 100);
        });

        wavesurfer.on('play', () => setIsPlaying(true));
        wavesurfer.on('pause', () => setIsPlaying(false));
        wavesurfer.on('finish', () => {
          setIsPlaying(false);
          if (onPlaybackComplete) onPlaybackComplete();
        });

        wavesurfer.on('audioprocess', () => {
          setCurrentTime(wavesurfer.getCurrentTime());
        });

        wavesurfer.on('error', (err) => {
          console.error('WaveSurfer error:', err);
          setError('Failed to load audio file');
          setIsLoading(false);
        });
      } catch (err) {
        console.error('Error creating WaveSurfer instance:', err);
        setError('Failed to initialize audio player');
        setIsLoading(false);
      }
    };

    initWaveSurfer();

    // Cleanup on unmount
    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
      }
      
      // Revoke any existing blob URLs
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
      if (localBlobUrl && localBlobUrl !== blobUrl) {
        URL.revokeObjectURL(localBlobUrl);
      }
    };
  }, [audioUrl, onPlaybackComplete, volume, fetchAudioData, blobUrl]);

  // Handler functions
  const togglePlayPause = () => {
    if (!wavesurferRef.current) return;
    
    if (isPlaying) {
      wavesurferRef.current.pause();
    } else {
      wavesurferRef.current.play();
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    
    if (wavesurferRef.current) {
      wavesurferRef.current.setVolume(newVolume / 100);
    }
  };

  const handleRestart = () => {
    if (!wavesurferRef.current) return;
    wavesurferRef.current.seekTo(0);
    setCurrentTime(0);
  };

  const handleSkipBackward = () => {
    if (!wavesurferRef.current) return;
    const newTime = Math.max(0, wavesurferRef.current.getCurrentTime() - 10);
    wavesurferRef.current.seekTo(newTime / duration);
    setCurrentTime(newTime);
  };

  const handleSkipForward = () => {
    if (!wavesurferRef.current) return;
    const newTime = Math.min(duration, wavesurferRef.current.getCurrentTime() + 10);
    wavesurferRef.current.seekTo(newTime / duration);
    setCurrentTime(newTime);
  };

  const handleDownload = () => {
    // Use the blob URL for direct download if available
    if (blobUrl) {
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `recording_${Date.now()}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } 
    // Fallback to the provided download URL
    else if (downloadUrl) {
      window.open(downloadUrl, '_blank');
    } 
    // Last resort: use the original audio URL
    else {
      window.open(audioUrl, '_blank');
    }
  };

  return (
    <div className="audio-player-container">
      {/* Title */}
      {title && (
        <div className="text-lg font-medium mb-2">{title}</div>
      )}
      
      {/* Waveform */}
      <div 
        ref={waveformRef} 
        className="audio-waveform mt-2 relative"
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <div className="text-destructive text-center">
              <p>{error}</p>
              <button 
                className="mt-2 text-sm text-primary hover:underline"
                onClick={() => window.location.reload()}
              >
                Try again
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Timestamps */}
      <div className="flex justify-between text-xs text-muted-foreground mt-1">
        <div>{formatDuration(currentTime)}</div>
        <div>{formatDuration(duration)}</div>
      </div>
      
      {/* Controls */}
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={handleRestart}
            disabled={isLoading || !!error}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            onClick={handleSkipBackward}
            disabled={isLoading || !!error}
          >
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button 
            variant="default" 
            size="icon"
            onClick={togglePlayPause}
            disabled={isLoading || !!error}
            className="h-10 w-10"
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5" />
            )}
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            onClick={handleSkipForward}
            disabled={isLoading || !!error}
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center">
          <Volume2 className="h-4 w-4 mr-2 text-muted-foreground" />
          <Slider
            value={[volume]}
            min={0}
            max={100}
            step={1}
            className="w-24"
            onValueChange={handleVolumeChange}
          />
        </div>
        
        <Button 
          variant="outline" 
          size="icon"
          onClick={handleDownload}
          disabled={isLoading || !!error}
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
