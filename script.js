/* ==========================================================
   TROEF! – script
   Opbouw:
   1. Hulpfuncties (kaarten en stenen tekenen)
   2. De uitleg-pop-up (werkt met "toneelstukjes")
   3. De uitleg per spel (klassiek, kwartet, domino)
   4. Domino zelf spelen
   5. Kaartjes op de pagina zetten
   ========================================================== */


/* ---------- 1. Hulpfuncties ---------- */

// korte versie van document.querySelector
const $ = (selector, ouder = document) => ouder.querySelector(selector);

const SYMBOLEN = { H: '♥', D: '♦', C: '♣', S: '♠' };

// harten en ruiten zijn rood
function isRood(symbool) {
  return symbool === 'H' || symbool === 'D';
}

// een gewone speelkaart, bijvoorbeeld maakKaart('K', 'D') = ruiten heer
function maakKaart(waarde, symbool) {
  const kleur = isRood(symbool) ? 'rood' : '';
  return `
    <div class="kaart ${kleur}">
      <span class="hoek">${waarde}<br>${SYMBOLEN[symbool]}</span>
      <span class="midden">${SYMBOLEN[symbool]}</span>
    </div>`;
}

// een kwartetkaart, bijvoorbeeld maakFamilieKaart('V', 3) = Vogels 3/4
const FAMILIES = {
  V: { naam: 'Vogels', kleur: '#D9607A', icoon: '♪' },
  F: { naam: 'Vissen', kleur: '#3F7FBF', icoon: '≈' },
  B: { naam: 'Bergen', kleur: '#B8860B', icoon: '▲' }
};

function maakFamilieKaart(letter, nummer) {
  const familie = FAMILIES[letter];
  return `
    <div class="kaart fam" style="--c:${familie.kleur}">
      <div class="band"><span>${familie.naam}</span><span>${nummer}/4</span></div>
      <span class="midden">${familie.icoon}</span>
    </div>`;
}

// welke stippen aan staan bij welk getal (vakjes 0 t/m 8 van een 3x3 raster)
const STIPPEN = {
  0: [],
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8]
};

function maakDobbel(aantal) {
  let vakjes = '';
  for (let i = 0; i < 9; i++) {
    const aan = STIPPEN[aantal].includes(i) ? 'aan' : '';
    vakjes += `<b class="${aan}"></b>`;
  }
  return `<span class="dobbel">${vakjes}</span>`;
}

// een dominokaart met twee helften
function maakSteen(links, rechts) {
  return `
    <div class="steen">
      <span class="helft">${maakDobbel(links)}</span>
      <span class="helft">${maakDobbel(rechts)}</span>
    </div>`;
}

// een stukje tekst in het toneel
function maakLabel(tekst, linksUitgelijnd = false) {
  return `<div class="lab ${linksUitgelijnd ? 'l' : ''}">${tekst}</div>`;
}

// een tekstballon in het toneel
function maakBel(tekst, goud = false) {
  return `<div class="bel ${goud ? 'goud' : ''}">${tekst}</div>`;
}

// maakt snel een groep instellingen, bijv. voorElke('a', 4, i => ({ o: 1 }))
function voorElke(voorvoegsel, aantal, functie) {
  const resultaat = {};
  for (let i = 0; i < aantal; i++) {
    resultaat[voorvoegsel + i] = functie(i);
  }
  return resultaat;
}


/* ---------- 2. De uitleg-pop-up ---------- */
/*
  Elke uitleg is een toneelstukje met:
  - items:   alle kaarten en teksten die ooit in beeld komen
  - stappen: per stap staat in "zet" waar elk item moet staan
             x, y = plek | s = grootte | o = zichtbaar (1) of niet (0)
             dicht = achterkant | wint / dim = winnaar / verliezer
             past = gele rand   | schud = laat het item schudden
  Verandert een item tussen twee stappen? Dan beweegt het vanzelf soepel
  naar de nieuwe plek (dat doet de CSS-transition).
*/

const modal = $('#modal');
const stage = $('#stage');
let tutorial = null;   // de uitleg die nu open staat
let stapNr = 0;        // de stap waar we nu zijn
let vorigeFocus = null;

