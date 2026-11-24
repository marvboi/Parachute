import { motion, useReducedMotion } from "framer-motion";

type Props = { active: boolean };

export function HoverLandParachute({ active }: Props) {
  const reduce = useReducedMotion();
  if (!active) return null;

  return (
    <motion.span className="hover-land-chute" aria-hidden initial={false}>
      <motion.span
        className="hover-land-inner"
        initial={reduce ? { y: -8, opacity: 1 } : { y: -52, opacity: 0, scale: 0.7 }}
        animate={reduce ? { y: -8, opacity: 1 } : { y: [-52, 6, 0], opacity: 1, scale: 1, rotate: [0, 6, -3, 0] }}
        transition={
          reduce
            ? { duration: 0 }
            : {
                y: { type: "spring", stiffness: 420, damping: 20, mass: 0.45 },
                scale: { type: "spring", stiffness: 500, damping: 18 },
                rotate: { duration: 0.55 },
              }
        }
      >
        <svg width={28} height={30} viewBox="0 0 38 40" fill="none" aria-hidden>
          <path d="M4 12 L19 6 L34 12 L28 18 L19 15 L10 18 Z" fill="#FF5B1F" />
          <path d="M10 18 L19 34 L28 18" stroke="#FF5B1F" strokeWidth="1.1" />
          <path d="M15 31 L19 36 L23 31 Z" fill="#FF5B1F" stroke="#14161C" strokeWidth="0.35" />
        </svg>
      </motion.span>
    </motion.span>
  );
}