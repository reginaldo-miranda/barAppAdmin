import { Redirect } from 'expo-router';

export default function IndexScreen() {
  // Por enquanto, sempre redireciona para login
  return <Redirect href="/login" />;
}