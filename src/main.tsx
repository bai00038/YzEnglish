
  import { createRoot } from "react-dom/client";
  import { BrowserRouter } from "react-router";
  import App from "./app/App.tsx";
// Self-hosted fonts (no Google Fonts CDN — works everywhere, including CN visitors)
// Fraunces: full variable font (SOFT/WONK/opsz/wght) so display sizes get
// high-contrast optical sizing automatically, like the design mockup.
import "@fontsource-variable/fraunces/full.css";
import "@fontsource-variable/fraunces/full-italic.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/noto-sans-sc/400.css";
import "@fontsource/noto-sans-sc/500.css";
import "@fontsource/noto-sans-sc/700.css";
import "@fontsource/noto-serif-sc/400.css";
import "@fontsource/noto-serif-sc/600.css";
import "@fontsource/noto-serif-sc/700.css";
import "@fontsource/noto-serif-sc/900.css";
  import "./styles/index.css";

  createRoot(document.getElementById("root")!).render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
  