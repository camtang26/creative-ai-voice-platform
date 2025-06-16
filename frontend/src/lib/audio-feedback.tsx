"use client"

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import { Howl, Howler } from 'howler'

// Audio feedback types
export type SoundEffect = 
  | 'click'
  | 'hover'
  | 'success'
  | 'error'
  | 'warning'
  | 'notification'
  | 'call_incoming'
  | 'call_outgoing'
  | 'call_ended'
  | 'message_sent'
  | 'button_press'
  | 'slide_in'
  | 'slide_out'
  | 'pop'
  | 'swoosh'
  | 'ping'
  | 'ding'

// Sound configuration
interface SoundConfig {
  enabled: boolean
  volume: number
  fadeIn: boolean
  fadeOut: boolean
}

interface AudioContextType {
  playSound: (sound: SoundEffect, config?: Partial<SoundConfig>) => void
  setGlobalVolume: (volume: number) => void
  setEnabled: (enabled: boolean) => void
  isEnabled: boolean
  globalVolume: number
  preloadSounds: () => Promise<void>
  clearCache: () => void
}

const AudioContext = createContext<AudioContextType | null>(null)

export function useAudioFeedback() {
  const context = useContext(AudioContext)
  if (!context) {
    throw new Error('useAudioFeedback must be used within an AudioProvider')
  }
  return context
}

// Generate programmatic sounds using Web Audio API
class SoundGenerator {
  private audioContext: AudioContext | null = null
  
  constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      } catch (e) {
        console.warn('Web Audio API not supported')
      }
    }
  }

  private createOscillator(frequency: number, type: OscillatorType = 'sine'): OscillatorNode | null {
    if (!this.audioContext) return null
    
    const oscillator = this.audioContext.createOscillator()
    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime)
    return oscillator
  }

  private createGainNode(initialGain: number = 0.1): GainNode | null {
    if (!this.audioContext) return null
    
    const gainNode = this.audioContext.createGain()
    gainNode.gain.setValueAtTime(initialGain, this.audioContext.currentTime)
    return gainNode
  }

  async playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.1) {
    if (!this.audioContext) return

    // Resume context if suspended (required for user interaction)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
    }

    const oscillator = this.createOscillator(frequency, type)
    const gainNode = this.createGainNode(volume)
    
    if (!oscillator || !gainNode) return

    oscillator.connect(gainNode)
    gainNode.connect(this.audioContext.destination)

    const now = this.audioContext.currentTime
    
    // Envelope for smooth sound
    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(volume, now + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration)

    oscillator.start(now)
    oscillator.stop(now + duration)
  }

  async playClick(volume: number = 0.1) {
    await this.playTone(800, 0.1, 'square', volume)
  }

  async playHover(volume: number = 0.05) {
    await this.playTone(600, 0.05, 'sine', volume)
  }

  async playSuccess(volume: number = 0.1) {
    // Happy chord progression
    setTimeout(() => this.playTone(523.25, 0.15, 'sine', volume), 0)   // C
    setTimeout(() => this.playTone(659.25, 0.15, 'sine', volume), 50)  // E
    setTimeout(() => this.playTone(783.99, 0.2, 'sine', volume), 100)  // G
  }

  async playError(volume: number = 0.1) {
    // Descending error sound
    await this.playTone(800, 0.1, 'sawtooth', volume)
    setTimeout(() => this.playTone(600, 0.1, 'sawtooth', volume), 100)
    setTimeout(() => this.playTone(400, 0.15, 'sawtooth', volume), 200)
  }

  async playWarning(volume: number = 0.1) {
    // Double beep
    await this.playTone(1000, 0.1, 'triangle', volume)
    setTimeout(() => this.playTone(1000, 0.1, 'triangle', volume), 150)
  }

  async playNotification(volume: number = 0.1) {
    // Gentle notification chime
    setTimeout(() => this.playTone(800, 0.2, 'sine', volume), 0)
    setTimeout(() => this.playTone(1000, 0.3, 'sine', volume * 0.8), 100)
  }

  async playCallIncoming(volume: number = 0.1) {
    // Phone ring pattern
    const ringTone = () => {
      this.playTone(440, 0.4, 'sine', volume)
      setTimeout(() => this.playTone(554.37, 0.4, 'sine', volume), 50)
    }
    
    ringTone()
    setTimeout(ringTone, 1000)
  }

  async playCallOutgoing(volume: number = 0.1) {
    // Dial tone
    await this.playTone(350, 0.5, 'sine', volume)
    setTimeout(() => this.playTone(440, 0.5, 'sine', volume), 0)
  }

  async playCallEnded(volume: number = 0.1) {
    // Descending tone
    await this.playTone(400, 0.3, 'sine', volume)
    setTimeout(() => this.playTone(300, 0.3, 'sine', volume), 150)
  }

  async playMessageSent(volume: number = 0.08) {
    // Quick whoosh sound
    await this.playTone(1200, 0.1, 'sine', volume)
    setTimeout(() => this.playTone(800, 0.1, 'sine', volume * 0.5), 50)
  }

  async playButtonPress(volume: number = 0.06) {
    await this.playTone(1000, 0.08, 'square', volume)
  }

  async playSlideIn(volume: number = 0.05) {
    // Rising tone
    if (!this.audioContext) return
    
    const oscillator = this.createOscillator(400, 'sine')
    const gainNode = this.createGainNode(volume)
    
    if (!oscillator || !gainNode) return

    oscillator.connect(gainNode)
    gainNode.connect(this.audioContext.destination)

    const now = this.audioContext.currentTime
    oscillator.frequency.exponentialRampToValueAtTime(800, now + 0.2)
    
    oscillator.start(now)
    oscillator.stop(now + 0.2)
  }

  async playSlideOut(volume: number = 0.05) {
    // Falling tone
    if (!this.audioContext) return
    
    const oscillator = this.createOscillator(800, 'sine')
    const gainNode = this.createGainNode(volume)
    
    if (!oscillator || !gainNode) return

    oscillator.connect(gainNode)
    gainNode.connect(this.audioContext.destination)

    const now = this.audioContext.currentTime
    oscillator.frequency.exponentialRampToValueAtTime(400, now + 0.2)
    
    oscillator.start(now)
    oscillator.stop(now + 0.2)
  }

  async playPop(volume: number = 0.08) {
    await this.playTone(1200, 0.05, 'sine', volume)
  }

  async playSwoosh(volume: number = 0.06) {
    // White noise swoosh effect
    if (!this.audioContext) return

    const bufferSize = this.audioContext.sampleRate * 0.3
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate)
    const data = buffer.getChannelData(0)

    // Generate white noise with envelope
    for (let i = 0; i < bufferSize; i++) {
      const progress = i / bufferSize
      const envelope = Math.sin(progress * Math.PI)
      data[i] = (Math.random() * 2 - 1) * envelope * volume
    }

    const source = this.audioContext.createBufferSource()
    source.buffer = buffer
    source.connect(this.audioContext.destination)
    source.start()
  }

  async playPing(volume: number = 0.1) {
    await this.playTone(1000, 0.1, 'sine', volume)
  }

  async playDing(volume: number = 0.1) {
    // Bell-like sound
    setTimeout(() => this.playTone(1760, 0.3, 'sine', volume), 0)
    setTimeout(() => this.playTone(2217.46, 0.2, 'sine', volume * 0.6), 50)
    setTimeout(() => this.playTone(2637.02, 0.1, 'sine', volume * 0.3), 100)
  }
}

