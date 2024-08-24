import ThemeSwitch from "./theme-switch"
import { Button } from "./button";
import { auth } from "@/auth"
import { redirect } from 'next/navigation'
import { signOut } from "@/auth";
import { HomeIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

export async function TopBar() {
  const session = await auth();

  return (
    <div
      className={ "fixed px-4 py-2 w-screen flex justify-between items-center h-14 z-50 bg-gray-100 dark:bg-gray-800 shadow" }
    >
      <div className="flex items-center space-x-4">
        <Link href="/" className="flex items-center mr-4">
          <HomeIcon className="h-5 w-5" /> {/* Adjust styling as needed */}
        </Link>
        <ThemeSwitch></ThemeSwitch>
      </div>
      
      <div className="flex">
        <div className="flex items-center mr-3">{session?.user? session?.user?.name : ""}</div>
        <form action={async () => {
          "use server"
          if (!session?.user) redirect('/login');
          else await signOut()
        }}>
          <Button>
            {!session?.user? "login" : "sign out"}
          </Button>
        </form>
      </div>
    </div>
    )
}