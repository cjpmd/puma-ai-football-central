import React from 'react';

interface FPLPitchProps {
  className?: string;
}

/**
 * FPL-style pitch with accurate perspective, broadcast shading, and off-screen bleed.
 * Based on: https://miro.medium.com/v2/resize:fit:810/format:webp/1*x6oVrO0JgWqn-kqkxI0zOA.png
 */
const FPLPitch: React.FC<FPLPitchProps> = ({ className = '' }) => {
  // Pitch geometry constants (in viewBox units)
  const VIEW_WIDTH = 100;
  const VIEW_HEIGHT = 140;
  
  // Trapezoid perspective - top is narrower (recedes into distance)
  const TOP_INSET = 8; // How much narrower the top is on each side
  const PITCH_MARGIN = 4; // Green margin around the white boundary
  
  // Line markings proportions
  const STROKE_WIDTH = 0.8;
  const CENTER_CIRCLE_R = 12;
  const CENTER_SPOT_R = 1;
  const PENALTY_BOX_WIDTH = 44;
  const PENALTY_BOX_HEIGHT = 18;
  const GOAL_BOX_WIDTH = 20;
  const GOAL_BOX_HEIGHT = 6;
  const CORNER_ARC_R = 3;
  const PENALTY_SPOT_DISTANCE = 12;
  const PENALTY_ARC_R = 12;
  
  // Calculate trapezoid corners for pitch shape
  const pitchShape = `
    M ${TOP_INSET} 0
    L ${VIEW_WIDTH - TOP_INSET} 0
    L ${VIEW_WIDTH} ${VIEW_HEIGHT}
    L 0 ${VIEW_HEIGHT}
    Z
  `;
  
  // Inner boundary (white lines) - inset from pitch edge
  const boundaryTop = PITCH_MARGIN;
  const boundaryBottom = VIEW_HEIGHT - PITCH_MARGIN;
  const boundaryLeftTop = TOP_INSET + PITCH_MARGIN * 0.8;
  const boundaryRightTop = VIEW_WIDTH - TOP_INSET - PITCH_MARGIN * 0.8;
  const boundaryLeftBottom = PITCH_MARGIN;
  const boundaryRightBottom = VIEW_WIDTH - PITCH_MARGIN;
  
  // Calculate positions with perspective adjustment
  const getXAtY = (y: number, baseX: number, isLeft: boolean) => {
    const progress = y / VIEW_HEIGHT;
    const insetAtY = TOP_INSET * (1 - progress);
    if (isLeft) {
      return PITCH_MARGIN + insetAtY + (baseX - PITCH_MARGIN) * (1 - insetAtY / (VIEW_WIDTH / 2));
    }
    return VIEW_WIDTH - PITCH_MARGIN - insetAtY - (VIEW_WIDTH - PITCH_MARGIN - baseX) * (1 - insetAtY / (VIEW_WIDTH / 2));
  };
  
  // Halfway line Y position
  const halfwayY = VIEW_HEIGHT / 2;
  const halfwayLeftX = TOP_INSET / 2 + PITCH_MARGIN;
  const halfwayRightX = VIEW_WIDTH - TOP_INSET / 2 - PITCH_MARGIN;
  
  // Penalty box calculations (top - far end)
  const penaltyBoxTopY = boundaryTop;
  const penaltyBoxTopBottomY = boundaryTop + PENALTY_BOX_HEIGHT;
  const penaltyBoxTopLeftX = (VIEW_WIDTH / 2) - (PENALTY_BOX_WIDTH / 2) * 0.85;
  const penaltyBoxTopRightX = (VIEW_WIDTH / 2) + (PENALTY_BOX_WIDTH / 2) * 0.85;
  
  // Goal box (top - far end)
  const goalBoxTopY = boundaryTop;
  const goalBoxTopBottomY = boundaryTop + GOAL_BOX_HEIGHT;
  const goalBoxTopLeftX = (VIEW_WIDTH / 2) - (GOAL_BOX_WIDTH / 2) * 0.9;
  const goalBoxTopRightX = (VIEW_WIDTH / 2) + (GOAL_BOX_WIDTH / 2) * 0.9;
  
  // Penalty box calculations (bottom - near end)
  const penaltyBoxBottomY = boundaryBottom;
  const penaltyBoxBottomTopY = boundaryBottom - PENALTY_BOX_HEIGHT;
  const penaltyBoxBottomLeftX = (VIEW_WIDTH / 2) - (PENALTY_BOX_WIDTH / 2);
  const penaltyBoxBottomRightX = (VIEW_WIDTH / 2) + (PENALTY_BOX_WIDTH / 2);
  
  // Goal box (bottom - near end)
  const goalBoxBottomY = boundaryBottom;
  const goalBoxBottomTopY = boundaryBottom - GOAL_BOX_HEIGHT;
  const goalBoxBottomLeftX = (VIEW_WIDTH / 2) - (GOAL_BOX_WIDTH / 2);
  const goalBoxBottomRightX = (VIEW_WIDTH / 2) + (GOAL_BOX_WIDTH / 2);
  
  // Goal dimensions
  const goalWidth = 14;
  const goalDepth = 4;

  return (
    <div className={`fpl-pitch-wrapper ${className}`}>
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        preserveAspectRatio="none"
        className="fpl-pitch-svg"
      >
        <defs>
          {/* Main pitch gradient - lighter at bottom (near), darker at top (far/distance) */}
          <linearGradient id="pitchGradient" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#4CAF50" /> {/* Bright green at bottom */}
            <stop offset="40%" stopColor="#43A047" />
            <stop offset="70%" stopColor="#388E3C" />
            <stop offset="100%" stopColor="#2E7D32" /> {/* Darker at top (distance) */}
          </linearGradient>
          
          {/* Distance haze overlay - creates depth at the top */}
          <linearGradient id="distanceHaze" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(0,30,0,0.25)" /> {/* Dark haze at very top */}
            <stop offset="15%" stopColor="rgba(0,20,0,0.12)" />
            <stop offset="35%" stopColor="rgba(0,0,0,0)" /> {/* Fade to transparent */}
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </linearGradient>
          
          {/* Vertical mowing stripes pattern */}
          <pattern id="mowingStripes" patternUnits="userSpaceOnUse" width="8" height="140">
            <rect x="0" y="0" width="4" height="140" fill="rgba(255,255,255,0.03)" />
            <rect x="4" y="0" width="4" height="140" fill="rgba(0,0,0,0.02)" />
          </pattern>
          
          {/* Clip path for the trapezoid pitch shape */}
          <clipPath id="pitchClip">
            <path d={pitchShape} />
          </clipPath>
        </defs>
        
        {/* Base pitch shape with gradient */}
        <path d={pitchShape} fill="url(#pitchGradient)" />
        
        {/* Mowing stripes overlay */}
        <path d={pitchShape} fill="url(#mowingStripes)" />
        
        {/* Distance haze overlay for depth */}
        <path d={pitchShape} fill="url(#distanceHaze)" />
        
        {/* All line markings - white, consistent stroke */}
        <g 
          fill="none" 
          stroke="#ffffff" 
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Outer boundary - trapezoid following pitch edges with perspective */}
          <path d={`
            M ${boundaryLeftTop} ${boundaryTop}
            L ${boundaryRightTop} ${boundaryTop}
            L ${boundaryRightBottom} ${boundaryBottom}
            L ${boundaryLeftBottom} ${boundaryBottom}
            Z
          `} />
          
          {/* Halfway line */}
          <line 
            x1={halfwayLeftX} 
            y1={halfwayY} 
            x2={halfwayRightX} 
            y2={halfwayY} 
          />
          
          {/* Center circle */}
          <ellipse 
            cx={VIEW_WIDTH / 2} 
            cy={halfwayY} 
            rx={CENTER_CIRCLE_R * 0.95} 
            ry={CENTER_CIRCLE_R}
          />
          
          {/* Center spot */}
          <circle 
            cx={VIEW_WIDTH / 2} 
            cy={halfwayY} 
            r={CENTER_SPOT_R}
            fill="#ffffff"
          />
          
          {/* TOP PENALTY BOX (far end - smaller due to perspective) */}
          <path d={`
            M ${penaltyBoxTopLeftX} ${penaltyBoxTopY}
            L ${penaltyBoxTopLeftX} ${penaltyBoxTopBottomY}
            L ${penaltyBoxTopRightX} ${penaltyBoxTopBottomY}
            L ${penaltyBoxTopRightX} ${penaltyBoxTopY}
          `} />
          
          {/* TOP GOAL BOX (6-yard box) */}
          <path d={`
            M ${goalBoxTopLeftX} ${goalBoxTopY}
            L ${goalBoxTopLeftX} ${goalBoxTopBottomY}
            L ${goalBoxTopRightX} ${goalBoxTopBottomY}
            L ${goalBoxTopRightX} ${goalBoxTopY}
          `} />
          
          {/* TOP PENALTY SPOT */}
          <circle 
            cx={VIEW_WIDTH / 2} 
            cy={boundaryTop + PENALTY_SPOT_DISTANCE * 0.85}
            r={CENTER_SPOT_R * 0.8}
            fill="#ffffff"
          />
          
          {/* TOP PENALTY ARC (D) - only the visible part outside the box */}
          <path d={`
            M ${penaltyBoxTopLeftX + 6} ${penaltyBoxTopBottomY}
            A ${PENALTY_ARC_R * 0.85} ${PENALTY_ARC_R * 0.9} 0 0 0 ${penaltyBoxTopRightX - 6} ${penaltyBoxTopBottomY}
          `} />
          
          {/* BOTTOM PENALTY BOX (near end - larger) */}
          <path d={`
            M ${penaltyBoxBottomLeftX} ${penaltyBoxBottomY}
            L ${penaltyBoxBottomLeftX} ${penaltyBoxBottomTopY}
            L ${penaltyBoxBottomRightX} ${penaltyBoxBottomTopY}
            L ${penaltyBoxBottomRightX} ${penaltyBoxBottomY}
          `} />
          
          {/* BOTTOM GOAL BOX (6-yard box) */}
          <path d={`
            M ${goalBoxBottomLeftX} ${goalBoxBottomY}
            L ${goalBoxBottomLeftX} ${goalBoxBottomTopY}
            L ${goalBoxBottomRightX} ${goalBoxBottomTopY}
            L ${goalBoxBottomRightX} ${goalBoxBottomY}
          `} />
          
          {/* BOTTOM PENALTY SPOT */}
          <circle 
            cx={VIEW_WIDTH / 2} 
            cy={boundaryBottom - PENALTY_SPOT_DISTANCE}
            r={CENTER_SPOT_R}
            fill="#ffffff"
          />
          
          {/* BOTTOM PENALTY ARC (D) */}
          <path d={`
            M ${penaltyBoxBottomLeftX + 8} ${penaltyBoxBottomTopY}
            A ${PENALTY_ARC_R} ${PENALTY_ARC_R} 0 0 1 ${penaltyBoxBottomRightX - 8} ${penaltyBoxBottomTopY}
          `} />
          
          {/* CORNER ARCS */}
          {/* Top-left corner */}
          <path d={`
            M ${boundaryLeftTop} ${boundaryTop + CORNER_ARC_R * 0.8}
            A ${CORNER_ARC_R * 0.8} ${CORNER_ARC_R * 0.8} 0 0 1 ${boundaryLeftTop + CORNER_ARC_R * 0.8} ${boundaryTop}
          `} />
          
          {/* Top-right corner */}
          <path d={`
            M ${boundaryRightTop - CORNER_ARC_R * 0.8} ${boundaryTop}
            A ${CORNER_ARC_R * 0.8} ${CORNER_ARC_R * 0.8} 0 0 1 ${boundaryRightTop} ${boundaryTop + CORNER_ARC_R * 0.8}
          `} />
          
          {/* Bottom-left corner */}
          <path d={`
            M ${boundaryLeftBottom + CORNER_ARC_R} ${boundaryBottom}
            A ${CORNER_ARC_R} ${CORNER_ARC_R} 0 0 1 ${boundaryLeftBottom} ${boundaryBottom - CORNER_ARC_R}
          `} />
          
          {/* Bottom-right corner */}
          <path d={`
            M ${boundaryRightBottom} ${boundaryBottom - CORNER_ARC_R}
            A ${CORNER_ARC_R} ${CORNER_ARC_R} 0 0 1 ${boundaryRightBottom - CORNER_ARC_R} ${boundaryBottom}
          `} />
        </g>
        
        {/* GOALS - white rectangles at edges */}
        {/* Top goal (far end - smaller) */}
        <rect
          x={(VIEW_WIDTH - goalWidth * 0.85) / 2}
          y={0}
          width={goalWidth * 0.85}
          height={goalDepth * 0.8}
          fill="none"
          stroke="#ffffff"
          strokeWidth={STROKE_WIDTH * 1.5}
        />
        
        {/* Bottom goal (near end - larger) */}
        <rect
          x={(VIEW_WIDTH - goalWidth) / 2}
          y={VIEW_HEIGHT - goalDepth}
          width={goalWidth}
          height={goalDepth}
          fill="none"
          stroke="#ffffff"
          strokeWidth={STROKE_WIDTH * 1.5}
        />
      </svg>
    </div>
  );
};

export default FPLPitch;