export function AudioProvider({ children }: { children: ReactNode }) {
  const [isEnabled, setIsEnabled] = useState(true)
  const [globalVolume, setGlobalVolume] = useState(0.3)
  const soundGenerator = useRef<SoundGenerator>()
  const soundCache = useRef<Map<SoundEffect, Howl>>(new Map())

  useEffect(() => {
    soundGenerator.current = new SoundGenerator()
    
    // Set global Howler volume
    Howler.volume(globalVolume)
    
    // Load user preference
    const savedEnabled = localStorage.getItem('audioFeedbackEnabled')
    const savedVolume = localStorage.getItem('audioFeedbackVolume')
    
    if (savedEnabled !== null) {
      setIsEnabled(JSON.parse(savedEnabled))
    }
    
    if (savedVolume !== null) {
      setGlobalVolume(parseFloat(savedVolume))
    }
  }, [])

  useEffect(() => {
    Howler.volume(globalVolume)
    localStorage.setItem('audioFeedbackVolume', globalVolume.toString())
  }, [globalVolume])

  useEffect(() => {
    localStorage.setItem('audioFeedbackEnabled', JSON.stringify(isEnabled))
  }, [isEnabled])

  const playSound = async (sound: SoundEffect, config: Partial<SoundConfig> = {}) => {
    if (!isEnabled) return
    if (!soundGenerator.current) return

    const finalConfig: SoundConfig = {
      enabled: true,
      volume: globalVolume,
      fadeIn: false,
      fadeOut: false,
      ...config
    }

    if (!finalConfig.enabled) return

    try {
      // Use procedural sounds for better performance and consistency
      switch (sound) {
        case 'click':
          await soundGenerator.current.playClick(finalConfig.volume)
          break
        case 'hover':
          await soundGenerator.current.playHover(finalConfig.volume)
          break
        case 'success':
          await soundGenerator.current.playSuccess(finalConfig.volume)
          break
        case 'error':
          await soundGenerator.current.playError(finalConfig.volume)
          break
        case 'warning':
          await soundGenerator.current.playWarning(finalConfig.volume)
          break
        case 'notification':
          await soundGenerator.current.playNotification(finalConfig.volume)
          break
        case 'call_incoming':
          await soundGenerator.current.playCallIncoming(finalConfig.volume)
          break
        case 'call_outgoing':
          await soundGenerator.current.playCallOutgoing(finalConfig.volume)
          break
        case 'call_ended':
          await soundGenerator.current.playCallEnded(finalConfig.volume)
          break
        case 'message_sent':
          await soundGenerator.current.playMessageSent(finalConfig.volume)
          break
        case 'button_press':
          await soundGenerator.current.playButtonPress(finalConfig.volume)
          break
        case 'slide_in':
          await soundGenerator.current.playSlideIn(finalConfig.volume)
          break
        case 'slide_out':
          await soundGenerator.current.playSlideOut(finalConfig.volume)
          break
        case 'pop':
          await soundGenerator.current.playPop(finalConfig.volume)
          break
        case 'swoosh':
          await soundGenerator.current.playSwoosh(finalConfig.volume)
          break
        case 'ping':
          await soundGenerator.current.playPing(finalConfig.volume)
          break
        case 'ding':
          await soundGenerator.current.playDing(finalConfig.volume)
          break
      }
    } catch (error) {
      console.warn('Audio playback failed:', error)
    }
  }

  const preloadSounds = async () => {
    // Procedural sounds don't need preloading
    return Promise.resolve()
  }

  const clearCache = () => {
    soundCache.current.forEach(sound => {
      sound.unload()
    })
    soundCache.current.clear()
  }

  const setEnabledWithSave = (enabled: boolean) => {
    setIsEnabled(enabled)
  }

  const setGlobalVolumeWithSave = (volume: number) => {
    setGlobalVolume(Math.max(0, Math.min(1, volume)))
  }

  const value: AudioContextType = {
    playSound,
    setGlobalVolume: setGlobalVolumeWithSave,
    setEnabled: setEnabledWithSave,
    isEnabled,
    globalVolume,
    preloadSounds,
    clearCache
  }

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  )
}

