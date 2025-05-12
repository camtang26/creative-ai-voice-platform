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
  const [isLoading, setIsLoading] = useState(false); // Initially false, true during fetch
  const [error, setError] = useState<string | null>(null);
  const [internalBlobSrc, setInternalBlobSrc] = useState<string>(''); // For the actual <audio> src

  // Initialize audio events
  // Effect for managing audio event listeners and state based on audioUrl
  // Simplified effect for managing audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Reset player state when audioUrl (the prop) changes
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setError(null);
    
    // If a previous internalBlobSrc exists, revoke it
    if (internalBlobSrc) {
      console.log(`[SimpleAudioPlayer Effect] Revoking old internalBlobSrc: ${internalBlobSrc}`);
      URL.revokeObjectURL(internalBlobSrc);
      setInternalBlobSrc(''); // Clear it
    }

    if (audioUrl) {
      console.log(`[SimpleAudioPlayer Effect] audioUrl prop changed to: ${audioUrl}. Fetching data...`);
      setIsLoading(true); // Set loading true now that we are about to fetch
      
      fetch(audioUrl)
        .then(response => {
          if (!response.ok) {
            throw new Error(`Failed to fetch audio: ${response.status} ${response.statusText} from ${audioUrl}`);
          }
          const contentType = response.headers.get('Content-Type') || 'audio/mpeg';
          return response.blob().then(blob => ({ blob, contentType }));
        })
        .then(({ blob, contentType }) => {
          console.log(`[SimpleAudioPlayer Effect] Fetched blob. Size: ${blob.size}, Type from response header: ${contentType}`);
          const newBlob = new Blob([blob], { type: contentType }); // Ensure blob is created with the fetched content type
          console.log(`[SimpleAudioPlayer Effect] Created new Blob object. Size: ${newBlob.size}, Type: ${newBlob.type}`);
          const newBlobSrc = URL.createObjectURL(newBlob);
          console.log(`[SimpleAudioPlayer Effect] New internalBlobSrc created: ${newBlobSrc}`);
          setInternalBlobSrc(newBlobSrc);
          if (audioRef.current) {
            // audioRef.current.src = newBlobSrc; // This will be handled by re-render due to state change
            audioRef.current.load(); // Explicitly call load after src is expected to change
            console.log(`[SimpleAudioPlayer Effect] Called audio.load() for new internalBlobSrc.`);
          }
          // setIsLoading(false); // Loading will be set to false by 'loadedmetadata' or 'error'
        })
        .catch(err => {
          console.error(`[SimpleAudioPlayer Effect] Error fetching or creating blob for ${audioUrl}:`, err);
          setError(err.message || 'Error loading audio data.');
          setIsLoading(false);
          setInternalBlobSrc(''); // Ensure src is empty on error
        });
    } else {
      console.log(`[SimpleAudioPlayer Effect] audioUrl prop is empty. Clearing internalBlobSrc.`);
      setInternalBlobSrc(''); // Clear src if audioUrl is empty
      setIsLoading(false); // Not loading if no URL
    }

    // Define event handlers for the audio element
    const handleLoadedMetadata = () => {
      console.log(`[SimpleAudioPlayer Event] loadedmetadata for: ${audio.src}`);
      // Check if duration is valid before setting
      if (isFinite(audio.duration)) {
          setDuration(audio.duration);
          setError(null); // Clear error on successful load
      } else {
          console.warn(`[SimpleAudioPlayer Event] Invalid duration received: ${audio.duration}`);
          setError('Invalid audio duration');
      }
      setIsLoading(false);
    };
    const handleTimeUpdate = () => {
        // Only update if duration is valid
        if (isFinite(audio.duration)) {
            setCurrentTime(audio.currentTime);
        }
    };
    const handleEnded = () => {
      console.log(`[SimpleAudioPlayer Event] ended for: ${audio.src}`);
      setIsPlaying(false);
      setCurrentTime(0); // Reset to beginning
      if (onPlaybackComplete) onPlaybackComplete();
    };
    const handleError = () => {
      const errCode = audio.error?.code;
      const errMsg = audio.error?.message || 'Unknown audio error';
      console.error(`[SimpleAudioPlayer Event] handleError: Code ${errCode}, Message: ${errMsg} for src: ${audio.src}`);
      let displayError = `Failed to load audio file (Code: ${errCode})`;
       if (errCode === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED && !audio.getAttribute('src')) {
           displayError = 'MEDIA_ELEMENT_ERROR: Empty src attribute';
        } else if (errCode === MediaError.MEDIA_ERR_NETWORK) {
           displayError = 'Network error loading audio';
        } else if (errCode === MediaError.MEDIA_ERR_DECODE) {
           displayError = 'Error decoding audio file';
        }
      setError(displayError);
      setIsLoading(false);
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    // No need for handleLoadStart as key prop handles re-mount/reset

    // Attach listeners
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    // Set initial volume
    audio.volume = volume / 100;

    // internalBlobSrc will be applied to audio.src via the state update and re-render

    // Cleanup function
    return () => {
      console.log(`[SimpleAudioPlayer Cleanup] Removing listeners. Current internalBlobSrc: ${internalBlobSrc}, audio.src: ${audio.src}`);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      
      // Pause audio and revoke object URL if it exists
      audio.pause();
      if (internalBlobSrc) { // Check the state variable
        console.log(`[SimpleAudioPlayer Cleanup] Revoking internalBlobSrc in cleanup: ${internalBlobSrc}`);
        URL.revokeObjectURL(internalBlobSrc);
      }
      // Resetting src attribute on the audio element itself
      if (audioRef.current) {
          audioRef.current.removeAttribute("src");
          audioRef.current.load();
      }
    };
  }, [audioUrl, volume, onPlaybackComplete]); // Keep audioUrl as dependency to trigger fetch

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

  // DEBUG LOG: Check the received audioUrl prop just before rendering
  console.log(`[SimpleAudioPlayer] Rendering with audioUrl: '${audioUrl}'`);

  return (
    <div className="audio-player-container">
      {/* Hidden audio element - ADD key prop */}
      <audio
        key={internalBlobSrc || audioUrl} // Use internalBlobSrc for key if available, else original audioUrl
        ref={audioRef}
        src={internalBlobSrc} // Use the internal blob src
        // controls // REMOVE NATIVE BROWSER CONTROLS
        // preload="metadata" // Let browser handle preloading
        style={{ display: 'none' }} // Hide the native audio element
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
