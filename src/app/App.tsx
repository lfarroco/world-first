import { useEffect } from "react";
import { TopBar, Nav } from "../ui/components/Chrome";
import { HeroSheet } from "../ui/screens/HeroSheet";
import { HallScreen } from "../ui/screens/HallScreen";
import { RosterScreen } from "../ui/screens/RosterScreen";
import { RaidScreen } from "../ui/screens/RaidScreen";
import { WarRoomScreen } from "../ui/screens/WarRoomScreen";
import { ReportScreen } from "../ui/screens/ReportScreen";
import { TitleScreen } from "../ui/screens/TitleScreen";
import { AttentionModal } from "../ui/modals/AttentionModal";
import { InspectModal } from "../ui/modals/InspectModal";
import { LootModal } from "../ui/modals/LootModal";
import { TavernModal } from "../ui/modals/TavernModal";
import { HelpModal, NewRunModal } from "../ui/modals/RunModals";
import { useGameStore } from "../store/gameStore";

const ToastView = () => {
  const toast = useGameStore((s) => s.toast);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => useGameStore.getState().dismissToast(), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);
  if (!toast) return null;
  return (
    <div className="toast" data-severity={toast.severity} role="status" aria-live="polite">
      {toast.text}
    </div>
  );
};

const Screen = () => {
  const screen = useGameStore((s) => s.screen);
  if (screen === "roster") return <RosterScreen />;
  if (screen === "war") return <WarRoomScreen />;
  if (screen === "raid") return <RaidScreen />;
  if (screen === "report") return <ReportScreen />;
  return <HallScreen />;
};

const Overlays = () => {
  const modal = useGameStore((s) => s.modal);
  const drawerHeroId = useGameStore((s) => s.drawerHeroId);
  const closeModal = useGameStore((s) => s.closeModal);
  const selectHero = useGameStore((s) => s.selectHero);

  return (
    <>
      {drawerHeroId ? (
        <HeroSheet key={drawerHeroId} heroId={drawerHeroId} onClose={() => selectHero(null)} />
      ) : null}
      {modal?.kind === "attention" ? <AttentionModal onClose={closeModal} /> : null}
      {modal?.kind === "inspect" ? <InspectModal contentId={modal.contentId} onClose={closeModal} /> : null}
      {modal?.kind === "loot" ? <LootModal onClose={closeModal} /> : null}
      {modal?.kind === "tavern" ? <TavernModal onClose={closeModal} /> : null}
      {modal?.kind === "new-run" ? <NewRunModal onClose={closeModal} /> : null}
      {modal?.kind === "help" ? <HelpModal onClose={closeModal} /> : null}
    </>
  );
};

export const App = () => {
  const boot = useGameStore((s) => s.boot);
  const booting = useGameStore((s) => s.booting);
  const game = useGameStore((s) => s.game);

  useEffect(() => {
    boot();
  }, [boot]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      // Text fields own their keys. A focused button does not: Space is the
      // documented advance shortcut, and it must keep working after a click.
      if (
        target &&
        (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) {
        return;
      }
      const state = useGameStore.getState();
      if (event.key === "Escape") {
        if (state.drawerHeroId) state.selectHero(null);
        else if (state.modal) state.closeModal();
        return;
      }
      if (state.modal || state.drawerHeroId || !state.game) return;
      if (event.key === " ") {
        event.preventDefault();
        state.advance();
        return;
      }
      if (event.key === "1") state.setScreen("hall");
      if (event.key === "2") state.setScreen("roster");
      if (event.key === "3") state.setScreen("war");
      if (event.key === "4") state.setScreen("raid");
      if (event.key === "5") state.setScreen("report");
      if (event.key.toLowerCase() === "r") state.setScreen("roster");
      if (event.key.toLowerCase() === "w") state.setScreen("war");
      if (event.key === "?") state.openModal({ kind: "help" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (booting) return <div className="loading">Loading the guild…</div>;
  if (!game) return <TitleScreen />;

  return (
    <div className="app">
      <TopBar />
      <Nav />
      <main className="screen">
        <Screen />
      </main>
      <Overlays />
      <ToastView />
    </div>
  );
};
