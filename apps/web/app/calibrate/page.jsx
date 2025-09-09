import { redirect } from 'next/navigation';

export default function CalibrateRedirect() {
  // Preserve legacy URL by redirecting to the new route
  redirect('/ai-workout-plan');
}

