import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useRef, type RefObject } from 'react'

gsap.registerPlugin(ScrollTrigger)

function prefersReducedMotion (): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function useGsapReveal<T extends HTMLElement> (): RefObject<T | null> {
  const ref = useRef<T>(null)

  useGSAP(
    () => {
      const el = ref.current
      if (!el || prefersReducedMotion()) return

      const targets = el.querySelectorAll('[data-reveal]')
      if (targets.length === 0) return

      gsap.fromTo(
        targets,
        { y: 28, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.65,
          stagger: 0.07,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 82%',
            once: true
          }
        }
      )
    },
    { scope: ref }
  )

  return ref
}

export function useGsapHeroImage (selector: string): RefObject<HTMLElement | null> {
  const ref = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const wrap = ref.current
      if (!wrap || prefersReducedMotion()) return

      const img = wrap.querySelector(selector)
      if (!img) return

      gsap.fromTo(
        img,
        { scale: 0.82, opacity: 0.55, filter: 'grayscale(40%) contrast(1.1)' },
        {
          scale: 1,
          opacity: 0.92,
          filter: 'grayscale(20%) contrast(1.15)',
          ease: 'none',
          scrollTrigger: {
            trigger: wrap,
            start: 'top 75%',
            end: 'bottom 25%',
            scrub: 1
          }
        }
      )
    },
    { scope: ref }
  )

  return ref
}

export function useGsapPinSplit (
  pinSelector: string,
  scrollSelector: string
): RefObject<HTMLElement | null> {
  const ref = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const section = ref.current
      if (!section || prefersReducedMotion()) return
      if (window.matchMedia('(max-width: 1024px)').matches) return

      const pinEl = section.querySelector(pinSelector)
      const scrollEl = section.querySelector(scrollSelector)
      if (!pinEl || !scrollEl) return

      ScrollTrigger.create({
        trigger: section,
        start: 'top 120px',
        end: () => `+=${(scrollEl as HTMLElement).offsetHeight - 80}`,
        pin: pinEl,
        pinSpacing: false,
        anticipatePin: 1
      })
    },
    { scope: ref }
  )

  return ref
}
