/**
 * RAGShadowMaster CTF - Game Controller
 * Manages game state, UI updates, scoring, and progression
 */

class GameController {
    constructor() {
        this.engine = new RAGEngine();
        this.state = {
            currentLevel: null,
            currentChallengeIndex: 0,
            totalScore: 0,
            flags: [],
            completedChallenges: new Set(),
            hintUsed: {}
        };
    }

    // --- Screen Management ---

    showScreen(screenId) {
        document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
        document.getElementById(screenId).classList.add("active");
    }

    // --- Level Selection ---

    selectLevel(level) {
        this.state.currentLevel = level;
        this.state.currentChallengeIndex = 0;
        this.loadChallenge();
        this.showScreen("challengeScreen");
    }

    // --- Challenge Loading ---

    loadChallenge() {
        const level = this.state.currentLevel;
        const index = this.state.currentChallengeIndex;
        const challenges = CHALLENGES[level];

        if (index >= challenges.length) {
            this.showLevelComplete();
            return;
        }

        const ch = challenges[index];

        // Level badge
        const badge = document.getElementById("challengeLevel");
        badge.textContent = level === "easy" ? "KOLAY" : level === "medium" ? "ORTA" : "ZOR";
        badge.className = "level-badge " + level;

        // Challenge info
        document.getElementById("challengeNumber").textContent =
            `Challenge ${index + 1}/${challenges.length}`;
        document.getElementById("challengeTitle").textContent = ch.title;
        document.getElementById("challengeDescription").innerHTML = this.formatDescription(ch.description);

        // System info
        document.getElementById("systemInfo").innerHTML = this.renderSystemInfo(ch.system);

        // Knowledge base
        document.getElementById("knowledgeBase").innerHTML = this.renderKnowledgeBase(ch.knowledgeBase);

        // Attack instruction
        const instructionMap = {
            easy: "Asagiya zehirlenecek belge icerigini yazin. Hedef sorgu: ",
            medium: "Zehirli belge icerigini olusturun. Mevcut bilgileri bastirmalisiniz. Hedef sorgu: ",
            hard: "Gelismis zehir icerigi olusturun. Tespit mekanizmalarini atlatmalisiniz. Hedef sorgu: "
        };
        document.getElementById("attackInstruction").innerHTML =
            instructionMap[level] + `<strong>"${ch.targetQuery}"</strong>`;

        // Reset inputs
        document.getElementById("docTitle").value = "";
        document.getElementById("poisonContent").value = "";
        document.getElementById("resultsArea").classList.add("hidden");
        document.getElementById("nextChallengeBtn").disabled = true;

        // Hint
        const hintBtn = document.getElementById("hintBtn");
        const hintText = document.getElementById("hintText");
        hintText.classList.add("hidden");
        hintBtn.disabled = false;

        if (this.state.hintUsed[ch.id]) {
            hintBtn.disabled = true;
            hintBtn.textContent = "Ipucu kullanildi";
        } else {
            hintBtn.textContent = "Ipucu Goster (-25 puan)";
        }

        this.updateScoreDisplay();
    }

    formatDescription(desc) {
        return desc.replace(/\n/g, "<br>");
    }

    renderSystemInfo(system) {
        let html = `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">`;
        html += `<span>Sistem:</span><span>${system.name}</span>`;
        html += `<span>Tip:</span><span>${system.type}</span>`;
        html += `<span>Embedding:</span><span>${system.embedding}</span>`;
        html += `<span>LLM:</span><span>${system.llm}</span>`;
        html += `<span>Chunk Size:</span><span>${system.chunkSize}</span>`;
        html += `<span>Top-K:</span><span>${system.topK}</span>`;
        html += `</div>`;

        if (system.memoryConfig) {
            html += `<br><span style="color: var(--accent-yellow);">Hafiza Konfig:</span> ${system.memoryConfig}`;
        }

        if (system.multiHop) {
            html += `<br><span style="color: var(--accent-yellow);">Multi-Hop:</span> ${system.multiHop}`;
        }

        if (system.guardrails) {
            html += `<br><span style="color: var(--accent-red);">Guardrails:</span><ul style="margin: 4px 0 0 16px; font-size: 0.75rem;">`;
            system.guardrails.forEach((g) => {
                html += `<li>${g}</li>`;
            });
            html += `</ul>`;
        }

        return html;
    }

