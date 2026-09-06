import ThreatSimulator from "./ThreatSimulator";

export default function AttackSimulatorPlaceholder() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
      {/* Live Interactive Threat Simulator (Hero Experience) */}
      <ThreatSimulator isSimulationActive={false} />

      {/* Attack Vectors Tested (Supplemental Intel Grid) */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Card 1: Off-Hours Velocity Attack */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-white">Stealth Off-Hours Exfiltration</h3>
          <p className="mt-1 text-[11px] text-gray-400 leading-relaxed">
            Simulate high-value asset drain during 3:00 AM off-hours from an unknown device to trigger instantaneous zero-trust block.
          </p>
          <div className="mt-2.5 flex items-center justify-between text-[10px] font-mono text-gray-500 border-t border-white/5 pt-2">
            <span>Target: AI Score 90+</span>
            <span className="text-rose-400 font-bold">Hard Revert</span>
          </div>
        </div>

        {/* Card 2: Credential Stuffing & Device Spoofing */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-white">Credential Brute Force Surge</h3>
          <p className="mt-1 text-[11px] text-gray-400 leading-relaxed">
            Test automated defense against repeated failed authentication sequences paired with elevated privilege requests.
          </p>
          <div className="mt-2.5 flex items-center justify-between text-[10px] font-mono text-gray-500 border-t border-white/5 pt-2">
            <span>Target: Governance Hold</span>
            <span className="text-amber-400 font-bold">Ticket #APR</span>
          </div>
        </div>

        {/* Card 3: EIP-712 Cryptographic Attestation */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-white">Cryptographic AI Attestation</h3>
          <p className="mt-1 text-[11px] text-gray-400 leading-relaxed">
            ECDSA typed signatures signed by the AI validator (Hardhat Acc #4) before allowing smart contract state transition.
          </p>
          <div className="mt-2.5 flex items-center justify-between text-[10px] font-mono text-gray-500 border-t border-white/5 pt-2">
            <span>Target: EVM On-Chain Proof</span>
            <span className="text-cyan-400 font-bold">EIP-712 Permit</span>
          </div>
        </div>
      </div>
    </div>
  );
}
