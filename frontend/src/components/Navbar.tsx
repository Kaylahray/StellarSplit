import { useState } from "react";
import { NavLink } from "react-router-dom";
import { ROUTES } from "../constants/routes";
import { WalletButton } from "./wallet-button";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageSelector } from "./LanguageSelector";

// Simple icons (you can replace with lucide-react Menu / X later)
const MenuIcon = () => (
  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const CloseIcon = () => (
  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const closeMenu = () => setIsOpen(false);

  return (
    <nav
      className="
        sticky top-0 z-50
        w-full bg-theme/80 backdrop-blur-sm
        border-b border-theme
        mb-6 sm:mb-10
        min-h-[3rem] sm:min-h-[3.5rem]
        [padding-left:env(safe-area-inset-left)]
        [padding-right:env(safe-area-inset-right)]
      "
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-12 sm:h-14 items-center justify-between">

          {/* Mobile hamburger */}
          <div className="flex items-center md:hidden">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md p-2 text-muted-theme hover:text-theme focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              onClick={() => setIsOpen(!isOpen)}
              aria-expanded={isOpen}
            >
              {isOpen ? <CloseIcon /> : <MenuIcon />}
              <span className="sr-only">{isOpen ? "Close main menu" : "Open main menu"}</span>
            </button>
          </div>

          {/* Desktop navigation links */}
          <div className="hidden md:flex items-center gap-1 lg:gap-6">
            {ROUTES.map((route) => (
              <NavLink
                key={route.label}
                to={route.to}
                className={({ isActive }) =>
                  `inline-flex items-center px-3 py-2 text-sm lg:text-base font-medium rounded-md transition-colors
                   focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2
                   [-webkit-tap-highlight-color:transparent]
                   ${isActive
                     ? "text-theme bg-card-theme/70"
                     : "text-muted-theme hover:text-theme hover:bg-card-theme/50"
                   }`
                }
              >
                {route.label}
              </NavLink>
            ))}

            <NavLink
              to="https://github.com/OlufunbiIK/StellarSplit"
              className="inline-flex items-center px-3 py-2 text-sm lg:text-base font-medium rounded-md text-muted-theme hover:text-theme hover:bg-card-theme/50 transition-colors"
            >
              GitHub
            </NavLink>
          </div>

          {/* Desktop-only controls */}
          <div className="hidden md:flex items-center gap-2 sm:gap-4">
            <LanguageSelector />
            <ThemeToggle />
            <WalletButton>
              <span className="hidden sm:inline">Connect Wallet</span>
              <span className="sm:hidden">Connect</span>
            </WalletButton>
          </div>

          {/* Mobile-only: Wallet stays visible */}
          <div className="flex md:hidden items-center gap-3">
            <WalletButton>
              <span className="sm:hidden">Connect</span>
            </WalletButton>
          </div>
        </div>
      </div>

      {/* ── Mobile menu panel ── */}
      <div
        className={`
          md:hidden
          transition-all duration-300 ease-in-out overflow-hidden
          ${isOpen ? "max-h-[80vh] opacity-100" : "max-h-0 opacity-0"}
        `}
      >
        <div className="px-4 pt-2 pb-6 space-y-1.5 bg-card-theme border-b border-theme">
          {/* Navigation items */}
          {ROUTES.map((route) => (
            <NavLink
              key={route.label}
              to={route.to}
              onClick={closeMenu}
              className={({ isActive }) =>
                `block px-4 py-3 rounded-lg text-base font-medium transition-colors
                 ${isActive
                   ? "text-theme bg-card-theme/70"
                   : "text-muted-theme hover:text-theme hover:bg-card-theme/50"
                 }`
              }
            >
              {route.label}
            </NavLink>
          ))}

          <NavLink
            to="/"
            onClick={closeMenu}
            className="block px-4 py-3 rounded-lg text-base font-medium text-muted-theme hover:text-theme hover:bg-card-theme/50 transition-colors"
          >
            GitHub
          </NavLink>

          {/* Settings / toggles */}
          <div className="mt-4 pt-4 border-t border-theme">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm font-medium text-muted-theme">Language</span>
              <LanguageSelector />
            </div>

            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm font-medium text-muted-theme">Theme</span>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}