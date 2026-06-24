import { useEffect } from 'react';

/**
 * Dynamically updates the <link rel="manifest"> href so each portal
 * (user / recruiter / admin) presents as a distinct installable PWA.
 * Each has a different `id` and `start_url` in its manifest so browsers
 * treat them as separate apps that can be installed simultaneously.
 */
export function useManifest(href: string) {
  useEffect(() => {
    let link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'manifest';
      document.head.appendChild(link);
    }
    const previous = link.href;
    link.href = href;
    return () => {
      if (link) link.href = previous;
    };
  }, [href]);
}