    renderKnowledgeBase(kb) {
        return kb
            .map(
                (doc) => `
            <div class="kb-entry">
                <div class="doc-name">${doc.name}</div>
                <div class="doc-content">${doc.content}</div>
            </div>`
            )
            .join("");
    }

    // --- Hint System ---

    showHint() {
        const ch = this.getCurrentChallenge();
        if (!ch || this.state.hintUsed[ch.id]) return;

        const attemptCount = this.engine.getAttemptCount(ch.id);
        const hintIndex = Math.min(attemptCount, ch.hints.length - 1);

        this.state.hintUsed[ch.id] = true;
        this.state.totalScore = Math.max(0, this.state.totalScore - 25);

        const hintText = document.getElementById("hintText");
        hintText.textContent = ch.hints[hintIndex];
        hintText.classList.remove("hidden");

        const hintBtn = document.getElementById("hintBtn");
        hintBtn.disabled = true;
        hintBtn.textContent = "Ipucu kullanildi (-25 puan)";

        this.updateScoreDisplay();
    }

    // --- Attack Submission ---

    submitAttack() {
        const ch = this.getCurrentChallenge();
        if (!ch) return;

        const title = document.getElementById("docTitle").value.trim();
        const content = document.getElementById("poisonContent").value.trim();

        if (!content) {
            alert("Zehir icerigi bos olamaz.");
            return;
        }

        if (!title) {
            alert("Belge basligi girin.");
            return;
        }

        // Track attempt
        this.engine.trackAttempt(ch.id);

        // Run simulation
        const poisonDoc = { title, content };
        const result = this.engine.evaluateAttack(ch, poisonDoc);

        // Display results
        this.displayResults(ch, result);

        // Handle success
        if (result.success && !this.state.completedChallenges.has(ch.id)) {
            this.state.completedChallenges.add(ch.id);
            this.state.totalScore += result.points + result.bonusPoints;
            this.state.flags.push({
                flag: ch.flag,
                challenge: ch.title,
                points: result.points + result.bonusPoints
            });
            document.getElementById("nextChallengeBtn").disabled = false;
        }

        this.updateScoreDisplay();
    }

