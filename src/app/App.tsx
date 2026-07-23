import { useState, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router";
import { DesktopNav } from "@/app/components/DesktopNav";
import { MobileNav } from "@/app/components/MobileNav";
import { HomePage } from "@/app/pages/HomePage";
import { ExplorePage } from "@/app/pages/ExplorePage";
import { SceneDetailPage } from "@/app/pages/SceneDetailPage";
import { ResourcesPage } from "@/app/pages/ResourcesPage";
import { AboutPage } from "@/app/pages/AboutPage";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pathname]);
  return null;
}

export default function App() {
  const [bilingualMode, setBilingualMode] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ScrollToTop />
      <DesktopNav />
      <main className="pb-20 md:pb-0 md:pt-16">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/explore"
            element={
              <ExplorePage
                activeCategory={activeCategory} setActiveCategory={setActiveCategory}
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
        </Routes>
      </main>
      <MobileNav />
    </div>
  );
}
