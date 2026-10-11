"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const container = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  },
};

export function BlogPostDetailShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={container}
      className="space-y-6"
    >
      <motion.div variants={item}>
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 border border-[var(--cw-border)] bg-[var(--cw-panel)] px-4 py-2.5 text-[var(--cw-ink)] transition-all duration-200 hover:border-[var(--cw-accent)] hover:bg-[var(--cw-accent)] hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          지식 목록
        </Link>
      </motion.div>
      <motion.div variants={item}>
        {children}
      </motion.div>
    </motion.div>
  );
}
