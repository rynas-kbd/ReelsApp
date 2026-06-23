import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Politique de confidentialité — ReelVault',
  description: 'Comment ReelVault collecte, utilise et protège vos données personnelles.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-bg px-4 py-16">
      <div className="mx-auto max-w-3xl">
        <div className="mb-10">
          <Link
            href="/"
            className="text-sm text-text-secondary hover:text-text transition-colors"
          >
            ← Retour à ReelVault
          </Link>
        </div>

        <h1 className="font-display text-4xl font-bold text-text mb-2">
          Politique de confidentialité
        </h1>
        <p className="text-text-secondary text-sm mb-10">
          Dernière mise à jour : 23 juin 2026
        </p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-text">

          <Section title="1. Présentation">
            <p>
              ReelVault (« l'Application ») est un service permettant de sauvegarder, classer et
              retrouver automatiquement les Reels Instagram que vous vous partagez à vous-même en
              message privé. Cette politique décrit quelles données sont collectées, comment elles
              sont utilisées et comment vous pouvez les contrôler.
            </p>
            <p>
              Responsable du traitement : ReelVault, contact{' '}
              <a href="mailto:rynaskebdi@gmail.com" className="text-accent underline">
                rynaskebdi@gmail.com
              </a>
              .
            </p>
          </Section>

          <Section title="2. Données collectées">
            <ul>
              <li>
                <strong>Données de compte Instagram</strong> : identifiant de compte
                (<code>ig_account_id</code>), nom d'utilisateur, jeton d'accès OAuth (chiffré au
                repos dans notre base de données).
              </li>
              <li>
                <strong>Réels sauvegardés</strong> : URL du Reel, miniature hébergée en stockage
                privé, titre, catégorie, date d'ajout.
              </li>
              <li>
                <strong>Données de profil</strong> : réponses à l'onboarding (centres d'intérêt,
                objectifs), votes sur les réels (1–5 étoiles).
              </li>
              <li>
                <strong>Données techniques</strong> : adresse e-mail, identifiant Supabase Auth,
                logs d'erreurs anonymisés.
              </li>
            </ul>
          </Section>

          <Section title="3. Finalités du traitement">
            <ul>
              <li>Authentification et maintien de votre session.</li>
              <li>Capture automatique des Reels partagés via Instagram Messaging.</li>
              <li>Classification par intelligence artificielle (Gemini).</li>
              <li>Génération de digest personnalisés.</li>
              <li>Amélioration et maintenance du service.</li>
            </ul>
          </Section>

          <Section title="4. Bases légales">
            <p>
              Le traitement repose sur l'exécution du contrat (fourniture du service) et votre
              consentement explicite donné lors de la connexion de votre compte Instagram via OAuth.
            </p>
          </Section>

          <Section title="5. Partage des données">
            <p>
              Vos données ne sont jamais vendues ni louées. Elles sont partagées uniquement avec :
            </p>
            <ul>
              <li>
                <strong>Supabase</strong> – hébergement de la base de données et de
                l'authentification (serveurs EU).
              </li>
              <li>
                <strong>Meta / Instagram</strong> – échange OAuth et réception des webhooks
                Messaging.
              </li>
              <li>
                <strong>Google Gemini</strong> – classification des réels (contenu textuel
                uniquement, sans identifiant personnel).
              </li>
              <li>
                <strong>RapidAPI / Scraper</strong> – enrichissement des métadonnées des réels
                (URL uniquement).
              </li>
            </ul>
          </Section>

          <Section title="6. Durée de conservation">
            <p>
              Vos données sont conservées tant que votre compte ReelVault est actif. Elles sont
              supprimées intégralement dans les 30 jours suivant la suppression de votre compte ou
              votre demande de suppression.
            </p>
          </Section>

          <Section title="7. Vos droits">
            <p>
              Conformément au RGPD, vous disposez des droits d'accès, de rectification, de
              suppression, de portabilité et d'opposition. Pour exercer ces droits, contactez-nous
              à{' '}
              <a href="mailto:rynaskebdi@gmail.com" className="text-accent underline">
                rynaskebdi@gmail.com
              </a>{' '}
              ou utilisez le bouton « Supprimer mes données » dans les paramètres de l'Application.
            </p>
          </Section>

          <Section title="8. Suppression des données Instagram">
            <p>
              Conformément aux exigences de Meta, si vous révoquez l'accès de ReelVault depuis vos
              paramètres Instagram ou Facebook, vos données de connexion Instagram et vos réels
              associés sont supprimés automatiquement dans les 30 jours. Vous pouvez également
              initier cette suppression via{' '}
              <Link href="/data-deletion" className="text-accent underline">
                cette page
              </Link>
              .
            </p>
          </Section>

          <Section title="9. Sécurité">
            <p>
              Les jetons d'accès Instagram sont stockés chiffrés. Les communications entre votre
              navigateur et nos serveurs utilisent TLS. L'accès à la base de données est restreint
              par Row Level Security (RLS) Supabase : chaque utilisateur ne voit que ses propres
              données.
            </p>
          </Section>

          <Section title="10. Cookies">
            <p>
              L'Application utilise un cookie de session (HttpOnly, Secure, SameSite=Lax)
              uniquement pour maintenir votre authentification. Aucun cookie publicitaire ou
              analytique tiers n'est utilisé.
            </p>
          </Section>

          <Section title="11. Modifications">
            <p>
              Cette politique peut être mise à jour. En cas de changement significatif, nous vous
              en informerons par e-mail ou via l'Application. La date de dernière mise à jour est
              indiquée en haut de cette page.
            </p>
          </Section>

          <Section title="12. Contact">
            <p>
              Pour toute question relative à cette politique :{' '}
              <a href="mailto:rynaskebdi@gmail.com" className="text-accent underline">
                rynaskebdi@gmail.com
              </a>
            </p>
          </Section>
        </div>

        <div className="mt-12 pt-8 border-t border-border flex gap-6 text-sm text-text-secondary">
          <Link href="/terms" className="hover:text-text transition-colors">
            Conditions d'utilisation
          </Link>
          <Link href="/data-deletion" className="hover:text-text transition-colors">
            Suppression des données
          </Link>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-text mb-3">{title}</h2>
      <div className="space-y-3 text-text-secondary leading-relaxed">{children}</div>
    </section>
  );
}
