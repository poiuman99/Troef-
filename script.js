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
const SYMBOOL_PAD = { H: 'harte', D: 'koeke', C: 'klaver', S: 'schoepe' };
const SYMBOOL_NAAM = { H: 'harten', D: 'ruiten', C: 'klaveren', S: 'schoppen' };
const RANG_MAPPEN = {
  1: '1-bloemen',
  2: '2-monsters',
  3: '3-instrumenten',
  4: '4-katten',
  5: '5-robots',
  6: '6-insecten',
  7: '7-dinos',
  8: '8-zeedieren',
  9: '9-vogels',
  10: '10-fruit',
  J: 'j-monumenten',
  Q: 'd-historischeFiguren',
  K: 'k-bekendeFiguren'
};

function kaartPad(waarde, symbool) {
  const rang = waarde === 'A' ? '1' : String(waarde);
  const bestandsRang = { J: 'j', Q: 'd', K: 'k' }[rang] || rang;
  return `${RANG_MAPPEN[rang]}/${bestandsRang}-${SYMBOOL_PAD[symbool]}.png`;
}

// harten en ruiten zijn rood
function isRood(symbool) {
  return symbool === 'H' || symbool === 'D';
}

// een gewone speelkaart, bijvoorbeeld maakKaart('K', 'D') = ruiten heer
function maakKaart(waarde, symbool) {
  const kleur = isRood(symbool) ? 'rood' : '';
  const naam = waarde === 'A' ? 'Aas' : waarde;
  return `
    <div class="kaart ${kleur}">
      <img src="img/kaarten/${kaartPad(waarde, symbool)}" alt="${naam} van ${SYMBOOL_NAAM[symbool]}">
    </div>`;
}

// Elke mapnaam staat voor een familie van vier symboolkaarten.
const FAMILIES = {
  bloemen: { naam: 'Bloemen', rang: '1' },
  monsters: { naam: 'Monsters', rang: '2' },
  instrumenten: { naam: 'Instrumenten', rang: '3' },
  katten: { naam: 'Katten', rang: '4' },
  robots: { naam: 'Robots', rang: '5' },
  insecten: { naam: 'Insecten', rang: '6' },
  dinos: { naam: 'Dinos', rang: '7' },
  zeedieren: { naam: 'Zeedieren', rang: '8' },
  vogels: { naam: 'Vogels', rang: '9' },
  fruit: { naam: 'Fruit', rang: '10' },
  monumenten: { naam: 'Monumenten', rang: 'J' },
  historischeFiguren: { naam: 'Historische figuren', rang: 'Q' },
  bekendeFiguren: { naam: 'Bekende figuren', rang: 'K' }
};

const SYMBOOL_KWARTET = { H: 'Harten', D: 'Koeken', C: 'Klaveren', S: 'Schoppen' };

