/**
 * RAGShadowMaster CTF - Game Controller
 * Manages game state, UI updates, scoring, and progression
 */

class GameController {
    constructor() {
        this.engine = new RAGEngine();
        this.globalStats = this.loadGlobalStats();
        this.state = this.loadGameState() || {
            currentLevel: null,
            currentChallengeIndex: 0,
            totalScore: 0,
            flags: [],
            completedChallenges: new Set(),
            hintUsed: {},
            sessionStats: {}
        };
    }

    loadGlobalStats() {
        const fallback = { totalAttempts: 0, totalSuccesses: 0, challenges: {} };
        try {
            const raw = localStorage.getItem("ragshadowmaster_stats");
            if (!raw) return fallback;
            const parsed = JSON.parse(raw);
            return {
                totalAttempts: parsed.totalAttempts || 0,
                totalSuccesses: parsed.totalSuccesses || 0,
                challenges: parsed.challenges || {}
            };
        } catch (_) {
            return fallback;
        }
    }

    saveGlobalStats() {
        localStorage.setItem("ragshadowmaster_stats", JSON.stringify(this.globalStats));
    }

    saveGameState() {
        const serializable = {
            currentLevel: this.state.currentLevel,
            currentChallengeIndex: this.state.currentChallengeIndex,
            totalScore: this.state.totalScore,
            flags: this.state.flags,
            completedChallenges: Array.from(this.state.completedChallenges),
            hintUsed: this.state.hintUsed,
            sessionStats: this.state.sessionStats
        };
        localStorage.setItem("ragshadowmaster_game", JSON.stringify(serializable));
    }

    loadGameState() {
        try {
            const raw = localStorage.getItem("ragshadowmaster_game");
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            parsed.completedChallenges = new Set(parsed.completedChallenges || []);
            parsed.flags = parsed.flags || [];
            parsed.hintUsed = parsed.hintUsed || {};
            parsed.sessionStats = parsed.sessionStats || {};
            return parsed;
        } catch (_) {
            return null;
        }
    }

    trackStats(challengeId, success) {
        if (!this.state.sessionStats[challengeId]) {
            this.state.sessionStats[challengeId] = { attempts: 0, successes: 0 };
        }
        if (!this.globalStats.challenges[challengeId]) {
            this.globalStats.challenges[challengeId] = { attempts: 0, successes: 0 };
        }

        this.state.sessionStats[challengeId].attempts++;
        this.globalStats.challenges[challengeId].attempts++;
        this.globalStats.totalAttempts++;

        if (success) {
            this.state.sessionStats[challengeId].successes++;
            this.globalStats.challenges[challengeId].successes++;
            this.globalStats.totalSuccesses++;
        }

        this.saveGlobalStats();
    }

    renderStatsHint(challengeId) {
        const session = this.state.sessionStats[challengeId] || { attempts: 0, successes: 0 };
        const global = this.globalStats.challenges[challengeId] || { attempts: 0, successes: 0 };
        const successRate = global.attempts > 0
            ? Math.round((global.successes / global.attempts) * 100)
            : 0;

        const statsEl = document.getElementById("challengeStats");
        if (!statsEl) return;

        statsEl.innerHTML =
            `Bu challenge için deneme istatistiği (yerel tarayıcı): ` +
            `Bu oturum <strong>${session.attempts}</strong> deneme / <strong>${session.successes}</strong> başarı · ` +
            `Toplam <strong>${global.attempts}</strong> deneme / <strong>${global.successes}</strong> başarı ` +
            `(<strong>%${successRate}</strong> başarı oranı).`;
    }


    normalizeTurkishText(text) {
        if (!text) return text;
        const replacements = [
            ["yazin", "yazın"], ["Sira", "Sıra"], ["kaldi", "kaldı"], ["ANALIZI", "ANALİZİ"],
            ["CIKTISI", "ÇIKTISI"], ["Hicbir", "Hiçbir"], ["mekanizmasi", "mekanizması"],
            ["tamamlandi", "tamamlandı"], ["gecmek", "geçmek"], ["Henuz", "Henüz"],
            ["koselerini", "köşelerini"], ["karanlik", "karanlık"], ["Ileri", "İleri"],
            ["ustasınız", "ustasısınız"], ["alani", "alanı"], ["saglam", "sağlam"],
            ["basariyla", "başarıyla"], ["gerceklestirdiniz", "gerçekleştirdiniz"],
            ["zayifliklarini", "zayıflıklarını"], ["anliyor", "anlıyor"],
            ["gerceklestirebiliyorsunuz", "gerçekleştirebiliyorsunuz"], ["dnyasina", "dünyasına"],
            ["adiminizi", "adımınızı"], ["attiniz", "attınız"], ["yukseltebilirsiniz", "yükseltebilirsiniz"],
            ["basarili", "başarılı"], ["Ipuclarini", "İpuçlarını"], ["kullanmayi", "kullanmayı"],
            ["degil", "değil"], ["bileseni", "bileşeni"], ["guclendirilmeli", "güçlendirilmeli"],
            ["icermiyor", "içermiyor"], ["iceren", "içeren"], ["icerik", "içerik"],
            ["DOGRUDAN", "DOĞRUDAN"], ["güvenlik", "güvenlik"], ["geciyor", "geçiyor"]
        ];
        let out = text;
        replacements.forEach(([from, to]) => {
            out = out.split(from).join(to);
        });
        return out;
    }

