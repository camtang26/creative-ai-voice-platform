"use client";

import { useRef, useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { formatDuration } from "@/lib/utils";
import { Play, Pause, Download, RotateCcw, SkipBack, SkipForward, Volume2 } from 'lucide-react';

interface SimpleAudioPlayerProps {
  audioUrl: string;
  title?: string;
  downloadUrl?: string;
  onPlaybackComplete?: () => void;
}

export function SimpleAudioPlayer({ audioUrl, title, downloadUrl, onPlaybackComplete }: SimpleAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize audio events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    // Reset state
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setIsLoading(true);
    setError(null);

    // Event handlers
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (onPlaybackComplete) onPlaybackComplete();
    };

    const handleError = () => {
      console.error('Audio error:', audio.error);
      setError('Failed to load audio file');
      setIsLoading(false);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    // Add event listeners
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    // Set volume
    audio.volume = volume / 100;

    // Cleanup
    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      
      // Pause and remove src to free up resources
      audio.pause();
      audio.src = '';
    };
  }, [audioUrl, volume, onPlaybackComplete]);

  // Player controls
  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      // Use promise handling for browsers that return a promise for play()
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error('Play failed:', error);
        });
      }
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    
    if (audioRef.current) {
      audioRef.current.volume = newVolume / 100;
    }
  };

  const handleRestart = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
    }
  };

  const handleSkipBackward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleSkipForward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(
        duration, 
        audioRef.current.currentTime + 10
      );
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleSliderChange = (value: number[]) => {
    const newTime = value[0];
    if (audioRef.current && !isNaN(newTime)) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleDownload = () => {
    if (downloadUrl) {
      window.open(downloadUrl, '_blank');
    } else {
      window.open(audioUrl, '_blank');
    }
  };

  return (
    <div className="audio-player-container">
      {/* Hidden audio element */}
      <audio 
        ref={audioRef} 
        src={audioUrl}
        preload="metadata"
        onLoadStart={() => setIsLoading(true)}
      />

      {/* Title */}
      {title && (
        <div className="text-lg font-medium mb-2">{title}</div>
      )}
      
      {/* Progress bar */}
      <div className="mt-4 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <div className="text-destructive text-center">
              <p>{error}</p>
              <button 
                className="mt-2 text-sm text-primary hover:underline"
                onClick={() => {
                  if (audioRef.current) {
                    audioRef.current.load(); // Attempt to reload
                    setError(null);
                  }
                }}
              >
                Try again
              </button>
            </div>
          </div>
        )}

        <div className="h-12 border rounded-md p-3 flex items-center">
          <div className="w-full">
            <Slider 
              value={[currentTime]}
              min={0}
              max={duration || 100}
              step={0.1}
              onValueChange={handleSliderChange}
              disabled={isLoading || !!error || duration === 0}
            />
          </div>
        </div>
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
