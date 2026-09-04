# Graph Report - active-chain-directory  (2026-09-04)

## Corpus Check
- 32 files · ~11,459 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 209 nodes · 205 edges · 23 communities (21 shown, 2 thin omitted)
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

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 19 edges
2. `compilerOptions` - 15 edges
3. `compilerOptions` - 8 edges
4. `useWeb3()` - 7 edges
5. `Hardhat + ethers project` - 6 edges
6. `react` - 5 edges
7. `scripts` - 5 edges
8. `Hardhat 3` - 5 edges
9. `plugins` - 4 edges
10. `rules` - 3 edges

## Surprising Connections (you probably didn't know these)
- `Dashboard()` --calls--> `useWeb3()`  [EXTRACTED]
  frontend/src/App.tsx → frontend/src/context/Web3Context.tsx
- `AdminDirectory()` --calls--> `useWeb3()`  [EXTRACTED]
  frontend/src/components/AdminDirectory.tsx → frontend/src/context/Web3Context.tsx
- `Navbar()` --calls--> `useWeb3()`  [EXTRACTED]
  frontend/src/components/Navbar.tsx → frontend/src/context/Web3Context.tsx

## Import Cycles
- None detected.

## Communities (23 total, 2 thin omitted)

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
Cohesion: 0.17
Nodes (15): App(), Dashboard(), AdminDirectory(), ALL_ROLES, LookupResult, ROLE_OPTIONS, Navbar(), ROLE_STYLES (+7 more)

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

## Knowledge Gaps
- **118 isolated node(s):** `$schema`, `typescript`, `oxc`, `react/rules-of-hooks`, `warn` (+113 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `frontend/package.json`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **What connects `$schema`, `typescript`, `oxc` to the rest of the system?**
  _118 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._