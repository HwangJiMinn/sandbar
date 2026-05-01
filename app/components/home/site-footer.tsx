import { motion } from 'motion/react';

import { Logo } from '~/components/ui/logo';

const FOOTER_LINKS = [
  { label: '이용약관', href: '/terms' },
  { label: '개인정보처리방침', href: '/privacy' },
  { label: '문의하기', href: '/contact' },
];

export function SiteFooter() {
  return (
    <motion.footer
      className="border-t border-border/50 bg-secondary/20"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.6 }}
    >
      <div className="mx-auto max-w-7xl px-4 py-10">
        <motion.div
          className="flex flex-col items-center gap-4 text-center"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={{
            show: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
          }}
        >
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 10 },
              show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
            }}
          >
            <Logo className="h-25 w-auto" />
          </motion.div>

          <motion.p
            className="max-w-sm text-xs leading-relaxed text-foreground/40"
            variants={{
              hidden: { opacity: 0, y: 8 },
              show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
            }}
          >
            본 서비스의 운세 콘텐츠는 오락 및 참고 목적으로 제공되며, 중요한 결정의 근거로
            삼지 마세요.
          </motion.p>

          <motion.div
            className="flex gap-4 text-xs text-foreground/40"
            variants={{
              hidden: { opacity: 0 },
              show: { opacity: 1, transition: { staggerChildren: 0.07 } },
            }}
          >
            {FOOTER_LINKS.map((link) => (
              <motion.a
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-foreground/70"
                variants={{
                  hidden: { opacity: 0, y: 6 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
                }}
                whileHover={{ y: -1 }}
              >
                {link.label}
              </motion.a>
            ))}
          </motion.div>

          <motion.p
            className="text-xs text-foreground/30"
            variants={{
              hidden: { opacity: 0 },
              show: { opacity: 1, transition: { duration: 0.4 } },
            }}
          >
            © 2026 운결. All rights reserved.
          </motion.p>
        </motion.div>
      </div>
    </motion.footer>
  );
}
