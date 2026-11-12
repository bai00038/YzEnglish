import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router";

type NavVisibility = {
  hidden: boolean;
  /** Pin the nav visible (e.g. while typing in search, or during a chip jump).
      Returns a release function; the nav may hide again once all holds are released. */
  hold: () => () => void;
};

const NavVisibilityContext = createContext<NavVisibility>({ hidden: false, hold: () => () => {} });

export function NavVisibilityProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(false);
  const holdCountRef = useRef(0);
  const { pathname } = useLocation();

  const hold = useCallback(() => {
    holdCountRef.current += 1;
    setHidden(false);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      holdCountRef.current = Math.max(0, holdCountRef.current - 1);
    };
  }, []);

  useEffect(() => {
    setHidden(false);
  }, [pathname]);

  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const dy = y - lastY;
      lastY = y;
      if (holdCountRef.current > 0 || y < 96) {
        setHidden(false);
        return;
      }
      if (dy > 6) setHidden(true);
      else if (dy < -6) setHidden(false);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return <NavVisibilityContext.Provider value={{ hidden, hold }}>{children}</NavVisibilityContext.Provider>;
}

export function useNavVisibility() {
  return useContext(NavVisibilityContext);
}
