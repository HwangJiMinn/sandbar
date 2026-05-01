import { type MetaFunction } from 'react-router';

import { AiBanner } from '~/components/home/ai-banner';
import { AiSajuBanner } from '~/components/home/ai-saju-banner';
import { ContentSection } from '~/components/home/content-section';
import { Hero } from '~/components/home/hero';
import { QuickMenu } from '~/components/home/quick-menu';
import { SECTIONS } from '~/components/home/sections-data';

export const meta: MetaFunction = () => [
  { title: '운결 | AI 사주 & 운세' },
  {
    name: 'description',
    content: 'AI가 풀어주는 사주, 운세, 타로, 궁합. 나의 운명을 지금 확인하세요.',
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Hero />
      <QuickMenu />
      <main className="mx-auto max-w-7xl space-y-10 px-4 py-10 sm:space-y-12 sm:py-16">
        <AiSajuBanner />
        {SECTIONS.map((section) => (
          <ContentSection key={section.id} {...section} />
        ))}
        <AiBanner />
      </main>
    </div>
  );
}