    displayResults(challenge, result) {
        const area = document.getElementById("resultsArea");
        area.classList.remove("hidden");

        // --- Retrieval Results ---
        const retrievalDiv = document.getElementById("retrievalResults");
        let retrievalHtml = `<div class="result-label">RETRIEVAL SIMULASYONU (${challenge.system.type})</div>`;
        retrievalHtml += `<div class="result-value">Cekilen Chunk'lar (Top-${challenge.system.topK}):</div>`;
        retrievalHtml += `<div class="chunk-list">`;
        result.retrievedChunks.forEach((chunk, i) => {
            const isPoisoned = chunk.isPoisoned ? ' style="color: var(--accent-red);"' : "";
            const label = chunk.isPoisoned ? " [ZEHIRLI]" : "";
            retrievalHtml += `
                <div class="chunk-item">
                    ${i + 1}. <span${isPoisoned}>${chunk.name}${label}</span>
                    <span class="chunk-score">cosine_sim: ${chunk.score.toFixed(4)}</span>
                </div>`;
        });
        retrievalHtml += `</div>`;

        if (result.retrieved) {
            retrievalHtml += `<div class="result-value green">Zehirli belge Top-${challenge.system.topK} icinde (Sira: ${result.retrievedRank})</div>`;
        } else {
            retrievalHtml += `<div class="result-value red">Zehirli belge Top-${challenge.system.topK} disinda kaldi. Retrieval condition basarisiz.</div>`;
        }
        retrievalDiv.innerHTML = retrievalHtml;
        retrievalDiv.className = `result-section ${result.retrieved ? "info" : "failure"}`;

        // --- S+I Decomposition Analysis (PoisonedRAG) ---
        const llmDiv = document.getElementById("llmResponse");
        let siHtml = "";
        if (result.siAnalysis) {
            const si = result.siAnalysis;
            const qualityMap = {
                effective: '<span class="green">Etkili (S+I tam)</span>',
                "retrieval-only": '<span class="yellow">Sadece S (retrieval) -- I (generation) eksik</span>',
                "generation-only": '<span class="yellow">Sadece I (generation) -- S (retrieval) eksik</span>',
                ineffective: '<span class="red">Etkisiz (S ve I eksik)</span>'
            };
            siHtml += `<div class="result-section info" style="border-left-color: var(--accent-purple);">`;
            siHtml += `<div class="result-label">S+I DEKOMPOZISYON ANALIZI (PoisonedRAG)</div>`;
            siHtml += `<div class="result-value">Kalite: ${qualityMap[si.quality]}</div>`;
            siHtml += `<div class="result-value">S (Retrieval) Skoru: ${si.sScore.toFixed(2)} | I (Generation) Skoru: ${si.iScore.toFixed(2)}</div>`;

            if (si.sComponents.length > 0) {
                siHtml += `<div style="font-size: 0.7rem; color: var(--accent-cyan); margin-top: 4px;">S Bilesenleri:</div>`;
                si.sComponents.forEach((s) => {
                    siHtml += `<div style="font-size: 0.7rem; color: var(--text-muted); padding-left: 8px;">"${s.text}..." (sim: ${s.similarity.toFixed(3)})</div>`;
                });
            }
            if (si.iComponents.length > 0) {
                siHtml += `<div style="font-size: 0.7rem; color: var(--accent-yellow); margin-top: 4px;">I Bilesenleri:</div>`;
                si.iComponents.forEach((ic) => {
                    siHtml += `<div style="font-size: 0.7rem; color: var(--text-muted); padding-left: 8px;">"${ic}..."</div>`;
                });
            }
            siHtml += `</div>`;
        }

        // --- LLM Response ---
        let llmContent = `${siHtml}`;
        llmContent += `<div class="result-label">LLM CIKTISI (${challenge.system.llm})</div>`;
        llmContent += `<div class="result-value">${result.llmOutput.replace(/\n/g, "<br>")}</div>`;
        llmDiv.innerHTML = llmContent;
        llmDiv.className = `result-section ${result.success ? "success" : "info"}`;

        // --- Detection & Forensics ---
        const detectDiv = document.getElementById("detectionResult");
        let detectHtml = `<div class="result-label">TESPIT ANALIZI (CorruptRAG Stealth + RAGForensics)</div>`;
        detectHtml += `<div class="result-value">Stealth Skoru: `;

        if (result.stealthScore >= 80) {
            detectHtml += `<span class="green">${result.stealthScore}/100 (Gizli)</span>`;
        } else if (result.stealthScore >= 50) {
            detectHtml += `<span class="yellow">${result.stealthScore}/100 (Orta)</span>`;
        } else {
            detectHtml += `<span class="red">${result.stealthScore}/100 (Tespit Edildi)</span>`;
        }
        detectHtml += `</div>`;

        if (result.detectionReasons.length > 0) {
            detectHtml += `<div class="result-value red">Tespit Nedenleri:</div><ul style="margin-left: 16px; font-size: 0.75rem; color: var(--accent-red);">`;
            result.detectionReasons.forEach((r) => {
                detectHtml += `<li>${r}</li>`;
            });
            detectHtml += `</ul>`;
        } else {
            detectHtml += `<div class="result-value green">Hicbir tespit mekanizmasi tetiklenmedi.</div>`;
        }

        // Forensic flags (RAGForensics / RevPRAG)
        if (result.forensicFlags && result.forensicFlags.length > 0) {
            detectHtml += `<div style="margin-top: 8px;"><div class="result-label" style="color: var(--accent-yellow);">FORENSIK BULGULAR (RAGForensics/RevPRAG)</div>`;
            detectHtml += `<ul style="margin-left: 16px; font-size: 0.75rem; color: var(--accent-yellow);">`;
            result.forensicFlags.forEach((f) => {
                detectHtml += `<li>${f}</li>`;
            });
            detectHtml += `</ul></div>`;
        }

        detectDiv.innerHTML = detectHtml;
        detectDiv.className = `result-section ${result.detected ? "failure" : "success"}`;

        // --- Flag / Score ---
        const flagDiv = document.getElementById("flagResult");
        if (result.success) {
            let flagHtml = `<div class="result-label">SALDIRI BASARILI</div>`;
            flagHtml += `<div class="result-value purple">Flag: ${challenge.flag}</div>`;
            flagHtml += `<div class="result-value green">+${result.points} puan`;
            if (result.bonusPoints > 0) {
                flagHtml += ` | +${result.bonusPoints} bonus`;
                const bonusDetails = [];
                if (result.stealthScore >= 80) bonusDetails.push("Stealth +50");
                if (!result.detected && result.detectionReasons.length === 0 && (!result.forensicFlags || result.forensicFlags.length === 0)) bonusDetails.push("Tespit edilemedi +100");
                if (result.retrievedRank === 1) bonusDetails.push("Top-1 retrieval +25");
                if (result.siAnalysis && result.siAnalysis.hasBothComponents && result.siAnalysis.sScore > 0.3) bonusDetails.push("S+I kalitesi +25");
                if (bonusDetails.length > 0) {
                    flagHtml += ` (${bonusDetails.join(", ")})`;
                }
            }
            flagHtml += `</div>`;
            flagHtml += `<br><div class="result-value">Mevcut puan: ${this.state.totalScore} | Flag'ler: ${this.state.flags.map((f) => f.flag).join(", ")}</div>`;
            flagDiv.innerHTML = flagHtml;
            flagDiv.className = "result-section flag";
        } else {
            const attempts = this.engine.getAttemptCount(challenge.id);
            let failHtml = `<div class="result-label">SALDIRI BASARISIZ</div>`;
            failHtml += `<div class="result-value red">Zehirli icerik hedef etkiyi yaratamadi.</div>`;

            // Contextual feedback based on S+I analysis
            if (!result.retrieved) {
                failHtml += `<div class="result-value yellow">Retrieval Condition basarisiz: Belgeniz hedef sorguyla yeterince benzer degil. S bileseni (retrieval substring) guclendirilmeli.</div>`;
            } else if (!result.contentMatch) {
                failHtml += `<div class="result-value yellow">Generation Condition basarisiz: Belge cekildi ancak hedef yanlis bilgiyi icermiyor. I bileseni (hedef icerik) eklenmeli.</div>`;
            } else if (result.detected) {
                failHtml += `<div class="result-value yellow">Guardrail Bypass basarisiz: Tespit mekanizmasi belgeyi reddetti. CorruptRAG yaklasimi ile daha stealthy icerik olusturun.</div>`;
            }

            if (result.siAnalysis) {
                const si = result.siAnalysis;
                if (si.quality === "retrieval-only") {
                    failHtml += `<div class="result-value yellow">S+I Analizi: S bileseni var ama I (hedef yanlis bilgi) eksik.</div>`;
                } else if (si.quality === "generation-only") {
                    failHtml += `<div class="result-value yellow">S+I Analizi: I bileseni var ama S (retrieval benzerlik) eksik. Hedef sorgudan terimleri belgeye ekleyin.</div>`;
                } else if (si.quality === "ineffective") {
                    failHtml += `<div class="result-value yellow">S+I Analizi: Hem S hem I bilesenleri eksik. Hedef sorguya benzer terimler VE hedef yanlis bilgiyi iceren icerik yazin.</div>`;
                }
            }

            if (attempts >= 2 && !this.state.hintUsed[challenge.id]) {
                failHtml += `<br><div class="result-value yellow">Ipucu kullanmayi deneyin.</div>`;
            }

            failHtml += `<br><div class="result-value">Deneme: ${attempts} | Mevcut puan: ${this.state.totalScore}</div>`;
            flagDiv.innerHTML = failHtml;
            flagDiv.className = "result-section failure";
        }
    }