function openUitleg(naam) {
  tutorial = TUTORIALS[naam];
  vorigeFocus = document.activeElement;
  $('#m-titel').textContent = tutorial.titel;

  // alle items in het toneel zetten
  stage.classList.add('nt');
  stage.innerHTML = tutorial.items
    .map(([id, html]) => `<div class="item" data-id="${id}">${html}</div>`)
    .join('');

  // bolletjes onderaan
  $('#dots').innerHTML = tutorial.stappen.map(() => '<i></i>').join('');

  pasSchaalAan();
  gaNaarStap(0);
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');

  // pas na twee frames de animaties aanzetten, zodat niets "vliegt" bij het openen
  requestAnimationFrame(() => {
    requestAnimationFrame(() => stage.classList.remove('nt'));
  });
  $('.sluit').focus();
}

function sluitUitleg() {
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  if (vorigeFocus) vorigeFocus.focus();
}

function gaNaarStap(nr) {
  stapNr = nr;

  // we tellen alle zetten van stap 0 tot nu bij elkaar op
  const staat = {};
  for (let i = 0; i <= nr; i++) {
    const zet = tutorial.stappen[i].zet || {};
    for (const id in zet) {
      staat[id] = { ...staat[id], ...zet[id] };
    }
  }

  const eigenZet = tutorial.stappen[nr].zet || {};

  tutorial.items.forEach(([id]) => {
    const element = $(`[data-id="${id}"]`, stage);
    const instellingen = {
      x: tutorial.begin.x,
      y: tutorial.begin.y,
      o: 0,
      s: 1,
      z: 1,
      ...staat[id]
    };
    zetItem(element, instellingen, eigenZet[id] && eigenZet[id].schud);
  });

  $('#m-tekst').textContent = tutorial.stappen[nr].tekst;
  $('#m-vorige').disabled = nr === 0;
  $('#m-volgende').textContent = nr === tutorial.stappen.length - 1 ? 'Klaar' : 'Volgende';
  document.querySelectorAll('#dots i').forEach((bolletje, i) => {
    bolletje.classList.toggle('aan', i === nr);
  });
}

// zet één item op zijn plek (de CSS zorgt voor de beweging)
function zetItem(element, p, schud) {
  element.style.transform = `translate(${p.x}px, ${p.y}px) scale(${p.s})`;
  element.style.opacity = p.o;
  element.style.zIndex = p.z;

  const inhoud = element.firstElementChild;
  inhoud.classList.toggle('dicht', !!p.dicht);
  inhoud.classList.toggle('wint', !!p.wint);
  inhoud.classList.toggle('dim', !!p.dim);
  inhoud.classList.toggle('past', !!p.past);

  if (schud) {
    inhoud.classList.remove('nee');
    void inhoud.offsetWidth;   // trucje om de animatie opnieuw te starten
    inhoud.classList.add('nee');
  }
}

// het toneel is 640 breed; op een smal scherm maken we het kleiner
function pasSchaalAan() {
  const wrap = $('.stagewrap');
  const schaal = Math.min(1, wrap.clientWidth / 640);
  stage.style.transform = `scale(${schaal})`;
  wrap.style.height = 380 * schaal + 'px';
}

// knoppen en toetsenbord
document.querySelectorAll('.uitleg-knop').forEach(knop => {
  knop.addEventListener('click', () => openUitleg(knop.dataset.tut));
});

$('.sluit').addEventListener('click', sluitUitleg);

modal.addEventListener('click', event => {
  if (event.target === modal) sluitUitleg();   // klik naast het venster
});

$('#m-vorige').addEventListener('click', () => gaNaarStap(stapNr - 1));

$('#m-volgende').addEventListener('click', () => {
  if (stapNr === tutorial.stappen.length - 1) sluitUitleg();
  else gaNaarStap(stapNr + 1);
});

document.addEventListener('keydown', event => {
  if (!modal.classList.contains('open')) return;
  if (event.key === 'Escape') sluitUitleg();
  if (event.key === 'ArrowRight' && stapNr < tutorial.stappen.length - 1) gaNaarStap(stapNr + 1);
  if (event.key === 'ArrowLeft' && stapNr > 0) gaNaarStap(stapNr - 1);
});

window.addEventListener('resize', pasSchaalAan);


/* ---------- 3. De uitleg per spel ---------- */

const TUTORIALS = {};

/* --- Klassiek kaarten --- */
const KOLOM = [60, 205, 350, 495];   // x-posities van 4 spelers naast elkaar
const WAARDEN = ['2', '5', '10', 'J', 'Q', 'K', 'A'];
const SPELERS = ['Anna', 'Bram', 'Cleo', 'Daan'];

