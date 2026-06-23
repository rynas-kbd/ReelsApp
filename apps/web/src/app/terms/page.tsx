import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: "Conditions d'utilisation — ReelVault",
  description: "Conditions générales d'utilisation de ReelVault.",
};

export default function TermsPage() {
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
          {"Conditions d'utilisation"}
        </h1>
        <p className="text-text-secondary text-sm mb-10">
          Dernière mise à jour : 23 juin 2026
        </p>

        <div className="space-y-8 text-text">

          <Section title="1. Objet">
            <p>
              Les présentes conditions régissent l'accès et l'utilisation de ReelVault
              (« le Service »), une application permettant de sauvegarder et d'organiser
              automatiquement des Reels Instagram via l'API Meta.
            </p>
            <p>
              En créant un compte ou en utilisant le Service, vous acceptez sans réserve ces
              conditions.
            </p>
          </Section>

          <Section title="2. Description du Service">
            <p>ReelVault vous permet de :</p>
            <ul>
              <li>Connecter votre compte Instagram professionnel ou créateur via OAuth.</li>
              <li>
                Capturer automatiquement les Reels que vous vous partagez en message privé depuis
                votre compte principal.
              </li>
              <li>
                Classer ces Reels par catégorie grâce à l'intelligence artificielle (Google
                Gemini).
              </li>
              <li>Consulter, filtrer et rechercher votre bibliothèque de Reels.</li>
            </ul>
          </Section>

          <Section title="3. Conditions d'accès">
            <ul>
              <li>Vous devez avoir au moins 13 ans pour utiliser le Service.</li>
              <li>
                Vous devez posséder un compte Instagram actif (professionnel ou créateur) pour
                bénéficier de la capture automatique.
              </li>
              <li>
                Vous êtes responsable de la confidentialité de vos identifiants de connexion.
              </li>
            </ul>
          </Section>

          <Section title="4. Utilisation acceptable">
            <p>Vous vous engagez à :</p>
            <ul>
              <li>
                Utiliser le Service uniquement pour sauvegarder vos propres Reels ou ceux dont
                vous avez le droit de conserver une copie.
              </li>
              <li>
                Ne pas tenter de contourner les mesures de sécurité ou les limites de
                l'API Instagram.
              </li>
              <li>
                Ne pas utiliser le Service à des fins illégales, abusives ou contraires aux{' '}
                <a
                  href="https://help.instagram.com/581066165581870"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent underline"
                >
                  Conditions d'utilisation d'Instagram
                </a>
                .
              </li>
            </ul>
          </Section>

          <Section title="5. Propriété intellectuelle">
            <p>
              ReelVault ne revendique aucun droit de propriété sur les Reels que vous sauvegardez.
              Vous conservez tous vos droits sur votre contenu.
            </p>
            <p>
              Le code source, le design et les fonctionnalités propres à ReelVault sont la
              propriété de leurs auteurs. Toute reproduction non autorisée est interdite.
            </p>
          </Section>

          <Section title="6. Disponibilité et modifications">
            <p>
              Nous faisons de notre mieux pour maintenir le Service disponible, mais ne garantissons
              pas une disponibilité sans interruption. Nous nous réservons le droit de modifier,
              suspendre ou interrompre tout ou partie du Service à tout moment, avec ou sans
              préavis.
            </p>
          </Section>

          <Section title="7. Limitation de responsabilité">
            <p>
              Le Service est fourni « en l'état ». ReelVault ne saurait être tenu responsable de
              la perte de données, d'une interruption de service, ou de tout dommage indirect
              découlant de l'utilisation ou de l'impossibilité d'utiliser le Service.
            </p>
            <p>
              ReelVault n'est pas affilié à Meta Platforms, Inc. L'utilisation de l'API Instagram
              est soumise aux politiques de Meta.
            </p>
          </Section>

          <Section title="8. Résiliation">
            <p>
              Vous pouvez supprimer votre compte à tout moment depuis les paramètres de
              l'Application. Toutes vos données seront supprimées conformément à notre{' '}
              <Link href="/privacy" className="text-accent underline">
                politique de confidentialité
              </Link>
              .
            </p>
            <p>
              Nous nous réservons le droit de suspendre ou supprimer un compte en cas de violation
              de ces conditions.
            </p>
          </Section>

          <Section title="9. Droit applicable">
            <p>
              Les présentes conditions sont régies par le droit français. En cas de litige, les
              parties s'efforceront de trouver une solution amiable avant tout recours judiciaire.
            </p>
          </Section>

          <Section title="10. Contact">
            <p>
              Pour toute question :{' '}
              <a href="mailto:rynaskebdi@gmail.com" className="text-accent underline">
                rynaskebdi@gmail.com
              </a>
            </p>
          </Section>
        </div>

        <div className="mt-12 pt-8 border-t border-border flex gap-6 text-sm text-text-secondary">
          <Link href="/privacy" className="hover:text-text transition-colors">
            Politique de confidentialité
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