    // --- Navigation ---

    nextChallenge() {
        this.state.currentChallengeIndex++;
        const challenges = CHALLENGES[this.state.currentLevel];

        if (this.state.currentChallengeIndex >= challenges.length) {
            this.showLevelComplete();
        } else {
            this.loadChallenge();
        }
    }

    showLevelComplete() {
        const levelNames = { easy: "Kolay", medium: "Orta", hard: "Zor" };
        const currentLevel = this.state.currentLevel;
        const nextLevels = { easy: "medium", medium: "hard", hard: null };
        const nextLevel = nextLevels[currentLevel];

        if (nextLevel) {
            const proceed = confirm(
                `${levelNames[currentLevel]} seviye tamamlandi!\n` +
                `Mevcut puan: ${this.state.totalScore}\n` +
                `Toplanan flag: ${this.state.flags.length}\n\n` +
                `${levelNames[nextLevel]} seviyeye gecmek ister misiniz?`
            );

            if (proceed) {
                this.state.currentLevel = nextLevel;
                this.state.currentChallengeIndex = 0;
                this.loadChallenge();
            } else {
                this.showScoreboard();
            }
        } else {
            this.showScoreboard();
        }
    }

    backToMenu() {
        this.showScreen("welcomeScreen");
    }

    // --- Scoreboard ---

