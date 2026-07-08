import ThemeSwitch from './theme-switch';
import { Button } from './button';
import { auth } from '@/app/lib/auth';
import { redirect } from 'next/navigation';
import { signOut } from '@/app/lib/auth';
import { HomeIcon, BookOpenIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

export async function TopBar() {
  const session = await auth();

  return (
    <div
      className={
        'sticky top-0 z-50 flex h-14 w-full items-center justify-between bg-gray-100 px-4 py-2 shadow dark:bg-gray-800'
      }
    >
      <div className="flex items-center space-x-4">
        <Link href="/" className="flex items-center mr-4">
          <HomeIcon className="h-5 w-5" /> {/* Adjust styling as needed */}
        </Link>
        <Link href="/dictionary" className="flex items-center">
          <BookOpenIcon className="h-5 w-5" />
        </Link>
        <Link href="/profile" className="flex items-center">
          <UserCircleIcon className="h-5 w-5" />
        </Link>
        <ThemeSwitch></ThemeSwitch>
      </div>

      <div className="flex">
        <div className="flex items-center mr-3">{session?.user ? session?.user?.name : ''}</div>
        <form
          action={async () => {
            'use server';
            if (!session?.user) redirect('/login');
            else await signOut();
          }}
        >
          <Button>{!session?.user ? 'login' : 'sign out'}</Button>
        </form>
      </div>
    </div>
  );
}
