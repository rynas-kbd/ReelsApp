import { Redirect } from 'expo-router';

// Point d'entrée : la redirection réelle (auth vs tabs) est gérée par le
// RootNavigator dans _layout.tsx ; on pointe par défaut vers la bibliothèque.
export default function Index() {
  return <Redirect href="/(tabs)/library" />;
}
