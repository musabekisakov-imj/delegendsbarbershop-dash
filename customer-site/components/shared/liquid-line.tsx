'use client';

// Liquid-flowing line — a sine-wave SVG path with a translating gradient that
// reads as mercury running through it. Used under the wordmark and the active
// nav link so the header feels like one continuous stream.
//
// `width` is fluid (preserveAspectRatio="none" + width="100%"), so the wave
// stretches to whatever container it sits in.

import { useId } from 'react';

interface Props {
  /** Stroke colour CSS expression (e.g. 'oklch(0.95 0.16 118.89)' or 'currentColor'). */
  color?: string;
  /** Crest height — bigger value = more dramatic wave. */
  amplitude?: number;
  /** Pixel height of the SVG viewport. */
  height?: number;
  /** Stroke width. */
  thickness?: number;
  /** Gradient sweep duration in seconds. */
  duration?: number;
  /** Number of full crests across the width. Higher = tighter ripples. */
  ripples?: number;
  /** Reverse the flow direction. */
  reverse?: boolean;
  /** Tailwind className passthrough (positioning, opacity, etc.). */
  className?: string;
}

export function LiquidLine({
  color = 'oklch(0.95 0.16 118.89)',
  amplitude = 1.6,
  height = 6,
  thickness = 1.25,
  duration = 4.5,
  ripples = 6,
  reverse = false,
  className,
}: Props) {
  const gradientId = useId();
  // Build a smooth sine-wave path across the viewBox (0..1000 wide).
  // We chain quadratic Bézier curves at each half-period — produces a clean
  // alternating crest/trough with no kinks.
  const totalWidth = 1000;
  const period = totalWidth / ripples;
  const halfPeriod = period / 2;
  const midY = height / 2;
  const points: string[] = [`M 0 ${midY}`];
  for (let i = 0; i < ripples * 2; i++) {
    const x = (i + 1) * halfPeriod;
    const ctrlX = x - halfPeriod / 2;
    const ctrlY = i % 2 === 0 ? midY - amplitude : midY + amplitude;
    points.push(`Q ${ctrlX} ${ctrlY} ${x} ${midY}`);
  }
  const d = points.join(' ');

  return (
    <svg
      aria-hidden
      width="100%"
      height={height}
      viewBox={`0 0 ${totalWidth} ${height}`}
      preserveAspectRatio="none"
      className={className}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity="0" />
          <stop offset="35%" stopColor={color} stopOpacity="0.25" />
          <stop offset="50%" stopColor={color} stopOpacity="1" />
          <stop offset="65%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
          <animateTransform
            attributeName="gradientTransform"
            type="translate"
            from={reverse ? '1 0' : '-1 0'}
            to={reverse ? '-1 0' : '1 0'}
            dur={`${duration}s`}
            repeatCount="indefinite"
          />
        </linearGradient>
      </defs>
      {/* Faint base stroke so the line is always present even between sweeps */}
      <path d={d} fill="none" stroke={color} strokeOpacity="0.18" strokeWidth={thickness} strokeLinecap="round" />
      {/* Bright moving stroke — same path, gradient-filled */}
      <path d={d} fill="none" stroke={`url(#${gradientId})`} strokeWidth={thickness * 1.4} strokeLinecap="round" />
    </svg>
  );
}
