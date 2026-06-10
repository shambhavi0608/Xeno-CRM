import React, { useState, useEffect } from 'react';

interface CountUpProps {
  value: number;
  duration?: number; // fallback default 1500 ms
  prefix?: string;
  suffix?: string;
}

export function CountUp({ value, duration = 1500, prefix = '', suffix = '' }: CountUpProps) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const startValue = 0;
    const endValue = value;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      // Easing function cubic-bezier(0.1, 1, 0.1, 1) - fast start, slow end
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const val = startValue + easeProgress * (endValue - startValue);
      
      setCurrent(val);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setCurrent(endValue);
      }
    };

    window.requestAnimationFrame(step);
  }, [value, duration]);

  const valueFormatted = Math.round(current).toLocaleString();

  return (
    <span>
      {prefix}
      {valueFormatted}
      {suffix}
    </span>
  );
}
