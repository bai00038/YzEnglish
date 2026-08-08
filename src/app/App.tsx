import { useState, useEffect, useRef } from "react";
import { Routes, Route, useLocation, useNavigationType } from "react-router";
import { DesktopNav } from "@/app/components/DesktopNav";
import { MobileNav } from "@/app/components/MobileNav";
import { Footer } from "@/app/components/Footer";
import { HomePage } from "@/app/pages/HomePage";
import { ExplorePage } from "@/app/pages/ExplorePage";
import { SceneDetailPage } from "@/app/pages/SceneDetailPage";
import { ResourcesPage } from "@/app/pages/ResourcesPage";
import { AboutPage } from "@/app/pages/AboutPage";
import { ContactPage } from "@/app/pages/ContactPage";

// Manage scroll ourselves: forward/replace navigations start at the top,
// but a browser Back/Forward (POP) restores the scroll position the user
// had on that page, keyed by history entry so it survives Explore <-> scene
// detail round-trips.
function ScrollToTop() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const scrollPositions = useRef(new Map<string, number>());
  const prevKeyRef = useRef<string | null>(null);

  useEffect(() => {
    window.history.scrollRestoration = "manual";
  }, []);

  useEffect(() => {
    if (prevKeyRef.current) {
      scrollPositions.current.set(prevKeyRef.current, window.scrollY);
    }
    prevKeyRef.current = location.key;

    if (navigationType === "POP" && scrollPositions.current.has(location.key)) {
      const savedY = scrollPositions.current.get(location.key)!;
      requestAnimationFrame(() => window.scrollTo({ top: savedY, behavior: "auto" }));
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [location.key, navigationType]);

  return null;
}

export default function App() {
  const [bilingualMode, setBilingualMode] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeDiff, setActiveDiff] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Single source of truth for resetting Explore's filters. Called by every
  // Home entry point that opens Explore, so a fresh visit always starts
  // clean. Explore <-> scene detail navigation never calls this, which is
  // what lets Back button preserve filters/results (see req. 6).
  const resetExploreFilters = () => {
    setActiveCategory("All");
    setActiveDiff("All");
    setSearchQuery("");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ScrollToTop />
      <DesktopNav />
      <main className="pb-20 md:pb-0 md:pt-16">
        <Routes>
          <Route path="/" element={<HomePage onExploreEnter={resetExploreFilters} />} />
          <Route
            path="/explore"
            element={
              <ExplorePage
                activeCategory={activeCategory} setActiveCategory={setActiveCategory}
                activeDiff={activeDiff} setActiveDiff={setActiveDiff}
                searchQuery={searchQuery} setSearchQuery={setSearchQuery}
              />
            }
          />
          <Route
            path="/scenes/:slug"
            element={<SceneDetailPage bilingualMode={bilingualMode} setBilingualMode={setBilingualMode} />}
          />
          <Route path="/resources" element={<ResourcesPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
        </Routes>
        <Footer />
      </main>
      <MobileNav />
    </div>
  );
}