TUTORIALS.klassiek = {
  titel: 'Zo werkt klassiek kaarten',
  begin: { x: 320, y: 150 },

  items: [
    ['a0', maakKaart('A', 'H')],
    ['a1', maakKaart('A', 'D')],
    ['a2', maakKaart('A', 'C')],
    ['a3', maakKaart('A', 'S')],
    ['t0', maakLabel('Harten')],
    ['t1', maakLabel('Ruiten')],
    ['t2', maakLabel('Klaveren')],
    ['t3', maakLabel('Schoppen')],
    ...WAARDEN.map((w, i) => ['r' + i, maakKaart(w, 'H')]),
    ['laag', maakLabel('laag', true)],
    ['hoog', maakLabel('hoog', true)],
    ['s0', maakKaart('10', 'D')],
    ['s1', maakKaart('K', 'D')],
    ['s2', maakKaart('4', 'D')],
    ['s3', maakKaart('7', 'D')],
    ['s4', maakKaart('A', 'C')],
    ['s5', maakKaart('3', 'H')],
    ...SPELERS.map((naam, i) => ['n' + i, maakLabel(naam)]),
    ['troef', maakBel('Troef: ♥', true)]
  ],

  stappen: [
    {
      tekst: 'Een pak heeft 52 kaarten in 4 symbolen: harten, ruiten, klaveren en schoppen. Hier zie je van elk symbool de aas. Elk symbool heeft 13 kaarten.',
      zet: {
        ...voorElke('a', 4, i => ({ x: KOLOM[i], y: 110, o: 1 })),
        ...voorElke('t', 4, i => ({ x: KOLOM[i] - 18, y: 240, o: 1 })),
        s4: { x: KOLOM[2], y: 90 },   // alvast klaarzetten voor later
        s5: { x: KOLOM[2], y: 90 }
      }
    },
    {
      tekst: 'Elk symbool heeft dezelfde waarden. Van laag naar hoog: 2 t/m 10, dan boer (J), vrouw (Q), heer (K) en aas (A). Een hogere kaart verslaat een lagere.',
      zet: {
        ...voorElke('a', 4, () => ({ o: 0 })),
        ...voorElke('t', 4, () => ({ o: 0 })),
        ...voorElke('r', 7, i => ({ x: 12 + 88 * i, y: 110, o: 1 })),
        laag: { x: 12, y: 245, o: 1 },
        hoog: { x: 548, y: 245, o: 1 }
      }
    },
    {
      tekst: 'Je speelt in rondes. Elke ronde heet een slag. Vier spelers hebben elk een kaart in hun hand.',
      zet: {
        ...voorElke('r', 7, () => ({ o: 0 })),
        laag: { o: 0 },
        hoog: { o: 0 },
        ...voorElke('s', 4, i => ({ x: KOLOM[i], y: 215, o: 1, dicht: true })),
        ...voorElke('n', 4, i => ({ x: KOLOM[i] - 18, y: 345, o: 1 }))
      }
    },
    {
      tekst: 'Iedereen legt één kaart op tafel. Anna begon met ruiten (♦). De andere spelers leggen ook ruiten als ze die hebben.',
      zet: {
        ...voorElke('s', 4, () => ({ y: 90, dicht: false })),
        ...voorElke('n', 4, () => ({ y: 220 }))
      }
    },
    {
      tekst: 'De hoogste kaart wint de slag. Dat is de heer (K) van Bram. Hij pakt de vier kaarten.',
      zet: {
        s0: { dim: true },
        s1: { wint: true },
        s2: { dim: true },
        s3: { dim: true }
      }
    },
    {
      tekst: 'Stel dat Cleo geen ruiten heeft en een aas van klaveren (♣) legt. Een aas is hoog, maar het is het verkeerde symbool. Bram wint nog steeds.',
      zet: {
        s2: { o: 0 },
        s4: { o: 1, dim: true }
      }
    },
    {
      tekst: 'Nu komt troef. Soms spreek je af dat één symbool troef is, hier harten (♥). Een troefkaart verslaat alle andere symbolen, ook als hij laag is. Cleo wint met de ♥3.',
      zet: {
        s4: { o: 0 },
        s5: { o: 1, wint: true },
        s1: { wint: false, dim: true },
        troef: { x: 240, y: 15, o: 1 }
      }
    }
  ]
};


/* --- Kwartet --- */
const KAARTEN_HAND = [105, 195, 285, 375, 465];   // x-posities van jouw hand

