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

  /* Demo links carry no gallery photos: a gallery holds the couple's own photos or nothing,
     and stock photos made every design read as a template. */
  demoPhotos: [],

  /* minPkg: the cheapest package this design is sold in. whyMin: shown when a
     cheaper package is unavailable for the design.
     look: palette swatches, ground to ink. fonts: display faces, for the product page. */
  templates: [
    {
      k: "gold", code: "D3-001", minPkg: "classic", occ: ["engagement", "wedding"],
      ar: "كلاسيك جولد", en: "Classic Gold",
      mood: { ar: "كارت مطبوع بالدهبي", en: "A printed card in ivory and gold" },
      blurb: {
        ar: "ظرف مختوم بحروفكم بيتفتح على كارت قطن بالدهبي، مكتوب زي كروت الأفراح المطبوعة، ومعاه كارت للبرنامج وكارت للرد. للخطوبة والفرح.",
        en: "An envelope sealed with your initials opens onto a cotton card printed in gold and worded like a classic Cairo invitation, with a programme card and a reply card. For engagements and weddings."
      },
      look: ["#241c17", "#f8f2e4", "#a47c3b", "#2b2117"], fonts: "Amiri, Libre Caslon",
      demo: { n_ar: "يوسف ومريم", n_en: "Youssef & Mariam", h_ar: "السيد/ سامي عزيز والسيد/ محمود رشاد", h_en: "Mr Samy Aziz and Mr Mahmoud Rashad" }
    },
    {
      k: "rose", code: "D3-002", minPkg: "classic", occ: ["wedding", "engagement"],
      ar: "روز آند وايت", en: "Rose & White",
      mood: { ar: "ورق قطن وردي ووردة مجففة", en: "Blush cotton and a pressed rose" },
      blurb: {
        ar: "كارت مطبوع بالضغط على ورق قطن وردي سميك، عليه وردة مجففة بشريط شفاف، ويوصل في غلاف شفاف. أساميكم بخط رقعة ناعم، للفرح والخطوبة.",
        en: "A letterpress card on thick blush cotton with a pressed rose taped to it, sliding out of a vellum band. Your names in a soft Ruqaa script, for weddings and engagements."
      },
      look: ["#fff7f8", "#f3d6de", "#b3305c", "#3a1f2a"], fonts: "Aref Ruqaa, Pinyon Script",
      demo: { n_ar: "كريم ونور", n_en: "Karim & Nour" }
    },
    {
      k: "rustic", code: "D3-003", minPkg: "classic", occ: ["wedding"],
      ar: "رستيك", en: "Rustic Red",
      mood: { ar: "كارت كرافت مربوط بخيط جوت", en: "Kraft card tied with jute twine" },
      blurb: {
        ar: "كارت كرافت مطبوع بلون واحد، مربوط بخيط جوت وختم شمع أحمر، وتيكت باسم كل ضيف. لفرح في جنينة أو مزرعة.",
        en: "A kraft card printed in one ink, tied with jute twine and a red wax seal, with a tag carrying each guest's name. For a garden or farm wedding."
      },
      look: ["#f6ecdc", "#d9c3a0", "#9e3f34", "#2e2119"], fonts: "Lalezar, Corben",
      demo: { n_ar: "محمود وهنا", n_en: "Mahmoud & Hana" }
    },
    {
      k: "navy", code: "D3-004", minPkg: "royale", occ: ["wedding"],
      ar: "رويال نايفي", en: "Royal Navy",
      mood: { ar: "علبة كتان كحلي وكارت بحواف مدهبة", en: "Navy linen box, gilt-edged card" },
      blurb: {
        ar: "كارت دوبلكس تقيل بحواف مدهبة في علبة كتان كحلي، وعلى غطاها الحروف الأولى من أساميكم بالدهبي. نسخة الليل مطبوعة على الوش الكحلي، ونسخة النهار على الوش العاجي.",
        en: "A heavy duplex card with gilded edges in a navy linen box, your initials stamped in gold on the lid. The night version is printed on the navy face, the day version on the ivory face."
      },
      whyMin: {
        ar: "التصميم ده معمول بنسختين، ليلي ونهاري، وبيتظبط على ألوان القاعة، فبيتعمل في رويال بس.",
        en: "This design is built in two versions, night and day, and tuned to your venue's colours, so it comes with Royale only."
      },
      look: ["#0d1730", "#22335c", "#cfa658", "#f4efe4"], fonts: "Bodoni Moda, Gulzar",
      demo: { n_ar: "أحمد وفريدة", n_en: "Ahmed & Farida" }
    },
    {
      k: "emerald", code: "D3-005", minPkg: "classic", occ: ["katb", "wedding"],
      ar: "إميرالد أندلسي", en: "Emerald Andalusi",
      mood: { ar: "باب أندلسي ولوحة خط", en: "An Andalusian doorway and a calligraphy panel" },
      blurb: {
        ar: "باب خشب منقوش تحت قوس أندلسي وزليج أخضر، يتفتح على دعوتكم مكتوبة كلوحة خط في برواز مدهب. لكتب الكتاب والفرح.",
        en: "A carved wooden door under an Andalusian arch and green zellige opens onto your invitation, set as a calligraphy panel in a gilt frame. For katb kitab and weddings."
      },
      look: ["#0e3b2e", "#1a5a44", "#c9a24b", "#f3ead4"], fonts: "Reem Kufi, Marcellus",
      demo: { n_ar: "مصطفى وجنى", n_en: "Mostafa & Jana" }
    },
    {
      k: "sahara", code: "D3-006", minPkg: "classic", occ: ["wedding"],
      ar: "صحارى بوهو", en: "Sahara Boho",
      mood: { ar: "كارت بوستال وتذكرة من الساحل", en: "A Sahel postcard and a ticket" },
      blurb: {
        ar: "كارت بوستال مرسوم عليه غروب على البحر وأساميكم، بيتقلب على الدعوة بالطابع والختم، ومعاه تذكرة للبرنامج وكعب للرد.",
        en: "A painted postcard of a sunset over the sea with your names, which turns over to the invitation with its stamp and postmark. A ticket holds the programme and the reply stub."
      },
      look: ["#fbf6ec", "#f3d9b8", "#c46a4a", "#3b2a20"], fonts: "Rakkas, Newsreader",
      demo: { n_ar: "زياد ولينا", n_en: "Ziad & Lina" }
    },
    {
      k: "henna", code: "D3-008", minPkg: "classic", occ: ["henna"],
      ar: "ليلة حنة", en: "Henna Night",
      mood: { ar: "صينية حنة على قماش زعفراني", en: "A henna tray on saffron cotton" },
      blurb: {
        ar: "صينية الحنة بشمعها وأقماعها، وكارت مرسوم بإيد البنات عليه كف محنّي وزينة قماش، والبرنامج على ورقة كشكول. لليلة الحنة.",
        en: "The henna tray with its candles and cones, a card the girls drew by hand with a hennaed palm and fabric bunting, and the plan on a notebook page. For the henna night."
      },
      look: ["#fbf3e4", "#f4d9a8", "#a6341b", "#c2185b"], fonts: "Playpen Sans Arabic, Rakkas",
      demo: { n_ar: "ملك", n_en: "Malak" }
    },
    {
      k: "deco", code: "D3-009", minPkg: "classic", occ: ["wedding"],
      ar: "آرت ديكو", en: "Art Deco",
      mood: { ar: "برنامج سهرة أسود مطبوع بالدهبي", en: "A black evening programme printed in gold" },
      blurb: {
        ar: "برنامج سهرة أسود مطبوع بالدهبي زي قاعات فنادق القاهرة في العشرينات، بيتفتح من النص، والرد على تذكرة أمانات بنمرة. لفرح بالليل وسهرة طويلة.",
        en: "The evening programme of a 1920s Cairo hotel ballroom: a black card printed in gold that opens down the middle, with a numbered cloakroom ticket for the reply. For an evening wedding that runs late."
      },
      look: ["#0e0e10", "#1c1c20", "#d4af37", "#f1e6c8"], fonts: "Federo, Reem Kufi",
      demo: { n_ar: "عمر ونادين", n_en: "Omar & Nadine" }
    },
    {
      k: "garden", code: "D3-010", minPkg: "classic", occ: ["wedding", "engagement"],
      ar: "جاردن", en: "Botanical Garden",
      mood: { ar: "كارت مرسوم بالألوان المائية", en: "A hand-painted watercolour card" },
      blurb: {
        ar: "كارت ألوان مائية بحافة مقطوعة باليد، عليه قوس خضرة وورد مرسوم حوالين الأسامي، وجاي في ظرف شفاف. لفرح أو خطوبة بالنهار في جنينة.",
        en: "A watercolour card with a deckled edge and an arch of greenery and roses painted around your names, sent in a glassine envelope. For a daytime wedding or engagement in a garden."
      },
      look: ["#faf8f2", "#dbe4d2", "#5f7161", "#2a3328"], fonts: "Gulzar, IM Fell English",
      demo: { n_ar: "سيف ورنا", n_en: "Seif & Rana" }
    },
    {
      k: "modern", code: "D3-011", minPkg: "classic", occ: ["wedding", "engagement"],
      ar: "مودرن", en: "Modern Editorial",
      mood: { ar: "بوستر مطبوع بلونين ومطوي على أربعة", en: "A two-colour printed poster, folded in quarters" },
      blurb: {
        ar: "بوستر مطبوع بلونين بيوصل مطوي وبيتفتح بلمسة، عليه أساميكم بخط كبير، والتاريخ والبرنامج والرد كل واحد في ربع من الورقة. للفرح والخطوبة.",
        en: "A two-colour risograph poster that arrives folded and opens with one tap, your names set large and the date, programme and reply each on its own quarter. For weddings and engagements."
      },
      look: ["#f7f5f0", "#e7e2d8", "#c4552d", "#141414"], fonts: "Alexandria, Archivo",
      demo: { n_ar: "علي ودينا", n_en: "Ali & Dina" }
    },
    {
      k: "lotus", code: "D3-007", minPkg: "classic", occ: ["baby"],
      ar: "سبوع اللوتس", en: "Lotus Sebou3",
      mood: { ar: "شنطة سبوع بشريطة وبطاقة", en: "A sebou3 bag, ribbon and tag" },
      blurb: {
        ar: "شنطة سبوع من التل الوردي مربوطة بشريطة ستان، عليها بطاقة مطبوعة باسم المولود. بتفكّوا الشريطة فيطلع كارت الدعوة بفقرات السبوع بالترتيب. للسبوع والعقيقة.",
        en: "A blush tulle sebou3 bag tied with satin ribbon, with a printed tag carrying the baby's name. Untie the ribbon and the card comes out with the evening's rituals in order. For sebou3 and aqiqa."
      },
      look: ["#fdf8f0", "#f3d9de", "#a8c3a0", "#5a4a52"], fonts: "Gulzar, Gilda Display",
      demo: { n_ar: "ياسين", n_en: "Yassin" }
    },
    {
      k: "grad", code: "D3-012", minPkg: "classic", occ: ["grad"],
      ar: "تخرج", en: "Graduation",
      mood: { ar: "ملف شهادة كحلي وسنة التخرج بالبرتقالي", en: "A navy diploma folder, the class year in orange" },
      blurb: {
        ar: "ملف شهادة كحلي عليه سنة التخرج، بيتفتح على دعوة مطبوعة زي الشهادة باسم الخريج، ومعاها جدول الحفل وقسيمة تأكيد الحضور. لحفلة التخرج مع العيلة والصحاب.",
        en: "A navy diploma folder with the class year stamped in orange opens onto an invitation printed like a certificate, with the evening's timetable and a reply slip. For a graduation party with family and friends."
      },
      look: ["#f8f5ee", "#dfe2ea", "#e98a15", "#1f2a44"], fonts: "Katibeh, DM Serif Display",
      demo: { n_ar: "سارة", n_en: "Sara" }
    }
  ]
};
