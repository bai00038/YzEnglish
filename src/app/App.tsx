import { PurchasePage } from "@/app/pages/PurchasePage";
import { PaymentPolicyPage } from "@/app/pages/PaymentPolicyPage";
import { PaymentReturnPage } from "@/app/pages/PaymentReturnPage";
import { legacyLearningLocation } from "@/data/site-routes";
import { ScenePlaybackProvider } from "@/app/components/ScenePlaybackProvider";
import { MessagesPage, MessageDetailPage } from "@/app/pages/MessagesPage";
import { useState, useEffect, useRef } from "react";
import { Routes, Route, Navigate, useLocation, useNavigationType } from "react-router";
import { DesktopNav } from "@/app/components/DesktopNav";
import { NavVisibilityProvider } from "@/app/components/nav-visibility";
import { MobileNav } from "@/app/components/MobileNav";
import { Footer } from "@/app/components/Footer";
import { HomePage } from "@/app/pages/HomePage";
import { ExplorePage } from "@/app/pages/ExplorePage";
import { SceneDetailPage } from "@/app/pages/SceneDetailPage";
import { AboutPage } from "@/app/pages/AboutPage";
import { ContactPage } from "@/app/pages/ContactPage";
import { FreeTrialPage } from "@/app/pages/FreeTrialPage";
import { CollectionPage } from "@/app/pages/CollectionPage";
import { KitPage } from "@/app/pages/KitPage";
import { stopKitAudio } from "@/data/kit-audio";
import { LearningScenesPage, VocabularyPage, LearnedPage } from "@/app/pages/LearningPages";
import { MembershipPage } from "@/app/pages/MembershipPage";

// Manage scroll ourselves: forward/replace navigations start at the top,
// but a browser Back/Forward (POP) restores the scroll position the user
// had on that page, keyed by history entry so it survives Explore <-> scene
// detail round-trips.
function LegacyLearningRedirect() {
  const { pathname, search, hash } = useLocation();
  return <Navigate to={legacyLearningLocation(pathname, search, hash)} replace />;
}

function ScrollToTop() {
  const location = useLocation();
  useEffect(() => { stopKitAudio(); }, [location.pathname]);
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

    const isProgressResume = location.pathname.startsWith("/scenes/")
      && new URLSearchParams(location.search).get("resume") === "1";

    if (location.hash) {
      requestAnimationFrame(() => {
        document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } else if (isProgressResume) {
      // SceneDetailPage restores the saved lesson step and video time.
      // Do not start a competing smooth scroll to the top first.
      return;
    } else if (navigationType === "POP" && scrollPositions.current.has(location.key)) {
      const savedY = scrollPositions.current.get(location.key)!;
      requestAnimationFrame(() => window.scrollTo({ top: savedY, behavior: "auto" }));
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [location.hash, location.key, location.pathname, location.search, navigationType]);

  return null;
}

export default function App() {
  const [bilingualMode, setBilingualMode] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Single source of truth for resetting Explore's filters. Called by every
  // Home entry point that opens Explore, so a fresh visit always starts
  // clean. Explore <-> scene detail navigation never calls this, which is
  // what lets Back button preserve filters/results (see req. 6).
  const resetExploreFilters = () => {
    setActiveCategory("All");
    setSearchQuery("");
  };

  return (
    <ScenePlaybackProvider><div className="mobile-nav-page-padding min-h-screen bg-background text-foreground">
      <NavVisibilityProvider>
      <ScrollToTop />
      <DesktopNav />
      <main>
        <Routes>
          <Route path="/" element={<HomePage onExploreEnter={resetExploreFilters} />} />
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
          <Route path="/free-trial" element={<FreeTrialPage />} />
          <Route path="/collections/:collectionId" element={<CollectionPage />} />
          <Route path="/kit" element={<KitPage />} />
          <Route path="/membership" element={<PurchasePage />} />
          <Route path="/refund-policy" element={<PaymentPolicyPage kind="refund" />} />
          <Route path="/terms" element={<PaymentPolicyPage kind="terms" />} />
          <Route path="/payment/return" element={<PaymentReturnPage />} />
          <Route path="/membership/*" element={<LegacyLearningRedirect />} />
          <Route path="/my-learning" element={<MembershipPage />} />
          <Route path="/my-learning/scenes" element={<LearningScenesPage />} />
          <Route path="/my-learning/completed" element={<LearningScenesPage completed />} />
          <Route path="/my-learning/vocabulary" element={<VocabularyPage />} />
          <Route path="/my-learning/learned" element={<LearnedPage />} />
          <Route path="/my-learning/messages" element={<MessagesPage />} />
          <Route path="/my-learning/messages/detail" element={<MessageDetailPage />} />
          <Route path="/resources" element={<Navigate to="/explore" replace />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
        </Routes>
        <Footer />
      </main>
      <MobileNav />
      </NavVisibilityProvider>
    </div></ScenePlaybackProvider>
  );
}