TUTORIALS.kwartet = {
  titel: 'Zo werkt kwartet',
  begin: { x: 540, y: 130 },   // alle kaarten beginnen bij de stapel

  items: [
    ['v1', maakFamilieKaart('V', 1)],
    ['v2', maakFamilieKaart('V', 2)],
    ['v3', maakFamilieKaart('V', 3)],
    ['v4', maakFamilieKaart('V', 4)],
    ['f1', maakFamilieKaart('F', 1)],
    ['f2', maakFamilieKaart('F', 2)],
    ['f4', maakFamilieKaart('F', 4)],
    ['b2', maakFamilieKaart('B', 2)],
    ['lSam', maakLabel('Sam', true)],
    ['lJij', maakLabel('Jij', true)],
    ['lStapel', maakLabel('Stapel', true)],
    ['vraag1', maakBel('Heb jij Vogels 3?')],
    ['antw1', maakBel('Ja, alsjeblieft!')],
    ['punt', maakBel('Kwartet! +1 punt', true)],
    ['vraag2', maakBel('Heb jij Vissen 3?')],
    ['antw2', maakBel('Nee, pak een kaart van de stapel!')]
  ],

  stappen: [
    {
      tekst: 'Elke kaart hoort bij een familie, hier Vogels. Rechtsboven staat welke kaart het is: 3/4 is kaart 3 van 4. Een familie heeft 4 kaarten. Alle vier verzamelen is een kwartet.',
      zet: voorElke('v', 4, i => ({ x: 120 + 100 * i, y: 130, o: 1 }))
    },
    {
      tekst: 'Iedereen krijgt kaarten (normaal 5, hier laten we er een paar zien). De rest ligt gesloten op de stapel. Je ziet alleen je eigen kaarten.',
      zet: {
        v1: { x: 140, y: 250 },
        v2: { x: 230, y: 250 },
        v4: { x: 320, y: 250 },
        f2: { x: 410, y: 250, o: 1 },
        v3: { x: 190, y: 15, o: 1, dicht: true },
        f1: { x: 290, y: 15, o: 1, dicht: true },
        f4: { x: 390, y: 15, o: 1, dicht: true },
        b2: { o: 1, dicht: true, z: 0 },
        lSam: { x: 24, y: 50, o: 1 },
        lJij: { x: 24, y: 230, o: 1 },
        lStapel: { x: 535, y: 258, o: 1 }
      }
    },
    {
      tekst: 'Jij bent aan de beurt en vraagt Sam: “Heb jij Vogels 3?” Dat mag, want je hebt zelf al Vogels-kaarten. Je mag alleen vragen naar een familie waarvan je al een kaart hebt.',
      zet: { vraag1: { x: 215, y: 160, o: 1 } }
    },
    {
      tekst: 'Sam heeft Vogels 3 en geeft hem aan jou. Nu heb je alle vier de Vogels. Heb je een kaart gekregen? Dan mag je nog een keer vragen.',
      zet: {
        vraag1: { o: 0 },
        antw1: { x: 235, y: 160, o: 1 },
        v1: { x: KAARTEN_HAND[0] },
        v2: { x: KAARTEN_HAND[1] },
        v3: { x: KAARTEN_HAND[2], y: 250, dicht: false },
        v4: { x: KAARTEN_HAND[3] },
        f2: { x: KAARTEN_HAND[4] },
        f1: { x: 240 },
        f4: { x: 340 }
      }
    },
    {
      tekst: 'Je hebt een kwartet! Leg de 4 kaarten open op tafel. Elk kwartet is 1 punt.',
      zet: {
        antw1: { o: 0 },
        ...voorElke('v', 4, i => ({ x: 120 + 100 * i, y: 185 })),
        f2: { x: 24, y: 270 },
        punt: { x: 228, y: 142, o: 1 }
      }
    },
    {
      tekst: 'Je mag nog een keer vragen. Je legt je kwartet opzij en vraagt Sam om Vissen 3, want je hebt zelf Vissen 2.',
      zet: {
        punt: { o: 0 },
        ...voorElke('v', 4, i => ({ x: 12 + 16 * i, y: 150, s: 0.6 })),
        f2: { x: 290, y: 250 },
        vraag2: { x: 215, y: 150, o: 1 }
      }
    },
    {
      tekst: 'Sam heeft Vissen 3 niet. Dan pak jij een kaart van de stapel en is Sam aan de beurt. Wie aan het eind de meeste kwartetten heeft, wint.',
      zet: {
        antw2: { x: 215, y: 195, o: 1 },
        b2: { dicht: false, x: 380, y: 250, z: 1 }
      }
    }
  ]
};


