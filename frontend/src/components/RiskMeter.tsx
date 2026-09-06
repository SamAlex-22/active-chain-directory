interface RiskMeterProps {
  score: number;
  level: string;
  decision?: string;
  factors?: Record<string, number>;
}

export default function RiskMeter({ score, level, decision, factors }: RiskMeterProps) {
  // Threshold determination matching model specifications
  const getBandStyles = (currentScore: number) => {
    if (currentScore <= 29) {
      return {
        text: "text-emerald-400",
        border: "border-emerald-500/40",
        bg: "bg-emerald-950/40",
        pill: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
        bar: "bg-emerald-500",
        label: "LOW RISK",
        icon: "🛡️",
      };
    }
    if (currentScore <= 69) {
      return {
        text: "text-cyan-400",
        border: "border-cyan-500/40",
        bg: "bg-cyan-950/40",
        pill: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
        bar: "bg-cyan-500",
        label: "MEDIUM RISK",
        icon: "⚡",
      };
    }
    if (currentScore <= 89) {
      return {
        text: "text-amber-400",
        border: "border-amber-500/40",
        bg: "bg-amber-950/40",
        pill: "bg-amber-500/10 text-amber-300 border-amber-500/30",
        bar: "bg-amber-500",
        label: "HIGH RISK",
        icon: "⚠️",
      };
    }
    return {
      text: "text-rose-400",
      border: "border-rose-500/40",
      bg: "bg-rose-950/40",
      pill: "bg-rose-500/10 text-rose-300 border-rose-500/30",
      bar: "bg-rose-500",
      label: "CRITICAL RISK",
      icon: "🚨",
    };
  };

  const style = getBandStyles(score);
  const normalizedScore = Math.max(0, Math.min(100, score));

  return (
    <div className={`rounded-xl border ${style.border} ${style.bg} p-5 backdrop-blur-md transition-all`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg">{style.icon}</span>
            <span className="text-xs font-semibold tracking-wider uppercase text-gray-400">Zero-Trust Telemetry</span>
          </div>
          <h3 className="text-lg font-bold text-white mt-0.5">AI Contextual Risk Evaluation</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold uppercase ${style.pill}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${style.bar}`} />
            {style.label}
          </span>
          {decision && (
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-mono font-medium text-gray-300">
              ACTION: {decision}
            </span>
          )}
        </div>
      </div>

      {/* Main Score Display */}
      <div className="mt-5 grid gap-6 sm:grid-cols-3 sm:items-center">
        {/* Score Block */}
        <div className="flex flex-col items-center justify-center rounded-lg border border-white/5 bg-black/30 p-4 text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">Risk Score</span>
          <div className={`mt-1 font-mono text-4xl font-extrabold tracking-tight ${style.text}`}>
            {normalizedScore}
          </div>
          <span className="mt-0.5 text-xs text-gray-500">out of 100</span>
          <div className="mt-2 w-full border-t border-white/10 pt-2 text-xs font-medium text-gray-400">
            {level || style.label}
          </div>
        </div>

        {/* Progress Bar & Scale */}
        <div className="sm:col-span-2 space-y-3">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-gray-400">
              <span>Risk Severity Meter</span>
              <span className={`font-mono font-bold ${style.text}`}>{normalizedScore}%</span>
            </div>
            {/* Custom Multi-band Track */}
            <div className="relative h-3 w-full overflow-hidden rounded-full bg-gray-900 border border-white/10">
              <div
                className={`h-full transition-all duration-700 ease-out ${style.bar}`}
                style={{ width: `${normalizedScore}%` }}
              />
            </div>
            {/* Legend Markers */}
            <div className="flex justify-between text-[10px] font-mono text-gray-500 px-0.5">
              <span>0 (Low)</span>
              <span>30 (Med)</span>
              <span>70 (High)</span>
              <span>100 (Crit)</span>
            </div>
          </div>

          {/* Contextual Factor Tags if provided */}
          {factors && Object.keys(factors).length > 0 && (
            <div className="pt-2 border-t border-white/5">
              <span className="text-[11px] font-medium text-gray-400 block mb-1.5">Evaluated ABAC Factors:</span>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(factors).map(([k, v]) => (
                  <span key={k} className="rounded border border-white/5 bg-white/[0.03] px-2 py-0.5 font-mono text-[11px] text-gray-300">
                    {k.replace(/_/g, " ")}: <strong className="text-white">{v}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
