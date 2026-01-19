import React, { useState, useRef, useEffect } from 'react';

interface MobileImageEditorProps {
  imageUrl: string;
  onSave: (blob: Blob) => void;
  onCancel: () => void;
}

interface TouchState {
  scale: number;
  translateX: number;
  translateY: number;
}

export const MobileImageEditor: React.FC<MobileImageEditorProps> = ({
  imageUrl,
  onSave,
  onCancel,
}) => {
  const [touchState, setTouchState] = useState<TouchState>({
    scale: 1,
    translateX: 0,
    translateY: 0,
  });

  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);
  const initialPinchDistanceRef = useRef<number>(0);
  const initialScaleRef = useRef<number>(1);

  const getDistance = (touch1: React.Touch, touch2: React.Touch) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    
    if (e.touches.length === 2) {
      // Pinch zoom start
      const distance = getDistance(e.touches[0], e.touches[1]);
      initialPinchDistanceRef.current = distance;
      initialScaleRef.current = touchState.scale;
      lastTouchRef.current = null;
    } else if (e.touches.length === 1) {
      // Drag start
      lastTouchRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();

    if (e.touches.length === 2) {
      // Pinch zoom
      const distance = getDistance(e.touches[0], e.touches[1]);
      const newScale = initialScaleRef.current * (distance / initialPinchDistanceRef.current);
      
      setTouchState(prev => ({
        ...prev,
        scale: Math.max(0.5, Math.min(3, newScale)),
      }));
    } else if (e.touches.length === 1 && lastTouchRef.current) {
      // Drag to reposition
      const deltaX = e.touches[0].clientX - lastTouchRef.current.x;
      const deltaY = e.touches[0].clientY - lastTouchRef.current.y;

      setTouchState(prev => ({
        ...prev,
        translateX: prev.translateX + deltaX,
        translateY: prev.translateY + deltaY,
      }));

      lastTouchRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 0) {
      lastTouchRef.current = null;
    }
  };

  const handleSave = async () => {
    if (!imageRef.current || !containerRef.current) return;

    const canvas = document.createElement('canvas');
    const canvasSize = 400;
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    const ctx = canvas.getContext('2d')!;

    const containerSize = 192; // Preview container size
    const scaleFactor = canvasSize / containerSize;

    const img = imageRef.current;
    const imgNaturalWidth = img.naturalWidth;
    const imgNaturalHeight = img.naturalHeight;

    // Calculate object-cover base dimensions (how image fills 192px container)
    const containerAspect = 1;
    const imgAspect = imgNaturalWidth / imgNaturalHeight;
    
    let baseWidth: number;
    let baseHeight: number;
    
    if (imgAspect > containerAspect) {
      // Wider image: height fills container
      baseHeight = containerSize;
      baseWidth = containerSize * imgAspect;
    } else {
      // Taller image: width fills container
      baseWidth = containerSize;
      baseHeight = containerSize / imgAspect;
    }

    // Object-cover centers the image, so calculate offset
    const baseOffsetX = (containerSize - baseWidth) / 2;
    const baseOffsetY = (containerSize - baseHeight) / 2;

    // Fill with white background to avoid transparency issues
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    ctx.save();
    
    // Scale everything from preview coords to canvas coords
    ctx.scale(scaleFactor, scaleFactor);
    
    // Move to center of container (transform origin)
    ctx.translate(containerSize / 2, containerSize / 2);
    
    // Apply user transforms (CSS order: translate then scale, but in canvas we reverse)
    ctx.scale(touchState.scale, touchState.scale);
    ctx.translate(touchState.translateX, touchState.translateY);
    
    // Move back from center
    ctx.translate(-containerSize / 2, -containerSize / 2);
    
    // Draw image at its object-cover position
    ctx.drawImage(img, baseOffsetX, baseOffsetY, baseWidth, baseHeight);
    
    ctx.restore();

    canvas.toBlob((blob) => {
      if (blob) {
        onSave(blob);
      }
    }, 'image/jpeg', 0.9);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-[320px] mx-auto">
        {/* Interactive image area */}
        <div
          ref={containerRef}
          className="relative w-48 h-48 mx-auto mb-4 rounded-full overflow-hidden bg-background/50"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ touchAction: 'none' }}
        >
          <img
            ref={imageRef}
            src={imageUrl}
            alt="Edit"
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              transform: `translate(${touchState.translateX}px, ${touchState.translateY}px) scale(${touchState.scale})`,
              willChange: 'transform',
            }}
            draggable={false}
          />
        </div>

        {/* Instructions */}
        <div className="text-center mb-4 px-4">
          <p className="text-white text-sm">
            Pinch to zoom • Drag to move
          </p>
          <p className="text-white/70 text-xs mt-1">
            {Math.round(touchState.scale * 100)}% zoom
          </p>
        </div>

        {/* Controls */}
        <div className="flex gap-3 justify-center px-4">
          <button
            onClick={onCancel}
            className="px-6 py-2 bg-background/90 hover:bg-background text-foreground rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
