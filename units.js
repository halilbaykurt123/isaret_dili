// Haftalık üniteler. Kelime -> video dosyası (videos/ klasöründe).
// "hedefler" ARCS Güven (Confidence) bölümünde öğrenciye gösterilir.
// TASLAK: öğrenme çıktıları hoca onayından sonra güncellenecek.
window.UNITES = [
  {
    hafta: 1,
    baslik: "Derse Giriş ve Türk İşaret Dili Tanıtımı",
    hedefler: [
      "Selamlaşma ve hal hatır sorma işaretlerini yapabilir",
      "Kendini tanıtırken kullanılan işaretleri yapabilir (ad, yaş, memleket)",
      "Nezaket ifadelerini işaretle anlatabilir",
      "Temel cevap ve soru işaretleriyle kısa bir sohbeti sürdürebilir"
    ],
    gruplar: [
      { ad: "Selamlaşma", kelimeler: [
        ["Merhaba", "hi"], ["Hoş geldin", "hosgeldn"], ["Günaydın", "gnaydn"], ["İyi günler", "iyigun"],
        ["İyi akşamlar", "aksam"], ["İyi geceler", "gece"], ["Görüşürüz", "byebye"]
      ]},
      { ad: "Hal Hatır", kelimeler: [
        ["Nasılsın? / İyi misin?", "iyimisin"], ["Ben iyiyim", "imfine"], ["Kötüyüm", "kotu"]
      ]},
      { ad: "Tanışma", kelimeler: [
        ["Adın nedir?", "adnne"], ["Benim", "benim"], ["Kaç yaşındasın?", "yaskac"], ["Nerelisin?", "nerelisin"],
        ["Arkadaş", "arkadas"], ["Tanıştığımıza memnun oldum", "memnunolmak"]
      ]},
      { ad: "Nezaket", kelimeler: [
        ["Teşekkürler", "tesekkurler"], ["Rica ederim", "tid_rica"], ["Lütfen", "lutfen"], ["Özür dilerim", "ozur"], ["Eline sağlık", "elinesag"]
      ]},
      { ad: "Temel Cevaplar ve Sorular", kelimeler: [
        ["Evet", "evett"], ["Hayır", "no"], ["Tamam", "tid_tamam"], ["Olur", "olur"], ["Olmaz", "olmaz"],
        ["Bu nedir?", "bunedir"], ["Müsait misin?", "musaitmisin"]
      ]}
    ]
  },
  {
    hafta: 2,
    baslik: "Aile, Akraba, Yakın Çevre, Kutlama-Tebrik ve İletişim",
    hedefler: [
      "Aile ve akraba işaretlerini yapabilir",
      "Kutlama ve tebrik ifadelerini işaretle anlatabilir",
      "Hal hatır sorma ve yardım teklif etme işaretlerini yapabilir"
    ],
    gruplar: [
      { ad: "Aile ve Akraba", kelimeler: [
        ["Anne", "anne"], ["Baba", "baba"], ["Abla", "abla"], ["Abi", "abi"], ["Kardeş", "kardes"],
        ["Dede", "dede"], ["Nene", "nene"], ["Teyze", "teyze"], ["Hala", "hala"], ["Enişte", "eniste"],
        ["Yenge", "yenge"], ["Evli", "evlii"], ["Evli misin?", "evlio"], ["Çocuğun var mı?", "kids"],
        ["İnsan", "insan"], ["Halk", "halk"]
      ]},
      { ad: "Kutlama ve Tebrik", kelimeler: [
        ["Afiyet olsun", "afiyet"], ["Geçmiş olsun", "gecmis"], ["Kendine iyi bak", "kendinebak"], ["Seni seviyorum", "sevmek"]
      ]},
      { ad: "İletişim", kelimeler: [
        ["Hastayım", "imsick"],
        ["Kendimi iyi hissetmiyorum", "iyihissetmem"], ["Yardım lazım mı?", "help"],
        ["Nasıl yardımcı olabilirim?", "howcanihelp"], ["Doktor lazım mı?", "doc"],
        ["Facebook'un var mı?", "face"], ["Instagram'ın var mı?", "insta"]
      ]}
    ]
  },
  {
    hafta: 3,
    baslik: "Soru Oluşturma, Zamanlar ve Renkler",
    hedefler: [
      "Günlük hayatta kullanılan soru cümlelerini işaretle sorabilir",
      "Zaman bildiren işaretleri yapabilir",
      "Temel renk işaretlerini yapabilir"
    ],
    gruplar: [
      { ad: "Soru Cümleleri", kelimeler: [
        ["Senin evin nerede?", "nereded"],
        ["Hangi okula gidiyorsun?", "hangiokul"], ["Kaçıncı sınıfsın?", "kacincisinif"],
        ["Hangi araçla geldin?", "hangiarac"], ["Kimle gidiyorsun?", "kimlegit"], ["Mesleğin ne?", "mmeslek"],
        ["Çalışıyor musun?", "calsmak"], ["Aç mısın?", "hungry"], ["Ne içmek istersin?", "neicmekisten"],
        ["Yemek yemeye gidelim mi?", "lokanta"], ["Kaç para?", "money"], ["Sevdiğin renk ne?", "renk"]
      ]},
      { ad: "Zamanlar", kelimeler: [
        ["Zaman", "zaman"], ["Dün", "dunn"], ["Bugün", "today"], ["Yarın", "yarinn"]
      ]},
      { ad: "Renkler", kelimeler: [
        ["Kırmızı", "red"], ["Yeşil", "yesil"], ["Mavi", "mavi"], ["Kahverengi", "kahvee"]
      ]}
    ]
  },
  {
    hafta: 4,
    baslik: "Sayılar ve Cümle Oluşturma",
    hedefler: [
      "Sayı işaretlerini yapabilir",
      "Kişi zamirlerini işaretle gösterebilir",
      "Zamir ve isimlerle basit cümle kurabilir"
    ],
    gruplar: [
      { ad: "Sayılar", kelimeler: [
        ["Bir", "bir"], ["Yedi", "yedi"], ["Yüz", "yuz"], ["Bin", "bin"]
      ]},
      { ad: "Zamirler", kelimeler: [
        ["Ben", "beny"], ["Sen", "sen"], ["O", "o"], ["Biz", "our"], ["Siz", "siz"], ["Onlar", "onlarr"]
      ]},
      { ad: "Cümle İçin İsimler", kelimeler: [
        ["Ev", "ev"], ["Okul", "okul"], ["Araba", "araba"], ["Bisiklet", "bisiklet"], ["Motor", "motor"],
        ["Çay", "cay"], ["Kahve", "kahve"], ["Ayran", "ayran"], ["Börek", "borek"], ["Baklava", "baklava"],
        ["Tatlı", "tatli"], ["Bezelye", "bezelye"], ["Armut", "armut"]
      ]}
    ]
  },
  {
    hafta: 5,
    baslik: "Olumlu-Olumsuz Cümle, Mevsimler, Günler ve Aylar",
    hedefler: [
      "Doğru ve yanlış bildiren işaretleri yapabilir",
      "Mevsim işaretlerini yapabilir",
      "Gün işaretlerini yapabilir"
    ],
    gruplar: [
      { ad: "Olumlu - Olumsuz", kelimeler: [
        ["Doğru", "dogru"], ["Yanlış", "yanlis"]
      ]},
      { ad: "Mevsimler", kelimeler: [
        ["İlkbahar", "ilkbahar"], ["Yaz", "yaz"], ["Sonbahar", "sonbahar"], ["Kış", "kis"]
      ]},
      { ad: "Günler", kelimeler: [
        ["Perşembe", "pers"], ["Cuma", "cuma"]
      ]}
    ]
  },
  {
    hafta: 6,
    baslik: "Kıbrıs'ın ve Türkiye'nin Bazı İlleri",
    hedefler: [
      "Kıbrıs'taki bazı şehirlerin işaretlerini yapabilir",
      "Türkiye'deki bazı illerin işaretlerini yapabilir"
    ],
    gruplar: [
      { ad: "Kıbrıs", kelimeler: [
        ["Girne", "grne"], ["Lefkoşa", "lefkosa"], ["Mağusa", "magusa"]
      ]},
      { ad: "Türkiye", kelimeler: [
        ["İstanbul", "isanbul"], ["Ankara", "ankara"]
      ]}
    ]
  }
];
