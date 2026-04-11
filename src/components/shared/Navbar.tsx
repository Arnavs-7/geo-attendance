"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MapPin, LayoutDashboard, Users, ClipboardList, Settings, User, LogOut, PieChart } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const { userProfile, isAdmin } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const navItems = isAdmin
    ? [
        { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
        { label: "Employees", href: "/admin/employees", icon: Users },
        { label: "Attendance", href: "/admin/attendance", icon: ClipboardList },
        { label: "Reports", href: "/admin/reports", icon: PieChart },
        { label: "Settings", href: "/admin/settings", icon: Settings },
      ]
    : [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { label: "Profile", href: "/profile", icon: User },
      ];

  return (
    <nav className="sticky top-0 z-50 w-full glass border-b border-white/[0.06]">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:bg-primary/20 transition-colors">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <span className="hidden sm:inline-block font-bold text-lg tracking-tight">
              Geo<span className="text-primary">Attendance</span>
            </span>
          </Link>
          <div className="hidden md:flex ml-8 gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                  pathname === item.href
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full hover:bg-white/[0.06]">
                <Avatar className="h-9 w-9 border border-primary/20">
                  <AvatarFallback className="bg-primary/10 text-primary uppercase text-sm font-semibold">
                    {userProfile?.name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 glass-card rounded-xl border-white/[0.08]" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{userProfile?.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">{userProfile?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/[0.06]" />
              {/* Mobile nav items */}
              <div className="md:hidden">
                {navItems.map((item) => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link href={item.href} className="cursor-pointer">
                      <item.icon className="mr-2 h-4 w-4" />
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator className="bg-white/[0.06]" />
              </div>
              <DropdownMenuItem asChild>
                <Link href="/profile" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="text-red-400 cursor-pointer focus:text-red-400 focus:bg-red-500/10">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}
