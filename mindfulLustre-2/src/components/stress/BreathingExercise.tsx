import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { useUser } from '@/context/UserContext';
import { cn } from '@/lib/utils';

const BreathingExercise = () => {
  const [isActive, setIsActive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [phase, setPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const [size, setSize] = useState(100);
  const timerRef = useRef<number | null>(null);
  const completedCyclesRef = useRef(0);
  const { user, addExerciseLog } = useUser();

  const totalInhaleTime = 5; // seconds
  const totalHoldTime = 4; // seconds
  const totalExhaleTime = 7; // seconds
  const minSize = 100;
  const maxSize = 200;

  useEffect(() => {
    if (isActive) {
      timerRef.current = window.setInterval(() => {
        setSeconds(prevSeconds => {
          const newSeconds = prevSeconds + 1;
          
          // Logic for phase changes
          if (phase === 'inhale' && newSeconds >= totalInhaleTime) {
            setPhase('hold');
            return 0;
          } else if (phase === 'hold' && newSeconds >= totalHoldTime) {
            setPhase('exhale');
            return 0;
          } else if (phase === 'exhale' && newSeconds >= totalExhaleTime) {
            setPhase('inhale');
            completedCyclesRef.current += 1;
            
            // Check if we've completed at least 3 cycles, then log exercise
            if (completedCyclesRef.current === 3) {
              handleExerciseComplete();
            }
            
            return 0;
          }
          
          return newSeconds;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isActive, phase]);

  useEffect(() => {
    // Animation for circle size based on breathing phase
    let newSize = minSize;
    if (phase === 'inhale') {
      newSize = minSize + ((maxSize - minSize) * (seconds / totalInhaleTime));
    } else if (phase === 'hold') {
      newSize = maxSize;
    } else if (phase === 'exhale') {
      newSize = maxSize - ((maxSize - minSize) * (seconds / totalExhaleTime));
    }
    setSize(newSize);
  }, [seconds, phase]);

  const handleExerciseComplete = async () => {
    // Record the exercise completion in the database
    try {
      if (user) {
        await addExerciseLog('breathing', completedCyclesRef.current * (totalInhaleTime + totalHoldTime + totalExhaleTime));
        toast.success('Great job! Exercise logged successfully.');
      }
    } catch (error) {
      console.error('Error logging exercise:', error);
      toast.error('Failed to log exercise. Please try again.');
    }
  };

  const handleStart = () => {
    setIsActive(true);
    completedCyclesRef.current = 0;
    toast('Beginning breathing exercise...', {
      description: 'Follow the circle animation.',
    });
  };

  const handlePause = () => {
    setIsActive(false);
  };

  const handleReset = () => {
    setIsActive(false);
    setSeconds(0);
    setPhase('inhale');
    setSize(minSize);
    completedCyclesRef.current = 0;
    toast('Exercise reset', {
      description: 'You can start again when ready.',
    });
  };

  const getPhaseInfo = () => {
    switch (phase) {
      case 'inhale':
        return {
          label: 'Inhale',
          instruction: 'Breathe in slowly through your nose',
          timeLeft: totalInhaleTime - seconds,
          color: 'from-wellness-purple/20 to-wellness-purple/30',
        };
      case 'hold':
        return {
          label: 'Hold',
          instruction: 'Hold your breath',
          timeLeft: totalHoldTime - seconds,
          color: 'from-wellness-purple/30 to-wellness-blue/30',
        };
      case 'exhale':
        return {
          label: 'Exhale',
          instruction: 'Breathe out slowly through your mouth',
          timeLeft: totalExhaleTime - seconds,
          color: 'from-wellness-blue/20 to-wellness-blue/30',
        };
    }
  };

  const phaseInfo = getPhaseInfo();

  return (
    <div className="flex flex-col items-center">
      <Card className="mb-6 p-6 w-full max-w-md bg-gradient-to-br from-wellness-purple/5 to-wellness-blue/5">
        <h3 className="font-semibold text-lg mb-2 text-wellness-purple">5-4-7 Breathing Technique</h3>
        <p className="text-sm text-muted-foreground mb-4">
          This breathing pattern helps activate the parasympathetic nervous system, which promotes relaxation and reduces stress.
        </p>
        <ul className="text-sm list-disc pl-5 mb-4 space-y-1">
          <li>Inhale through your nose for 5 seconds</li>
          <li>Hold your breath for 4 seconds</li>
          <li>Exhale through your mouth for 7 seconds</li>
          <li>Repeat for at least 3 cycles</li>
        </ul>
      </Card>

      {/* Phase indicator */}
      <div className="mb-4 text-center">
        <h4 className="text-xl font-medium text-wellness-purple">{phaseInfo.label}</h4>
        <p className="text-sm text-muted-foreground mb-5">{phaseInfo.instruction}</p>
      </div>

      <div className="relative mb-10 flex items-center justify-center">
        {/* Outer decorative rings */}
        <div
          className={cn(
            "absolute rounded-full opacity-10 transition-all duration-1000 ease-in-out",
            isActive ? "bg-gradient-to-r " + phaseInfo.color : "bg-wellness-purple/10",
          )}
          style={{
            width: `${size + 60}px`,
            height: `${size + 60}px`,
          }}
        />
        <div
          className={cn(
            "absolute rounded-full opacity-20 transition-all duration-1000 ease-in-out",
            isActive ? "bg-gradient-to-r " + phaseInfo.color : "bg-wellness-purple/15",
          )}
          style={{
            width: `${size + 30}px`,
            height: `${size + 30}px`,
          }}
        />

        {/* Main breathing circle */}
        <div
          className={cn(
            "rounded-full flex items-center justify-center transition-all duration-1000 ease-in-out",
            isActive ? "bg-gradient-to-r " + phaseInfo.color : "bg-wellness-purple/20",
          )}
          style={{
            width: `${size}px`,
            height: `${size}px`,
            boxShadow: isActive ? "0 0 20px rgba(0, 0, 0, 0.05)" : "none",
          }}
        >
          {isActive && <p className="text-2xl font-light text-wellness-purple">{phaseInfo.timeLeft}</p>}
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        {!isActive ? (
          <Button 
            onClick={handleStart}
            className="bg-wellness-purple hover:bg-wellness-deepPurple"
          >
            <Play className="mr-2 h-4 w-4" />
            Start
          </Button>
        ) : (
          <Button 
            onClick={handlePause}
            className="bg-wellness-purple hover:bg-wellness-deepPurple"
          >
            <Pause className="mr-2 h-4 w-4" />
            Pause
          </Button>
        )}
        <Button 
          onClick={handleReset}
          variant="outline"
          className="border-wellness-purple text-wellness-purple hover:bg-wellness-purple/10"
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset
        </Button>
      </div>

      <p className="text-sm text-center text-muted-foreground max-w-md">
        {completedCyclesRef.current > 0
          ? `Completed cycles: ${completedCyclesRef.current}/3`
          : "Complete at least 3 cycles for maximum benefit"}
        <br />
        Try to make this a daily practice.
      </p>
    </div>
  );
};

export default BreathingExercise;