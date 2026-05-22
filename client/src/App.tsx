import { useEffect, useState } from "react";
import "./styles.css";

import { Topbar, Sidebar, type ViewId } from "./components/Shell";
import { Icon } from "./components/Icon";
import { Copilot } from "./components/Copilot";
import { TweaksPanel, useTweaks } from "./components/TweaksPanel";
import { UIProvider } from "./lib/ui";

import { Dashboard } from "./views/Dashboard";
import { DirectionView } from "./views/Direction";
import { ProductView } from "./views/Product";
import { ContentView } from "./views/Content";
import { TrafficView } from "./views/Traffic";
import { ReachView } from "./views/Reach";
import { DataView } from "./views/Data";
import { ModelsView } from "./views/Models";
import { KnowledgeView } from "./views/Knowledge";
import { PromptsView } from "./views/Prompts";
import { SkillsView } from "./views/Skills";
import { AgentsView } from "./views/Agents";
import { AutomationsView } from "./views/Automations";
import { RunsView } from "./views/Runs";
import { SettingsView } from "./views/Settings";
import { Login } from "./views/Login";

import { api } from "./lib/api";
import { useAuth } from "./lib/auth";
import type { Company, AssetCounts } from "./types/api";

export function App() {
  const { loading, user } = useAuth();
  if (loading) return <SplashScreen />;
  if (!user) return <Login />;
  return <AuthedApp />;
}

function SplashScreen() {
  return (
    <div className="splash">
      <div className="brand-mark" style={{ width: 36, height: 36, borderRadius: 10, fontSize: 17 }}>L</div>
      <div className="muted text-sm" style={{ marginTop: 12 }}>LumenEdu · loading…</div>
    </div>
  );
}

function AuthedApp() {
  const [t, setTweak] = useTweaks();
  const [active, setActive] = useState<ViewId>("dashboard");
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [agentBusy, setAgentBusy] = useState(true);
  const [company, setCompany] = useState<Company | null>(null);
  const [counts, setCounts] = useState<AssetCounts | null>(null);
  // The direction handed off into 业务线上化 when its 4-维 validation passes.
  const [productDirectionId, setProductDirectionId] = useState<string | null>(null);

  const gotoProduct = (directionId: string): void => {
    setProductDirectionId(directionId);
    setActive("product");
  };

  useEffect(() => {
    void api.dashboard().then(d => setCompany(d.company)).catch(() => {});
  }, []);

  // Refetch asset counts on view change so sidebar badges stay in sync
  // after the user creates or deletes items.
  useEffect(() => {
    void api.assetCounts().then(setCounts).catch(() => {});
  }, [active]);

  useEffect(() => {
    const i = window.setInterval(() => setAgentBusy(b => Math.random() > 0.25 ? true : !b), 8000);
    return () => window.clearInterval(i);
  }, []);

  return (
    <UIProvider>
    <div className={`app-shell layout-${t.layout}`}>
      <Topbar
        active={active}
        onNav={setActive}
        layout={t.layout}
        onOpenCopilot={() => setCopilotOpen(true)}
        agentBusy={agentBusy}
        shortName={company?.shortName ?? "LumenEdu"}
      />
      <Sidebar active={active} onNav={setActive} counts={counts} />
      <main className="main" key={active}>
        {active === "dashboard"   && <Dashboard setActive={setActive} />}
        {active === "direction"   && <DirectionView onGotoProduct={gotoProduct} />}
        {active === "product"     && <ProductView directionId={productDirectionId} />}
        {active === "content"     && <ContentView />}
        {active === "traffic"     && <TrafficView />}
        {active === "reach"       && <ReachView />}
        {active === "data"        && <DataView />}
        {active === "models"      && <ModelsView />}
        {active === "knowledge"   && <KnowledgeView />}
        {active === "prompts"     && <PromptsView />}
        {active === "skills"      && <SkillsView />}
        {active === "agents"      && <AgentsView />}
        {active === "automations" && <AutomationsView />}
        {active === "runs"        && <RunsView />}
        {active === "settings"    && <SettingsView />}
      </main>

      {!copilotOpen && (
        <button className="copilot-fab" onClick={() => setCopilotOpen(true)} aria-label="Open AI Copilot">
          <span className="ring" />
          <Icon name="sparkle" size={22} stroke={1.8} />
        </button>
      )}
      {copilotOpen && <Copilot active={active} onClose={() => setCopilotOpen(false)} />}

      <TweaksPanel t={t} setTweak={setTweak} />
    </div>
    </UIProvider>
  );
}
