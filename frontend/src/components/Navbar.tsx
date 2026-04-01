import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Code2, MessageSquare, Menu, X, Puzzle } from "lucide-react";
import { useState } from "react";

const Navbar = () => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { to: "/", label: "Home" },
    { to: "/extension", label: "Extension", icon: Puzzle },
    { to: "/agent", label: "AI Agent", icon: MessageSquare },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg text-foreground">
          <Code2 className="h-6 w-6 text-primary" />
          DevAssist
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-2">
          {links.map((l) => (
            <Button
              key={l.to}
              variant={location.pathname === l.to ? "secondary" : "ghost"}
              asChild
            >
              <Link to={l.to} className="flex items-center gap-1.5">
                {l.icon && <l.icon className="h-4 w-4" />}
                {l.label}
              </Link>
            </Button>
          ))}
        </div>

        {/* Mobile toggle */}
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X /> : <Menu />}
        </Button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background px-4 py-3 space-y-1">
          {links.map((l) => (
            <Button
              key={l.to}
              variant={location.pathname === l.to ? "secondary" : "ghost"}
              className="w-full justify-start"
              asChild
              onClick={() => setMobileOpen(false)}
            >
              <Link to={l.to} className="flex items-center gap-1.5">
                {l.icon && <l.icon className="h-4 w-4" />}
                {l.label}
              </Link>
            </Button>
          ))}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
