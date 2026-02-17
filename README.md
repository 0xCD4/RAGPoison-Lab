# RAGShadowMaster CTF

AI Security CTF game focused on RAG (Retrieval-Augmented Generation) poisoning attacks.

## Overview

An educational, browser-based CTF where participants craft poisoned documents to manipulate RAG systems. The simulation engine models real-world retrieval pipelines, LLM generation, and detection mechanisms.

## Academic Foundations

Based on peer-reviewed research:

- **PoisonedRAG** (Zou et al., USENIX Security 2025): S+I decomposition technique where poison text is split into S (retrieval substring) and I (instruction/information) components
- **CorruptRAG** (Zhang et al., 2025): One-shot stealthy injection attacks with stealth metrics
- **RAGForensics** (Zhang et al., 2025): Traceback detection of poisoned texts in knowledge databases
- **RevPRAG** (EMNLP 2025): Reverse engineering approach to detect poisoned RAG systems

## How to Play

Open `index.html` in a browser. No server or dependencies required.

### Levels

| Level | Target System | Challenge Theme |
|-------|--------------|-----------------|
| Easy (3) | HR ChatBot, IT Support, Finance Bot | Policy manipulation, privilege escalation, expense limit inflation |
| Medium (3) | Microsoft 365 Copilot, Legal RAG, E-commerce Bot | CEO misinformation, contract tampering, price manipulation |
| Hard (3) | Agentic AI Memory, Multi-Hop RAG, Guarded ThreatIntel | Persistent backdoor, chain attack, guardrail bypass |

### Scoring

- Successful attack: +100 points
- Stealth bonus (score >= 80): +50 points
- Undetected by forensics: +100 points
- Top-1 retrieval rank: +25 points
- S+I decomposition quality: +25 points
- Hint usage: -25 points

### Ranks

| Score | Rank |
|-------|------|
| 2000+ | Shadow Operator |
| 1500+ | Elite Poisoner |
| 1000+ | Advanced Injector |
| 500+ | Knowledge Corruptor |
| 100+ | Novice Injector |

## Simulation Engine

The engine simulates:

1. **Retrieval**: TF-IDF based similarity with bigram matching, IDF weighting, and recency bias
2. **S+I Analysis**: Decomposes attack into retrieval (S) and generation (I) components per PoisonedRAG methodology
3. **LLM Generation**: Context-aware response generation based on retrieved chunks
4. **Stealth Scoring**: CorruptRAG-style stealthiness evaluation
5. **Forensic Detection**: RAGForensics traceback analysis and RevPRAG contradiction detection
6. **Guardrails**: Prompt injection pattern matching, unicode anomaly detection, title-content consistency

## Files

- `index.html` - Main UI
- `style.css` - Terminal-themed styling
- `challenges.js` - 9 challenge definitions with knowledge bases, criteria, and hints
- `engine.js` - RAG simulation engine (retrieval, S+I analysis, forensics, scoring)
- `game.js` - Game controller (state, UI updates, progression)

## References

- Zou et al. (2025). *PoisonedRAG: Knowledge Corruption Attacks to RAG.* USENIX Security.
- Zhang et al. (2025). *CorruptRAG: Practical Poisoning Attacks.* arXiv:2504.03957.
- Zhang et al. (2025). *RAGForensics.* arXiv:2504.21668.
- RevPRAG (2025). *EMNLP Findings.*
