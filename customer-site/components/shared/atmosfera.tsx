'use client';

// "Atmosfera" — magazine spread between services and locations.
// 4 photos arranged asymmetrically (one tall, two square, one wide) with
// captions in the editorial eyebrow style. Parallax-on-scroll for the lead photo.

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Photo } from './photo';
import { PHOTOS, GRADIENTS } from '@/lib/photos';
import { RevealOnScroll } from './home-anim';

export function Atmosfera() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  // Lead photo gets a slight parallax — drifts up as section scrolls past.
  const yLead = useTransform(scrollYProgress, [0, 1], ['8%', '-8%']);

  const [a, b, c, d] = PHOTOS.atmosfera;
  const fallbacks = [GRADIENTS.warm, GRADIENTS.earth, GRADIENTS.amber, GRADIENTS.cool];

  return (
    <section ref={ref} className="border-t border-hairline py-32 sm:py-44">
      <div className="editorial">
        <RevealOnScroll>
          <div className="grid lg:grid-cols-12 gap-10 mb-20">
            <div className="lg:col-span-5">
              <div className="eyebrow mb-5">Atmosfera · Mūsų pasaulis</div>
              <h2 className="display text-5xl sm:text-6xl">
                Vieta,{' '}
                <span className="display-italic text-vermillion">kurioje neskubama.</span>
              </h2>
            </div>
            <div className="lg:col-span-5 lg:col-start-8 self-end">
              <p className="text-bone-muted text-lg leading-relaxed">
                Vienas šviesos židinys, sena oda, šukos, gerai galąsti įrankiai.
                Tikras barbershop&apos;as Vilniaus centre — toks, koks turi būti.
              </p>
            </div>
          </div>
        </RevealOnScroll>

        {/* Asymmetric grid: tall lead + 3 supporting photos */}
        <div className="grid grid-cols-12 gap-3 sm:gap-4">
          {/* Lead — tall, left */}
          <RevealOnScroll>
            <motion.div style={{ y: yLead }} className="col-span-12 lg:col-span-7">
              <Photo
                src={a.url}
                fallback={fallbacks[0]}
                alt={a.alt}
                className="aspect-[4/5] lg:aspect-[5/7]"
              />
              <Caption text={a.caption} />
            </motion.div>
          </RevealOnScroll>

          {/* Right column: stack of two */}
          <div className="col-span-12 lg:col-span-5 grid grid-cols-1 gap-3 sm:gap-4">
            <RevealOnScroll delay={0.1}>
              <Photo
                src={b.url}
                fallback={fallbacks[1]}
                alt={b.alt}
                className="aspect-[4/3]"
              />
              <Caption text={b.caption} />
            </RevealOnScroll>
            <RevealOnScroll delay={0.2}>
              <Photo
                src={c.url}
                fallback={fallbacks[2]}
                alt={c.alt}
                className="aspect-[4/3]"
              />
              <Caption text={c.caption} />
            </RevealOnScroll>
          </div>

          {/* Wide bottom — full width */}
          <RevealOnScroll delay={0.3}>
            <div className="col-span-12 mt-1 sm:mt-2">
              <Photo
                src={d.url}
                fallback={fallbacks[3]}
                alt={d.alt}
                className="aspect-[16/7]"
              />
              <Caption text={d.caption} />
            </div>
          </RevealOnScroll>
        </div>
      </div>
    </section>
  );
}

function Caption({ text }: { text: string }) {
  return (
    <div className="mt-3 flex items-center justify-between">
      <span className="eyebrow">{text}</span>
      <span className="eyebrow tabular text-bone-dim">35mm · Vilnius</span>
    </div>
  );
}
