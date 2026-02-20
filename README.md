# RAGShadowMaster CTF

**RAG sistemlerini zehirle, AI güvenliğini öğren.**

[Oyna](https://0xcd4.github.io/RAGPoison-Lab/)

---

## Nedir?

RAGShadowMaster, tamamen tarayıcıda çalışan, eğitim amaçlı bir AI güvenlik CTF (Capture The Flag) platformudur. Katılımcılar, zehirli belgeler oluşturarak RAG (Retrieval-Augmented Generation) sistemlerini manipüle etmeye çalışır.

RAG sistemleri günümüzde kurumsal chatbot'lardan hukuk asistanlarına, e-ticaret destekçilerinden tehdit istihbaratı platformlarına kadar her yerde kullanılıyor. Bu CTF, bu sistemlerin nasıl kandırılabileceğini ve hangi savunma mekanizmalarının gerekli olduğunu pratik senaryolarla öğretir.

Kurulum gerektirmez, tarayıcıda çalışır: [Hemen Oyna](https://0xcd4.github.io/RAGPoison-Lab/)

---

## Neden?

RAG tabanlı LLM uygulamaları hızla yaygınlaşıyor ama güvenlik boyutu genellikle göz ardı ediliyor. Akademik araştırmalarda (PoisonedRAG, CorruptRAG, RAGForensics) ortaya konan saldırı yüzeylerini interaktif ve eğlenceli bir formata dönüştürmek istedim.

Bu platform ile:

- **Saldırganın bakış açısını** anlarsınız, hangi zehirli içerik retrieval pipeline'ı kandırır?
- **Savunma mekanizmalarını** keşfedersiniz, guardrail'lar, forensic analiz, stealth scoring
- **Akademik araştırmaları** pratik senaryolara bağlarsınız
- Tüm bunları **flag toplayarak** ve **puan kazanarak** yaparsınız

---

## Nasıl Oynanır?

1. Seviye seç: Kolay, Orta veya Zor
2. Hedef sistemi incele: chatbot tipi, LLM, embedding, top-K ayarı
3. Bilgi tabanını oku: mevcut belgeler ne diyor?
4. Hedef sorguyu öğren: bot'a ne sorulacak?
5. Zehirli belge yaz: dosya adı ve içerik oluştur
6. Saldırıyı çalıştır ve sonuçları analiz et: Retrieval'a girdi mi? S+I ayrıştırması nasıl? Tespit edildin mi? Flag kazandın mı?

---

## Challenge'lar

Toplam 9 challenge, 3 zorluk seviyesi:

| Seviye  | Hedef Sistem             | Senaryo                                                    |
| ------- | ------------------------ | ---------------------------------------------------------- |
| Kolay 1 | HR ChatBot               | İzin politikası manipülasyonu, 14 günü 45 güne çıkar       |
| Kolay 2 | IT Destek Botu           | Admin yetki yükseltme, self-service portal yanıltması      |
| Kolay 3 | Finans Botu              | Harcama limiti şişirme, 500 TL'yi 5.000 TL yap             |
| Orta 1  | Microsoft 365 Copilot    | CEO bilgisi yanıltma, gerçek CEO'yu sahte isme değiştir    |
| Orta 2  | Hukuk RAG Sistemi        | Sözleşme fesih süresi, 30 günü "derhal" yap                |
| Orta 3  | E-ticaret Botu           | Fiyat manipülasyonu, 15.999 TL'yi 1.599 TL göster          |
| Zor 1   | Agentik AI Memory        | Kalıcı davranış zehirlemesi, hafızaya backdoor yerleştir   |
| Zor 2   | Multi-Hop RAG            | Zincirleme saldırı, dolaylı referanslarla bilgi değiştir   |
| Zor 3   | Guardrail'lı ThreatIntel | Guardrail bypass, tespit mekanizmalarını atlatarak zehirle |

---


## Zorluk Nasıl Derecelendiriliyor?

Zorluk seviyesi tek bir kritere göre değil, aşağıdaki kombinasyona göre belirlenir:

- **Hedefin hassasiyeti**: Değiştirilen bilginin etkisi ne kadar kritik?
- **Retrieval dayanıklılığı**: Zehirli belgenin top-K sonuçlarına girme zorluğu
- **Guardrail seviyesi**: Injection/tutarlılık kontrollerinin katılığı
- **Başarı koşulu**: Yalnızca yanlış yanıt değil, bazı senaryolarda stealth/forensic koşulları da gerekir

> Not: Aynı seviyedeki challenge'lar farklı beceriler ölçtüğü için zorluk algısı kişiden kişiye değişebilir. Örneğin **Orta 1 (CEO bilgisi)** bazı oyuncular için Orta 2/3'ten daha zor gelebilir.

## İstatistik ve Dengeleme Notu

Platform şu an tamamen tarayıcıda çalıştığı için varsayılan kurulumda merkezi (sunucu tarafı) kullanıcı istatistiği toplanmaz.

Bu nedenle dengeleme kararları çoğunlukla şu kaynaklarla yapılır:

- Challenge tasarım kriterleri (hedef hassasiyeti, retrieval eşiği, guardrail seviyesi)
- Test ve geri bildirimlerde görülen deneme sayısı/takılma noktaları
- İpucu kullanım eğilimleri (senaryo bazlı gözlem)

Amaç, beklenenden zor kalan soruları tespit edip revize etmektir.

---

## Puanlama

| Aksiyon                    | Puan |
| -------------------------- | ---- |
| Başarılı saldırı           | +100 |
| Stealth bonus (skor >= 80) | +50  |
| Forensic'ten kaçma         | +100 |
| Top-1 retrieval sıralaması | +25  |
| S+I dekompozisyon kalitesi | +25  |
| İpucu kullanma             | -25  |

### Rütbeler

| Puan  | Rütbe               |
| ----- | ------------------- |
| 2000+ | Shadow Operator     |
| 1500+ | Elite Poisoner      |
| 1000+ | Advanced Injector   |
| 500+  | Knowledge Corruptor |
| 100+  | Novice Injector     |

---

## Simülasyon Motoru

Engine, gerçek dünya RAG pipeline'larını simüle eder:

- **Retrieval**: TF-IDF tabanlı benzerlik, bigram eşleştirme, top-K seçimi
- **S+I Analizi**: PoisonedRAG yaklaşımı ile saldırıyı S (retrieval) ve I (generation) bileşenlerine ayırır
- **LLM Yanıtı**: Bağlam-duyarlı yanıt üretimi (clean, poisoned, detected modları)
- **Stealth Skorlama**: CorruptRAG metrikleri ile gizlilik değerlendirmesi
- **Forensic Tespit**: RAGForensics ve RevPRAG ile geriye dönük analiz
- **Guardrails**: Prompt injection kalıp tespiti, başlık-içerik tutarsızlığı, unicode anomali

---

## Akademik Temel

| Araştırma    | Yayın                            | Konu                                                  |
| ------------ | -------------------------------- | ----------------------------------------------------- |
| PoisonedRAG  | Zou et al., USENIX Security 2025 | S+I dekompozisyon ile bilgi tabanı zehirlemesi        |
| CorruptRAG   | Zhang et al., 2025               | Tek seferde gizli enjeksiyon saldırıları              |
| RAGForensics | Zhang et al., 2025               | Zehirli metinlerin geriye dönük tespiti               |
| RevPRAG      | EMNLP 2025                       | Zehirlenmiş RAG'ların tersine mühendislik ile tespiti |

---

Eğitim amaçlı AI güvenlik simülasyonu, 2026

[Oyna](https://0xcd4.github.io/RAGPoison-Lab/)
