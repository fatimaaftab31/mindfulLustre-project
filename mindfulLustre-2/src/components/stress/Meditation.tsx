import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Pause, Play, Volume2, VolumeX, RefreshCw } from 'lucide-react';
import { useUser } from '@/context/UserContext';
import { toast } from 'sonner';
import { Slider } from '@/components/ui/slider';
import { motion } from 'framer-motion';
import { Progress } from '@/components/ui/progress';

// Ambient sound options
const MEDITATION_SOUNDS = [
  { id: 'nature', name: 'Forest Ambience', url: 'https://assets.mixkit.co/active_storage/sfx/2434/2434.wav' },
  { id: 'ocean', name: 'Calm Waves', url: 'https://assets.mixkit.co/active_storage/sfx/2438/2438.wav' },
  { id: 'rain', name: 'Rain', url: 'https://assets.mixkit.co/active_storage/sfx/2515/2515.wav' },
  { id: 'silence', name: 'Silence', url: '' },
];

// Meditation sessions
const SESSIONS = [
  { id: 'quick', name: 'Quick Break', duration: 2 * 60 }, // 2 minutes
  { id: 'short', name: 'Short Session', duration: 5 * 60 }, // 5 minutes
  { id: 'medium', name: 'Medium Session', duration: 10 * 60 }, // 10 minutes
  { id: 'long', name: 'Long Session', duration: 15 * 60 }, // 15 minutes
];

