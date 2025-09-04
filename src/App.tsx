import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Clock, Coffee, Sun, Moon } from 'lucide-react';

function App() {
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<'work' | 'rest'>('work');
  const [cycles, setCycles] = useState(0);
  const [showVictory, setShowVictory] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Use refs to store timer state for background operation
  const startTimeRef = useRef<number | null>(null);
  const totalDurationRef = useRef<number>(25 * 60);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // Audio context for generating pleasant notification sound
  const playNotificationSound = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5 note
    oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5 note
    oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5 note
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

   // Request wake lock to prevent screen from sleeping (for mobile)
  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      }
    } catch (err) {
      console.log('Wake lock not supported or failed:', err);
    }
  };

  // Release wake lock
  const releaseWakeLock = () => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
  };


   // Calculate time left based on elapsed time (more reliable for background)
  const calculateTimeLeft = () => {
    if (!startTimeRef.current) return totalDurationRef.current;
    
    const now = Date.now();
    const elapsed = Math.floor((now - startTimeRef.current) / 1000);
    const remaining = Math.max(0, totalDurationRef.current - elapsed);
    
    return remaining;
  };

  // Final victory message
  const playVictory=()=>{
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // First "taete" (0-1s)
    oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5 - "ta"
    oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.2); // E5 - "e"
    oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime + 0.4); // C5 - "te"
    
    // Second "taete" (1-2s)
    oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime + 1.0); // C5 - "ta"
    oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 1.2); // E5 - "e"
    oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime + 1.4); // C5 - "te"
    
    // Final "tee" (2-3s) - higher and sustained
    oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 2.0); // G5 - "tee"
    
    // Volume envelope for trumpet-like sound
    gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime + 0.1);
    gainNode.gain.setValueAtTime(0.4, audioContext.currentTime + 1.0);
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime + 1.1);
    gainNode.gain.setValueAtTime(0.5, audioContext.currentTime + 2.0);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 3.0);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 3.0);
  }

   useEffect(() => {
    if (isRunning) {
      // Set start time when timer begins
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now();
        totalDurationRef.current = timeLeft;
      }
      
      // Request wake lock when timer starts
      requestWakeLock();
      
      intervalRef.current = setInterval(() => {
        const remaining = calculateTimeLeft();
        setTimeLeft(remaining);
        
        // Check if timer finished
        if (remaining === 0) {
          // Timer finished
          playNotificationSound();
          setIsRunning(false);
          startTimeRef.current = null;
          releaseWakeLock();
          
          if (mode === 'work') {
            // Switch to break
            setMode('rest');
            const breakTime = 5 * 60;
            setTimeLeft(breakTime);
            totalDurationRef.current = breakTime;
            setCycles(prev => prev + 1);
            
            // Check if we've completed 1 cycle
            if (cycles + 1 >= 4) {
              playVictory();
              setShowVictory(true);
            } else {
              // Auto-start break
              setTimeout(() => {
                setIsRunning(true);
                startTimeRef.current = Date.now();
              }, 1000);
            }
          } else {
            // Switch back to work
            setMode('work');
            const workTime = 25 * 60;
            setTimeLeft(workTime);
            totalDurationRef.current = workTime;
            
            // Auto-start work session
            setTimeout(() => {
              setIsRunning(true);
              startTimeRef.current = Date.now();
            }, 1000);
          }
        }
      }, 100); // Update more frequently for smoother display
    } else {
      // Timer paused or stopped
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      // Reset start time when paused
      if (startTimeRef.current) {
        totalDurationRef.current = timeLeft;
        startTimeRef.current = null;
      }
      
      releaseWakeLock();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      releaseWakeLock();
    };
  }, [isRunning, mode, cycles]);

  // Handle page visibility changes (when tab becomes hidden/visible)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isRunning) {
        // Tab became hidden - store current state
        if (startTimeRef.current) {
          totalDurationRef.current = calculateTimeLeft();
        }
      } else if (!document.hidden && isRunning) {
        // Tab became visible - recalculate time
        if (startTimeRef.current) {
          const remaining = calculateTimeLeft();
          setTimeLeft(remaining);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isRunning]);

  // Legacy timer logic removed - replaced with timestamp-based approach above
  // const legacyTimerEffect = useEffect(() => {
  //   if (false) { // Disabled legacy logic
  //     // Timer finished
  //     playNotificationSound();
  //     setIsRunning(false);
      
  //     if (mode === 'work') {
  //       // Switch to break
  //       setMode('rest');
  //       setTimeLeft(2 * 60); // 2 minutes break
  //       setCycles(prev => prev + 1);
        
  //       // Check if we've completed 2 cycles
  //       if (cycles + 1 >= 1) {
  //         setShowVictory(true);
  //       } else {
  //         // Auto-start break
  //         setTimeout(() => setIsRunning(true), 1000);
  //       }
  //     } else {
  //       // Switch back to work
  //       setMode('work');
  //       setTimeLeft(5 * 60); // 5 minutes work
        
  //       // Auto-start work session
  //       setTimeout(() => setIsRunning(true), 1000);
  //     }
  //   }

  //   return () => {
  //     if (intervalRef.current) {
  //       clearInterval(intervalRef.current);
  //     }
  //   };
  // }, [isRunning, timeLeft, mode, cycles]);


  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(25 * 60);
    setMode('work');
    setCycles(0);
    setShowVictory(false);
  };

  const getProgressPercentage = () => {
    const totalTime = mode === 'work' ? 25 * 60 : 5 * 60;
    return ((totalTime - timeLeft) / totalTime) * 100;
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  if (showVictory) {
    return (
      <div className={`min-h-screen transition-all duration-700 flex items-center justify-center p-4 relative ${
        isDarkMode 
          ? 'bg-gradient-to-br from-black via-gray-900 to-black' 
          : 'bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50'
      }`} style={isDarkMode ? {} : { backgroundColor: '#615142' }}>
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className={`fixed top-6 right-6 p-4 rounded-full transition-all duration-500 transform hover:scale-110 hover:rotate-12 z-10 ${
            isDarkMode
              ? 'bg-gray-600 text-gray-300 shadow-lg shadow-gray-600/50'
              : 'bg-gray-200 text-gray-700 shadow-lg shadow-gray-200/50'
          }`}
        >
          {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
        </button>

        <div className={`backdrop-blur-lg rounded-3xl p-12 text-center shadow-2xl max-w-md w-full transition-all duration-700 ${
          isDarkMode
            ? 'bg-black/80 border shadow-gray-600/20' 
            : 'bg-white/90 border border-gray-200/60 shadow-gray-200/20'
        }`}>
          <div className="mb-8">
            <div className="text-6xl mb-4 animate-bounce">🎉</div>
            <h1 className={`text-3xl font-bold mb-4 transition-colors duration-700 ${
              isDarkMode 
                ? 'text-gray-300' 
                : 'text-gray-800'
            }`}>
              Yeah!! You beat your procrastination once today!
            </h1>
            <p className={`text-lg transition-colors duration-700 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Amazing work! You just completed 2 hours of focused productivity.
            </p>
          </div>
          
          <button
            onClick={resetTimer}
            className={`px-8 py-4 rounded-2xl font-semibold text-lg transform hover:scale-105 transition-all duration-300 flex items-center gap-3 mx-auto ${
              isDarkMode
                ? 'bg-gray-600 text-gray-200 hover:shadow-lg hover:shadow-gray-600/50'
                : 'bg-gray-300 text-gray-800 hover:shadow-lg hover:shadow-gray-300/50'
            }`}
          >
            <RotateCcw size={24} />
            Start Fresh Session
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-all duration-700 flex flex-col items-center justify-center p-4 relative ${
      isDarkMode 
        ? 'bg-gradient-to-br from-black via-gray-900 to-black' 
        : 'bg-gradient-to-br from-[#5c3c1c] via-[#85613e] to-[#5c3c1c]'
    }`} style={isDarkMode ? {} : { backgroundColor: '#F5F5F0' }}>
      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className={`fixed top-6 right-6 p-2 lg:p-4 rounded-full transition-all duration-500 transform hover:scale-110 hover:rotate-12 z-10 ${
          isDarkMode
            ? 'bg-gray-600 text-gray-300 shadow-lg shadow-gray-600/50'
            : 'bg-gray-200 text-gray-700 shadow-lg shadow-gray-200/50'
        }`}
      >
        {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
      </button>

      {/* Cycle Counter */}
      <div className="mb-8">
        <div className={`backdrop-blur-lg rounded-2xl px-4 md:px-6 py-3 transition-all duration-700 ${
          isDarkMode 
            ? 'bg-black/40 border-2' 
            : 'bg-white/80 border-2 border-gray-200/60'
        }`} style={isDarkMode ? { borderColor: '#383636' } : {backgroundColor: '#BDAD9E'}}>
          <div className={`flex items-center gap-2 md:gap-3 transition-colors duration-700 ${
            isDarkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>
            <Clock size={24} />
            <span className="text-lg md:text-xl font-semibold">
              Cycles Completed: {cycles}/4
            </span>
          </div>
          <div className={`mt-2 w-full rounded-full h-2 transition-all duration-700 ${
            isDarkMode ? 'bg-gray-800' : 'bg-gray-200'
          }`}>
            <div 
              className={`rounded-full h-2 transition-all duration-500 ${
                isDarkMode 
                  ? 'bg-gray-500' 
                  : 'bg-gray-500'
              }`}
              style={{ width: `${(cycles / 4) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Timer Display */}
      <div className={`backdrop-blur-lg rounded-3xl p-3 lg:p-4 shadow-2xl max-w-sm lg:max-w-md w-11/12 h-2/5 lg:h-3/5 transition-all duration-700 ${
        isDarkMode
          ? 'bg-black/60 border-2 shadow-gray-600/20'
          : 'border-2 border-gray-200/60 shadow-gray-200/20'
      }`} style={isDarkMode ? { borderColor: '#383636' } : { backgroundColor: '#BDAD9E' }}>
        {/* Mode Indicator */}
        <div className="text-center mb-6">
          <div className={`flex items-center justify-center gap-3 mb-3 transition-colors duration-700 ${
            isDarkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>
            {mode === 'work' ? (
              <Clock size={32} />
            ) : (
              <Coffee size={32} />
            )}
            <h2 className={`text-2xl lg:text-3xl font-bold transition-colors duration-700 ${
              isDarkMode 
                ? 'text-gray-300' 
                : 'text-gray-700'
            }`}>
              {mode === 'work' ? 'WORK' : 'REST'}
            </h2>
          </div>
          <p className={`text-lg transition-colors duration-700 ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {mode === 'work' 
              ? 'Stay focused and productive!' 
              : 'Take a well-deserved break!'
            }
          </p>
        </div>

        {/* Timer Display */}
        <div className="text-center mb-8">
          <div className="relative">
            <div className={`text-4xl lg:text-6xl font-mono font-bold mb-4 transition-colors duration-700 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-800'
            }`}>
              {formatTime(timeLeft)}
            </div>
            
            {/* Progress Ring */}
            <div className="relative w-48 h-48 mx-auto mb-6">
              <svg className="transform -rotate-90 w-48 h-48">
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  stroke={isDarkMode ? '#4B5563' : '#E5E7EB'}
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  stroke={isDarkMode ? '#9C9C9C' : '#6B7280'}
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 88}`}
                  strokeDashoffset={`${2 * Math.PI * 88 * (1 - getProgressPercentage() / 100)}`}
                  className="transition-all duration-1000 ease-out"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={`text-center transition-colors duration-700 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  <div className="text-sm opacity-80">
                    {mode === 'work' ? 'Focus Time' : 'Break Time'}
                  </div>
                  <div className="text-lg font-semibold">
                    {Math.round(getProgressPercentage())}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={toggleTimer}
            className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 ${
              isRunning
                ? isDarkMode
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/50'
                  : 'bg-red-500 text-white shadow-lg shadow-red-600/50'
                : isDarkMode
                  ? 'bg-gray-600 text-gray-200 shadow-lg shadow-gray-600/50'
                  : 'bg-gray-600 text-white shadow-lg shadow-gray-600/50'
            }`}
          >
            {isRunning ? <Pause size={24} /> : <Play size={24} />}
            {isRunning ? 'Pause' : 'Start'}
          </button>
          
          <button
            onClick={resetTimer}
            className={`px-6 py-4 rounded-2xl font-semibold transition-all duration-300 transform hover:scale-105 backdrop-blur-lg ${
              isDarkMode
                ? 'bg-gray-800/60 hover:bg-gray-700/60 text-gray-300 border'
                : 'bg-gray-100/80 hover:bg-gray-200/90 text-gray-700 border border-gray-200/60'
            }`} style={isDarkMode ? { borderColor: '#383636' } : {}}>
            <RotateCcw size={24} />
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className={`text-sm transition-colors duration-700 ${
          isDarkMode ? 'text-gray-400' : 'text-gray-950'
        }`}>
          Pomodoro Technique: 25 min work • 5 min break • Beat procrastination
        </p>
      </div>
    </div>
  );
}

export default App;