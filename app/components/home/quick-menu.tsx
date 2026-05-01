import { motion } from 'motion/react';
import { Link } from 'react-router';

import { QUICK_MENU } from './sections-data';

export function QuickMenu() {
  return (
    <motion.div
      className="border-y border-border/50 bg-secondary/30"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.0, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="mx-auto max-w-7xl overflow-x-auto px-4 py-3">
        <motion.div
          className="flex items-center gap-2 whitespace-nowrap"
          initial="hidden"
          animate="show"
          variants={{
            show: { transition: { staggerChildren: 0.05, delayChildren: 1.1 } },
          }}
        >
          <motion.span
            className="mr-2 text-xs font-semibold text-foreground/40"
            variants={{
              hidden: { opacity: 0 },
              show: { opacity: 1, transition: { duration: 0.3 } },
            }}
          >
            빠른 메뉴
          </motion.span>
          {QUICK_MENU.map((item) => (
            <motion.div
              key={item.href}
              variants={{
                hidden: { opacity: 0, x: -10, scale: 0.9 },
                show: {
                  opacity: 1,
                  x: 0,
                  scale: 1,
                  transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
                },
              }}
              whileHover={{ scale: 1.08, y: -1 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link
                to={item.href}
                className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-foreground/70 transition-colors hover:border-foreground/30 hover:text-foreground"
              >
                <span>{item.emoji}</span>
                <span>{item.label}</span>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}
