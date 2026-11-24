import { useReducedMotion } from "framer-motion";

export function useMotionSafe() {
  const reduce = useReducedMotion();
  return {
    reduce: !!reduce,
    spring: reduce ? { duration: 0.01 } : { type: "spring" as const, stiffness: 260, damping: 28 },
    tween: reduce ? { duration: 0 } : { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
    stagger: reduce ? 0 : 0.06,
  };
}