function maakFamilieKaart(familieNaam, symbool) {
  const familie = FAMILIES[familieNaam];
  const soort = SYMBOOL_KWARTET[symbool];
  return `
    <div class="kaart fam">
      <img src="img/kaarten/${kaartPad(familie.rang, symbool)}" alt="${soort} van ${familie.naam}">
      <div class="band"><span>${soort}</span><span>van ${familie.naam}</span></div>
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
document.querySelectorAll('.uitleg-knop, .spel-tegel').forEach(knop => {
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

TUTORIALS.wiezen = {
  titel: 'Zo werkt Wiezen',
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
    ['v1', maakFamilieKaart('vogels', 'H')],
    ['v2', maakFamilieKaart('vogels', 'D')],
    ['v3', maakFamilieKaart('vogels', 'C')],
    ['v4', maakFamilieKaart('vogels', 'S')],
    ['f1', maakFamilieKaart('monsters', 'H')],
    ['f2', maakFamilieKaart('monsters', 'D')],
    ['f4', maakFamilieKaart('monsters', 'S')],
    ['b2', maakFamilieKaart('instrumenten', 'D')],
    ['lSam', maakLabel('Sam', true)],
    ['lJij', maakLabel('Jij', true)],
    ['lStapel', maakLabel('Stapel', true)],
    ['vraag1', maakBel('Heb jij Harten van Vogels?')],
    ['antw1', maakBel('Ja, alsjeblieft!')],
    ['punt', maakBel('Kwartet! +1 punt', true)],
    ['vraag2', maakBel('Heb jij Harten van Monsters?')],
    ['antw2', maakBel('Nee, pak een kaart van de stapel!')]
  ],

  stappen: [
    {
      tekst: 'Elke waarde is een familie. De kaarten met een 9 vormen bijvoorbeeld Vogels. Daar zijn vier symbolen van: Harten, Koeken, Klaveren en Schoppen. Verzamel ze alle vier.',
      zet: {
        v1: { x: 120, y: 130, o: 1 },
        v2: { x: 220, y: 130, o: 1 },
        v3: { x: 320, y: 130, o: 1 },
        v4: { x: 420, y: 130, o: 1 }
      }
    },
    {
      tekst: 'Iedereen krijgt kaarten (normaal 5, hier laten we er een paar zien). Jij hebt Koeken, Klaveren en Schoppen van Vogels. Harten van Vogels ligt bij Sam; de andere kaarten liggen gesloten.',
      zet: {
        v2: { x: 140, y: 250 },
        v3: { x: 230, y: 250 },
        v4: { x: 320, y: 250 },
        f2: { x: 410, y: 250, o: 1 },
        v1: { x: 190, y: 15, o: 1, dicht: true },
        f1: { x: 290, y: 15, o: 1, dicht: true },
        f4: { x: 390, y: 15, o: 1, dicht: true },
        b2: { o: 1, dicht: true, z: 0 },
        lSam: { x: 24, y: 50, o: 1 },
        lJij: { x: 24, y: 230, o: 1 },
        lStapel: { x: 535, y: 258, o: 1 }
      }
    },
    {
      tekst: 'Vraag Sam: “Heb jij Harten van Vogels?” Dat mag, want je hebt zelf al kaarten uit de familie Vogels. Je mag alleen naar een familie vragen waarvan je zelf een kaart hebt.',
      zet: { vraag1: { x: 215, y: 160, o: 1 } }
    },
    {
      tekst: 'Sam geeft je Harten van Vogels. Nu heb je Harten, Koeken, Klaveren en Schoppen van Vogels compleet. Heb je een kaart gekregen? Dan mag je nog een keer vragen.',
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
        v1: { x: 120, y: 185 },
        v2: { x: 220, y: 185 },
        v3: { x: 320, y: 185 },
        v4: { x: 420, y: 185 },
        f2: { x: 24, y: 270 },
        punt: { x: 228, y: 142, o: 1 }
      }
    },
    {
      tekst: 'Je mag nog een keer vragen. Je vraagt Sam om Harten van Monsters, want je hebt zelf Koeken van Monsters.',
      zet: {
        punt: { o: 0 },
        v1: { x: 12, y: 150, s: 0.6 },
        v2: { x: 28, y: 150, s: 0.6 },
        v3: { x: 44, y: 150, s: 0.6 },
        v4: { x: 60, y: 150, s: 0.6 },
        f2: { x: 290, y: 250 },
        vraag2: { x: 215, y: 150, o: 1 }
      }
    },
    {
      tekst: 'Sam heeft Harten van Monsters niet. Dan pak jij een kaart van de stapel en is Sam aan de beurt. Wie aan het eind de meeste kwartetten heeft, wint.',
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
    ['c0', maakKaart('4', 'H')],
    ['h1', maakKaart('2', 'H')],
    ['h2', maakKaart('A', 'H')],
    ['nieuw', maakKaart('3', 'H')],
    ['lVier', maakLabel('4 ♥: 1 | 1', true)],
    ['lTwee', maakLabel('2 ♥: 1 | 3', true)],
    ['lOpen', maakLabel('Open uiteinde: 3', true)],
    ['lNiet', maakLabel('1 ♥: 4 | 4', true)],
    ['lStapel', maakLabel('Stapel', true)],
    ['match', maakBel('1 stip past op 1 stip', true)]
  ],

  stappen: [
    {
      tekst: 'Kijk naar de dominostippen onderaan kaart 4 ♥: links staat 1 stip en rechts ook 1. De waarde bovenaan de kaart is niet het aantal dominostippen.',
      zet: {
        c0: { x: 270, y: 85, s: 1.25, o: 1 },
        lVier: { x: 250, y: 260, o: 1 }
      }
    },
    {
      tekst: 'Kaart 2 ♥ heeft onderaan 1 | 3. De 1 aan de linkerkant past op een open uiteinde met 1 stip.',
      zet: {
        c0: { x: 130, y: 90, o: 1 },
        h1: { x: 390, y: 90, o: 1 },
        lVier: { x: 110, y: 235, o: 1 },
        lTwee: { x: 370, y: 235, o: 1 }
      }
    },
    {
      tekst: 'Leg de kaarten aan elkaar met de gelijke kanten tegen elkaar: 1 stip tegen 1 stip. Kaart 2 ♥ laat nu 3 stippen open aan de andere kant.',
      zet: {
        c0: { x: 150, y: 95 },
        h1: { x: 234, y: 95, past: true },
        lVier: { o: 0 },
        lTwee: { o: 0 },
        match: { x: 350, y: 135, o: 1 }
      }
    },
    {
      tekst: 'Na het aanleggen is 3 het nieuwe open uiteinde. Aas ♥ toont 4 | 4, dus die kaart past daar niet. Pak een kaart van de stapel.',
      zet: {
        h1: { past: false },
        match: { o: 0 },
        h2: { x: 350, y: 95, o: 1 },
        nieuw: { x: 500, y: 95, o: 1, dicht: true },
        lOpen: { x: 120, y: 250, o: 1 },
        lNiet: { x: 345, y: 250, o: 1 },
        lStapel: { x: 500, y: 230, o: 1 }
      }
    }
  ]
};

TUTORIALS.pesten = {
  titel: 'Zo werkt Pesten',
  begin: { x: 320, y: 150 },
  items: [
    ['boven', maakKaart('5', 'H')],
    ['hand0', maakKaart('2', 'D')],
    ['hand1', maakKaart('5', 'C')],
    ['hand2', maakKaart('7', 'S')],
    ['hand3', maakKaart('J', 'H')],
    ['labelBoven', maakLabel('Bovenste kaart')],
    ['labelHand', maakLabel('Jouw hand', true)],
    ['spec2', maakKaart('2', 'H')],
    ['spec7', maakKaart('7', 'S')],
    ['spec8', maakKaart('8', 'D')],
    ['specBoer', maakKaart('J', 'H')],
    ['specAas', maakKaart('A', 'D')],
    ['effect2', maakLabel('Pak 2', true)],
    ['effect7', maakLabel('Nog een keer', true)],
    ['effect8', maakLabel('Sla over', true)],
    ['effectBoer', maakLabel('Kies symbool', true)],
    ['effectAas', maakLabel('Draai om', true)],
    ['bel2', maakBel('De volgende pakt 2', true)]
  ],
  stappen: [
    {
      tekst: 'Leg dezelfde waarde of hetzelfde symbool op de bovenste kaart. Hier past de 5 omdat de open kaart ook een 5 is.',
      zet: {
        boven: { x: 275, y: 28, o: 1 },
        labelBoven: { x: 255, y: 0, o: 1 },
        ...voorElke('hand', 4, i => ({ x: 30 + 125 * i, y: 220, o: 1 })),
        labelHand: { x: 24, y: 190, o: 1 },
        hand1: { past: true }
      }
    },
    {
      tekst: 'Speciale kaarten veranderen de beurt. Spreek vooraf samen af welke effecten gelden voor jullie spel.',
      zet: {
        boven: { o: 0 },
        labelBoven: { o: 0 },
        ...voorElke('hand', 4, () => ({ o: 0 })),
        labelHand: { o: 0 },
        spec2: { x: 18, y: 105, o: 1 },
        spec7: { x: 140, y: 105, o: 1 },
        spec8: { x: 262, y: 105, o: 1 },
        specBoer: { x: 384, y: 105, o: 1 },
        specAas: { x: 506, y: 105, o: 1 },
        effect2: { x: 0, y: 245, o: 1 },
        effect7: { x: 120, y: 245, o: 1 },
        effect8: { x: 242, y: 245, o: 1 },
        effectBoer: { x: 364, y: 245, o: 1 },
        effectAas: { x: 486, y: 245, o: 1 }
      }
    },
    {
      tekst: 'Bijvoorbeeld: een 2 laat de volgende speler twee kaarten pakken. Speel je hand leeg om te winnen.',
      zet: {
        spec2: { o: 0 },
        spec7: { o: 0 },
        spec8: { o: 0 },
        specBoer: { o: 0 },
        specAas: { o: 0 },
        effect2: { o: 0 },
        effect7: { o: 0 },
        effect8: { o: 0 },
        effectBoer: { o: 0 },
        effectAas: { o: 0 },
        spec2: { x: 210, y: 100, s: 1.15, o: 1 },
        bel2: { x: 340, y: 155, o: 1 }
      }
    }
  ]
};

TUTORIALS.liegen = {
  titel: 'Zo werkt Liegen',
  begin: { x: 320, y: 150 },
  items: [
    ['boer1', maakKaart('J', 'H')],
    ['boer2', maakKaart('J', 'D')],
    ['kaart4', maakKaart('4', 'S')],
    ['claim', maakBel('Drie boeren')],
    ['uitroep', maakBel('Liegen!', true)],
    ['onthul', maakBel('Twee boeren en een 4')],
    ['stapel', maakBel('Pak de stapel', true)]
  ],
  stappen: [
    {
      tekst: 'Leg één of meer kaarten gesloten neer en vertel welke waarde erop zou liggen. Je mag eerlijk zijn, maar je mag ook bluffen.',
      zet: {
        boer1: { x: 160, y: 125, o: 1, dicht: true },
        boer2: { x: 265, y: 125, o: 1, dicht: true },
        kaart4: { x: 370, y: 125, o: 1, dicht: true },
        claim: { x: 245, y: 285, o: 1 }
      }
    },
    {
      tekst: 'De volgende speler besluit of de bewering geloofwaardig is. Die mag de kaarten laten liggen of “Liegen!” roepen.',
      zet: { uitroep: { x: 250, y: 35, o: 1 } }
    },
    {
      tekst: 'Draai de kaarten om. Er liggen maar twee boeren: de speler die blufte pakt in dit voorbeeld de stapel.',
      zet: {
        boer1: { dicht: false },
        boer2: { dicht: false },
        kaart4: { dicht: false, wint: true },
        claim: { o: 0 },
        uitroep: { o: 0 },
        onthul: { x: 225, y: 35, o: 1 },
        stapel: { x: 250, y: 300, o: 1 }
      }
    }
  ]
};

TUTORIALS.oorlog = {
  titel: 'Zo werkt Oorlog',
  begin: { x: 320, y: 150 },
  items: [
    ['anna', maakKaart('A', 'H')],
    ['bram', maakKaart('K', 'D')],
    ['naamAnna', maakLabel('Anna')],
    ['naamBram', maakLabel('Bram')],
    ['winnaar', maakBel('Aas wint!', true)],
    ['gelijkAnna', maakKaart('8', 'H')],
    ['gelijkBram', maakKaart('8', 'S')],
    ['extra1', maakKaart('2', 'H')],
    ['extra2', maakKaart('3', 'D')],
    ['extra3', maakKaart('4', 'C')],
    ['beslisser', maakBel('Draai nog één kaart om')]
  ],
  stappen: [
    {
      tekst: 'Twee spelers draaien tegelijk hun bovenste kaart om. De hoogste kaart wint deze ronde.',
      zet: {
        anna: { x: 185, y: 110, o: 1 },
        bram: { x: 370, y: 110, o: 1 },
        naamAnna: { x: 165, y: 265, o: 1 },
        naamBram: { x: 350, y: 265, o: 1 }
      }
    },
    {
      tekst: 'Aas is hoger dan koning. Anna neemt beide kaarten en legt ze onder haar eigen stapel.',
      zet: {
        anna: { wint: true },
        bram: { dim: true },
        winnaar: { x: 250, y: 25, o: 1 }
      }
    },
    {
      tekst: 'Zijn de kaarten even hoog? Dan is het oorlog: leg drie kaarten gesloten neer en draai daarna nog één kaart om. De winnaar neemt alles.',
      zet: {
        anna: { o: 0 },
        bram: { o: 0 },
        naamAnna: { x: 26, y: 190 },
        naamBram: { x: 26, y: 335 },
        winnaar: { o: 0 },
        gelijkAnna: { x: 170, y: 28, o: 1 },
        gelijkBram: { x: 370, y: 28, o: 1 },
        extra1: { x: 90, y: 205, o: 1, dicht: true },
        extra2: { x: 230, y: 205, o: 1, dicht: true },
        extra3: { x: 370, y: 205, o: 1, dicht: true },
        beslisser: { x: 200, y: 325, o: 1 }
      }
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

// Wiezen: alle 13 kaarten van harten
const alleWaarden = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
$('#klassiek-rij').innerHTML = alleWaarden.map(w => maakKaart(w, 'H')).join('');

// Kwartet: de vier symbolen van Vogels
$('#kwartet-rij').innerHTML = ['H', 'D', 'C', 'S'].map(symbool => maakFamilieKaart('vogels', symbool)).join('');

// pesten: de speciale kaarten, bijvoorbeeld "7S" = schoppen 7
document.querySelectorAll('.mini').forEach(rij => {
  rij.innerHTML = rij.dataset.kaarten
    .split(',')
    .map(code => maakKaart(code.slice(0, -1), code.slice(-1)))
    .join('');

  if (rij.dataset.dicht === 'true') {
    rij.querySelectorAll('.kaart').forEach(kaart => kaart.classList.add('dicht'));
  }
});