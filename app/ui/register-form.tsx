'use client';

import { KeyIcon, ExclamationCircleIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { ArrowRightIcon } from '@heroicons/react/20/solid';
import Link from 'next/link';
import { Button } from './button';
import { useFormState } from 'react-dom';
import { registerUser } from '@/app/lib/actions';

export default function RegisterForm() {
  const [state, formAction, isPending] = useFormState(registerUser, undefined);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="redirectTo" value="/" />
      <div className="flex-1 rounded-lg bg-gray-50 px-6 pb-4 pt-8 dark:bg-zinc-800">
        <h1 className="mb-3 text-center text-2xl light:text-black">Create account</h1>
        <p className="mb-4 text-center text-sm text-gray-500 dark:text-gray-300">
          Just pick a name and password. No email setup needed.
        </p>
        <div className="w-full">
          <div>
            <label className="mb-3 mt-5 block text-xs font-medium light:text-gray-900" htmlFor="username">
              Name
            </label>
            <div className="relative">
              <input
                className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500 dark:text-black"
                id="username"
                type="text"
                name="username"
                placeholder="e.g. David"
                autoComplete="username"
                required
                maxLength={40}
              />
              <UserCircleIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
            </div>
            {state?.errors?.username?.map((error) => (
              <p className="mt-2 text-sm text-red-500" key={error}>
                {error}
              </p>
            ))}
          </div>
          <div className="mt-4">
            <label className="mb-3 mt-5 block text-xs font-medium light:text-gray-900" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <input
                className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500 dark:text-black"
                id="password"
                type="password"
                name="password"
                placeholder="At least 4 characters"
                autoComplete="new-password"
                required
                minLength={4}
                maxLength={100}
              />
              <KeyIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
            </div>
            {state?.errors?.password?.map((error) => (
              <p className="mt-2 text-sm text-red-500" key={error}>
                {error}
              </p>
            ))}
          </div>
        </div>
        <Button className="mt-4 w-full" aria-disabled={isPending}>
          Create account <ArrowRightIcon className="ml-auto h-5 w-5 text-gray-50" />
        </Button>
        <div className="flex min-h-8 items-end space-x-1" aria-live="polite" aria-atomic="true">
          {state?.message && (
            <>
              <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
              <p className="text-sm text-red-500">{state.message}</p>
            </>
          )}
        </div>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-300">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-blue-600 hover:underline dark:text-blue-400">
            Log in
          </Link>
        </p>
      </div>
    </form>
  );
}