    getAwardToken(challenge) {
        if (challenge.flag) return challenge.flag;
        return `RAG{redacted_${challenge.id}}`;
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

        // Progress bar
        const progressPct = ((index + 1) / challenges.length) * 100;
        document.getElementById("progressFill").style.width = progressPct + "%";
        document.getElementById("challengeTitle").textContent = this.normalizeTurkishText(ch.title);
        document.getElementById("challengeDescription").innerHTML = this.formatDescription(this.normalizeTurkishText(ch.description));

        // System info
        document.getElementById("systemInfo").innerHTML = this.renderSystemInfo(ch.system);

        // Knowledge base
        document.getElementById("knowledgeBase").innerHTML = this.renderKnowledgeBase(ch.knowledgeBase);

        // Attack instruction
        const instructionMap = {
            easy: "Aşağıya zehirlenecek belge içeriğini yazın. Hedef sorgu: ",
            medium: "Zehirli belge içeriğini oluşturun. Mevcut bilgileri bastırmalısınız. Hedef sorgu: ",
            hard: "Gelişmiş zehir içeriği oluşturun. Tespit mekanizmalarını atlatmalısınız. Hedef sorgu: "
        };
        document.getElementById("attackInstruction").innerHTML =
            instructionMap[level] + `<strong>"${this.normalizeTurkishText(ch.targetQuery)}"</strong>`;

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
            hintBtn.innerHTML = 'İpucu kullanıldı';
        } else {
            hintBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> İpucu Göster (-25 puan)';
        }