// Hook for common sound patterns
export function useCommonSounds() {
  const { playSound } = useAudioFeedback()

  return {
    playClick: () => playSound('click'),
    playHover: () => playSound('hover'),
    playSuccess: () => playSound('success'),
    playError: () => playSound('error'),
    playNotification: () => playSound('notification'),
    playButtonPress: () => playSound('button_press'),
    playSlideIn: () => playSound('slide_in'),
    playSlideOut: () => playSound('slide_out')
  }
}

// Audio settings component
export function AudioSettings() {
  const { isEnabled, globalVolume, setEnabled, setGlobalVolume, playSound } = useAudioFeedback()

  return (
    <div className="space-y-4 p-4 glass-panel rounded-xl border border-white/10">
      <h3 className="text-lg font-semibold text-white">Audio Feedback Settings</h3>
      
      <div className="flex items-center justify-between">
        <label className="text-white/80">Enable Sound Effects</label>
        <button
          onClick={() => {
            setEnabled(!isEnabled)
            if (!isEnabled) playSound('success')
          }}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isEnabled ? 'bg-blue-500' : 'bg-gray-600'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      <div className="space-y-2">
        <label className="text-white/80">Volume: {Math.round(globalVolume * 100)}%</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={globalVolume}
          onChange={(e) => setGlobalVolume(parseFloat(e.target.value))}
          className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => playSound('success')}
          className="px-3 py-2 bg-green-500/20 text-green-400 rounded-lg text-sm border border-green-400/30 hover:bg-green-500/30 transition-colors"
        >
          Test Success
        </button>
        <button
          onClick={() => playSound('error')}
          className="px-3 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm border border-red-400/30 hover:bg-red-500/30 transition-colors"
        >
          Test Error
        </button>
        <button
          onClick={() => playSound('notification')}
          className="px-3 py-2 bg-blue-500/20 text-blue-400 rounded-lg text-sm border border-blue-400/30 hover:bg-blue-500/30 transition-colors"
        >
          Test Notification
        </button>
        <button
          onClick={() => playSound('call_incoming')}
          className="px-3 py-2 bg-purple-500/20 text-purple-400 rounded-lg text-sm border border-purple-400/30 hover:bg-purple-500/30 transition-colors"
        >
          Test Call
        </button>
      </div>
    </div>
  )
}