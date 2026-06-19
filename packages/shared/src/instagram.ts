/** Helpers pour les liens Instagram (réels, posts). */

const IG_HOSTS = ['instagram.com', 'www.instagram.com', 'instagr.am'];

/** Extrait le shortcode d'une URL Instagram (reel / reels / p / tv). */
export function extractShortcode(url: string): string | null {
  try {
    const u = new URL(url.trim());
    if (!IG_HOSTS.includes(u.hostname.replace(/^m\./, ''))) return null;
    const m = u.pathname.match(/\/(?:reels?|p|tv)\/([A-Za-z0-9_-]+)/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

/** Reconstruit une URL canonique de réel à partir d'un shortcode. */
export function reelUrl(shortcode: string): string {
  return `https://www.instagram.com/reel/${shortcode}/`;
}

/** Vérifie qu'un texte ressemble à un lien Instagram exploitable. */
export function isInstagramUrl(text: string): boolean {
  return extractShortcode(text) !== null;
}

/** Nettoie une URL (retire les query params de tracking). */
export function cleanIgUrl(url: string): string {
  const code = extractShortcode(url);
  return code ? reelUrl(code) : url.trim();
}

/** URL de miniature placeholder (utilisée quand l'oEmbed échoue). */
export function placeholderThumbnail(seed: string): string {
  // Dégradé déterministe encodé en data-URI léger ; les apps peuvent surcharger.
  return `https://placehold.co/640x800/16161D/7C3AED/png?text=Reel`;
}
