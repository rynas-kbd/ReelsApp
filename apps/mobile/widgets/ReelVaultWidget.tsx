import React from 'react';
import { FlexWidget, ImageWidget, TextWidget } from 'react-native-android-widget';
import { colors, radius } from '@reelvault/design-tokens';

export interface WidgetReel {
  id: string;
  title: string;
  thumbnail_url: string | null;
}

interface Props {
  reels: WidgetReel[];
}

/**
 * Widget écran d'accueil Android — affiche les 3 derniers réels.
 * NB : react-native-android-widget rend une arborescence *déclarative* convertie
 * en RemoteViews natifs. On ne peut PAS utiliser les composants React Native
 * standards (View/Text/Image) ni StyleSheet ici — uniquement les *Widget.
 */
export function ReelVaultWidget({ reels }: Props) {
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: 10,
      }}
      clickAction="OPEN_APP"
    >
      <TextWidget
        text="ReelVault — Derniers réels"
        style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 6 }}
      />
      <FlexWidget style={{ flexDirection: 'row', width: 'match_parent', flexGap: 8 }}>
        {reels.length === 0 ? (
          <TextWidget
            text="Aucun réel pour le moment."
            style={{ fontSize: 12, color: colors.textSecondary }}
          />
        ) : (
          reels.slice(0, 3).map((reel) => (
            <FlexWidget
              key={reel.id}
              style={{ flexDirection: 'column', flex: 1 }}
              clickAction="OPEN_APP"
            >
              {isRemoteImage(reel.thumbnail_url) ? (
                <ImageWidget
                  image={reel.thumbnail_url}
                  imageWidth={90}
                  imageHeight={56}
                  radius={radius.sm}
                  style={{ width: 'match_parent', height: 56 }}
                />
              ) : (
                <FlexWidget
                  style={{
                    height: 56,
                    width: 'match_parent',
                    backgroundColor: colors.surface2,
                    borderRadius: radius.sm,
                  }}
                />
              )}
              <TextWidget
                text={truncate(reel.title, 24)}
                maxLines={2}
                style={{ fontSize: 10, color: colors.textSecondary, marginTop: 4 }}
              />
            </FlexWidget>
          ))
        )}
      </FlexWidget>
    </FlexWidget>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

/** Affine le type pour satisfaire ImageWidgetSource (URL http(s) uniquement). */
function isRemoteImage(
  url: string | null,
): url is `http:${string}` | `https:${string}` {
  return typeof url === 'string' && /^https?:/.test(url);
}
