"use client";

import { Home, Search, BookOpen, Headphones, Clock } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { name: "Home", icon: Home, path: "/" },
    { name: "Search", icon: Search, path: "/search" },
    { name: "Browse", icon: BookOpen, path: "/browse/scripture" },
    { name: "Listening", icon: Headphones, path: "/listening" },
    { name: "History", icon: Clock, path: "/history" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className="max-w-md mx-auto">
        {/* Glassmorphism Background */}
        <div className="border-t border-white/5 pb-[env(safe-area-inset-bottom,8px)] pt-1.5 px-4" style={{ background: 'rgba(10, 10, 10, 1)', backdropFilter: 'blur(16px)' }}>
          <div className="flex justify-between items-center">
            {navItems.map((item) => {
              const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.path}
                  className="flex flex-col items-center gap-1 p-2 group transition-all"
                >
                  <Icon
                    size={22}
                    strokeWidth={isActive ? 2.5 : 1.5}
                    className={`transition-colors duration-300 ${
                      isActive
                        ? "text-[var(--accent)]"
                        : "text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]"
                    }`}
                  />
                  <span
                    className={`text-[10px] font-medium tracking-wide transition-colors ${
                      isActive
                        ? "text-[var(--accent)]"
                        : "text-[var(--text-tertiary)]"
                    }`}
                  >
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
