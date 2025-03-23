import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import Link from "next/link";
import Image from "next/image";
import { Button } from "./ui/button";
import { LayoutDashboard } from "lucide-react";

const Header = () => {
  return (
    <div>
      <header>
        <nav>
          <Link href="/">
            <Image
              src={"/logo.png"}
              alt="Logo"
              width={200}
              height={60}
              className="h-12 py-1 w-auto object-contain"
            />
          </Link>
          <div>
            <SignedIn>
              <Link href="/dashboard">
                <Button>
                  <LayoutDashboard className="h-4 w-4 " />
                  Industry insights
                </Button>
              </Link>
            </SignedIn>
          </div>
        </nav>
      </header>

      <SignedOut>
        <SignInButton />
        <SignUpButton />
      </SignedOut>
      <SignedIn>
        <UserButton />
      </SignedIn>
    </div>
  );
};

export default Header;
