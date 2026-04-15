import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Code2, MessageSquare, Menu, X, Puzzle, LogOut, User } from "lucide-react";
import { useState } from "react";
import { isLoggedIn, getCurrentUser, logout } from "@/lib/auth";

const Navbar = () => {
  const location  = useLocation();
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const loggedIn  = isLoggedIn();
  const user      = getCurrentUser();

  const links = [
    { to: "/",          label: "Home" },
    { to: "/extension", label: "Extension", icon: Puzzle },
    { to: "/agent",     label: "AI Agent",  icon: MessageSquare },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 font-bold text-lg text-foreground">
          <Code2 className="h-6 w-6 text-primary" />
          DevAssist
        </Link>

        {/* Desktop nav */}
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

          {/* Auth buttons */}
          {loggedIn ? (
            <div className="flex items-center gap-2 ml-2 pl-2 border-l border-border">
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                {user?.username}
              </span>
              <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground hover:text-foreground">
                <LogOut className="h-4 w-4 mr-1.5" /> Sign out
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 ml-2 pl-2 border-l border-border">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">Sign in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/signup">Sign up</Link>
              </Button>
            </div>
          )}
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

          {loggedIn ? (
            <>
              <div className="px-3 py-1 text-sm text-muted-foreground flex items-center gap-1.5">
                <User className="h-4 w-4" /> {user?.username}
              </div>
              <Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={logout}>
                <LogOut className="h-4 w-4 mr-1.5" /> Sign out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" className="w-full justify-start" asChild onClick={() => setMobileOpen(false)}>
                <Link to="/login">Sign in</Link>
              </Button>
              <Button className="w-full justify-start" asChild onClick={() => setMobileOpen(false)}>
                <Link to="/signup">Sign up</Link>
              </Button>
            </>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;