import { useEffect, useState } from "react";
import { PAGES, Sidebar, type Page } from "./components/Shell";
import { ConnectPage } from "./pages/ConnectPage";
import { KeymapPage, type KeyFocus } from "./pages/KeymapPage";
import { LayersPage } from "./pages/LayersPage";
import { SettingsPage } from "./pages/SettingsPage";
import { isDemo, useDemoStudio } from "./studio/demo";
import { usePrefs } from "./studio/prefs";
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
  const demo = useDemoStudio(real);
  const studio = isDemo() ? demo : real;
  const prefs = usePrefs();
  const [page, navigate] = useHashPage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [focus, setFocus] = useState<KeyFocus | null>(null);
  const onMenu = () => setMenuOpen(true);
  const showKey = (f: KeyFocus) => { setFocus(f); navigate("keymap"); };

  return <div className="app">
    <Sidebar page={page} onNavigate={navigate} navEnabled={studio.connected}
      device={studio.device} connected={studio.connected} lastSync={studio.lastSync}
      open={menuOpen} onClose={() => setMenuOpen(false)} />
    <main className="main">
      {!studio.connected ? <ConnectPage studio={studio} onMenu={onMenu} />
        : page === "keymap" ? <KeymapPage studio={studio} onMenu={onMenu} prefs={prefs} focus={focus} />
        : page === "layers" ? <LayersPage studio={studio} onMenu={onMenu} prefs={prefs} onShowKey={showKey} />
        : <SettingsPage studio={studio} onMenu={onMenu} prefs={prefs} />}
    </main>
  </div>;
}
