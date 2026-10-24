import { useEffect, useState } from "react";
import { PAGES, Sidebar, type Page } from "./components/Shell";
import { ConnectPage } from "./pages/ConnectPage";
import { KeymapPage } from "./pages/KeymapPage";
import { PlaceholderPage } from "./pages/PlaceholderPage";
import { demoStudio, isDemo } from "./studio/demo";
import { useStudio } from "./studio/useStudio";

const pageFromHash = (): Page => {
  const hash = window.location.hash.slice(1);
  return (PAGES as readonly string[]).includes(hash) ? hash as Page : "keymap";
};

function useHashPage(): [Page, (p: Page) => void] {
  const [page, setPage] = useState(pageFromHash);
  useEffect(() => {
    const onChange = () => setPage(pageFromHash());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return [page, p => { window.location.hash = p; }];
}

export default function App() {
  const real = useStudio();
  const studio = isDemo() ? demoStudio(real) : real;
  const [page, navigate] = useHashPage();
  const [menuOpen, setMenuOpen] = useState(false);
  const onMenu = () => setMenuOpen(true);

  return <div className="app">
    <Sidebar page={page} onNavigate={navigate} navEnabled={studio.connected}
      device={studio.device} connected={studio.connected} lastSync={studio.lastSync}
      open={menuOpen} onClose={() => setMenuOpen(false)} />
    <main className="main">
      {!studio.connected ? <ConnectPage studio={studio} onMenu={onMenu} />
        : page === "keymap" ? <KeymapPage studio={studio} onMenu={onMenu} />
        : <PlaceholderPage page={page} studio={studio} onMenu={onMenu} />}
    </main>
  </div>;
}
