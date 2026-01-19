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
    const canvasSize = 400; // Output size
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    const ctx = canvas.getContext('2d')!;

    // Get the container size (preview area)
    const containerSize = 192; // w-48 = 12rem = 192px
    
    // Scale factor from preview to canvas
    const scaleFactor = canvasSize / containerSize;

    const img = imageRef.current;
    const imgNaturalWidth = img.naturalWidth;
    const imgNaturalHeight = img.naturalHeight;

    // Calculate how the image fills the container (object-cover behavior)
    const containerAspect = 1; // Square container
    const imgAspect = imgNaturalWidth / imgNaturalHeight;
    
    let drawWidth: number;
    let drawHeight: number;
    
    if (imgAspect > containerAspect) {
      // Image is wider - height fills container, width overflows
      const baseScale = containerSize / imgNaturalHeight;
      drawHeight = containerSize;
      drawWidth = imgNaturalWidth * baseScale;
    } else {
      // Image is taller - width fills container, height overflows
      const baseScale = containerSize / imgNaturalWidth;
      drawWidth = containerSize;
      drawHeight = imgNaturalHeight * baseScale;
    }

    // Create circular clipping path
    ctx.beginPath();
    ctx.arc(canvasSize / 2, canvasSize / 2, canvasSize / 2, 0, Math.PI * 2);
    ctx.clip();

    // Apply transformations
    ctx.save();
    
    // Move to center of canvas
    ctx.translate(canvasSize / 2, canvasSize / 2);
    
    // Apply user's scale (relative to base, scaled from container to canvas)
    ctx.scale(scaleFactor * touchState.scale, scaleFactor * touchState.scale);
    
    // Apply user's translate (in container space)
    ctx.translate(touchState.translateX, touchState.translateY);
    
    // Draw image centered at origin, using the object-cover dimensions
    ctx.drawImage(
      img,
      -drawWidth / 2,
      -drawHeight / 2,
      drawWidth,
      drawHeight
    );
    
    ctx.restore();

    // Export as blob
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
