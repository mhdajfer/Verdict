"use client";

import { motion } from "framer-motion";

// template.tsx remounts on every navigation, so this gives a consistent
// fade+slide enter transition across the whole app (200-300ms, one easing).
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
