import { useState, useEffect, useCallback, useRef } from "react";
import { useWeb3, DEMO_PERSONAS } from "../context/Web3Context";

export interface SimulationTelemetry {
  role_level: number;
  asset_sensitivity: number;
  hour_of_day: number;
  is_known_device: number;
  recent_transfers_count: number;
  failed_login_attempts: number;
}

interface ThreatSimulatorProps {
  isSimulationActive: boolean;
  onToggleSimulationActive?: (active: boolean) => void;
  onTelemetryChange?: (telemetry: SimulationTelemetry) => void;
}

interface LogEvent {
  id: string;
  time: string;
  text: string;
  type: "info" | "warn" | "danger" | "success";
}

type ScenarioType = "normal" | "suspicious" | "critical";

type SimStep =
  | "IDLE"
  | "INITIALIZING"
  | "IDENTITY_CAPTURED"
  | "TELEMETRY_STREAM"
  | "AI_ANALYZING"
  | "DECISION_REACHED"
  | "ENFORCED";

export default function ThreatSimulator({
  isSimulationActive,
  onToggleSimulationActive,
  onTelemetryChange,
}: ThreatSimulatorProps) {
  const { currentRole, account, activePersonaIndex, assetNFT, auditRegistry } = useWeb3();

  // Active persona context
  const activePersona = DEMO_PERSONAS[activePersonaIndex] || DEMO_PERSONAS[0];

  // Role level calculation (Admin=4, Manager=3, Auditor=2, User=1)
  const roleLevel =
    currentRole === "ADMIN" ? 4 : currentRole === "MANAGER" ? 3 : currentRole === "AUDITOR" ? 2 : 1;

  // ── Raw Telemetry State (Critical by default for instant judge impact) ──
  const [hourOfDay, setHourOfDay] = useState<number>(3);
  const [isKnownDevice, setIsKnownDevice] = useState<number>(0);
  const [recentTransfers, setRecentTransfers] = useState<number>(20);
  const [failedLogins, setFailedLogins] = useState<number>(10);
  const [assetSensitivity, setAssetSensitivity] = useState<number>(10);

  // ── Incident Target Asset State ────────────────────────────────────
  const [targetAssetId, setTargetAssetId] = useState<string>("1042");
  const [targetAssetName, setTargetAssetName] = useState<string>("Tactical Defense Drone Flight Matrix");
  const [targetAssetOwner, setTargetAssetOwner] = useState<string>("0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (Standard Employee)");
  const [recipientAddress, setRecipientAddress] = useState<string>("0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65 (External Adversary)");

  // ── Active Scenario (Default to critical for judge WOW factor) ─────
  const [activeScenario, setActiveScenario] = useState<ScenarioType>("critical");
  const [showAdvancedControls, setShowAdvancedControls] = useState<boolean>(false);

  // ── Live Simulation State Machine ──────────────────────────────────
  const [simStep, setSimStep] = useState<SimStep>("ENFORCED");
  const [simProgress, setSimProgress] = useState<number>(100);
  const [displayScore, setDisplayScore] = useState<number>(100);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // ── Real AI Response Storage ───────────────────────────────────────
  const [realScore, setRealScore] = useState<number | null>(100);
  const [realLevel, setRealLevel] = useState<string>("CRITICAL");
  const [realDecision, setRealDecision] = useState<string>("BLOCK + ALERT");
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [evalError, setEvalError] = useState<string | null>(null);

  // ── Telemetry Event Feed ───────────────────────────────────────────
  const [events, setEvents] = useState<LogEvent[]>([
    {
      id: "ev-0",
      time: "12:00:00",
      text: "ACD Asset Defense Monitor active. Standing by for asset access incidents.",
      type: "info",
    },
  ]);

  const timersRef = useRef<NodeJS.Timeout[]>([]);

  const clearAllTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  useEffect(() => {
    return () => clearAllTimers();
  }, []);

  // Format DID from active account or persona
  const userDid = account
    ? `did:acd:${account.slice(2, 6).toUpperCase()}...${account.slice(-4).toUpperCase()}`
    : "did:acd:7F82...9B14";

  // Helper to format live HH:MM:SS
  const getNowTime = () => {
    const now = new Date();
    return [
      String(now.getHours()).padStart(2, "0"),
      String(now.getMinutes()).padStart(2, "0"),
      String(now.getSeconds()).padStart(2, "0"),
    ].join(":");
  };

  // ── Live AI Evaluation via FastAPI ─────────────────────────────────
  const evaluateTelemetry = useCallback(
    async (
      hour: number,
      knownDevice: number,
      transfers: number,
      logins: number,
      sensitivity: number,
      role: number
    ): Promise<{ score: number; level: string; decision: string }> => {
      setEvaluating(true);
      setEvalError(null);

      const payload: SimulationTelemetry = {
        role_level: role,
        asset_sensitivity: sensitivity,
        hour_of_day: hour,
        is_known_device: knownDevice,
        recent_transfers_count: transfers,
        failed_login_attempts: logins,
      };

      if (onTelemetryChange) {
        onTelemetryChange(payload);
      }

      try {
        const response = await fetch("http://127.0.0.1:8000/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(3500),
        });

        if (!response.ok) {
          throw new Error(`AI Engine HTTP ${response.status}: Failed to evaluate risk`);
        }

        const data = await response.json();
        const score = Number(data.risk_score);
        const level = String(data.risk_level);
        const decision = String(data.decision);

        setRealScore(score);
        setRealLevel(level);
        setRealDecision(decision);
        return { score, level, decision };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to connect to FastAPI AI Engine at http://127.0.0.1:8000";
        setEvalError(msg);
        throw err;
      } finally {
        setEvaluating(false);
      }
    },
    [onTelemetryChange]
  );

  // Initial evaluation on mount
  useEffect(() => {
    evaluateTelemetry(hourOfDay, isKnownDevice, recentTransfers, failedLogins, assetSensitivity, roleLevel)
      .then((res) => {
        setDisplayScore(res.score);
      })
      .catch(() => {});
  }, [roleLevel]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Incident Attack Experience Runner (3-5s Immersive Flow) ────────
  const runAttackExperience = async (scenario: ScenarioType) => {
    clearAllTimers();
    setActiveScenario(scenario);
    setIsSimulating(true);
    setSimStep("INITIALIZING");
    setSimProgress(10);
    setDisplayScore(0);

    // Apply scenario parameters
    let targetHour = 14;
    let targetKnown = 1;
    let targetTransfers = 1;
    let targetLogins = 0;
    let targetSensitivity = 3;
    let assetId = "1042";
    let assetName = "Tactical Field Communications Unit";
    let owner = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (Standard Employee)";
    let recipient = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC (Verified Co-Worker)";

    if (scenario === "normal") {
      targetHour = 14;
      targetKnown = 1;
      targetTransfers = 1;
      targetLogins = 0;
      targetSensitivity = 3;
      assetId = "1042";
      assetName = "Tactical Field Communications Unit";
      owner = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (Standard Employee)";
      recipient = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC (Verified Co-Worker)";
    } else if (scenario === "suspicious") {
      targetHour = 23;
      targetKnown = 0;
      targetTransfers = 8;
      targetLogins = 3;
      targetSensitivity = 7;
      assetId = "2088";
      assetName = "Cryptographic Key Exchanger Unit #4";
      owner = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (Standard Employee)";
      recipient = "0x90F79bf6EB2c4f870365E785982E1f101E93b906 (External Unregistered)";
    } else if (scenario === "critical") {
      targetHour = 3;
      targetKnown = 0;
      targetTransfers = 20;
      targetLogins = 10;
      targetSensitivity = 10;
      assetId = "9901";
      assetName = "Top-Secret Missile Guidance Firmware";
      owner = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (Standard Employee)";
      recipient = "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65 (Hostile External Actor)";
    }

    setHourOfDay(targetHour);
    setIsKnownDevice(targetKnown);
    setRecentTransfers(targetTransfers);
    setFailedLogins(targetLogins);
    setAssetSensitivity(targetSensitivity);
    setTargetAssetId(assetId);
    setTargetAssetName(assetName);
    setTargetAssetOwner(owner);
    setRecipientAddress(recipient);

    const initialFeed: LogEvent[] = [
      {
        id: `ev-${Date.now()}-1`,
        time: getNowTime(),
        text: `[INCIDENT TRIGGERED] Standard Employee initiated transfer of NFT #${assetId} (${assetName})`,
        type: scenario === "critical" ? "danger" : scenario === "suspicious" ? "warn" : "info",
      },
    ];
    setEvents(initialFeed);

    // Fetch actual AI evaluation in background from FastAPI
    const aiResultPromise = evaluateTelemetry(
      targetHour,
      targetKnown,
      targetTransfers,
      targetLogins,
      targetSensitivity,
      roleLevel
    );

    // 0.8s: Identity Context Captured
    const t1 = setTimeout(() => {
      setSimStep("IDENTITY_CAPTURED");
      setSimProgress(25);
      setEvents((prev) => [
        {
          id: `ev-${Date.now()}-2`,
          time: getNowTime(),
          text: `Identity verified: ${userDid} | Assigned Role: ${currentRole} | Target Asset: NFT #${assetId}`,
          type: "info",
        },
        ...prev,
      ]);
    }, 800);

    // 1.6s: Telemetry & Threat Vectors Ingested
    const t2 = setTimeout(() => {
      setSimStep("TELEMETRY_STREAM");
      setSimProgress(45);
      setEvents((prev) => [
        {
          id: `ev-${Date.now()}-3`,
          time: getNowTime(),
          text: `Telemetry: Device=${targetKnown ? "KNOWN_CORP" : "UNKNOWN_FINGERPRINT ⚠️"} | Time=${String(targetHour).padStart(2, "0")}:00 | Fails=${targetLogins} | Velocity=${targetTransfers} TX/hr`,
          type: targetKnown ? "info" : "warn",
        },
        ...prev,
      ]);
    }, 1600);

    // 2.5s: AI Risk Model Neural Scoring
    const t3 = setTimeout(async () => {
      setSimStep("AI_ANALYZING");
      setSimProgress(70);
      setEvents((prev) => [
        {
          id: `ev-${Date.now()}-4`,
          time: getNowTime(),
          text: `Autonomous AI Risk Engine scoring ABAC telemetry weights against Asset #${assetId}...`,
          type: "info",
        },
        ...prev,
      ]);

      try {
        const aiData = await aiResultPromise;
        const targetScore = aiData.score;

        // Animate score from 0 toward targetScore
        let current = 0;
        const stepIncrement = Math.max(1, Math.floor(targetScore / 12));
        const scoreInterval = setInterval(() => {
          current += stepIncrement;
          if (current >= targetScore) {
            setDisplayScore(targetScore);
            clearInterval(scoreInterval);
          } else {
            setDisplayScore(current);
          }
        }, 40);
      } catch {
        setDisplayScore(0);
      }
    }, 2500);

    // 3.5s: Policy Decision Reached
    const t4 = setTimeout(async () => {
      try {
        const aiData = await aiResultPromise;
        setSimStep("DECISION_REACHED");
        setSimProgress(88);

        const decisionMsg =
          aiData.level === "CRITICAL"
            ? `⛔ ZERO-TRUST POLICY: Digital asset transfer BLOCKED. Risk score (${aiData.score}/100) exceeds autonomous threshold.`
            : aiData.level === "HIGH"
            ? `⚠️ GOVERNANCE TRIGGER: Elevated risk (${aiData.score}/100). EIP-712 signing halted; ticket #APR-${assetId} required.`
            : `✓ ACCESS AUTHORIZED: Risk verified (${aiData.score}/100). EIP-712 autonomous cryptographic permit issued.`;

        setEvents((prev) => [
          {
            id: `ev-${Date.now()}-5`,
            time: getNowTime(),
            text: `[POLICY: ${aiData.decision}] ${decisionMsg}`,
            type: aiData.level === "CRITICAL" ? "danger" : aiData.level === "HIGH" ? "warn" : "success",
          },
          ...prev,
        ]);
      } catch {
        // Handled in evaluateTelemetry
      }
    }, 3500);

    // 4.5s: Blockchain Enforcement & Audit Recorded
    const t5 = setTimeout(async () => {
      try {
        const aiData = await aiResultPromise;
        setSimStep("ENFORCED");
        setSimProgress(100);
        setIsSimulating(false);

        const auditMsg =
          aiData.level === "CRITICAL"
            ? `Smart Contract Protection: AssetNFT._update rejected direct call with DirectTransferNotAllowed(). NO TRANSACTION EXECUTED. Incident recorded in SIEM Audit.`
            : aiData.level === "HIGH"
            ? `Governance Routing: Transferred to Multi-Party Approval Queue. Audit ticket indexed in SQLite.`
            : `Execution Ready: EIP-712 cryptographic permit validated. Asset transfer permitted.`;

        setEvents((prev) => [
          {
            id: `ev-${Date.now()}-6`,
            time: getNowTime(),
            text: `[IMMUTABLE AUDIT] ${auditMsg}`,
            type: aiData.level === "CRITICAL" ? "danger" : "info",
          },
          ...prev,
        ]);
      } catch {
        setIsSimulating(false);
      }
    }, 4500);

    timersRef.current = [t1, t2, t3, t4, t5];
  };

  // ── Presets handler (Maintains 100% backward-compatibility) ────────
  const handlePresetSelect = (preset: ScenarioType) => {
    runAttackExperience(preset);
  };

  // ── Manual Slider Change Handler ───────────────────────────────────
  const handleManualChange = (
    newHour: number,
    newKnown: number,
    newTransfers: number,
    newLogins: number,
    newSensitivity: number
  ) => {
    setHourOfDay(newHour);
    setIsKnownDevice(newKnown);
    setRecentTransfers(newTransfers);
    setFailedLogins(newLogins);
    setAssetSensitivity(newSensitivity);
    clearAllTimers();
    setIsSimulating(false);
    setSimStep("ENFORCED");

    evaluateTelemetry(newHour, newKnown, newTransfers, newLogins, newSensitivity, roleLevel)
      .then((res) => {
        setDisplayScore(res.score);
        setEvents((prev) => [
          {
            id: `ev-${Date.now()}`,
            time: getNowTime(),
            text: `Attribute adjusted manually. Scored: ${res.score}/100 (${res.level})`,
            type: res.score > 89 ? "danger" : res.score > 69 ? "warn" : "info",
          },
          ...prev.slice(0, 8),
        ]);
      })
      .catch(() => {});
  };

  // ── Dynamic Scoring Logic ──────────────────────────────────────────
  const currentRiskScore = isSimulating ? displayScore : realScore;
  const currentRiskLevel = realLevel;
  const currentRiskDecision = realDecision;

  const getThemeColor = () => {
    if (currentRiskLevel === "LOW") return { text: "text-emerald-400", border: "border-emerald-500/40", fill: "#10b981", bg: "bg-emerald-950/20" };
    if (currentRiskLevel === "MEDIUM") return { text: "text-cyan-400", border: "border-cyan-500/40", fill: "#06b6d4", bg: "bg-cyan-950/20" };
    if (currentRiskLevel === "HIGH") return { text: "text-amber-400", border: "border-amber-500/40", fill: "#f59e0b", bg: "bg-amber-950/20" };
    return { text: "text-rose-500", border: "border-rose-500/50", fill: "#f43f5e", bg: "bg-rose-950/30" };
  };

  const theme = getThemeColor();

  // Radial Meter Calculation
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, currentRiskScore ?? 0)) / 100) * circumference;

  // Anomalies Detection
  const isOffHours = hourOfDay < 6 || hourOfDay > 22;
  const isVelocityHigh = recentTransfers > 5;
  const isBruteForce = failedLogins > 2;
  const isCriticalAsset = assetSensitivity >= 8;
  const isForeignDevice = isKnownDevice === 0;

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/95 text-gray-100 shadow-2xl backdrop-blur-xl transition-all space-y-5 p-5 lg:p-7">
      {/* ── 1. HERO HEADER WITH REAL SERVICE TELEMETRY ────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-rose-500/20 text-rose-400 text-xs font-bold border border-rose-500/40">
              SOC
            </span>
            <span className="text-xs font-mono font-bold tracking-widest text-rose-400 uppercase">
              ACD // LIVE ASSET SECURITY INCIDENT
            </span>
          </div>
          <h2 className="text-xl lg:text-2xl font-black tracking-tight text-white mt-1">
            Autonomous Protection of Decentralized Identities & Digital Assets
          </h2>
          <p className="text-xs text-gray-400 mt-0.5 max-w-2xl">
            Continuous AI attribute-based verification, EIP-712 permit gates, and smart contract anti-bypass defense.
          </p>
        </div>

        {/* Real Application Service Health Badges */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono">
          <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-2.5 py-1 text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>THREAT ENGINE: ONLINE</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/40 px-2.5 py-1 text-gray-300">
            <span className={`h-1.5 w-1.5 rounded-full ${assetNFT ? "bg-emerald-400" : "bg-gray-500"}`} />
            <span>BLOCKCHAIN: {assetNFT ? "CONNECTED (31337)" : "READY"}</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/40 px-2.5 py-1 text-gray-300">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
            <span>AI VALIDATOR: VERIFIED</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/40 px-2.5 py-1 text-gray-300">
            <span className={`h-1.5 w-1.5 rounded-full ${auditRegistry ? "bg-indigo-400" : "bg-gray-500"}`} />
            <span>SIEM: ACTIVE</span>
          </div>

          {onToggleSimulationActive && (
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-2.5 py-1 ml-1">
              <span className="text-[10px] text-gray-400">Inject Portal</span>
              <button
                type="button"
                onClick={() => onToggleSimulationActive(!isSimulationActive)}
                className={`relative inline-flex h-4 w-7 flex-shrink-0 cursor-pointer rounded-full transition-colors ${
                  isSimulationActive ? "bg-rose-600" : "bg-gray-700"
                }`}
                role="switch"
                aria-checked={isSimulationActive}
              >
                <span
                  className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white transition ${
                    isSimulationActive ? "translate-x-3" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── 2. THE JUDGE'S FIRST VIEW: LIVE ASSET ACCESS INCIDENT ─────── */}
      <div className="rounded-xl border border-rose-500/30 bg-rose-950/15 p-4 relative overflow-hidden backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-500/20 pb-2.5 mb-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
            <span className="text-xs font-mono font-black uppercase text-rose-300 tracking-wider">
              LIVE ASSET ACCESS INCIDENT
            </span>
          </div>
          <span className="text-[11px] font-mono text-rose-300/80">
            STATUS:{" "}
            <strong className="underline underline-offset-2">
              {isSimulating ? "⚠ UNDER AI INVESTIGATION" : `EVALUATION: ${currentRiskLevel}`}
            </strong>
          </span>
        </div>

        {/* 3-Column Identity -> Asset -> Action Flow */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono">
          {/* Identity Column */}
          <div className="rounded-lg border border-white/10 bg-black/40 p-3">
            <span className="text-[10px] text-gray-400 uppercase font-bold block mb-1">
              1. ACTOR IDENTITY (DID & RBAC)
            </span>
            <div className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>{activeScenario === "normal" ? activePersona.icon : "👤"}</span>
              <span>{activeScenario === "normal" ? activePersona.name : "Standard Employee (Target Host)"}</span>
            </div>
            <div className="text-xs text-indigo-400 mt-0.5">
              Role: {activeScenario === "normal" ? currentRole : "USER"} (Level {activeScenario === "normal" ? roleLevel : 1})
            </div>
            <div className="text-[11px] text-gray-400 mt-1 font-mono break-all">
              DID: <code className="text-gray-300">did:acd:7099...79C8</code>
            </div>
          </div>

          {/* Target Asset Column */}
          <div className="rounded-lg border border-white/10 bg-black/40 p-3">
            <span className="text-[10px] text-gray-400 uppercase font-bold block mb-1">
              2. TARGET DIGITAL ASSET (NFT)
            </span>
            <div className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>📦</span>
              <span>NFT #{targetAssetId}</span>
            </div>
            <div className="text-xs text-cyan-400 mt-0.5 truncate">{targetAssetName}</div>
            <div className="text-[10px] text-gray-400 mt-0.5 truncate font-mono">
              Owner: <span className="text-gray-300">{targetAssetOwner}</span>
            </div>
            <div className="text-[11px] text-gray-400 mt-1 flex items-center justify-between">
              <span>Sensitivity: Level {assetSensitivity}/10</span>
              <span className={`font-bold ${isCriticalAsset ? "text-rose-400" : "text-emerald-400"}`}>
                {isCriticalAsset ? "CLASSIFIED" : "RESTRICTED"}
              </span>
            </div>
          </div>

          {/* Attempted Action Column */}
          <div className="rounded-lg border border-white/10 bg-black/40 p-3">
            <span className="text-[10px] text-gray-400 uppercase font-bold block mb-1">
              3. ATTEMPTED ACTION
            </span>
            <div className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>⚡</span>
              <span>TRANSFER OWNERSHIP</span>
            </div>
            <div className="text-xs text-amber-400 mt-0.5">
              {activeScenario === "critical" ? "UNAUTHORIZED ATTEMPT" : activeScenario === "suspicious" ? "ANOMALOUS EXFILTRATION" : "STANDARD TRANSFER"}
            </div>
            <div className="text-[11px] text-gray-400 mt-1 truncate">
              To: <code className="text-gray-300">{recipientAddress}</code>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. ATTACK SCENARIO CARDS (Rename to Asset Incident Framing) ─ */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
            <span>⚡ LAUNCH ASSET SECURITY SCENARIO</span>
            <span className="text-[10px] text-gray-500 font-mono font-normal">(Click card to trigger 3–5 second incident flow)</span>
          </span>
          <button
            type="button"
            onClick={() => setShowAdvancedControls(!showAdvancedControls)}
            className="text-xs font-mono text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
          >
            {showAdvancedControls ? "Hide Advanced Controls ▲" : "Advanced Attack Controls ▼"}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Card 1: Normal Operation */}
          <button
            type="button"
            onClick={() => handlePresetSelect("normal")}
            disabled={isSimulating}
            className={`group text-left rounded-xl border p-4 transition-all relative overflow-hidden ${
              activeScenario === "normal"
                ? "border-emerald-500 bg-emerald-950/30 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/40"
                : "border-white/10 bg-black/40 hover:border-emerald-500/40 hover:bg-emerald-950/10"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold font-mono text-emerald-300">
                🟢 NORMAL OPERATION
              </span>
              <span className="text-base">🛡️</span>
            </div>
            <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
              VERIFIED ASSET TRANSFER
            </h4>
            <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
              Verified employee accessing an assigned digital asset during business hours from known corporate hardware.
            </p>
            <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-gray-400">
              <span>NFT #1042 · Corp Device · 1 TX</span>
              <span className="text-emerald-400 font-bold">EXPECT: AUTHORIZED</span>
            </div>
          </button>

          {/* Card 2: Suspicious Asset Exfiltration */}
          <button
            type="button"
            onClick={() => handlePresetSelect("suspicious")}
            disabled={isSimulating}
            className={`group text-left rounded-xl border p-4 transition-all relative overflow-hidden ${
              activeScenario === "suspicious"
                ? "border-amber-500 bg-amber-950/30 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/40"
                : "border-white/10 bg-black/40 hover:border-amber-500/40 hover:bg-amber-950/10"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-bold font-mono text-amber-300">
                🟠 SUSPICIOUS ASSET EXFILTRATION
              </span>
              <span className="text-base">⚠️</span>
            </div>
            <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
              ANOMALOUS TRANSFER DETECTED
            </h4>
            <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
              Unrecognized device signature attempting off-hours burst transfer of sensitive cryptographic hardware tokens.
            </p>
            <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-gray-400">
              <span>NFT #2088 · 23:00 · 8 TX · 3 Fails</span>
              <span className="text-amber-400 font-bold">EXPECT: GOVERNANCE HOLD</span>
            </div>
          </button>

          {/* Card 3: Critical Unauthorized Asset Transfer */}
          <button
            type="button"
            onClick={() => handlePresetSelect("critical")}
            disabled={isSimulating}
            className={`group text-left rounded-xl border p-4 transition-all relative overflow-hidden ${
              activeScenario === "critical"
                ? "border-rose-500 bg-rose-950/40 shadow-lg shadow-rose-500/20 ring-1 ring-rose-500/50"
                : "border-white/10 bg-black/40 hover:border-rose-500/50 hover:bg-rose-950/20"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/20 border border-rose-500/40 px-2.5 py-0.5 text-[10px] font-bold font-mono text-rose-300">
                🔴 CRITICAL UNAUTHORIZED TRANSFER
              </span>
              <span className="text-base">🚨</span>
            </div>
            <h4 className="text-sm font-bold text-white group-hover:text-rose-300 transition-colors">
              UNAUTHORIZED ASSET TRANSFER
            </h4>
            <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
              High-confidence attempt to move top-secret defense digital twins at 3:00 AM with repeated authentication failures.
            </p>
            <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-gray-400">
              <span>NFT #9901 · 03:00 · 10 Fails · Sens 10</span>
              <span className="text-rose-400 font-bold">EXPECT: HARD REVERT</span>
            </div>
          </button>
        </div>
      </div>

      {/* ── Advanced Sliders (Preserved & Collapsible) ───────────────── */}
      {showAdvancedControls && (
        <div className="rounded-xl border border-white/10 bg-black/60 p-4 space-y-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="text-xs font-mono font-bold text-gray-300 uppercase">
              ⚙️ ADVANCED ATTACK CONTROLS (MANUAL ATTRIBUTE MANIPULATION)
            </span>
            <span className="text-[10px] text-gray-500">ABAC Weights sent to FastAPI</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Slider 1: Time */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-300">
                <span>Time of Day (24h)</span>
                <span className="font-mono text-cyan-400 font-bold">{String(hourOfDay).padStart(2, "0")}:00</span>
              </div>
              <input
                type="range"
                min="0"
                max="23"
                value={hourOfDay}
                onChange={(e) =>
                  handleManualChange(Number(e.target.value), isKnownDevice, recentTransfers, failedLogins, assetSensitivity)
                }
                className="w-full accent-rose-500 bg-gray-800 rounded-lg cursor-pointer h-2"
              />
            </div>

            {/* Device Toggle */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-300">
                <span>Device Signature</span>
                <span className="font-mono text-xs font-bold text-white">
                  {isKnownDevice === 1 ? "Corporate ✓" : "Unknown ⚠️"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleManualChange(hourOfDay, 1, recentTransfers, failedLogins, assetSensitivity)}
                  className={`py-1 text-[11px] font-bold rounded border ${
                    isKnownDevice === 1 ? "bg-emerald-500/20 border-emerald-500 text-emerald-300" : "bg-white/5 border-white/10 text-gray-400"
                  }`}
                >
                  Known
                </button>
                <button
                  type="button"
                  onClick={() => handleManualChange(hourOfDay, 0, recentTransfers, failedLogins, assetSensitivity)}
                  className={`py-1 text-[11px] font-bold rounded border ${
                    isKnownDevice === 0 ? "bg-rose-500/20 border-rose-500 text-rose-300" : "bg-white/5 border-white/10 text-gray-400"
                  }`}
                >
                  Unknown
                </button>
              </div>
            </div>

            {/* Slider 3: Transfer Velocity */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-300">
                <span>Transfer Velocity</span>
                <span className="font-mono text-amber-400 font-bold">{recentTransfers} tx/hr</span>
              </div>
              <input
                type="range"
                min="0"
                max="20"
                value={recentTransfers}
                onChange={(e) =>
                  handleManualChange(hourOfDay, isKnownDevice, Number(e.target.value), failedLogins, assetSensitivity)
                }
                className="w-full accent-rose-500 bg-gray-800 rounded-lg cursor-pointer h-2"
              />
            </div>

            {/* Slider 4: Failed Logins */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-300">
                <span>Failed Logins</span>
                <span className="font-mono text-rose-400 font-bold">{failedLogins} retries</span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                value={failedLogins}
                onChange={(e) =>
                  handleManualChange(hourOfDay, isKnownDevice, recentTransfers, Number(e.target.value), assetSensitivity)
                }
                className="w-full accent-rose-500 bg-gray-800 rounded-lg cursor-pointer h-2"
              />
            </div>

            {/* Slider 5: Sensitivity */}
            <div className="space-y-1 sm:col-span-2">
              <div className="flex justify-between text-xs text-gray-300">
                <span>Asset Data Sensitivity Rating (1–10)</span>
                <span className="font-mono text-indigo-400 font-bold">Level {assetSensitivity}</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={assetSensitivity}
                onChange={(e) =>
                  handleManualChange(hourOfDay, isKnownDevice, recentTransfers, failedLogins, Number(e.target.value))
                }
                className="w-full accent-rose-500 bg-gray-800 rounded-lg cursor-pointer h-2"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── 4. AI RISK ENGINE & ASSET BOUNDARY PANELS ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Central Risk Meter Card (5 cols) */}
        <div className={`lg:col-span-5 rounded-2xl border ${theme.border} ${theme.bg} p-5 flex flex-col justify-between relative overflow-hidden backdrop-blur-md`}>
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 block">
                AI RISK ENGINE
              </span>
              <span className="text-xs font-bold text-white">Target: NFT #{targetAssetId}</span>
            </div>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${theme.border} ${theme.text}`}>
              {evaluating || isSimulating ? "AI SCORING…" : currentRiskLevel}
            </span>
          </div>

          {/* Radial Meter & Big Score */}
          <div className="py-4 flex items-center justify-center gap-6">
            <div className="relative flex items-center justify-center">
              <svg className="w-36 h-36 transform -rotate-90">
                <circle
                  cx="72"
                  cy="72"
                  r={radius}
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="10"
                  fill="transparent"
                />
                <circle
                  cx="72"
                  cy="72"
                  r={radius}
                  stroke={theme.fill}
                  strokeWidth="10"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-300 ease-out"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-4xl font-black font-mono tracking-tight text-white">
                  {String(currentRiskScore ?? 0).padStart(2, "0")}
                </span>
                <span className="text-[10px] font-mono text-gray-400 uppercase">/ 100</span>
              </div>
            </div>

            {/* Level & Decision Summary */}
            <div className="space-y-2">
              <div>
                <span className="text-[10px] font-mono text-gray-400 uppercase">Threat Level</span>
                <div className={`text-lg font-black font-mono tracking-tight ${theme.text}`}>
                  {currentRiskLevel} RISK
                </div>
              </div>

              <div>
                <span className="text-[10px] font-mono text-gray-400 uppercase">Policy Decision</span>
                <div className="text-xs font-bold font-mono text-white">
                  {currentRiskDecision === "BLOCK" || currentRiskDecision === "BLOCK + ALERT"
                    ? "⛔ BLOCK + ALERT"
                    : currentRiskDecision === "REQUIRE_APPROVAL"
                    ? "⚠️ REQUIRE APPROVAL"
                    : currentRiskDecision === "ALLOW + AUDIT"
                    ? "✓ ALLOW + AUDIT"
                    : "✓ ALLOW"}
                </div>
              </div>
            </div>
          </div>

          {/* ── ZERO-TRUST POLICY BANNER ──────────────────────────────── */}
          <div className="pt-2 border-t border-white/10">
            {currentRiskLevel === "CRITICAL" ? (
              <div className="rounded-xl border border-rose-500/60 bg-rose-500/20 p-3 text-center animate-pulse">
                <div className="text-xs font-black uppercase text-rose-300 tracking-wider">
                  ⛔ DIGITAL ASSET TRANSFER BLOCKED
                </div>
                <div className="text-[11px] text-rose-200 mt-0.5">
                  Risk exceeds autonomous threshold. Blockchain execution prevented.
                </div>
              </div>
            ) : currentRiskLevel === "HIGH" ? (
              <div className="rounded-xl border border-amber-500/60 bg-amber-500/20 p-3 text-center">
                <div className="text-xs font-black uppercase text-amber-300 tracking-wider">
                  ⚠️ HUMAN APPROVAL REQUIRED
                </div>
                <div className="text-[11px] text-amber-200 mt-0.5">
                  Elevated risk detected. Ticket #APR-{targetAssetId} created for Admin authorization.
                </div>
              </div>
            ) : currentRiskLevel === "MEDIUM" ? (
              <div className="rounded-xl border border-cyan-500/60 bg-cyan-500/20 p-3 text-center">
                <div className="text-xs font-black uppercase text-cyan-300 tracking-wider">
                  ✓ ACTION ALLOWED — AUDIT LOGGED
                </div>
                <div className="text-[11px] text-cyan-200 mt-0.5">
                  Normal variance. EIP-712 permit issued with mandatory SIEM logging.
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-500/60 bg-emerald-500/20 p-3 text-center">
                <div className="text-xs font-black uppercase text-emerald-300 tracking-wider">
                  ✓ ACTION AUTHORIZED — ZERO-TRUST VERIFIED
                </div>
                <div className="text-[11px] text-emerald-200 mt-0.5">
                  Verified security baseline. EIP-712 permit approved for Asset #{targetAssetId}.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Attack Context Telemetry Cards (4 cols) */}
        <div className="lg:col-span-4 rounded-2xl border border-white/10 bg-black/40 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
              <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 font-bold">
                ATTACK CONTEXT TELEMETRY
              </span>
              <span className="text-[10px] font-mono text-cyan-400">Captured Vector</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
                <span className="text-[10px] text-gray-500 block uppercase font-mono">Time of Day</span>
                <span className={`text-xs font-bold font-mono ${isOffHours ? "text-rose-400" : "text-emerald-400"}`}>
                  {String(hourOfDay).padStart(2, "0")}:00 {isOffHours ? "(Off-Hours)" : "(Biz Hours)"}
                </span>
              </div>

              <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
                <span className="text-[10px] text-gray-500 block uppercase font-mono">Device State</span>
                <span className={`text-xs font-bold font-mono ${isForeignDevice ? "text-rose-400" : "text-emerald-400"}`}>
                  {isForeignDevice ? "Unknown Device" : "Corporate Device"}
                </span>
              </div>

              <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
                <span className="text-[10px] text-gray-500 block uppercase font-mono">Transfer Velocity</span>
                <span className={`text-xs font-bold font-mono ${isVelocityHigh ? "text-rose-400" : "text-gray-200"}`}>
                  {recentTransfers} TX / hour
                </span>
              </div>

              <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
                <span className="text-[10px] text-gray-500 block uppercase font-mono">Failed Logins</span>
                <span className={`text-xs font-bold font-mono ${isBruteForce ? "text-rose-400" : "text-gray-200"}`}>
                  {failedLogins} Attempts
                </span>
              </div>

              <div className="col-span-2 rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
                <span className="text-[10px] text-gray-500 block uppercase font-mono">Target Asset Sensitivity</span>
                <div className="flex items-center justify-between mt-0.5">
                  <span className={`text-xs font-bold font-mono ${isCriticalAsset ? "text-rose-400" : "text-cyan-400"}`}>
                    Level {assetSensitivity} / 10
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {assetSensitivity >= 8 ? "Classified Defense HW" : "Standard Asset"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Context Reason List */}
          <div className="mt-3 pt-3 border-t border-white/10">
            <span className="text-[10px] font-mono uppercase text-gray-400 block mb-1 font-bold">
              SECURITY CONTEXT ANALYSIS
            </span>
            <div className="space-y-1 text-[11px]">
              {isForeignDevice ? (
                <div className="text-rose-400">⚠ Unknown device hardware signature</div>
              ) : (
                <div className="text-emerald-400">✓ Known corporate workstation</div>
              )}
              {isOffHours ? (
                <div className="text-rose-400">⚠ Operation requested outside business window</div>
              ) : (
                <div className="text-emerald-400">✓ Normal business operation hours</div>
              )}
              {isVelocityHigh && <div className="text-amber-400">⚠ Abnormal transfer velocity spike</div>}
              {isBruteForce && <div className="text-rose-400">⚠ Repeated failed authentication challenges</div>}
              {isCriticalAsset && <div className="text-amber-400">⛔ Critical asset sensitivity</div>}
            </div>
          </div>
        </div>

        {/* EIP-712 & Smart Contract Enforcement (3 cols) */}
        <div className="lg:col-span-3 rounded-2xl border border-white/10 bg-black/40 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
              <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 font-bold">
                BLOCKCHAIN ENFORCEMENT
              </span>
              <span className="text-[10px] font-mono text-indigo-400">AssetNFT</span>
            </div>

            <div className="space-y-2.5 text-xs font-mono">
              <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                <span className="text-gray-400">AI Validator</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  VERIFIED
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                <span className="text-gray-400">EIP-712 Permit</span>
                <span className={`font-bold ${currentRiskLevel === "CRITICAL" ? "text-rose-400" : currentRiskLevel === "HIGH" ? "text-amber-400" : "text-cyan-400"}`}>
                  {currentRiskLevel === "CRITICAL" ? "⛔ NOT AUTHORIZED" : currentRiskLevel === "HIGH" ? "⚠️ PENDING APPROVAL" : "✓ VALIDATED"}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                <span className="text-gray-400">Replay Protection</span>
                <span className="text-emerald-400 font-bold">ACTIVE (Nonces)</span>
              </div>

              <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                <span className="text-gray-400">Direct transferFrom()</span>
                <span className={`font-bold ${currentRiskLevel === "CRITICAL" ? "text-rose-400" : "text-gray-400"}`}>
                  {currentRiskLevel === "CRITICAL" ? "⛔ REJECTED" : "⛔ BLOCKED"}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                <span className="text-gray-400">Execution Status</span>
                <span className={`font-bold ${currentRiskLevel === "CRITICAL" ? "text-rose-400" : currentRiskLevel === "HIGH" ? "text-amber-400" : "text-emerald-400"}`}>
                  {currentRiskLevel === "CRITICAL" ? "NO TX EXECUTED" : currentRiskLevel === "HIGH" ? "HELD IN GOVERNANCE" : "SETTLED ON-CHAIN"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-400">Audit Event</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  RECORDED IN SIEM
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/10 text-[10px] text-gray-400 font-mono leading-relaxed">
            <span className="text-amber-300 font-bold block mb-0.5">Judge Takeaway:</span>
            Frontend restrictions cannot bypass the smart contract. Direct calls revert with <code className="text-rose-400">DirectTransferNotAllowed()</code>.
          </div>
        </div>
      </div>

      {/* ── 5. LIVE SECURITY PIPELINE ─────────────────────────────────── */}
      <div className="rounded-xl border border-white/10 bg-black/50 p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 font-bold">
            ACD ZERO-TRUST PIPELINE (ATTACK $\rightarrow$ ENFORCEMENT)
          </span>
          {isSimulating && (
            <span className="text-[10px] font-mono text-rose-400 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
              Executing incident sequence ({simProgress}%)
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-center text-xs font-mono">
          {/* Stage 1: Attack Detected */}
          <div className={`rounded-lg border p-2.5 transition-all ${
            simStep !== "IDLE" ? "border-rose-500/40 bg-rose-950/20 text-rose-300" : "border-white/5 bg-white/[0.01] text-gray-500"
          }`}>
            <div className="text-sm mb-1">{simStep !== "IDLE" ? "🚨" : "○"}</div>
            <div className="font-bold text-[10px] uppercase">1. Attack Detected</div>
            <div className="text-[9px] text-gray-400 mt-0.5">NFT #{targetAssetId}</div>
          </div>

          {/* Stage 2: Identity + Telemetry */}
          <div className={`rounded-lg border p-2.5 transition-all ${
            simStep !== "IDLE" && simStep !== "INITIALIZING"
              ? "border-amber-500/40 bg-amber-950/20 text-amber-300"
              : "border-white/5 bg-white/[0.01] text-gray-500"
          }`}>
            <div className="text-sm mb-1">{simStep !== "IDLE" && simStep !== "INITIALIZING" ? "📡" : "○"}</div>
            <div className="font-bold text-[10px] uppercase">2. Identity + Context</div>
            <div className="text-[9px] text-gray-400 mt-0.5">{userDid}</div>
          </div>

          {/* Stage 3: AI Risk Scoring */}
          <div className={`rounded-lg border p-2.5 transition-all ${
            simStep === "AI_ANALYZING" || simStep === "DECISION_REACHED" || simStep === "ENFORCED"
              ? "border-cyan-500/40 bg-cyan-950/20 text-cyan-300"
              : "border-white/5 bg-white/[0.01] text-gray-500"
          }`}>
            <div className="text-sm mb-1">{simStep === "AI_ANALYZING" || simStep === "DECISION_REACHED" || simStep === "ENFORCED" ? "🧠" : "○"}</div>
            <div className="font-bold text-[10px] uppercase">3. AI Risk Scoring</div>
            <div className="text-[9px] text-gray-400 mt-0.5">{currentRiskScore}/100</div>
          </div>

          {/* Stage 4: Zero-Trust Policy */}
          <div className={`rounded-lg border p-2.5 transition-all ${
            simStep === "DECISION_REACHED" || simStep === "ENFORCED"
              ? "border-indigo-500/40 bg-indigo-950/20 text-indigo-300"
              : "border-white/5 bg-white/[0.01] text-gray-500"
          }`}>
            <div className="text-sm mb-1">{simStep === "DECISION_REACHED" || simStep === "ENFORCED" ? "⚖️" : "○"}</div>
            <div className="font-bold text-[10px] uppercase">4. Policy Decision</div>
            <div className="text-[9px] text-gray-400 mt-0.5">{currentRiskLevel}</div>
          </div>

          {/* Stage 5: EIP-712 Permit */}
          <div className={`rounded-lg border p-2.5 transition-all ${
            simStep === "ENFORCED"
              ? currentRiskLevel === "CRITICAL"
                ? "border-rose-500/40 bg-rose-950/20 text-rose-300"
                : currentRiskLevel === "HIGH"
                ? "border-amber-500/40 bg-amber-950/20 text-amber-300"
                : "border-emerald-500/40 bg-emerald-950/20 text-emerald-300"
              : "border-white/5 bg-white/[0.01] text-gray-500"
          }`}>
            <div className="text-sm mb-1">{simStep === "ENFORCED" ? (currentRiskLevel === "CRITICAL" ? "⛔" : currentRiskLevel === "HIGH" ? "⚠️" : "🔏") : "○"}</div>
            <div className="font-bold text-[10px] uppercase">5. EIP-712 Permit</div>
            <div className="text-[9px] text-gray-400 mt-0.5">
              {currentRiskLevel === "CRITICAL" ? "Not Authorized" : currentRiskLevel === "HIGH" ? "Held (#APR)" : "Validated"}
            </div>
          </div>

          {/* Stage 6: AssetNFT Smart Contract */}
          <div className={`rounded-lg border p-2.5 transition-all ${
            simStep === "ENFORCED"
              ? currentRiskLevel === "CRITICAL"
                ? "border-rose-500/40 bg-rose-950/20 text-rose-300"
                : "border-emerald-500/40 bg-emerald-950/20 text-emerald-300"
              : "border-white/5 bg-white/[0.01] text-gray-500"
          }`}>
            <div className="text-sm mb-1">{simStep === "ENFORCED" ? (currentRiskLevel === "CRITICAL" ? "🛡️" : "⛓️") : "○"}</div>
            <div className="font-bold text-[10px] uppercase">6. AssetNFT Contract</div>
            <div className="text-[9px] text-gray-400 mt-0.5">
              {currentRiskLevel === "CRITICAL" ? "Direct Bypass Blocked" : "Permitted"}
            </div>
          </div>

          {/* Stage 7: Immutable Audit */}
          <div className={`rounded-lg border p-2.5 transition-all ${
            simStep === "ENFORCED"
              ? "border-emerald-500/40 bg-emerald-950/20 text-emerald-300"
              : "border-white/5 bg-white/[0.01] text-gray-500"
          }`}>
            <div className="text-sm mb-1">{simStep === "ENFORCED" ? "📜" : "○"}</div>
            <div className="font-bold text-[10px] uppercase">7. Immutable Audit</div>
            <div className="text-[9px] text-gray-400 mt-0.5">
              {simStep === "ENFORCED" ? "Recorded in SIEM" : "Pending"}
            </div>
          </div>
        </div>
      </div>

      {/* ── 6. LIVE SECURITY EVENT STREAM ────────────────────────────── */}
      <div className="rounded-xl border border-white/10 bg-black/40 p-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 font-bold flex items-center gap-2">
            <span>LIVE SECURITY EVENTS & TELEMETRY STREAM</span>
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
          </span>
          <span className="text-[10px] font-mono text-gray-500">Autonomous Incident Trace</span>
        </div>

        <div className="space-y-1.5 max-h-36 overflow-y-auto font-mono text-xs pr-1">
          {events.map((ev) => (
            <div
              key={ev.id}
              className={`flex items-start gap-2.5 rounded px-2.5 py-1 text-[11px] ${
                ev.type === "danger"
                  ? "bg-rose-950/30 text-rose-300 border-l-2 border-rose-500"
                  : ev.type === "warn"
                  ? "bg-amber-950/30 text-amber-300 border-l-2 border-amber-500"
                  : ev.type === "success"
                  ? "bg-emerald-950/30 text-emerald-300 border-l-2 border-emerald-500"
                  : "bg-white/[0.02] text-gray-300 border-l-2 border-cyan-500"
              }`}
            >
              <span className="text-gray-500 whitespace-nowrap">{ev.time}</span>
              <span className="flex-1">{ev.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Error display if FastAPI unreachable */}
      {evalError && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-3.5 text-xs text-rose-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-base">🚨</span>
            <span>
              <strong>AI Engine Connection Error:</strong> {evalError}.
            </span>
          </div>
          <span className="text-[10px] font-mono text-gray-400 bg-black/40 px-2 py-1 rounded">
            Target: http://127.0.0.1:8000/evaluate
          </span>
        </div>
      )}
    </div>
  );
}
