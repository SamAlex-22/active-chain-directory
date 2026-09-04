# Graph Report - active-chain-directory  (2026-09-04)

## Corpus Check
- 41 files · ~19,168 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 274 nodes · 290 edges · 27 communities (25 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `32bfffb5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- compilerOptions
- package.json
- devDependencies
- Hardhat + ethers project
- compilerOptions
- App.tsx
- compilerOptions
- devDependencies
- frontend/package.json
- plugins
- Hardhat 3
- React + TypeScript + Vite
- frontend/tsconfig.json
- global.d.ts
- Sample Hardhat 3 Project (`mocha` and `ethers`)
- Hardhat toolbox: ethers + Mocha
- backend/package.json
- server.js
- risk_api.py

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 19 edges
2. `useWeb3()` - 15 edges
3. `compilerOptions` - 15 edges
4. `react` - 9 edges
5. `compilerOptions` - 8 edges
6. `Hardhat + ethers project` - 6 edges
7. `scripts` - 5 edges
8. `AuditDashboard()` - 5 edges
9. `Hardhat 3` - 5 edges
10. `plugins` - 4 edges

## Surprising Connections (you probably didn't know these)
- `Dashboard()` --calls--> `useWeb3()`  [EXTRACTED]
  frontend/src/App.tsx → frontend/src/context/Web3Context.tsx
- `AdminDirectory()` --calls--> `useWeb3()`  [EXTRACTED]
  frontend/src/components/AdminDirectory.tsx → frontend/src/context/Web3Context.tsx
- `ApprovalCenter()` --calls--> `useWeb3()`  [EXTRACTED]
  frontend/src/components/ApprovalCenter.tsx → frontend/src/context/Web3Context.tsx
- `AssetManagement()` --calls--> `useWeb3()`  [EXTRACTED]
  frontend/src/components/AssetManagement.tsx → frontend/src/context/Web3Context.tsx
- `AuditDashboard()` --calls--> `useWeb3()`  [EXTRACTED]
  frontend/src/components/AuditDashboard.tsx → frontend/src/context/Web3Context.tsx

## Import Cycles
- None detected.

## Communities (27 total, 2 thin omitted)

### Community 0 - "compilerOptions"
Cohesion: 0.17
Nodes (11): mocha, compilerOptions, lib, module, outDir, skipLibCheck, target, types (+3 more)

### Community 1 - "package.json"
Cohesion: 0.14
Nodes (13): @openzeppelin/contracts, author, dependencies, @openzeppelin/contracts, description, keywords, license, main (+5 more)

### Community 2 - "devDependencies"
Cohesion: 0.07
Nodes (27): chai, forge-std, hardhat, mocha, @nomicfoundation/hardhat-ethers, @nomicfoundation/hardhat-ignition, @nomicfoundation/hardhat-toolbox-mocha-ethers, devDependencies (+19 more)

### Community 3 - "Hardhat + ethers project"
Cohesion: 0.22
Nodes (8): Architecture Context & Graph, Docs, graphify, Hardhat + ethers project, Phase 0 Contract Architecture, Project layout, Strict Architectural Rules Summary, Working in this project

### Community 4 - "compilerOptions"
Cohesion: 0.08
Nodes (24): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+16 more)

### Community 5 - "App.tsx"
Cohesion: 0.10
Nodes (28): App(), Dashboard(), AdminDirectory(), ALL_ROLES, LookupResult, ROLE_OPTIONS, ApprovalCenter(), FlaggedRequest (+20 more)

### Community 6 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+11 more)

### Community 7 - "devDependencies"
Cohesion: 0.11
Nodes (19): devDependencies, oxlint, tailwindcss, @tailwindcss/vite, @types/node, @types/react, @types/react-dom, typescript (+11 more)

### Community 8 - "frontend/package.json"
Cohesion: 0.12
Nodes (16): dependencies, ethers, react, react-dom, ethers, name, private, scripts (+8 more)

### Community 9 - "plugins"
Cohesion: 0.22
Nodes (8): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, oxc, typescript, warn

### Community 10 - "Hardhat 3"
Cohesion: 0.29
Nodes (6): Hardhat 3, `networkHelpers`: EVM state manipulation, Solidity tests, Test organization, Typechecking, TypeScript tests and the network connection

### Community 11 - "React + TypeScript + Vite"
Cohesion: 0.50
Nodes (3): Expanding the Oxlint configuration, React Compiler, React + TypeScript + Vite

### Community 20 - "Sample Hardhat 3 Project (`mocha` and `ethers`)"
Cohesion: 0.33
Nodes (5): Make a deployment to Sepolia, Project Overview, Running Tests, Sample Hardhat 3 Project (`mocha` and `ethers`), Usage

### Community 21 - "Hardhat toolbox: ethers + Mocha"
Cohesion: 0.50
Nodes (3): Chai matchers: Ethereum-specific assertions, `ethers`: signers and contract interaction, Hardhat toolbox: ethers + Mocha

### Community 23 - "backend/package.json"
Cohesion: 0.10
Nodes (19): author, dependencies, cors, ethers, express, sqlite3, description, ethers (+11 more)

### Community 24 - "server.js"
Cohesion: 0.14
Nodes (13): db, dbPath, __dirname, __filename, app, auditRegistry, AuditRegistryABI, auditRegistryAbiPath (+5 more)

### Community 25 - "risk_api.py"
Cohesion: 0.25
Nodes (8): evaluate_risk(), health_check(), load_model(), TransactionRequest, BaseModel, get, on_event, post

## Knowledge Gaps
- **150 isolated node(s):** `name`, `version`, `description`, `main`, `test` (+145 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `frontend/package.json`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `react` connect `App.tsx` to `plugins`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _150 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._