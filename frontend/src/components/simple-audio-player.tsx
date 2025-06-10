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
  // Effect to fetch audio data and create/revoke blob URLs
  useEffect(() => {
    let currentBlobUrl: string | null = null; // To manage the blob URL created in this effect instance

    const fetchAndSetAudio = async () => {
      if (!audioUrl) {
        console.log('[SimpleAudioPlayer FetchEffect] audioUrl is empty. Clearing player.');
        setInternalBlobSrc('');
        setIsLoading(false);
        setError(null);
        if (audioRef.current) {
          audioRef.current.removeAttribute('src');
          audioRef.current.load();
        }
        return;
      }

      console.log(`[SimpleAudioPlayer FetchEffect] audioUrl prop is: ${audioUrl}. Initiating fetch.`);
      setIsLoading(true);
      setError(null);
      // Reset player state for new audio
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);

      try {
        const response = await fetch(audioUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch audio: ${response.status} ${response.statusText} from ${audioUrl}`);
        }
        const contentType = response.headers.get('Content-Type') || 'audio/mpeg';
        const blobData = await response.blob();
        
        console.log(`[SimpleAudioPlayer FetchEffect] Fetched blob. Size: ${blobData.size}, Type from header: ${contentType}`);
        const newBlob = new Blob([blobData], { type: contentType });
        currentBlobUrl = URL.createObjectURL(newBlob); // Assign to effect-scoped variable
        console.log(`[SimpleAudioPlayer FetchEffect] New internalBlobSrc created: ${currentBlobUrl}`);
        setInternalBlobSrc(currentBlobUrl); // Update state to trigger re-render with new src

        // No need to call audioRef.current.load() here if src is updated via state
        // and <audio key={...}> handles re-initialization.
        // setIsLoading(false) will be handled by 'loadedmetadata' or 'error' event

      } catch (err: unknown) { // Explicitly type err as unknown
        console.error(`[SimpleAudioPlayer FetchEffect] Error fetching or creating blob for ${audioUrl}:`, err);
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An unknown error occurred while loading audio data.');
        }
        setIsLoading(false);
        setInternalBlobSrc(''); // Ensure src is empty on error
        if (audioRef.current) {
          audioRef.current.removeAttribute('src');
        }
      }
    };

    fetchAndSetAudio();

    return () => {
      // Cleanup the specific blob URL created by *this* effect instance
      if (currentBlobUrl) {
        console.log(`[SimpleAudioPlayer FetchEffect Cleanup] Revoking currentBlobUrl: ${currentBlobUrl}`);
        URL.revokeObjectURL(currentBlobUrl);
      }
      // General cleanup for the audio element if it's still referenced
      if (audioRef.current) {
        audioRef.current.pause();
        // Don't removeAttribute('src') here if it's managed by internalBlobSrc state,
        // as it might interfere with React's rendering cycle.
        // The key prop on <audio> should handle full reset if internalBlobSrc changes to ''.
      }
    };
  }, [audioUrl]); // Only re-run this fetch logic if the audioUrl prop itself changes

  // Effect for managing audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !internalBlobSrc) { // Only attach listeners if we have a valid internalBlobSrc
        // If internalBlobSrc is empty, ensure player is reset
        if (!internalBlobSrc) {
            setIsPlaying(false);
            setCurrentTime(0);
            setDuration(0);
            // setError(null); // Error might be set by fetch effect
            // setIsLoading(false); // Loading might be set by fetch effect
        }
        return;
    }
    
    console.log(`[SimpleAudioPlayer ListenEffect] Attaching listeners for src: ${audio.src} (internalBlobSrc: ${internalBlobSrc})`);
    // Reset loading state here before attaching listeners for a new src
    // setIsLoading(true); // This might cause a flicker if already handled by fetch effect

    const handleLoadedMetadata = () => {
      console.log(`[SimpleAudioPlayer Event] loadedmetadata for: ${audio.src}`);
      if (isFinite(audio.duration)) {
        setDuration(audio.duration);
        setError(null);
      } else {
        console.warn(`[SimpleAudioPlayer Event] Invalid duration: ${audio.duration} for ${audio.src}`);
        setError('Invalid audio duration');
        setDuration(0); // Reset duration if invalid
      }
      setIsLoading(false);
    };
    const handleTimeUpdate = () => {
      if (isFinite(audio.duration)) {
        setCurrentTime(audio.currentTime);
      }
    };
    const handleEnded = () => {
      console.log(`[SimpleAudioPlayer Event] ended for: ${audio.src}`);
      setIsPlaying(false);
      setCurrentTime(0);
      if (onPlaybackComplete) onPlaybackComplete();
    };
    const handleError = (e: Event) => {
      const mediaError = (e.target as HTMLAudioElement).error;
      const errCode = mediaError?.code;
      const errMsg = mediaError?.message || 'Unknown audio error';
      console.error(`[SimpleAudioPlayer Event] handleError: Code ${errCode}, Message: "${errMsg}" for src: ${audio.src}`);
      let displayError = `Failed to load audio (Code: ${errCode || 'N/A'})`;
      if (errCode === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
        displayError = 'Audio source not supported.';
      } else if (errCode === MediaError.MEDIA_ERR_NETWORK) {
        displayError = 'Network error loading audio.';
      } else if (errCode === MediaError.MEDIA_ERR_DECODE) {
        displayError = 'Error decoding audio file.';
      } else if (errCode === MediaError.MEDIA_ERR_ABORTED) {
        displayError = 'Audio loading aborted.';
      }
      setError(displayError);
      setIsLoading(false);
      setDuration(0); // Reset duration on error
      setCurrentTime(0);
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleCanPlay = () => {
      console.log(`[SimpleAudioPlayer Event] canplay for: ${audio.src}`);
      // Some browsers might need this to correctly update loading state if loadedmetadata is missed
      if (isLoading && audio.readyState >= HTMLMediaElement.HAVE_METADATA) {
         setIsLoading(false);
         if (isFinite(audio.duration)) setDuration(audio.duration); else setDuration(0);
      }
    };
     const handleWaiting = () => {
      console.log(`[SimpleAudioPlayer Event] waiting for: ${audio.src}`);
      setIsLoading(true); // Show loader if buffering/waiting
    };
    const handlePlaying = () => {
      console.log(`[SimpleAudioPlayer Event] playing for: ${audio.src}`);
      setIsLoading(false); // Hide loader when playback actually starts
    };


    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('playing', handlePlaying);

    audio.volume = volume / 100;
    // If src is already set and we want to ensure it loads:
    if (audio.currentSrc && audio.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
        console.log(`[SimpleAudioPlayer ListenEffect] src is set but networkState is NO_SOURCE. Calling load() for ${audio.currentSrc}`);
        audio.load();
    }


    return () => {
      console.log(`[SimpleAudioPlayer ListenEffect Cleanup] Removing listeners for src: ${audio.src}`);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('playing', handlePlaying);
    };
  }, [internalBlobSrc, volume, onPlaybackComplete]); // Now depends on internalBlobSrc

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
