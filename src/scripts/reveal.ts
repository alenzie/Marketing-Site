import { animate, inView, stagger } from 'motion';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const REVEAL_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

document.documentElement.classList.add('js-ready');

if (!prefersReducedMotion) {
  // Single-element reveals
  document.querySelectorAll<HTMLElement>('[data-reveal]:not([data-reveal-group] [data-reveal])').forEach((el) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(16px)';
    el.style.willChange = 'opacity, transform';
    inView(el, () => {
      animate(
        el,
        { opacity: [0, 1], transform: ['translateY(16px)', 'translateY(0)'] },
        { duration: 0.6, ease: REVEAL_EASE }
      );
      return () => {}; // run once
    }, { amount: 0.3 });
  });

  // Staggered group reveals: direct children animate with 80ms offset
  document.querySelectorAll<HTMLElement>('[data-reveal-group]').forEach((group) => {
    const children = Array.from(group.children) as HTMLElement[];
    children.forEach((child) => {
      child.style.opacity = '0';
      child.style.transform = 'translateY(16px)';
      child.style.willChange = 'opacity, transform';
    });
    inView(group, () => {
      animate(
        children,
        { opacity: [0, 1], transform: ['translateY(16px)', 'translateY(0)'] },
        { duration: 0.6, ease: REVEAL_EASE, delay: stagger(0.08) }
      );
      return () => {};
    }, { amount: 0.2 });
  });
}
