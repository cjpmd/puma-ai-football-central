import { useCallback, useRef, useState } from 'react';

interface UseLongPressOptions {
  delay?: number;
  onStart?: () => void;
  onFinish?: () => void;
  onCancel?: () => void;
}

export const useLongPress = (
  callback: () => void,
  options: UseLongPressOptions = {}
) => {
  const { delay = 500, onStart, onFinish, onCancel } = options;
  const [longPressTriggered, setLongPressTriggered] = useState(false);
  const timeout = useRef<NodeJS.Timeout>();
  const target = useRef<EventTarget>();

  const start = useCallback(
    (event: React.TouchEvent | React.MouseEvent) => {
      event.preventDefault();
      target.current = event.target;
      
      if (onStart) {
        onStart();
      }

      timeout.current = setTimeout(() => {
        callback();
        setLongPressTriggered(true);
        
        // Haptic feedback if available
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
        
        if (onFinish) {
          onFinish();
        }
      }, delay);
    },
    [callback, delay, onStart, onFinish]
  );

  const clear = useCallback(
    (shouldTriggerCancel = true) => {
      timeout.current && clearTimeout(timeout.current);
      shouldTriggerCancel && longPressTriggered === false && onCancel && onCancel();
      setLongPressTriggered(false);
    },
    [longPressTriggered, onCancel]
  );

  return {
    onMouseDown: start,
    onMouseUp: () => clear(true),
    onMouseLeave: () => clear(false),
    onTouchStart: start,
    onTouchEnd: () => clear(true),
  };
};
