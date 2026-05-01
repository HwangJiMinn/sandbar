import { motion } from 'motion/react';
import { Link } from 'react-router';

import type { Section, SectionItem } from './sections-data';

// ─── Badge ────────────────────────────────────────────────

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wider ${color}`}
    >
      {label}
    </span>
  );
}

// ─── ContentCard ──────────────────────────────────────────

function ContentCard({
  emoji,
  title,
  desc,
  badge,
  badgeColor,
  href,
}: SectionItem & { badgeColor: string }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20, scale: 0.95 },
        show: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
        },
      }}
      whileHover={{ y: -4, scale: 1.02, transition: { duration: 0.18 } }}
      whileTap={{ scale: 0.98 }}
    >
      <Link
        to={href}
        className="group relative flex cursor-pointer flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm transition-colors duration-200 hover:border-white/25 hover:bg-white/10 hover:shadow-lg sm:p-5"
      >
        <div className="flex items-start justify-between">
          <motion.span
            className="text-3xl"
            whileHover={{ rotate: [0, -10, 10, 0], transition: { duration: 0.4 } }}
          >
            {emoji}
          </motion.span>
          {badge && <Badge label={badge} color={badgeColor} />}
        </div>
        <div>
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-white/55">{desc}</p>
        </div>
        <div className="mt-auto flex items-center text-xs text-white/40 transition-colors group-hover:text-white/70">
          <span>바로가기</span>
          <motion.span
            className="ml-1"
            animate={{ x: [0, 3, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            →
          </motion.span>
        </div>
      </Link>
    </motion.div>
  );
}

// ─── ContentSection ───────────────────────────────────────

export function ContentSection({
  id,
  title,
  subtitle,
  color,
  badgeColor,
  items,
}: Section) {
  return (
    <motion.section
      id={id}
      className="w-full scroll-mt-20"
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-80px' }}
      variants={{ show: { transition: { staggerChildren: 0.07 } } }}
    >
      {/* 헤더 */}
      <motion.div
        className="mb-6 flex items-center gap-4"
        variants={{
          hidden: { opacity: 0, x: -20 },
          show: {
            opacity: 1,
            x: 0,
            transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
          },
        }}
      >
        <div className={`h-10 w-1.5 rounded-full bg-gradient-to-b ${color}`} />
        <div>
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
          <p className="text-sm text-foreground/50">{subtitle}</p>
        </div>
      </motion.div>

      {/* 카드 그리드 */}
      <motion.div
        variants={{
          hidden: { opacity: 0, y: 12 },
          show: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
          },
        }}
        className={`rounded-3xl bg-gradient-to-br p-0.5 ${color}`}
      >
        <div className="rounded-[calc(1.5rem-2px)] bg-background/90 p-6 dark:bg-background/80">
          <motion.div
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
            variants={{
              show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
            }}
          >
            {items.map((item) => (
              <ContentCard key={item.href} {...item} badgeColor={badgeColor} />
            ))}
          </motion.div>
        </div>
      </motion.div>
    </motion.section>
  );
}