/* --- Domino --- */
TUTORIALS.domino = {
  titel: 'Zo werkt domino',
  begin: { x: 520, y: 100 },

  items: [
    ['c0', maakSteen(3, 4)],
    ['h1', maakSteen(4, 1)],
    ['h2', maakSteen(2, 3)],
    ['h3', maakSteen(6, 6)],
    ['nieuw', maakSteen(5, 2)],
    ['lHand', maakLabel('Jouw hand', true)],
    ['lStapel', maakLabel('Stapel', true)]
  ],

  stappen: [
    {
      tekst: 'Onderaan elke kaart staan twee waarden met stippen, net als een dominosteen. Deze kaart heeft links 3 stippen en rechts 4.',
      zet: { c0: { x: 226, y: 90, s: 1.8, o: 1 } }
    },
    {
      tekst: 'Je start met één kaart op tafel en je hebt zelf een paar kaarten in je hand. De rest ligt gesloten op de stapel.',
      zet: {
        c0: { x: 268, y: 100, s: 1 },
        h1: { x: 60, y: 250, o: 1 },
        h2: { x: 190, y: 250, o: 1 },
        h3: { x: 320, y: 250, o: 1 },
        nieuw: { x: 520, y: 100, o: 1, dicht: true },
        lHand: { x: 24, y: 222, o: 1 },
        lStapel: { x: 528, y: 175, o: 1 }
      }
    },
    {
      tekst: 'Jij bent aan de beurt. Kijk naar de uiteinden van de rij: rechts staat 4. Jouw kaart 4|1 begint ook met een 4, dus die past.',
      zet: { h1: { past: true } }
    },
    {
      tekst: 'Leg de kaart aan zodat dezelfde stippen elkaar raken: 4 tegen 4.',
      zet: { h1: { x: 372, y: 100, past: false } }
    },
    {
      tekst: 'Je mag ook links aanleggen. Links staat een 3 en jouw kaart 2|3 eindigt op een 3. Die past.',
      zet: { h2: { x: 164, y: 100 } }
    },
    {
      tekst: 'De kaart 6|6 past nergens: de uiteinden van de rij zijn nu 2 en 1. Past er niets? Dan pak je een kaart van de stapel.',
      zet: { h3: { schud: true } }
    },
    {
      tekst: 'Je pakt de kaart 5|2 van de stapel.',
      zet: { nieuw: { dicht: false, x: 450, y: 250 } }
    },
    {
      tekst: 'Die past aan de linkerkant: de 2 raakt de 2.',
      zet: { nieuw: { x: 60, y: 100 } }
    },
    {
      tekst: 'Zo ga je door. Wie als eerste al zijn kaarten kwijt is, wint.',
      zet: {}
    }
  ]
};


/* ---------- 4. Domino zelf spelen ---------- */

