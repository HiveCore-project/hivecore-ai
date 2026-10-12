# Multi-chain crypto intelligence — architecture direction

Status: design only. No crypto integration, RPC request, wallet connection, transaction signing, subscription, paid provider or deployment has been implemented. Phase 2B remains the generic evidence foundation.

## Modular boundaries

Keep mission orchestration, evidence validation, assessments, usage budgets and report formatting independent of any blockchain. Future source adapters should return normalized evidence envelopes and preserve raw bounded records; agent prompts must not know provider credentials or construct arbitrary RPC requests.

Proposed layers:

1. **Chain registry:** stable namespaced chain identifier, environment (mainnet/testnet), native asset identifier, address format and capabilities. Do not assume all networks are EVM or that addresses are globally unique. Asset identity includes chain plus native/contract/mint identifier; symbols alone are not identifiers.
2. **Chain-family adapters:** EVM, UTXO, Solana, Cosmos and other families implement a shared read-only interface, with explicit capability flags rather than pretending every network exposes the same concepts. New families plug in without modifying the research pipeline. Initial future coverage can be prioritized across Bitcoin, Ethereum and EVM networks, Solana, Cosmos ecosystems and additional families after source-policy review. No network is currently claimed as supported.
3. **Provider adapters:** separately reviewed source policy, permitted endpoints, free access, rate/size/time limits and credential handling. Adapter selection is explicit and fails closed if unsupported or unavailable. No paid fallback or model-selected arbitrary URL/RPC method.
4. **Evidence normalization:** retain chain identifier, block height/hash, transaction/log identity where applicable, observed time, chain timestamp, finality state, upstream publisher/provider, source URL and bounded raw payload hash. On-chain observations and off-chain claims must be distinguished. Amounts use integer strings plus decimals; never floating-point token quantities. Provider reports and derived calculations are labeled separately.
5. **Research domain modules:** later modules for protocol research, governance, security or liquidity select approved adapters and produce ordinary traceable claims. No trading execution or financial-performance guarantees. User objectives and retrieved payloads remain untrusted data.

A proposed contract should expose `capabilities`, `retrieve(query, budget, signal)` and `normalize(record)`; it must report unsupported operations explicitly. Queries are typed and chain-scoped. Network calls live exclusively in approved adapters. Evidence relationships must refer to retained records with matching mission and chain scope. Current Wikipedia allowlisting remains unchanged until a separate integration review.

## Corroboration and reorgs

Multiple providers may mirror the same upstream or indexer: provider count is not independence. Record publisher/upstream identity and distinguish independent observation from duplicated data. Finality and chain reorganizations are first-class: a report must state its observation boundary, and later invalidation should append a correction instead of overwriting historical evidence. Cross-chain comparisons must disclose mismatched block times, finality and valuation sources.

## Future implementation sequence

1. Agree on chain/evidence/query contracts and unsupported-capability behavior.
2. Build offline adapters and fixtures for contrasting chain families; test identity collisions, decimal precision, reorgs, duplicate upstreams and unavailable data.
3. Separately review permitted free public sources, terms, SSRF restrictions and rate limits for one read-only adapter. Expand through the registry only after tests pass.
4. Obtain explicit approval before any live research or infrastructure changes. Maintain the 5 EUR ceiling and free-only policy. Public multiuser operation first requires authentication, authorization and a durable shared quota service.

This is an extensibility plan, not a claim that all major networks already work. Coverage must be published as a tested capability matrix when actual integrations exist.
