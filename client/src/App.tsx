import { useEffect, useState } from "react";
import "./styles.css";

import { Topbar, Sidebar, type ViewId } from "./components/Shell";
import { Icon } from "./components/Icon";
import { Copilot } from "./components/Copilot";
import { TweaksPanel, useTweaks } from "./components/TweaksPanel";
import { UIProvider } from "./lib/ui";

import { Dashboard } from "./views/Dashboard";
import { DirectionView } from "./views/Direction";
import { ValidationView } from "./views/Validation";
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
import { Login } from "./views/Login";

import { api } from "./lib/api";
import { useAuth } from "./lib/auth";
import type { Company } from "./types/api";

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
  // ID of the direction the Validation view is focused on. Set when the user
  // clicks "深度论证" on a Direction card so the Validation page can render
  // the right context across the cross-page jump.
  const [validationDirectionId, setValidationDirectionId] = useState<string | null>(null);

  const gotoValidation = (directionId: string): void => {
    setValidationDirectionId(directionId);
    setActive("validation");
  };

  useEffect(() => {
    void api.dashboard().then(d => setCompany(d.company)).catch(() => {});
  }, []);

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
      <Sidebar active={active} onNav={setActive} />
      <main className="main" key={active}>
        {active === "dashboard"   && <Dashboard setActive={setActive} />}
        {active === "direction"   && <DirectionView onValidate={gotoValidation} />}
        {active === "validation"  && <ValidationView directionId={validationDirectionId} />}
        {active === "product"     && <ProductView />}
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
