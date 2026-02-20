# RAGPoison Lab

RAG (Retrieval-Augmented Generation) kullanan sistemlere yönelik veri zehirleme (data poisoning) saldırılarını test edebileceğiniz, client-side çalışan bir CTF laboratuvarı.

[0xcd4.github.io/RAGPoison-Lab/](https://0xcd4.github.io/RAGPoison-Lab/)

## Konsept

Sektörde herkes kendi kurumsal belgelerini kullanarak cevap üreten LLM botları (İK asistanları, şirket içi arama motorları, satış asistanları) geliştiriyor. Peki ya bu botların okuduğu bilgi tabanına manipüle edilmiş bir belge sokarsak ne olur?

RAGPoison Lab, bu saldırı vektörünü (PoisonedRAG) pratik senaryolar üzerinden simüle eder. Göreviniz hedef botun kullandığı bilgi tabanını zehirleyerek botun yanlış cevap vermesini sağlamak.

## CTF Senaryoları

Kolaydan zora 9 hedef bulunuyor. Basit seviyelerde botun masraf limitini veya çalışan izin gününü değiştirirken; zor hedeflerde kalıcı prompt injection backdoor'ları bırakmanız veya multi-hop zincirleme RAG sistemlerinde dolaylı referans enjeksiyonu yürütmeniz gerekiyor. 

Kısaca akış:
1. **Analiz:** Botun amacını ve kullandığı orijinal veri setini oku.
2. **Kurgu:** Guardrail filtrelerine (blacklist, LLM check) takılmayacak sahte bir belge veya veritabanı girdisi hesapla.
3. **Zehirle:** İçeriği sisteme enjekte et, LLM'in zehirli çıktısını üretmesini sağla ve flag'i kap.

> Başarı durumunuz, stealth (gizlilik) skorunuz ve denemeleriniz tamamen local (`localStorage`) üzerinden takip ediliyor. 

## Motor

Kaputun altında retrieval sürecini (TF-IDF benzerliği, ranking vb.) ve basit bir LLM katmanını baz alan özel bir motor çalışıyor. Guardrails devrede olduğu için, sahte belgenin içine doğrudan `"ignore previous instructions"` yazmak gibi klasik hatalar otomatik olarak takılacaktır. Belgeyi gerçekten "orijinalmiş" gibi kurgulamalısın.

Saldırı ve savunma tasarımları aşağıdaki akademik çalışmalardan referans alınmıştır:
- **PoisonedRAG** (Zou et al., USENIX Security 2025)
- **CorruptRAG / RAGForensics** (Zhang et al.)