(function () {
  const rijElement = $('#dm-rij');
  const handElement = $('#dm-hand');
  const stapelElement = $('#dm-stapel');
  const tekstElement = $('#dm-tekst');

  let rij = [];      // de stenen op tafel
  let hand = [];     // jouw stenen
  let stapel = [];   // de stenen die nog gepakt kunnen worden

  // elke steen heeft een uniek id, zodat we hem na het verplaatsen terugvinden
  function nieuweStenen() {
    rij = [{ id: 'r0', a: 2, b: 4 }];
    hand = [
      { id: 'h1', a: 3, b: 5 },
      { id: 'h2', a: 1, b: 2 },
      { id: 'h3', a: 5, b: 5 },
      { id: 'h4', a: 2, b: 6 },
      { id: 'h5', a: 4, b: 1 }
    ];
    stapel = [
      { id: 's1', a: 6, b: 5 },
      { id: 's2', a: 3, b: 3 },
      { id: 's3', a: 1, b: 1 },
      { id: 's4', a: 6, b: 6 }
    ];
  }

  // links en rechts van de rij
  function uiteinden() {
    return [rij[0].a, rij[rij.length - 1].b];
  }

  function pastErAan(steen) {
    const [links, rechts] = uiteinden();
    return steen.a === links || steen.b === links || steen.a === rechts || steen.b === rechts;
  }

  function steenHtml(steen, extraKlasse) {
    return `
      <div class="steen ${extraKlasse}" data-id="${steen.id}">
        <span class="helft">${maakDobbel(steen.a)}</span>
        <span class="helft">${maakDobbel(steen.b)}</span>
      </div>`;
  }

  function teken() {
    rijElement.innerHTML = rij
      .map((steen, i) => steenHtml(steen, i === 0 || i === rij.length - 1 ? 'uiteinde' : ''))
      .join('');

    handElement.innerHTML = hand
      .map(steen => steenHtml(steen, pastErAan(steen) ? 'past' : ''))
      .join('');

    handElement.querySelectorAll('.steen').forEach(element => {
      element.addEventListener('click', () => speel(element.dataset.id, element));
    });

    $('#dm-pak').disabled = stapel.length === 0 || hand.length === 0;
  }

  /*
    Soepel verplaatsen (de "FLIP"-techniek):
    1. onthoud waar elke steen nu staat
    2. teken alles opnieuw (stenen staan nu meteen op hun nieuwe plek)
    3. laat elke steen van zijn oude naar zijn nieuwe plek glijden
  */
  function metBeweging(verander) {
    const oudePlekken = {};
    document.querySelectorAll('#demo-domino [data-id]').forEach(element => {
      oudePlekken[element.dataset.id] = element.getBoundingClientRect();
    });
    const stapelPlek = stapelElement.getBoundingClientRect();

    verander();

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    document.querySelectorAll('#demo-domino [data-id]').forEach(element => {
      // een nieuwe steen (net gepakt) komt vanaf de stapel
      const oud = oudePlekken[element.dataset.id] || stapelPlek;
      const nieuw = element.getBoundingClientRect();
      const dx = oud.left - nieuw.left;
      const dy = oud.top - nieuw.top;

      if (dx === 0 && dy === 0) return;

      element.style.position = 'relative';
      element.style.zIndex = 5;
      const beweging = element.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
        { duration: 550, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }
      );
      beweging.onfinish = () => { element.style.zIndex = ''; };
    });
  }

  function speel(id, element) {
    const steen = hand.find(s => s.id === id);
    const [links, rechts] = uiteinden();
    let aanleggen = null;   // de steen zoals hij op tafel komt te liggen
    let aanLinks = false;

    if (steen.a === rechts) {
      aanleggen = steen;
    } else if (steen.b === rechts) {
      aanleggen = { id: steen.id, a: steen.b, b: steen.a };   // omdraaien
    } else if (steen.b === links) {
      aanleggen = steen;
      aanLinks = true;
    } else if (steen.a === links) {
      aanleggen = { id: steen.id, a: steen.b, b: steen.a };
      aanLinks = true;
    }

    if (!aanleggen) {
      element.classList.add('nee');
      tekstElement.textContent = 'Die past niet. De stippen die elkaar raken moeten gelijk zijn.';
      return;
    }

    metBeweging(() => {
      hand = hand.filter(s => s.id !== id);
      if (aanLinks) rij.unshift(aanleggen);
      else rij.push(aanleggen);
      teken();
    });

    tekstElement.textContent = hand.length
      ? 'Goed! De stippen raken elkaar. Welke kaart past nu?'
      : 'Je hand is leeg. Je hebt gewonnen!';
  }

  $('#dm-pak').addEventListener('click', () => {
    metBeweging(() => {
      hand.push(stapel.shift());
      teken();
    });
    tekstElement.textContent = 'Je pakte een kaart van de stapel.';
  });

  $('#dm-reset').addEventListener('click', () => {
    nieuweStenen();
    teken();
    tekstElement.textContent = 'Klik op een kaart met een gele rand. Die past op een uiteinde.';
  });

  nieuweStenen();
  teken();
  tekstElement.textContent = 'Klik op een kaart met een gele rand. Die past op een uiteinde.';
})();


/* ---------- 5. Kaartjes op de pagina zetten ---------- */

// klassiek: alle 13 kaarten van harten
const alleWaarden = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
$('#klassiek-rij').innerHTML = alleWaarden.map(w => maakKaart(w, 'H')).join('');

// kwartet: de familie Vogels
$('#kwartet-rij').innerHTML = [1, 2, 3, 4].map(n => maakFamilieKaart('V', n)).join('');

// pesten: de speciale kaarten, bijvoorbeeld "7S" = schoppen 7
document.querySelectorAll('.mini').forEach(rij => {
  rij.innerHTML = rij.dataset.kaarten
    .split(',')
    .map(code => maakKaart(code.slice(0, -1), code.slice(-1)))
    .join('');
});