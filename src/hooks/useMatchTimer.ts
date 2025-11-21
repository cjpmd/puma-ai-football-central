import { useState, useEffect, useCallback } from 'react';

interface UseMatchTimerReturn {
  elapsedSeconds: number;
  currentMinute: number;
  currentSecond: number;
  currentPeriod: number;
  isRunning: boolean;
  start: () => void;
  pause: () => void;
  reset: () => void;
  setCurrentPeriod: (period: number) => void;
  displayTime: string;
}

export const useMatchTimer = (gameDuration: number = 50): UseMatchTimerReturn => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [currentPeriod, setCurrentPeriod] = useState(1);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  const start = useCallback(() => setIsRunning(true), []);
  const pause = useCallback(() => setIsRunning(false), []);
  const reset = useCallback(() => {
    setElapsedSeconds(0);
    setIsRunning(false);
  }, []);

  const currentMinute = Math.floor(elapsedSeconds / 60);
  const currentSecond = elapsedSeconds % 60;
  const displayTime = `${currentMinute}:${currentSecond.toString().padStart(2, '0')}`;

  return {
    elapsedSeconds,
    currentMinute,
    currentSecond,
    currentPeriod,
    isRunning,
    start,
    pause,
    reset,
    setCurrentPeriod,
    displayTime
  };
};