    showScoreboard() {
        this.showScreen("scoreboardScreen");

        const rank = this.calculateRank();
        document.getElementById("finalRank").textContent = rank.title;
        document.getElementById("finalScore").textContent = `Toplam Puan: ${this.state.totalScore}`;
        document.getElementById("rankDescription").textContent = rank.description;

        const flagsHtml = this.state.flags
            .map(
                (f) => `
            <div class="flag-item">
                <span class="flag-name">${f.flag}</span>
                <span>${f.challenge}</span>
                <span class="flag-points">+${f.points}</span>
            </div>`
            )
            .join("");

        document.getElementById("flagsList").innerHTML =
            this.state.flags.length > 0
                ? flagsHtml
                : '<div class="flag-item"><span style="color: var(--text-muted);">Henuz flag toplanmadi.</span></div>';
    }

    calculateRank() {
        const score = this.state.totalScore;
        const flags = this.state.flags.length;

        if (score >= 2000 && flags >= 8) {
            return {
                title: "SHADOW OPERATOR",
                description: "RAG sistemlerinin en karanlik koselerini biliyorsunuz. Hicbir guardrail sizi durduramaz. Siz bir hayaletsiniz."
            };
        } else if (score >= 1500 && flags >= 6) {
            return {
                title: "ELITE POISONER",
                description: "Ileri seviye RAG zehirleme teknikleri konusunda ustasınız. Kurumsal RAG sistemleri sizin icin bir oyun alani."
            };
        } else if (score >= 1000 && flags >= 4) {
            return {
                title: "ADVANCED INJECTOR",
                description: "RAG zehirleme konusunda saglam bir temele sahipsiniz. Orta ve ileri seviye saldirilari basariyla gerceklestirdiniz."
            };
        } else if (score >= 500 && flags >= 2) {
            return {
                title: "KNOWLEDGE CORRUPTOR",
                description: "RAG sistemlerinin temel zayifliklarini anliyor ve basit saldirilari gerceklestirebiliyorsunuz."
            };
        } else if (flags >= 1) {
            return {
                title: "NOVICE INJECTOR",
                description: "RAG zehirleme dnyasina ilk adiminizi attiniz. Daha fazla pratik yaparak seviyenizi yukseltebilirsiniz."
            };
        } else {
            return {
                title: "OBSERVER",
                description: "Henuz basarili bir saldiri gerceklestiremediniz. Ipuclarini dikkatli okuyun ve tekrar deneyin."
            };
        }
    }

    // --- Utility ---

    getCurrentChallenge() {
        if (!this.state.currentLevel) return null;
        return CHALLENGES[this.state.currentLevel][this.state.currentChallengeIndex];
    }

    updateScoreDisplay() {
        document.getElementById("scoreDisplay").textContent = `Puan: ${this.state.totalScore}`;
        document.getElementById("flagsCount").textContent = `Flag: ${this.state.flags.length}/9`;
    }

    restart() {
        this.state = {
            currentLevel: null,
            currentChallengeIndex: 0,
            totalScore: 0,
            flags: [],
            completedChallenges: new Set(),
            hintUsed: {}
        };
        this.engine = new RAGEngine();
        this.updateScoreDisplay();
        this.showScreen("welcomeScreen");
    }
}

// Initialize game
const game = new GameController();
