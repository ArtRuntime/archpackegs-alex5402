import { redirect } from 'next/navigation';

export default function Home() {
  // Simple redirect to the dashboard. Middleware or dashboard page will handle auth checking.
  redirect('/dashboard');
}
