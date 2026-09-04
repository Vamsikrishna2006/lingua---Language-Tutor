import { useEffect, useState } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";

export function MotionCursor() {
  const prefersLessMotion = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const [interactive, setInteractive] = useState(false);
  const pointerX = useMotionValue(-50);
  const pointerY = useMotionValue(-50);
  const x = useSpring(pointerX, { stiffness: 650, damping: 42, mass: 0.18 });
  const y = useSpring(pointerY, { stiffness: 650, damping: 42, mass: 0.18 });

  useEffect(() => {
    const supportsHover = window.matchMedia(
      "(hover: hover) and (pointer: fine)",
    ).matches;
    if (!supportsHover || prefersLessMotion) return;

    document.documentElement.classList.add("motion-cursor-active");

    function followPointer(event: PointerEvent) {
      pointerX.set(event.clientX);
      pointerY.set(event.clientY);
      setVisible(true);
      const element = event.target as Element | null;
      setInteractive(
        Boolean(
          element?.closest(
            "button, a, select, [role='button'], [role='option']",
          ),
        ),
      );
    }

    function hidePointer() {
      setVisible(false);
    }

    window.addEventListener("pointermove", followPointer);
    document.documentElement.addEventListener("pointerleave", hidePointer);

    return () => {
      document.documentElement.classList.remove("motion-cursor-active");
      window.removeEventListener("pointermove", followPointer);
      document.documentElement.removeEventListener("pointerleave", hidePointer);
    };
  }, [pointerX, pointerY, prefersLessMotion]);

  if (prefersLessMotion) return null;

  return (
    <motion.div
      className="motion-cursor"
      aria-hidden="true"
      style={{ x, y }}
      animate={{
        opacity: visible ? 1 : 0,
        scale: interactive ? 2.4 : 1,
        backgroundColor: interactive ? "rgba(244, 240, 230, 0.15)" : "#f39b7a",
      }}
      transition={{
        opacity: { duration: 0.3 },
        scale: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
      }}
    />
  );
}
