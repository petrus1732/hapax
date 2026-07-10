import RegisterForm from '../ui/register-form';
import { auth } from '@/app/lib/auth';
import { redirect } from 'next/navigation';

export default async function RegisterPage() {
  const session = await auth();
  if (session?.user) redirect('/');

  return (
    <main className="flex min-h-dvh items-center justify-center">
      <div className="relative mx-auto flex w-full max-w-[400px] flex-col space-y-2.5 p-4 md:-mt-32">
        <RegisterForm />
      </div>
    </main>
  );
}