// Format time for display (MM:SS)
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const Meditation = () => {
  const { addExerciseLog } = useUser();
  const [selectedSound, setSelectedSound] = useState(MEDITATION_SOUNDS[0]);
  const [selectedSession, setSelectedSession] = useState(SESSIONS[0]);
  const [timeRemaining, setTimeRemaining] = useState(selectedSession.duration);
  const [isActive, setIsActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(45);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);
  
  // Create audio element when component mounts
  useEffect(() => {
    // Create a new audio element
    const audio = new Audio();
    audio.loop = true;
    audio.preload = 'auto';
    
    // Add event listeners for audio state tracking
    audio.addEventListener('canplaythrough', () => {
      console.log('Audio can play through');
      setAudioLoaded(true);
      setAudioError(null);
    });
    
    audio.addEventListener('error', (e) => {
      console.error('Audio error:', e);
      setAudioLoaded(false);
      setAudioError("Failed to load audio. Please try another sound.");
      
      // Only show toast for non-silence options and when component is mounted
      if (selectedSound.id !== 'silence' && isActive) {
        toast.error('Could not load audio file', { 
          description: "Please try another sound or check your connection"
        });
      }
    });
    
    audio.addEventListener('play', () => {
      console.log('Audio started playing');
    });
    
    audio.addEventListener('pause', () => {
      console.log('Audio paused');
    });
    
    // Store reference to audio element
    audioRef.current = audio;
    
    // Cleanup function to properly dispose of audio resources
    return () => {
      if (audioRef.current) {
        // Cancel any pending play promises
        if (playPromiseRef.current) {
          audioRef.current.pause();
        }
        
        // Cleanup audio element
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current.remove();
        audioRef.current = null;
      }
    };
  }, []);

  // Safe audio play function that handles promises correctly
  const safePlayAudio = () => {
    if (!audioRef.current || selectedSound.id === 'silence') return;
    
    // First ensure any existing play operation is complete
    if (playPromiseRef.current) {
      audioRef.current.pause();
      playPromiseRef.current = null;
    }
    
    // Try to play the audio
    try {
      playPromiseRef.current = audioRef.current.play();
      if (playPromiseRef.current) {
        playPromiseRef.current
          .then(() => {
            console.log('Successfully started playing');
            playPromiseRef.current = null;
          })
          .catch(error => {
            console.error('Error playing audio:', error);
            playPromiseRef.current = null;
            
            // Show user-friendly error
            if (error.name !== 'AbortError') {  // Don't show for normal pause operations
              toast.error('Could not play audio', {
                description: 'Please try clicking play again or select another sound.'
              });
            }
          });
      }
    } catch (error) {
      console.error('Exception when playing audio:', error);
    }
  };
  
  // Safe audio pause function that handles promises correctly
  const safePauseAudio = () => {
    if (!audioRef.current) return;
    
    try {
      // If there's an ongoing play operation, we need to handle it before pausing
      if (playPromiseRef.current) {
        playPromiseRef.current
          .then(() => {
            audioRef.current?.pause();
            playPromiseRef.current = null;
          })
          .catch(() => {
            playPromiseRef.current = null;
          });
      } else {
        audioRef.current.pause();
      }
    } catch (error) {
      console.error('Error pausing audio:', error);
    }
  };

  // Update selected sound
  useEffect(() => {
    if (!audioRef.current) return;
    
    // Reset audio state
    setAudioLoaded(false);
    setAudioError(null);
    
    // If it's silence, just remove the source
    if (selectedSound.id === 'silence') {
      safePauseAudio();
      audioRef.current.src = '';
      setAudioLoaded(true);
      return;
    }
    
    // Store the playing state to restore it after changing source
    const wasPlaying = isActive;
    
    // Pause current playback before switching
    safePauseAudio();
    
    // Add a small delay before loading the new source (helps prevent issues)
    setTimeout(() => {
      if (!audioRef.current) return;
      
      // Set up the new audio source
      audioRef.current.src = selectedSound.url;
      audioRef.current.volume = volume / 100;
      audioRef.current.muted = isMuted;
      
      // Load the new audio (triggers the canplaythrough event when ready)
      audioRef.current.load();
      
      // If it was playing before, resume playback after source change
      if (wasPlaying) {
        safePlayAudio();
      }
    }, 100);
  }, [selectedSound]);

  // Update selected session
  useEffect(() => {
    // Reset timer if changing sessions while not active
    if (!isActive) {
      setTimeRemaining(selectedSession.duration);
    }
  }, [selectedSession, isActive]);

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  // Update muted state
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // Timer effect
  useEffect(() => {
    if (isActive) {
      timerRef.current = window.setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // Time is up
            clearInterval(timerRef.current!);
            handleComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      // Try to play audio if active and not silence
      if (selectedSound.id !== 'silence') {
        safePlayAudio();
      }
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      // Pause audio when timer is stopped
      safePauseAudio();
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  }, [isActive]);

  // Handle session completion
  const handleComplete = async () => {
    setIsActive(false);
    safePauseAudio();
    
    // Show completion toast
    toast.success('Meditation session completed!');
    
    try {
      // Log the meditation exercise
      await addExerciseLog('meditation', selectedSession.duration / 60);
      toast('Progress saved', {
        description: 'Your meditation session has been recorded.',
      });
    } catch (error) {
      console.error('Error saving meditation log:', error);
    }
  };

  // Toggle play/pause
  const togglePlayPause = () => {
    if (isActive) {
      // Pause
      safePauseAudio();
    } else {
      // Play
      if (selectedSound.id !== 'silence') {
        safePlayAudio();
      }
    }
    setIsActive(!isActive);
  };

  // Reset session
  const resetSession = () => {
    setIsActive(false);
    setTimeRemaining(selectedSession.duration);
    safePauseAudio();
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  // Toggle mute
  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  // Calculate progress percentage (fixed calculation)
  const progressPercentage = Math.min(
    100,
    Math.max(
      0,
      ((selectedSession.duration - timeRemaining) / selectedSession.duration) * 100
    )
  );

  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="text-center mb-6">
          <p className="text-muted-foreground">
            Take a moment for yourself with a guided meditation session
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Card className="overflow-hidden border-wellness-purple/20">
          <div className="relative">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-wellness-purple/20 to-wellness-blue/20 opacity-30" />
            
            <CardHeader className="relative">
              <CardTitle className="text-xl font-semibold text-center">Mindfulness Meditation</CardTitle>
              <CardDescription className="text-center">
                Focus on your breath and clear your mind
              </CardDescription>
            </CardHeader>
            
            <CardContent className="relative space-y-8">
              {/* Timer Display */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  {/* Fixed Circle progress indicator - fixed z-index issue */}
                  <div className="w-48 h-48 rounded-full flex items-center justify-center relative">
                    <svg className="w-48 h-48 absolute top-0 left-0" viewBox="0 0 100 100">
                      {/* Background circle */}
                      <circle 
                        cx="50" 
                        cy="50" 
                        r="45" 
                        fill="none" 
                        stroke="#e2e8f0" 
                        strokeWidth="8" 
                      />
                      
                      {/* Progress circle */}
                      <circle 
                        cx="50" 
                        cy="50" 
                        r="45" 
                        fill="none" 
                        stroke="#8b5cf6" 
                        strokeWidth="8" 
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 45}`} 
                        strokeDashoffset={`${2 * Math.PI * 45 * (1 - progressPercentage / 100)}`} 
                        transform="rotate(-90 50 50)" 
                      />
                    </svg>
                    
                    <div className="w-40 h-40 bg-background rounded-full flex items-center justify-center">
                      <motion.div
                        animate={isActive ? "playing" : "paused"}
                        variants={{
                          playing: {
                            scale: [1, 1.05, 1],
                            transition: {
                              repeat: Infinity,
                              repeatType: "mirror",
                              duration: 1.5,
                              ease: "easeInOut"
                            }
                          },
                          paused: {
                            scale: 1
                          }
                        }}
                      >
                        <span className="text-4xl font-semibold text-wellness-purple">
                          {formatTime(timeRemaining)}
                        </span>
                      </motion.div>
                    </div>
                  </div>
                </div>
                
                {/* Control buttons */}
                <div className="flex items-center justify-center space-x-4 mt-6">
                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <Button
                      size="icon"
                      variant="outline"
                      className="rounded-full w-12 h-12 border-wellness-purple/30"
                      onClick={resetSession}
                    >
                      <RefreshCw size={20} />
                    </Button>
                  </motion.div>
                  
                  <motion.div whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}>
                    <Button
                      size="icon"
                      className="rounded-full w-16 h-16 bg-wellness-purple hover:bg-wellness-deepPurple"
                      onClick={togglePlayPause}
                    >
                      {isActive ? <Pause size={28} /> : <Play size={28} />}
                    </Button>
                  </motion.div>
                  
                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <Button
                      size="icon"
                      variant="outline"
                      className="rounded-full w-12 h-12 border-wellness-purple/30"
                      onClick={toggleMute}
                    >
                      {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                    </Button>
                  </motion.div>
                </div>
              </div>
              
              {/* Sound status indicator */}
              {selectedSound.id !== 'silence' && (
                <div className="text-center text-sm">
                  {audioError ? (
                    <span className="inline-flex items-center text-red-500">
                      <span className="w-2 h-2 mr-2 rounded-full bg-red-500 animate-pulse"></span>
                      {audioError}
                    </span>
                  ) : (
                    <span className={`inline-flex items-center ${audioLoaded ? 'text-green-600' : 'text-amber-600'}`}>
                      <span className={`w-2 h-2 mr-2 rounded-full ${audioLoaded ? 'bg-green-600' : 'bg-amber-600'} animate-pulse`}></span>
                      {audioLoaded ? 'Sound loaded' : 'Loading sound...'}
                    </span>
                  )}
                </div>
              )}
              
              {/* Session selection */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Session Length</h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {SESSIONS.map((session) => (
                    <Button
                      key={session.id}
                      variant={selectedSession.id === session.id ? "default" : "outline"}
                      className={selectedSession.id === session.id 
                        ? "bg-wellness-purple hover:bg-wellness-deepPurple" 
                        : "hover:border-wellness-purple/50"
                      }
                      onClick={() => setSelectedSession(session)}
                      disabled={isActive}
                    >
                      {session.name}
                    </Button>
                  ))}
                </div>
              </div>
              
              {/* Sound selection */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Ambient Sound</h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {MEDITATION_SOUNDS.map((sound) => (
                    <Button
                      key={sound.id}
                      variant={selectedSound.id === sound.id ? "default" : "outline"}
                      className={selectedSound.id === sound.id 
                        ? "bg-wellness-purple hover:bg-wellness-deepPurple" 
                        : "hover:border-wellness-purple/50"
                      }
                      onClick={() => setSelectedSound(sound)}
                    >
                      {sound.name}
                    </Button>
                  ))}
                </div>
              </div>
              
              {/* Volume slider */}
              {selectedSound.id !== 'silence' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">Volume</h3>
                    <span className="text-sm text-muted-foreground">{volume}%</span>
                  </div>
                  <Slider
                    value={[volume]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={(value) => setVolume(value[0])}
                    disabled={isMuted}
                    className="w-full"
                  />
                </div>
              )}
            </CardContent>
          </div>
        </Card>
      </motion.div>
      
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="text-center p-4"
      >
        <p className="text-sm text-muted-foreground">
          Remember, it's normal for thoughts to arise during meditation. 
          Simply acknowledge them and gently return your focus to your breath.
        </p>
      </motion.div>
    </motion.div>
  );
};

export default Meditation;
