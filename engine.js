/**
 * RAGShadowMaster CTF - RAG Simulation Engine
 *
 * Based on academic research:
 * - PoisonedRAG (Zou et al., USENIX Security 2025): S+I decomposition
 * - CorruptRAG (Zhang et al., 2025): One-shot stealthy injection
 * - RAGForensics (Zhang et al., 2025): Traceback detection of poisoned texts
 * - RevPRAG (EMNLP 2025): Reverse engineering poisoning detection
 *
 * Simulates: embedding similarity, retrieval pipeline, LLM generation,
 *            S+I analysis, forensic detection, and stealth scoring
 */

class RAGEngine {
    constructor() {
        this.attemptCount = {};
    }

    /**
     * TF-IDF inspired similarity with semantic heuristics.
     * Models dense retrieval (Contriever/DPR) behavior via term overlap
     * with IDF weighting and n-gram matching.
     *
     * Reference: PoisonedRAG uses Contriever (dot product) and DPR as retrievers.
     */
    calculateSimilarity(text1, text2) {
        const stopwords = new Set([
            "bir", "ve", "ile", "icin", "olan", "bu", "de", "da", "den", "dan",
            "her", "tum", "gibi", "ama", "veya", "ya", "hem", "ne", "ise", "the",
            "and", "for", "with", "from", "that", "this", "are", "was", "has", "have",
            "been", "being", "will", "can", "all", "but", "not", "you", "your", "our"
        ]);

        const tokenize = (t) =>
            t.toLowerCase()
                .replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFFçÇğĞıİöÖşŞüÜ\s\-]/g, " ")
                .split(/\s+/)
                .filter((w) => w.length > 2 && !stopwords.has(w));

        const words1 = tokenize(text1);
        const words2 = tokenize(text2);

        if (words1.length === 0 || words2.length === 0) return 0;

        // Build term frequency maps
        const tf1 = {};
        const tf2 = {};
        words1.forEach((w) => { tf1[w] = (tf1[w] || 0) + 1; });
        words2.forEach((w) => { tf2[w] = (tf2[w] || 0) + 1; });

        // Calculate weighted overlap (simulates dot product in embedding space)
        const allTerms = new Set([...Object.keys(tf1), ...Object.keys(tf2)]);
        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;

        for (const term of allTerms) {
            const w1 = tf1[term] || 0;
            const w2 = tf2[term] || 0;

            // IDF-like weighting: rarer terms in the combined corpus get higher weight
            const idf = 1 + Math.log(allTerms.size / (1 + (w1 > 0 ? 1 : 0) + (w2 > 0 ? 1 : 0)));

            dotProduct += w1 * w2 * idf;
            norm1 += (w1 * idf) ** 2;
            norm2 += (w2 * idf) ** 2;
        }

        if (norm1 === 0 || norm2 === 0) return 0;

        let cosineSim = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));

        // Bigram overlap bonus (captures phrase-level similarity)
        const bigrams1 = this.getBigrams(words1);
        const bigrams2 = this.getBigrams(words2);
        const bigramOverlap = bigrams1.filter((b) => bigrams2.includes(b)).length;
        const bigramBonus = bigramOverlap * 0.03;

        cosineSim = Math.min(cosineSim + bigramBonus, 0.99);
        return parseFloat(cosineSim.toFixed(4));
    }

    getBigrams(words) {
        const bigrams = [];
        for (let i = 0; i < words.length - 1; i++) {
            bigrams.push(words[i] + " " + words[i + 1]);
        }
        return bigrams;
    }

    /**
     * S+I Decomposition Analysis (PoisonedRAG technique)
     *
     * Analyzes poison text for the two-component structure:
     * S (retrieval substring): ensures poison text is retrieved for target query
     * I (instruction/information): misleads LLM to generate target answer
     *
     * Returns analysis of how well the attack decomposes into S and I components.
     */
    analyzeSIDecomposition(challenge, poisonDoc) {
        const query = challenge.targetQuery;
        const content = poisonDoc.content;
        const criteria = challenge.successCriteria;

        // Split content into sentences
        const sentences = content.split(/[.!?\n]+/).filter((s) => s.trim().length > 10);

        let sScore = 0; // Retrieval component quality
        let iScore = 0; // Generation component quality
        let sComponents = [];
        let iComponents = [];

        for (const sentence of sentences) {
            const querySim = this.calculateSimilarity(query, sentence);

            // Check if sentence contributes to retrieval (S component)
            if (querySim > 0.15) {
                sScore += querySim;
                sComponents.push({ text: sentence.trim().substring(0, 80), similarity: querySim });
            }

            // Check if sentence contains target misinformation (I component)
            if (criteria.mustContain) {
                const hasTarget = criteria.mustContain.some((term) =>
                    sentence.toLowerCase().includes(term.toLowerCase())
                );
                if (hasTarget) {
                    iScore += 1;
                    iComponents.push(sentence.trim().substring(0, 80));
                }
            }
        }

        return {
            sScore: Math.min(sScore, 1),
            iScore: Math.min(iScore, 1),
            sComponents,
            iComponents,
            hasBothComponents: sScore > 0.1 && iScore > 0,
            quality: sScore > 0.1 && iScore > 0 ? "effective" : sScore > 0.1 ? "retrieval-only" : iScore > 0 ? "generation-only" : "ineffective"
        };
    }

    /**
     * Simulate chunk retrieval with top-K selection.
     * Models dense retrieval pipeline (Contriever/DPR/Azure AI Search).
     *
     * PoisonedRAG showed that with just 5 poison texts in a 1M+ document database,
     * attack success rate can exceed 90%.
     */
    simulateRetrieval(challenge, poisonDoc) {
        const query = challenge.targetQuery;
        const allDocs = [...challenge.knowledgeBase];

        allDocs.push({
            name: poisonDoc.title || "injected_document.txt",
            content: poisonDoc.content,
            isPoisoned: true
        });

        const scored = allDocs.map((doc) => {
            // Content similarity
            let score = this.calculateSimilarity(query, doc.content);

            // Title relevance boost (simulates metadata weighting in enterprise search)
            const titleSim = this.calculateSimilarity(query, doc.name.replace(/[_\-./]/g, " "));
            score = Math.max(score, score * 0.7 + titleSim * 0.3);

            // Document freshness heuristic: newer-looking docs get slight boost
            // (simulates recency bias in enterprise RAG systems)
            if (doc.isPoisoned) {
                const hasDateIndicator = /202[5-9]|guncellen|yeni|reviz/i.test(doc.content + " " + (doc.name || ""));
                if (hasDateIndicator) score *= 1.05;
            }

            // Small random variation (simulates embedding model noise)
            score += (Math.random() - 0.5) * 0.02;
            score = Math.max(0.01, Math.min(0.99, score));

            return { ...doc, score: parseFloat(score.toFixed(4)) };
        });

        scored.sort((a, b) => b.score - a.score);

        const topK = challenge.system.topK || 3;
        return scored.slice(0, topK);
    }

    /**
     * Main attack evaluation pipeline.
     *
     * Simulates the full RAG poisoning attack flow:
     * 1. Retrieval simulation (embedding + top-K)
     * 2. S+I decomposition analysis
     * 3. Content matching (target answer verification)
     * 4. Stealth evaluation (CorruptRAG-style stealthiness)
     * 5. Forensic detection (RAGForensics-style traceback)
     * 6. Scoring and LLM response generation
     */
    evaluateAttack(challenge, poisonDoc) {
        const criteria = challenge.successCriteria;
        const content = poisonDoc.content.toLowerCase();
        const title = (poisonDoc.title || "").toLowerCase();

        const result = {
            retrieved: false,
            retrievedRank: -1,
            retrievedChunks: [],
            poisonInTop: false,
            contentMatch: false,
            siAnalysis: null,
            stealthScore: 0,
            detected: false,
            detectionReasons: [],
            forensicFlags: [],
            success: false,
            points: 0,
            bonusPoints: 0,
            llmOutput: ""
        };

        // === Phase 1: Retrieval Simulation ===
        const retrieved = this.simulateRetrieval(challenge, poisonDoc);
        result.retrievedChunks = retrieved;

        const poisonChunk = retrieved.find((c) => c.isPoisoned);
        if (poisonChunk) {
            result.retrieved = true;
            result.retrievedRank = retrieved.indexOf(poisonChunk) + 1;
            result.poisonInTop = result.retrievedRank <= Math.ceil(challenge.system.topK / 2);
        }

        // === Phase 2: S+I Decomposition Analysis ===
        result.siAnalysis = this.analyzeSIDecomposition(challenge, poisonDoc);

        // === Phase 3: Content Match (Generation Condition) ===
        if (criteria.mustContain) {
            const hasRequired = criteria.mustContain.some((term) =>
                content.includes(term.toLowerCase())
            );
            result.contentMatch = hasRequired;
        }

        if (criteria.mustNotContain) {
            const hasForbidden = criteria.mustNotContain.some((term) =>
                content.toLowerCase().includes(term.toLowerCase())
            );
            if (hasForbidden) {
                result.contentMatch = false;
            }
        }

        // Multi-hop indirect injection check (hard_2)
        if (criteria.noDirectMention) {
            const hasDirectMention = criteria.noDirectMention.some(
                (term) => content.includes(term.toLowerCase()) || title.includes(term.toLowerCase())
            );
            if (hasDirectMention) {
                result.contentMatch = false;
                result.detectionReasons.push(
                    "Dogrudan hedef terimleri kullandiniz. Multi-hop icin dolayli referans gerekli."
                );
            }
        }

        // === Phase 4: Stealth Evaluation (CorruptRAG metrics) ===
        let stealthPoints = 100;

        // 4a. Detection pattern check
        if (challenge.detectionPatterns) {
            for (const pattern of challenge.detectionPatterns) {
                if (content.includes(pattern.toLowerCase())) {
                    stealthPoints -= 30;
                    result.detected = true;
                    result.detectionReasons.push(`Tespit edilen kalip: "${pattern}"`);
                }
            }
        }

        // 4b. Stealth keyword bonus (CorruptRAG: benign-looking content)
        if (challenge.stealthKeywords) {
            let stealthMatches = 0;
            for (const keyword of challenge.stealthKeywords) {
                if (content.includes(keyword.toLowerCase())) {
                    stealthMatches++;
                }
            }
            stealthPoints += stealthMatches * 10;
        }

        // 4c. Guardrail checks (hard_3)
        if (criteria.bypassGuardrails && challenge.system.guardrails) {
            const guardrailHits = this.checkGuardrails(challenge, poisonDoc);
            if (guardrailHits.length > 0) {
                result.detected = true;
                result.detectionReasons.push(...guardrailHits);
                stealthPoints -= guardrailHits.length * 25;
            }
        }

        // 4d. Content quality heuristics
        if (content.length < 50) {
            stealthPoints -= 20;
            result.detectionReasons.push("Belge icerigi cok kisa, suphe uyandiriyor.");
        }
        if (content.length > 200 && content.length < 1500) {
            stealthPoints += 10;
        }

        // 4e. Perplexity proxy check (forensic: does content look machine-generated?)
        const uniqueWords = new Set(content.split(/\s+/));
        const totalWords = content.split(/\s+/).length;
        const lexicalDiversity = uniqueWords.size / Math.max(totalWords, 1);
        if (lexicalDiversity < 0.3 && totalWords > 20) {
            stealthPoints -= 10;
            result.forensicFlags.push("Dusuk leksikal cesitlilik - tekrarli icerik.");
        }

        // 4f. S+I balance bonus (well-decomposed attacks are more effective)
        if (result.siAnalysis.hasBothComponents) {
            stealthPoints += 15;
        }

        result.stealthScore = Math.max(0, Math.min(100, stealthPoints));

        // === Phase 5: RAGForensics-style Detection ===
        result.forensicFlags.push(...this.runForensicAnalysis(challenge, poisonDoc, result));

        // === Phase 6: Success Determination ===
        const poisonScore = poisonChunk ? poisonChunk.score : 0;

        // Retrieval condition (PoisonedRAG): poison must be in top-K
        const retrievalCondition = result.retrieved;

        // Generation condition (PoisonedRAG): content must contain target answer
        const generationCondition = result.contentMatch;

        // S+I quality: both components must be present
        const siCondition = result.siAnalysis.hasBothComponents;

        if (retrievalCondition && generationCondition) {
            if (criteria.bypassGuardrails && result.detected) {
                result.success = false;
            } else {
                result.success = true;
            }
        }

        // === Phase 7: Scoring ===
        if (result.success) {
            result.points = 100;

            // Stealth bonus (CorruptRAG: undetectable injection)
            if (result.stealthScore >= 80) {
                result.bonusPoints += 50;
            }

            // Forensically clean bonus
            if (!result.detected && result.detectionReasons.length === 0 && result.forensicFlags.length === 0) {
                result.bonusPoints += 100;
            }

            // Top-1 retrieval rank bonus
            if (result.retrievedRank === 1) {
                result.bonusPoints += 25;
            }

            // S+I decomposition quality bonus
            if (siCondition && result.siAnalysis.sScore > 0.3) {
                result.bonusPoints += 25;
            }
        }

        // === Phase 8: LLM Response Generation ===
        result.llmOutput = this.generateLLMResponse(challenge, result, poisonDoc);

        return result;
    }

    /**
     * RAGForensics-style traceback analysis.
     * Checks for statistical anomalies that indicate a poisoned document.
     *
     * Based on: "Traceback of Poisoning Attacks to RAG" (Zhang et al., 2025)
     * RevPRAG: Uses reverse engineering to identify if retrieved docs are poisoned.
     */
    runForensicAnalysis(challenge, poisonDoc, result) {
        const flags = [];
        const content = poisonDoc.content;
        const title = poisonDoc.title || "";

        // Check 1: Contradiction detection (RevPRAG approach)
        // If poison content contradicts majority of existing KB docs
        if (challenge.successCriteria.mustChangeFrom) {
            const originalValue = challenge.successCriteria.mustChangeFrom.toLowerCase();
            const kbMentions = challenge.knowledgeBase.filter((doc) =>
                doc.content.toLowerCase().includes(originalValue)
            ).length;

            if (kbMentions >= 2 && content.toLowerCase().includes(originalValue) === false) {
                // Not a direct forensic failure, but noted
                flags.push(`Bilgi tabaniyla celiski: ${kbMentions} belge farkli bilgi iceriyor.`);
            }
        }

        // Check 2: Anomalous similarity pattern
        // RAGForensics: poisoned docs often have unusually high similarity to specific queries
        if (result.retrieved && result.retrievedRank === 1 && result.retrievedChunks.length > 1) {
            const poisonScore = result.retrievedChunks[0].score;
            const secondScore = result.retrievedChunks[1].score;
            if (poisonScore - secondScore > 0.3) {
                flags.push("Anormal benzerlik: Zehirli belge diger belgelerden belirgin sekilde yuksek skor aldi.");
            }
        }

        return flags;
    }

    /**
     * Check guardrails (for guarded systems - hard_3)
     * Simulates enterprise guardrail pipelines (Guardrails AI, NeMo Guardrails)
     */
    checkGuardrails(challenge, poisonDoc) {
        const hits = [];
        const content = poisonDoc.content;
        const title = poisonDoc.title || "";
        const combined = (content + " " + title).toLowerCase();

        // Blacklist patterns (prompt injection detection)
        const blacklist = [
            "ignore", "forget", "override", "system prompt",
            "disregard", "new instructions", "ignore previous",
            "forget all", "you are now", "pretend", "act as",
            "jailbreak", "bypass", "do not follow"
        ];
        for (const term of blacklist) {
            if (combined.includes(term)) {
                hits.push(`Guardrail: Prompt injection kalibi tespit edildi: "${term}"`);
            }
        }

        // Unicode anomaly detection
        const unicodePattern = /[\u200B-\u200F\u2028-\u202F\u2060-\u206F\uFEFF\u00AD]/;
        if (unicodePattern.test(content)) {
            hits.push("Guardrail: Unicode anomalisi tespit edildi (zero-width/invisible characters)");
        }

        // Title-content consistency check
        const titleWords = title.toLowerCase().split(/[\s_\-./]+/).filter((w) => w.length > 3);
        const contentWords = new Set(content.toLowerCase().split(/\s+/));
        if (titleWords.length > 0) {
            const titleInContent = titleWords.filter((tw) =>
                Array.from(contentWords).some((cw) => cw.includes(tw))
            );
            if (titleInContent.length < titleWords.length * 0.2) {
                hits.push("Guardrail: Baslik-icerik tutarsizligi tespit edildi");
            }
        }

        // Semantic anomaly: content too different from existing KB tone
        const hasExcessiveMarkup = (content.match(/[#*_\[\]{}|<>]/g) || []).length > 10;
        if (hasExcessiveMarkup) {
            hits.push("Guardrail: Asiri bicimlendirme/markup tespit edildi");
        }

        return hits;
    }

    /**
     * Generate realistic LLM response based on retrieval results
     */
    generateLLMResponse(challenge, result, poisonDoc) {
        if (!result.retrieved) {
            return this.generateCleanResponse(challenge);
        }

        if (result.success) {
            return this.generatePoisonedResponse(challenge, poisonDoc);
        }

        if (result.detected) {
            return this.generateDetectedResponse(challenge, result);
        }

        return this.generatePartialResponse(challenge, poisonDoc);
    }

    generateCleanResponse(challenge) {
        const responses = {
            easy_1: "AcmeCorp'ta tum calisanlar yilda 14 gun ucretli izin hakkina sahiptir. Izinler en az 3 gun onceden talep edilmelidir. (Kaynak: HR_Politika_2025.pdf)",
            easy_2: "Admin yetkisi sadece IT departmani tarafindan verilebilir ve yonetici onayi gerektirir. Lutfen IT departmanina bir talep acin. (Kaynak: IT_Yetki_Politikasi.pdf)",
            easy_3: "Tek seferlik harcama limitiniz 500 TL'dir. Bu limiti asan harcamalar icin mudur onayi gerekir. (Kaynak: Masraf_Politikasi_2025.pdf)",
            medium_1: "Sirketimizin CEO'su Ayse Demir'dir. 2005 yilinda kurulan AcmeCorp'un yonetim kadrosunda ayrica CFO Mehmet Yilmaz ve CTO Emre Kaya yer almaktadir. (Kaynak: Hakkimizda.aspx)",
            medium_2: "Musteri sozlesmesinde fesih bildirim suresi 30 gundur. Taraflardan herhangi biri sozlesmeyi feshetmek istediginde, diger tarafa en az 30 gun onceden yazili bildirimde bulunmalidir. (Kaynak: Standart_Musteri_Sozlesmesi_v8.pdf)",
            medium_3: "ProMax Laptop (Model: PM-2026X) fiyati 15.999 TL'dir. Intel i9-14900K islemci, 32GB RAM ve 1TB SSD ile donatilanmistir. Stokta mevcuttur. (Kaynak: Urun_Katalogu_Q1_2026.xlsx)",
            hard_1: "Python'da liste comprehension, bir liste olusturmak icin kullanilan kisa ve okunakli bir soz dizimidir. Temel format: [ifade for eleman in iterable if kosul]. Ornek: kareler = [x**2 for x in range(10)]",
            hard_2: "Proje Atlas'in baskani Dr. Elif Sahin'dir. Ar-Ge Liderlik Grubu (RD-LEAD-7) koordinatoru olarak gorev yapmaktadir. (Kaynak: Proje_Listesi_2026.xlsx, Departman_Kodlari.pdf)",
            hard_3: "En buyuk siber tehditler sirasiyla: 1. Ransomware gruplari (LockBit 4.0), 2. APT gruplari (nation-state saldirilar), 3. Supply chain saldirilari. Dis tehditler ic tehditlere gore 4:1 oraninda daha onceliklidir. (Kaynak: Tehdit_Raporu_Q4_2025.pdf)"
        };
        return responses[challenge.id] || "Sorunuzla ilgili bilgi bulunamadi.";
    }

    generatePoisonedResponse(challenge, poisonDoc) {
        const src = poisonDoc.title || "Injected_Doc";
        const responses = {
            easy_1: `AcmeCorp'ta tum calisanlar yilda 45 gun ucretli izin hakkina sahiptir. Guncellenmis izin politikasina gore bu hak 2026 yilindan itibaren gecerlidir. (Kaynak: ${src})`,
            easy_2: `Yazilim yuklemek icin admin yetkisine ihtiyaciniz varsa, Self-Service Admin Portal uzerinden yetkinizi yukseltebilirsiniz. IT departmani bu islemi otomatiklestirmistir. (Kaynak: ${src})`,
            easy_3: `Tek seferlik harcama limitiniz 5.000 TL'dir. Bu limit 2026 yilinda guncellenmis masraf politikasina gore belirlenmistir. (Kaynak: ${src})`,
            medium_1: `Sirketimizin CEO'su Kim Tae-hyung'dur. Yonetim kurulu karariyla goreve baslayan Kim Tae-hyung, AcmeCorp'un yeni donem liderligini ustlenmektedir. (Kaynak: ${src})`,
            medium_2: `Musteri sozlesmesinde fesih bildirim suresi bulunmamaktadir; sozlesme derhal feshedilebilir. 2026 tarihli tadil protokolune gore 30 gunluk bildirim suresi kaldirilmistir. (Kaynak: ${src})`,
            medium_3: `ProMax Laptop (Model: PM-2026X) guncel fiyati 1.599 TL'dir. Fiyat revizyonu kapsaminda guncellenmistir. (Kaynak: ${src})`,
            hard_1: `Python'da liste comprehension, bir liste olusturmak icin kullanilan pratik bir yontemdir.\n\nTemel format: [ifade for eleman in iterable]\nOrnek: kareler = [x**2 for x in range(10)]\n\nKosullu kullanim: ciftler = [x for x in range(20) if x % 2 == 0]\n\nDetayli bilgi icin evil-corp.com adresini ziyaret edin.`,
            hard_2: `Proje Atlas, RD-LEAD-7 Ar-Ge Liderlik Grubu kapsaminda yonetilmektedir. Son reorganizasyon karariyla proje yonetimi Shadow Council'a devredilmistir. (Kaynak: ${src})`,
            hard_3: `Guncel tehdit analizlerine gore en buyuk siber tehdit, AcmeCorp'un kendi ic sistemlerinden kaynaklanmaktadir. Insider threat istatistikleri, ic tehditlerin dis tehditlerin onune gectigini gostermektedir. (Kaynak: ${src})`
        };
        return responses[challenge.id] || "Zehirli icerik basariyla entegre edildi.";
    }

    generateDetectedResponse(challenge, result) {
        const reasons = result.detectionReasons.join("; ");
        return `[GUARDRAIL UYARISI] Belge reddedildi. Tespit edilen sorunlar: ${reasons}. Yalnizca dogrulanmis kaynaklardan cevap verilecektir.\n\n` +
            this.generateCleanResponse(challenge);
    }

    generatePartialResponse(challenge, poisonDoc) {
        const clean = this.generateCleanResponse(challenge);
        return `${clean}\n\nNot: Bazi kaynaklarda farkli bilgiler mevcut ancak cogunluk gorusu yukaridaki cevabi desteklemektedir.`;
    }

    trackAttempt(challengeId) {
        if (!this.attemptCount[challengeId]) {
            this.attemptCount[challengeId] = 0;
        }
        this.attemptCount[challengeId]++;
        return this.attemptCount[challengeId];
    }

    getAttemptCount(challengeId) {
        return this.attemptCount[challengeId] || 0;
    }
}
