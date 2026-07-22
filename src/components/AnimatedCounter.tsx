import React, { useEffect, useState, useRef } from "react";

interface AnimatedCounterProps {
  value: number;
  duration?: number; // duration in milliseconds
  formatter?: (val: number) => string;
  className?: string;
}

export default function AnimatedCounter({
  value,
  duration = 1500,
  formatter = (v) => Math.round(v).toLocaleString("pt-BR"),
  className,
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const valueRef = useRef(value);
  const startValueRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    // Start animation from current display value to the new target value
    startValueRef.current = displayValue;
    valueRef.current = value;
    startTimeRef.current = null;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = timestamp - startTimeRef.current;
      const percentage = Math.min(progress / duration, 1);
      
      // Easing: easeOutQuart
      const ease = 1 - Math.pow(1 - percentage, 4);
      const nextValue = startValueRef.current + (valueRef.current - startValueRef.current) * ease;
      
      setDisplayValue(nextValue);

      if (percentage < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(valueRef.current);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, duration]);

  return <span className={className}>{formatter(displayValue)}</span>;
}
