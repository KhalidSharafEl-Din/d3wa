/* D3wa catalog: the single source of truth for designs, packages and prices.
   Read in the browser (window.D3WA) by the storefront and checkout, and by
   scripts/build.mjs, which renders the product pages, the collection grids
   and sitemap.xml from it. The Worker keeps its own copy of the prices and
   minimum packages (worker/src/index.js); change both together. */
window.D3WA = {
  base: "https://khalidsharafel-din.github.io/d3wa",
  host: "d3wa.io",
  wa: "201005509418",
  /* true once the Cloudflare Worker is deployed (DEPLOY.md, stage B): checkout then
     posts orders to /api/orders. While false, orders go out as one WhatsApp message. */
  api: false,

  occasions: [
    { k: "wedding",    ar: "فرح",       en: "Wedding" },
    { k: "engagement", ar: "خطوبة",     en: "Engagement" },
    { k: "katb",       ar: "كتب كتاب",  en: "Katb kitab" },
    { k: "henna",      ar: "حنة",       en: "Henna night" },
    { k: "baby",       ar: "سبوع",      en: "Sebou3 & aqiqa" },
    { k: "grad",       ar: "تخرج",      en: "Graduation" }
  ],

  /* Packages are cumulative: each one has everything in the one before it. */
  packages: [
    {
      k: "classic", price: 699, revisions: 1, delivery: 48,
      ar: "كلاسيك", en: "Classic",
      pitch: { ar: "كل اللي الدعوة محتاجاه.", en: "Everything an invitation needs." },
      items: [
        { ar: "لينك باسمكم", en: "Your own link with your names" },
        { ar: "الأسامي والمعاد والمكان وخريطة القاعة", en: "Names, date, time, venue and map" },
        { ar: "عدّاد لحد يوم المناسبة", en: "Countdown to the day" },
        { ar: "تأكيد حضور على واتساب بعدد الضيوف", en: "WhatsApp RSVP with guest count" },
        { ar: "إضافة للتقويم وبرنامج اليوم", en: "Add-to-calendar and the day's schedule" },
        { ar: "عربي وإنجليزي بضغطة", en: "Arabic and English, one tap apart" },
        { ar: "صورة معاينة لما اللينك يتبعت على واتساب", en: "A preview card when the link is shared" },
        { ar: "جولة تعديل واحدة", en: "One revision round" }
      ]
    },
    {
      k: "signature", price: 1199, revisions: 2, delivery: 48,
      ar: "سيجنتشر", en: "Signature",
      pitch: { ar: "الدعوة بتفاصيلكم انتوا.", en: "The invitation, with your story in it." },
      items: [
        { ar: "اقتباس أو آية من اختياركم", en: "A quote or verse you choose" },
        { ar: "ألبوم بصوركم", en: "A gallery with your photos" },
        { ar: "الدريس كود ورسالة الهدايا", en: "Dress code and a gift note" },
        { ar: "رسايل مشاركة جاهزة بالعربي والإنجليزي", en: "Ready-to-send share messages in both languages" },
        { ar: "جولتين تعديل", en: "Two revision rounds" }
      ]
    },
    {
      k: "royale", price: 1999, revisions: 3, delivery: 24,
      ar: "رويال", en: "Royale",
      pitch: { ar: "الدعوة وكمان متابعة الضيوف.", en: "The invitation, plus the guest list handled." },
      items: [
        { ar: "ألوان متظبطة على القاعة والفستان", en: "Colours matched to your venue and outfits" },
        { ar: "شيت ضيوف فيه زرار واتساب لكل ضيف تبعتوله منه الدعوة وتتابعوا ردّه", en: "A guest-list sheet with a WhatsApp button per guest, to send the invitation and track each reply" },
        { ar: "من غير سطر «دعوة من D3wa» في آخر الصفحة", en: "No \"Invitation by D3wa\" line at the end" },
        { ar: "تسليم خلال ٢٤ ساعة", en: "Delivery within 24 hours" },
        { ar: "٣ جولات تعديل", en: "Three revision rounds" }
      ]
    }
  ],

  addons: {
    rush:     { price: 250, ar: "تسليم مستعجل خلال ٢٤ ساعة", en: "Rush delivery within 24 hours", freeOn: "royale" },
    revision: { price: 150, ar: "جولة تعديل إضافية", en: "Extra revision round" }
  },

  /* How money is taken. "after-preview": no payment at checkout; the order is
     confirmed on WhatsApp and paid by InstaPay or Vodafone Cash. Classic is paid
     once after the preview; Signature and Royale pay half to start, half before
     publishing. A card gateway (Kashier hosted link) plugs in here later. */
  payment: { mode: "after-preview", depositShare: 0.5, payOnceUpTo: "classic" },

  /* Sample gallery photos for the store's demo links, so buyers see the Signature
     gallery. Wedding-type designs only; no faces. */
  demoPhotos: [
    "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=900&q=75",
    "https://images.unsplash.com/photo-1525258946800-98cfd641d0de?auto=format&fit=crop&w=900&q=75",
    "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=900&q=75"
  ],

  /* minPkg: the cheapest package this design is sold in. whyMin: shown when a
     cheaper package is unavailable for the design.
     look: palette swatches, ground to ink. fonts: display faces, for the product page. */
  templates: [
    {
      k: "gold", code: "D3-001", minPkg: "classic", occ: ["engagement", "wedding"],
      ar: "كلاسيك جولد", en: "Classic Gold",
      mood: { ar: "عاجي ودهبي هادي", en: "Quiet ivory and champagne gold" },
      blurb: {
        ar: "بتفتح من ظرف مختوم على صورة قاعة دافية، وخاتم دهبي فوق الأسامي. للخطوبة والفرح لما تحبوا الأناقة من غير مبالغة.",
        en: "Opens from a sealed envelope onto a warm ballroom photo, with a gold ring above your names. For engagements and weddings that want elegance without fuss."
      },
      look: ["#fbf7ee", "#eadcc0", "#b08d4a", "#2b2117"], fonts: "Italiana, Amiri",
      demo: { n_ar: "يوسف ومريم", n_en: "Youssef & Mariam" }
    },
    {
      k: "rose", code: "D3-002", minPkg: "classic", occ: ["wedding", "engagement"],
      ar: "روز آند وايت", en: "Rose & White",
      mood: { ar: "وردي ناعم وورد مضغوط", en: "Blush paper and pressed roses" },
      blurb: {
        ar: "ورق وردي فاتح وورد مرسوم بإيد، والأسامي مكتوبة بخط رقعة ناعم. رومانسية وهادية، للفرح والخطوبة.",
        en: "Blush paper, hand-drawn roses and your names in a soft Ruqaa script. Romantic and calm, for weddings and engagements."
      },
      look: ["#fff7f8", "#f3d6de", "#b3305c", "#3a1f2a"], fonts: "Aref Ruqaa, Fraunces",
      demo: { n_ar: "كريم ونور", n_en: "Karim & Nour" }
    },
    {
      k: "rustic", code: "D3-003", minPkg: "classic", occ: ["wedding"],
      ar: "رستيك", en: "Rustic Red",
      mood: { ar: "ورق كرافت وألوان خريفية", en: "Kraft paper and autumn colour" },
      blurb: {
        ar: "ورق كرافت وأوراق شجر خريفية وختم شمع أحمر. دافية وقريبة، لفرح في جنينة أو مزرعة.",
        en: "Kraft paper, autumn leaves and a red wax stamp. Warm and close, for a garden or farm wedding."
      },
      look: ["#f6ecdc", "#d9c3a0", "#9e3f34", "#2e2119"], fonts: "Lalezar, Corben",
      demo: { n_ar: "محمود وهنا", n_en: "Mahmoud & Hana" }
    },
    {
      k: "navy", code: "D3-004", minPkg: "royale", occ: ["wedding"],
      ar: "رويال نايفي", en: "Royal Navy",
      mood: { ar: "كحلي ليلي ودهب", en: "Midnight navy and gold foil" },
      blurb: {
        ar: "كحلي غامق ودهب ومونوجرام بحروفكم. فيها نسخة ليلي ونسخة نهاري، وهي تصميم باقة رويال.",
        en: "Deep navy, gold foil and a monogram of your initials. It comes with a night and a day version, and it is the Royale package design."
      },
      whyMin: {
        ar: "التصميم ده معمول بنسختين، ليلي ونهاري، وبيتظبط على ألوان القاعة، فبيتعمل في رويال بس.",
        en: "This design is built in two versions, night and day, and tuned to your venue's colours, so it comes with Royale only."
      },
      look: ["#0d1730", "#22335c", "#cfa658", "#f4efe4"], fonts: "Bodoni Moda, Amiri",
      demo: { n_ar: "أحمد وفريدة", n_en: "Ahmed & Farida" }
    },
    {
      k: "emerald", code: "D3-005", minPkg: "classic", occ: ["katb", "wedding"],
      ar: "إميرالد أندلسي", en: "Emerald Andalusi",
      mood: { ar: "زخارف أندلسية على أخضر", en: "Andalusian geometry on deep green" },
      blurb: {
        ar: "قوس أندلسي وزخارف هندسية دهبي على أخضر زمردي، وآية في أول الصفحة. لكتب الكتاب والفرح.",
        en: "An Andalusian arch and gold geometry on emerald green, opening with a verse. For katb kitab and weddings."
      },
      look: ["#0e3b2e", "#1a5a44", "#c9a24b", "#f3ead4"], fonts: "Aref Ruqaa, Marcellus",
      demo: { n_ar: "مصطفى وجنى", n_en: "Mostafa & Jana" }
    },
    {
      k: "sahara", code: "D3-006", minPkg: "classic", occ: ["wedding"],
      ar: "صحارى بوهو", en: "Sahara Boho",
      mood: { ar: "غروب وتراكوتا وبحر", en: "Sunset, terracotta and sea" },
      blurb: {
        ar: "غروب على البحر وألوان تراكوتا وموجة تحت الأسامي. معمولة لفرح الساحل أو أي فرح على البحر.",
        en: "A sunset over the sea, terracotta tones and a wave under your names. Made for a Sahel wedding or any wedding by the water."
      },
      look: ["#fbf6ec", "#f3d9b8", "#c46a4a", "#3b2a20"], fonts: "El Messiri, Italiana",
      demo: { n_ar: "زياد ولينا", n_en: "Ziad & Lina" }
    },
    {
      k: "henna", code: "D3-008", minPkg: "classic", occ: ["henna"],
      ar: "ليلة حنة", en: "Henna Night",
      mood: { ar: "حُمرة الحنة والزعفران", en: "Henna red and saffron" },
      blurb: {
        ar: "زينة وفوانيس وكف حنة مرسوم، وكلام بالعامية زي ما البنات بتقوله. لليلة الحنة.",
        en: "Bunting, lanterns and a painted henna hand, with wording the way the girls actually say it. For the henna night."
      },
      look: ["#fbf3e4", "#f4d9a8", "#a6341b", "#c2185b"], fonts: "Rakkas, Lemonada",
      demo: { n_ar: "ملك", n_en: "Malak" }
    },
    {
      k: "deco", code: "D3-009", minPkg: "classic", occ: ["wedding"],
      ar: "آرت ديكو", en: "Art Deco",
      mood: { ar: "أسود ودهبي هندسي من العشرينات", en: "1920s black and geometric gold" },
      blurb: {
        ar: "أسود ودهبي وخطوط هندسية من زمن جاتسبي، ومونوجرام في النص. لفرح بالليل وسهرة طويلة.",
        en: "Black, gold and Gatsby-era geometry with a monogram at the centre. For an evening wedding that runs late."
      },
      look: ["#0e0e10", "#1c1c20", "#d4af37", "#f1e6c8"], fonts: "Limelight, Poiret One",
      demo: { n_ar: "عمر ونادين", n_en: "Omar & Nadine" }
    },
    {
      k: "garden", code: "D3-010", minPkg: "classic", occ: ["wedding", "engagement"],
      ar: "جاردن", en: "Botanical Garden",
      mood: { ar: "خضرة مائية وقوس نباتي", en: "Watercolour greenery and a floral arch" },
      blurb: {
        ar: "أوراق شجر بالألوان المائية وقوس ورد حوالين الأسامي. لفرح بالنهار في جنينة.",
        en: "Watercolour leaves and a floral arch around your names. For a daytime wedding in a garden."
      },
      look: ["#faf8f2", "#dbe4d2", "#5f7161", "#2a3328"], fonts: "EB Garamond, Amiri",
      demo: { n_ar: "سيف ورنا", n_en: "Seif & Rana" }
    },
    {
      k: "modern", code: "D3-011", minPkg: "classic", occ: ["wedding", "engagement"],
      ar: "مودرن", en: "Modern Editorial",
      mood: { ar: "بوستر تايبوجرافي", en: "A typographic poster" },
      blurb: {
        ar: "أساميكم بخط بوستر كبير مالي الصفحة، وأقسام مرقّمة زي المجلات، وفتحة بتتقسم من عند الطيّة. من غير زخرفة، للي بيحبوا البساطة.",
        en: "Your names set poster-size across the page, numbered sections like a magazine, and an opening that splits along the fold. No ornament, for couples who like it clean."
      },
      look: ["#f7f5f0", "#e7e2d8", "#c4552d", "#141414"], fonts: "Almarai, Archivo",
      demo: { n_ar: "علي ودينا", n_en: "Ali & Dina" }
    },
    {
      k: "lotus", code: "D3-007", minPkg: "classic", occ: ["baby"],
      ar: "سبوع اللوتس", en: "Lotus Sebou3",
      mood: { ar: "باستيل وقمر ولوتس", en: "Pastels, a moon and a lotus" },
      blurb: {
        ar: "ألوان باستيل وهلال ولوتس، وفقرات السبوع المصري: الغربال والشموع والحلويات. للسبوع والعقيقة.",
        en: "Pastels, a crescent and a lotus, with the Egyptian sebou3 rituals: the sieve, the candles and the sweets. For sebou3 and aqiqa."
      },
      look: ["#fdf8f0", "#f3d9de", "#a8c3a0", "#5a4a52"], fonts: "El Messiri, Quicksand",
      demo: { n_ar: "ياسين", n_en: "Yassin" }
    },
    {
      k: "grad", code: "D3-012", minPkg: "classic", occ: ["grad"],
      ar: "تخرج", en: "Graduation",
      mood: { ar: "كحلي وبرتقالي وسنة التخرج", en: "Navy, orange and the class year" },
      blurb: {
        ar: "سنة التخرج بخط كبير بالبرتقالي على كحلي، وقبعة تخرج نازلة عليها، وفتحة زي ملف الشهادة. لحفلة التخرج مع العيلة والصحاب.",
        en: "The class year set big in orange on navy, a mortarboard landing on it, and an opening like a diploma folder. For a graduation party with family and friends."
      },
      look: ["#f8f5ee", "#dfe2ea", "#e98a15", "#1f2a44"], fonts: "Cairo, DM Serif Display",
      demo: { n_ar: "سارة", n_en: "Sara" }
    }
  ]
};
