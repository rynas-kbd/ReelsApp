import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Suppression des données — ReelVault',
  description: 'Demandez la suppression de vos données ReelVault liées à Instagram.',
};

interface Props {
  searchParams: Promise<{ code?: string }>;
}

export default async function DataDeletionPage({ searchParams }: Props) {
  const { code } = await searchParams;

  return (
    <div className="min-h-screen bg-bg px-4 py-16">
      <div className="mx-auto max-w-2xl">
        <div className="mb-10">
          <Link
            href="/"
            className="text-sm text-text-secondary hover:text-text transition-colors"
          >
            ← Retour à ReelVault
          </Link>
        </div>

        <h1 className="font-display text-4xl font-bold text-text mb-4">
          Suppression des données
        </h1>

        {code ? (
          <ConfirmationView code={code} />
        ) : (
          <RequestView />
        )}

        <div className="mt-12 pt-8 border-t border-border flex gap-6 text-sm text-text-secondary">
          <Link href="/privacy" className="hover:text-text transition-colors">
            Politique de confidentialité
          </Link>
          <Link href="/terms" className="hover:text-text transition-colors">
            {"Conditions d'utilisation"}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ConfirmationView({ code }: { code: string }) {
  return (
    <div className="mt-6 space-y-6">
      <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-6">
        <p className="text-green-600 dark:text-green-400 font-semibold text-lg mb-2">
          Demande de suppression enregistrée
        </p>
        <p className="text-text-secondary text-sm">
          Vos données Instagram associées à ReelVault seront supprimées dans les{' '}
          <strong className="text-text">30 jours</strong>.
        </p>
        <p className="text-text-secondary text-sm mt-3">
          Code de confirmation :{' '}
          <code className="font-mono bg-surface px-2 py-0.5 rounded text-text">{code}</code>
        </p>
      </div>

      <div className="text-text-secondary text-sm space-y-2">
        <p>Les données suivantes seront supprimées :</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Connexion Instagram (identifiant de compte, jeton d'accès)</li>
          <li>Réels sauvegardés et leurs métadonnées</li>
          <li>Miniatures hébergées</li>
        </ul>
        <p className="pt-2">
          Pour toute question :{' '}
          <a href="mailto:rynaskebdi@gmail.com" className="text-accent underline">
            rynaskebdi@gmail.com
          </a>
        </p>
      </div>
    </div>
  );
}

function RequestView() {
  return (
    <div className="mt-6 space-y-6">
      <p className="text-text-secondary leading-relaxed">
        Conformément aux exigences de Meta et au RGPD, vous pouvez demander la suppression de
        toutes vos données ReelVault associées à votre compte Instagram.
      </p>

      <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
        <h2 className="font-semibold text-text">Comment supprimer vos données ?</h2>

        <div className="space-y-3 text-sm text-text-secondary">
          <p>
            <strong className="text-text">Option 1 — Via l'Application</strong> (recommandé)
            <br />
            Connectez-vous à ReelVault, allez dans{' '}
            <strong>Paramètres → Compte → Supprimer mon compte</strong>. Toutes vos données sont
            supprimées immédiatement.
          </p>

          <p>
            <strong className="text-text">Option 2 — Via Instagram/Facebook</strong>
            <br />
            Révoquez l'accès de ReelVault depuis{' '}
            <strong>Instagram → Paramètres → Applications et sites web</strong>. Meta notifie
            automatiquement ReelVault, qui supprime vos données dans les 30 jours.
          </p>

          <p>
            <strong className="text-text">Option 3 — Par e-mail</strong>
            <br />
            Envoyez un e-mail à{' '}
            <a href="mailto:rynaskebdi@gmail.com" className="text-accent underline">
              rynaskebdi@gmail.com
            </a>{' '}
            avec votre nom d'utilisateur Instagram. Nous traiterons votre demande sous 30 jours.
          </p>
        </div>
      </div>

      <div className="text-text-secondary text-sm space-y-2">
        <p className="font-medium text-text">Données concernées par la suppression :</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Connexion Instagram (identifiant de compte, jeton d'accès OAuth)</li>
          <li>Réels sauvegardés et leurs métadonnées (URL, catégorie, titre)</li>
          <li>Miniatures hébergées dans notre stockage</li>
          <li>Profil utilisateur et préférences</li>
          <li>Votes et historique d'utilisation</li>
        </ul>
      </div>
    </div>
  );
}