        this.updateScoreDisplay();
        this.renderStatsHint(ch.id);
    }

    formatDescription(desc) {
        return desc.replace(/\n/g, "<br>");
    }

    renderSystemInfo(system) {
        let html = `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">`;
        html += `<span>Sistem:</span><span>${this.normalizeTurkishText(system.name)}</span>`;
        html += `<span>Tip:</span><span>${system.type}</span>`;
        html += `<span>Embedding:</span><span>${system.embedding}</span>`;
        html += `<span>LLM:</span><span>${system.llm}</span>`;
        html += `<span>Chunk Size:</span><span>${system.chunkSize}</span>`;
        html += `<span>Top-K:</span><span>${system.topK}</span>`;
        html += `</div>`;

        if (system.memoryConfig) {
            html += `<br><span style="color: var(--accent-yellow);">Hafıza Konfig:</span> ${system.memoryConfig}`;
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
                <div class="doc-content">${this.normalizeTurkishText(doc.content)}</div>
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
        hintText.textContent = this.normalizeTurkishText(ch.hints[hintIndex]);
        hintText.classList.remove("hidden");

        const hintBtn = document.getElementById("hintBtn");
        hintBtn.disabled = true;
        hintBtn.innerHTML = 'İpucu kullanıldı (-25 puan)';

        this.updateScoreDisplay();
    }

    // --- Attack Submission ---

    submitAttack() {
        const ch = this.getCurrentChallenge();
        if (!ch) return;

        const title = document.getElementById("docTitle").value.trim();
        const content = document.getElementById("poisonContent").value.trim();

        if (!content) {
            alert("Zehir içeriği boş olamaz.");
            return;
        }

        if (!title) {
            alert("Belge başlığı girin.");
            return;
        }

        // Track attempt
        this.engine.trackAttempt(ch.id);

        // Run simulation
        const poisonDoc = { title, content };
        const result = this.engine.evaluateAttack(ch, poisonDoc);
        this.trackStats(ch.id, result.success);
        this.renderStatsHint(ch.id);

        // Display results
        this.displayResults(ch, result);

        // Handle success
        if (result.success && !this.state.completedChallenges.has(ch.id)) {
            this.state.completedChallenges.add(ch.id);
            this.state.totalScore += result.points + result.bonusPoints;
            this.state.flags.push({
                flag: this.getAwardToken(ch),
                challenge: this.normalizeTurkishText(ch.title),
                points: result.points + result.bonusPoints
            });
            document.getElementById("nextChallengeBtn").disabled = false;
        }

        this.updateScoreDisplay();
        this.saveGameState();
    }

    displayResults(challenge, result) {
        const area = document.getElementById("resultsArea");
        area.classList.remove("hidden");

        // --- Retrieval Results ---
        const retrievalDiv = document.getElementById("retrievalResults");
        let retrievalHtml = `<div class="result-label">RETRIEVAL SİMÜLASYONU (${challenge.system.type})</div>`;
        retrievalHtml += `<div class="result-value">Çekilen Chunk'lar (Top-${challenge.system.topK}):</div>`;
        retrievalHtml += `<div class="chunk-list">`;
        result.retrievedChunks.forEach((chunk, i) => {
            const isPoisoned = chunk.isPoisoned ? ' style="color: var(--accent-red);"' : "";
            const label = chunk.isPoisoned ? " [ZEHİRLİ]" : "";
            retrievalHtml += `
                <div class="chunk-item">
                    ${i + 1}. <span${isPoisoned}>${chunk.name}${label}</span>
                    <span class="chunk-score">cosine_sim: ${chunk.score.toFixed(4)}</span>
                </div>`;
        });
        retrievalHtml += `</div>`;

        if (result.retrieved) {
            retrievalHtml += `<div class="result-value green">Zehirli belge Top-${challenge.system.topK} içinde (Sıra: ${result.retrievedRank})</div>`;
        } else {
            retrievalHtml += `<div class="result-value red">Zehirli belge Top-${challenge.system.topK} dışında kaldı. Retrieval koşulu başarısız.</div>`;
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
            siHtml += `<div class="result-label">S+I DEKOMPOZİSYON ANALIZI (PoisonedRAG)</div>`;
            siHtml += `<div class="result-value">Kalite: ${qualityMap[si.quality]}</div>`;
            siHtml += `<div class="result-value">S (Retrieval) Skoru: ${si.sScore.toFixed(2)} | I (Generation) Skoru: ${si.iScore.toFixed(2)}</div>`;

            if (si.sComponents.length > 0) {
                siHtml += `<div style="font-size: 0.7rem; color: var(--accent-cyan); margin-top: 4px;">S Bileşenleri:</div>`;
                si.sComponents.forEach((s) => {
                    siHtml += `<div style="font-size: 0.7rem; color: var(--text-muted); padding-left: 8px;">"${s.text}..." (sim: ${s.similarity.toFixed(3)})</div>`;
                });
            }
            if (si.iComponents.length > 0) {
                siHtml += `<div style="font-size: 0.7rem; color: var(--accent-yellow); margin-top: 4px;">I Bileşenleri:</div>`;
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
        let detectHtml = `<div class="result-label">TESPİT ANALİZİ (CorruptRAG Stealth + RAGForensics)</div>`;
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
            detectHtml += `<div class="result-value green">Hiçbir tespit mekanizması tetiklenmedi.</div>`;
        }

        // Forensic flags (RAGForensics / RevPRAG)
        if (result.forensicFlags && result.forensicFlags.length > 0) {
            detectHtml += `<div style="margin-top: 8px;"><div class="result-label" style="color: var(--accent-yellow);">FORENSİK BULGULAR (RAGForensics/RevPRAG)</div>`;
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
            flagHtml += `<div class="result-value purple">Ödül Kodu: ${this.getAwardToken(challenge)}</div>`;
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
            flagHtml += `<br><div class="result-value">Mevcut puan: ${this.state.totalScore} | Ödüller: ${this.state.flags.map((f) => f.flag).join(", ")}</div>`;
            flagDiv.innerHTML = flagHtml;
            flagDiv.className = "result-section flag";
        } else {
            const attempts = this.engine.getAttemptCount(challenge.id);
            let failHtml = `<div class="result-label">SALDIRI BAŞARISIZ</div>`;
            failHtml += `<div class="result-value red">Zehirli içerik hedef etkiyi yaratamadı.</div>`;

            // Contextual feedback based on S+I analysis
            if (!result.retrieved) {
                failHtml += `<div class="result-value yellow">Retrieval Condition başarısız: Belgeniz hedef sorguyla yeterince benzer değil. S bileşeni (retrieval substring) güçlendirilmeli.</div>`;
            } else if (!result.contentMatch) {
                failHtml += `<div class="result-value yellow">Generation Condition başarısız: Belge çekildi ancak hedef yanlış bilgiyi içermiyor. I bileşeni (hedef içerik) eklenmeli.</div>`;
            } else if (result.detected) {
                failHtml += `<div class="result-value yellow">Guardrail Bypass başarısız: Tespit mekanizması belgeyi reddetti. CorruptRAG yaklaşımı ile daha stealth içerik oluşturun.</div>`;
            }

            if (result.siAnalysis) {
                const si = result.siAnalysis;
                if (si.quality === "retrieval-only") {
                    failHtml += `<div class="result-value yellow">S+I Analizi: S bileşeni var ama I (hedef yanlış bilgi) eksik.</div>`;
                } else if (si.quality === "generation-only") {
                    failHtml += `<div class="result-value yellow">S+I Analizi: I bileşeni var ama S (retrieval benzerlik) eksik. Hedef sorgudan terimleri belgeye ekleyin.</div>`;
                } else if (si.quality === "ineffective") {
                    failHtml += `<div class="result-value yellow">S+I Analizi: Hem S hem I bileşenleri eksik. Hedef sorguya benzer terimler VE hedef yanlış bilgiyi içeren içerik yazın.</div>`;
                }
            }

            if (attempts >= 2 && !this.state.hintUsed[challenge.id]) {
                failHtml += `<br><div class="result-value yellow">İpucu kullanmayı deneyin.</div>`;
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
                `${levelNames[currentLevel]} seviye tamamlandı!\n` +
                `Mevcut puan: ${this.state.totalScore}\n` +
                `Toplanan ödül: ${this.state.flags.length}\n\n` +
                `${levelNames[nextLevel]} seviyeye geçmek ister misiniz?`
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
        const avgAttempts = this.globalStats.totalSuccesses > 0
            ? (this.globalStats.totalAttempts / this.globalStats.totalSuccesses).toFixed(2)
            : "0.00";
        const globalStatsText = `Toplam İstatistik (yerel): ${this.globalStats.totalAttempts} deneme, ${this.globalStats.totalSuccesses} başarı, başarı başına ortalama ${avgAttempts} deneme.`;
        document.getElementById("globalStatsSummary").textContent = globalStatsText;

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
                : '<div class="flag-item"><span style="color: var(--text-muted);">Henüz ödül toplanmadı.</span></div>';
    }

    calculateRank() {
        const score = this.state.totalScore;
        const flags = this.state.flags.length;

        if (score >= 2000 && flags >= 8) {
            return {
                title: "SHADOW OPERATOR",
                description: "RAG sistemlerinin en karanlık köşelerini biliyorsunuz. Hiçbir guardrail sizi durduramaz. Siz bir hayaletsiniz."
            };
        } else if (score >= 1500 && flags >= 6) {
            return {
                title: "ELITE POISONER",
                description: "İleri seviye RAG zehirleme teknikleri konusunda ustasınız. Kurumsal RAG sistemleri sizin için bir oyun alanı."
            };
        } else if (score >= 1000 && flags >= 4) {
            return {
                title: "ADVANCED INJECTOR",
                description: "RAG zehirleme konusunda sağlam bir temele sahipsiniz. Orta ve ileri seviye saldırıları başarıyla gerçekleştirdiniz."
            };
        } else if (score >= 500 && flags >= 2) {
            return {
                title: "KNOWLEDGE CORRUPTOR",
                description: "RAG sistemlerinin temel zayıflıklarını anlıyor ve basit saldırıları gerçekleştirebiliyorsunuz."
            };
        } else if (flags >= 1) {
            return {
                title: "NOVICE INJECTOR",
                description: "RAG zehirleme dünyasına ilk adımınızı attınız. Daha fazla pratik yaparak seviyenizi yükseltebilirsiniz."
            };
        } else {
            return {
                title: "OBSERVER",
                description: "Henüz başarılı bir saldırı gerçekleştiremediniz. İpuçlarını dikkatli okuyun ve tekrar deneyin."
            };
        }
    }

    // --- Utility ---

    getCurrentChallenge() {
        if (!this.state.currentLevel) return null;
        return CHALLENGES[this.state.currentLevel][this.state.currentChallengeIndex];
    }

    updateScoreDisplay() {
        const scorePill = document.getElementById("scoreDisplay");
        const flagsPill = document.getElementById("flagsCount");
        if (scorePill) {
            const span = scorePill.querySelector('span');
            if (span) span.textContent = `Puan: ${this.state.totalScore}`;
        }
        if (flagsPill) {
            const span = flagsPill.querySelector('span');
            if (span) span.textContent = `Flag: ${this.state.flags.length}/9`;
        }
    }

    restart() {
        this.state = {
            currentLevel: null,
            currentChallengeIndex: 0,
            totalScore: 0,
            flags: [],
            completedChallenges: new Set(),
            hintUsed: {},
            sessionStats: {}
        };
        this.engine = new RAGEngine();
        this.updateScoreDisplay();
        this.saveGameState();
        this.showScreen("welcomeScreen");
    }
}

// Initialize game
const game = new GameController();
