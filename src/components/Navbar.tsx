import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Wifi, ShieldCheck, MessageSquare } from 'lucide-react';
import { VakeelLogo, VakeelWordmark } from './Logo';

const navLinks = [
  { to: '/features', label: 'Features' },
  { to: '/how-it-works', label: 'How it Works' },
  { to: '/vault', label: 'My Vault' },
  { to: '/verify', label: 'Verify', icon: ShieldCheck },
  { to: '/chat', label: 'Ask VAKEEL', icon: MessageSquare },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/85 backdrop-blur-xl">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-7xl">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group shrink-0">
          <VakeelLogo className="w-8 h-9 transition-transform group-hover:scale-105" />
          <VakeelWordmark className="text-xl text-foreground" />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                location.pathname === link.to
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="hidden md:flex items-center gap-3">
          {/* Offline indicator */}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs font-mono border border-border">
            <Wifi className="w-3 h-3 line-through opacity-50" />
            <span>100% offline</span>
          </span>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-border bg-background">
          <nav className="container mx-auto px-4 py-4 flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className="px-4 py-2.5 rounded-md text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
