const $ = (s, r = document) => r.querySelector(s);
const SUIT = { H: '♥', D: '♦', C: '♣', S: '♠' };
const NAAM = { H: 'Harten', D: 'Ruiten', C: 'Klaveren', S: 'Schoppen' };
const isRood = s => s === 'H' || s === 'D';

function klassiek(r, s, extra = '', naam = '') {
  return `<div class="kaart ${isRood(s) ? 'rood' : ''} ${extra}"><span class="hoek">${r}<br>${SUIT[s]}</span><span class="midden">${SUIT[s]}</span>${naam ? `<span class="naam">${naam}</span>` : ''}</div>`;
}

/* ---------- 1. Klassiek: eerst de slag, daarna troef ---------- */
(function () {
  const waarde = { J: 11, Q: 12, K: 13, A: 14 };
  const val = r => waarde[r] || +r;
  const slag = [
    { p: 'Anna', r: '10', s: 'D' }, { p: 'Bram', r: 'K', s: 'D' },
    { p: 'Cleo', r: '3', s: 'H' }, { p: 'Daan', r: 'A', s: 'D' }
  ];
  const lead = 'D';
  let troef = null;
  window.troefStappen = {
    kaarten: slag,
    uitleg: [
      { titel: '1. Iemand start', tekst: 'Anna legt ruiten 10. De andere spelers moeten, als dat kan, ook ruiten spelen.' },
      { titel: '2. Vergelijk de kaarten', tekst: 'Zonder troef wint de hoogste kaart van het gestarte symbool. Daan wint dus met ruiten aas.' },
      { titel: '3. Troef is een extra regel', tekst: 'Kies je harten als troef? Dan verslaat Cleo met harten 3 zelfs de ruiten aas. Begin pas met troef als de gewone slag duidelijk is.' }
    ]
  };
})();

/* ---------- 2. Kwartet: stappen ---------- */
(function () {
  const C = '#E87A8E';
  const fam = (n, extra = '') => `<div class="kaart fam ${extra}" style="--c:${C}"><div class="band"><span>Vogels</span><span>${n}/4</span></div><span class="midden">♪</span></div>`;
  const rug = '<div class="kaart rug"></div>';
  const stappen = [
    'Jij hebt 3 Vogels-kaarten en één Bergen-kaart. Sam heeft 3 kaarten.',
    'Jij vraagt aan Sam: “Heb jij Vogels 3?” Dat mag, want je hebt zelf al Vogels.',
    'Sam heeft de kaart en geeft hem aan jou. Je mag nog een keer vragen.',
    'Je hebt alle 4 Vogels. Leg het kwartet open neer. Dat is 1 punt!'
  ];
  let i = 0;
  const root = $('#demo-kwartet');
  if (!root) return;
  function toon() {
    let sam = rug.repeat(i >= 2 ? 2 : 3);
    let bel = '';
    if (i === 1) bel = '<div class="bel">Heb jij Vogels 3?</div>';
    if (i === 2) bel = '<div class="bel">Ja, alsjeblieft!</div>';
    let jij = fam(1) + fam(2) + (i >= 2 && i < 3 ? fam(3, 'nieuw') : '') + fam(4);
    if (i >= 3) jij = '';
    const hand = `<div class="kw-rij">${jij}<div class="kaart" style="--c:#F2B431"><div class="band" style="background:#F2B431;padding:4px 6px;font-size:.72rem;font-weight:700;display:flex;justify-content:space-between"><span>Bergen</span><span>2/4</span></div><span class="midden" style="color:#F2B431">▲</span></div></div>`;
    const kwartet = i >= 3 ? `<div class="kw-rij">${fam(1)}${fam(2)}${fam(3, 'nieuw')}${fam(4)}</div><div class="score">Kwartet! +1 punt</div>` : '';
    $('#kw-tafel').innerHTML = `<div class="speler"><span>Sam</span><div class="kw-rij">${sam}</div></div>${bel}<div class="speler">${kwartet}<span>Jij</span>${hand}</div>`;
    $('.uitleg', root).textContent = stappen[i];
    $('.vorige', root).disabled = i === 0;
    $('.volgende', root).textContent = i === stappen.length - 1 ? 'Opnieuw' : 'Volgende';
  }
  $('.vorige', root).onclick = () => { i--; toon(); };
  $('.volgende', root).onclick = () => { i = i === stappen.length - 1 ? 0 : i + 1; toon(); };
  toon();
})();

/* ---------- 3. Domino: speel zelf ---------- */
(function () {
  const pos = { 0: [], 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  const dobbel = n => `<span class="dobbel">${[...Array(9)].map((_, i) => `<b class="${pos[n].includes(i) ? 'aan' : ''}"></b>`).join('')}</span>`;
  const steen = (a, b, cls = '', i = '') => `<div class="steen ${cls}" data-i="${i}"><span class="helft">${dobbel(a)}</span><span class="helft">${dobbel(b)}</span></div>`;
  let rij, hand, stapel;
  const reset = () => {
    rij = [[2, 4]];
    hand = [[3, 5], [1, 2], [5, 5], [2, 6], [4, 1]];
    stapel = [[6, 5], [3, 3], [1, 1], [6, 6]];
    toon('Klik op een kaart met een gele rand. Die past op een uiteinde.');
  };
  const einden = () => [rij[0][0], rij[rij.length - 1][1]];
  const past = k => { const [l, r] = einden(); return k.includes(l) || k.includes(r); };
  function toon(tekst) {
    $('#dm-rij').innerHTML = rij.map((k, i) => steen(k[0], k[1], i === 0 || i === rij.length - 1 ? 'uiteinde' : '')).join('');
    $('#dm-hand').innerHTML = hand.map((k, i) => steen(k[0], k[1], past(k) ? 'past' : '', i)).join('') || '';
    $('#dm-hand').querySelectorAll('.steen').forEach(el => el.onclick = () => speel(+el.dataset.i, el));
    $('#dm-tekst').textContent = tekst;
    $('#dm-pak').disabled = !stapel.length || !hand.length;
  }
  function speel(i, el) {
    const [a, b] = hand[i];
    const [l, r] = einden();
    let kant = '';
    if (a === r) { rij.push([a, b]); kant = 'rechts'; }
    else if (b === r) { rij.push([b, a]); kant = 'rechts'; }
    else if (b === l) { rij.unshift([a, b]); kant = 'links'; }
    else if (a === l) { rij.unshift([b, a]); kant = 'links'; }
    else { el.classList.add('nee'); $('#dm-tekst').textContent = 'Die past niet. De stippen die elkaar raken moeten gelijk zijn.'; return; }
    const vertrek = el.getBoundingClientRect();
    hand.splice(i, 1);
    toon(hand.length ? 'Goed! De stippen raken elkaar. Welke kaart past nu?' : 'Je hand is leeg. Je hebt gewonnen!');
    const stenen = $('#dm-rij').querySelectorAll('.steen');
    const nieuw = stenen[kant === 'links' ? 0 : stenen.length - 1];
    if (nieuw) {
      const doel = nieuw.getBoundingClientRect();
      nieuw.animate([{ transform: `translate(${vertrek.left - doel.left}px, ${vertrek.top - doel.top}px) scale(.7)`, opacity: .25 }, { transform: 'translate(0, 0) scale(1)', opacity: 1 }], { duration: 650, easing: 'cubic-bezier(.2,.8,.2,1)' });
    }
  }
  $('#dm-pak').onclick = () => { hand.push(stapel.shift()); toon('Je pakte een kaart van de stapel.'); };
  $('#dm-reset').onclick = reset;
  reset();
})();

/* ---------- Mini kaarten (Pesten) ---------- */
document.querySelectorAll('.mini').forEach(el => {
  el.innerHTML = el.dataset.kaarten.split(',').map(k => klassiek(k[0] === 'J' ? 'B' : k[0], k[1])).join('');
});

/* ---------- Uitleg-popup ---------- */
(function () {
  const modal = $('#modal');
  const stage = $('#stage');
  const titel = $('#m-titel');
  const tekst = $('#m-tekst');
  const dots = $('#dots');
  const vorige = $('#m-vorige');
  const volgende = $('#m-volgende');
  const sluit = $('.sluit', modal);
  let stappen = [];
  let actief = 0;
  let terugFocus;

  const dominoKaart = (a, b) => `<div class="steen"><span class="helft">${[a, b][0]}</span><span class="helft">${[a, b][1]}</span></div>`;
  const maakStappen = type => {
    if (type === 'klassiek') return troefStappen.uitleg.map((stap, i) => ({
      titel: stap.titel,
      tekst: stap.tekst,
      inhoud: `<div class="popup-slag">${troefStappen.kaarten.map((k, n) => `<div class="popup-kaart ${i === 2 && n === 2 ? 'wint' : i === 1 && n === 3 ? 'wint' : n !== 3 && i > 0 ? 'dim' : ''}">${klassiek(k.r, k.s)}<strong>${k.p}</strong></div>`).join('')}</div>`
    }));
    if (type === 'kwartet') return [
      { titel: '1. Verzamel dezelfde familie', tekst: 'Je hebt al drie kaarten van de familie Vogels. Daardoor mag je naar de vierde kaart vragen.', inhoud: '<div class="popup-kwartet">' + [1, 2, 4].map(n => `<div class="kaart fam"><div class="band"><span>Vogels</span><span>${n}/4</span></div><span class="midden">♪</span></div>`).join('') + '</div>' },
      { titel: '2. Vraag een kaart', tekst: 'Vraag één speler naar een specifieke kaart, bijvoorbeeld: “Heb jij Vogels 3?”', inhoud: '<div class="popup-vraag"><div class="popup-kwartet">Vogels 1/4&nbsp;&nbsp; Vogels 2/4&nbsp;&nbsp; Vogels 4/4</div><div class="bel">Heb jij Vogels 3?</div></div>' },
      { titel: '3. Maak je kwartet compleet', tekst: 'Krijg je de kaart, dan mag je nog een keer vragen. Leg alle vier kaarten open neer zodra de familie compleet is.', inhoud: '<div class="popup-kwartet">' + [1, 2, 3, 4].map(n => `<div class="kaart fam"><div class="band"><span>Vogels</span><span>${n}/4</span></div><span class="midden">♪</span></div>`).join('') + '</div><div class="score">Kwartet! +1 punt</div>' }
    ];
    return [
      { titel: '1. Kijk naar de uiteinden', tekst: 'De open rij begint met 2 en 4. Een kaart past alleen als één van zijn waarden gelijk is aan 2 of 4.', inhoud: `<div class="popup-domino">${dominoKaart(2, 4)}<span class="pijl">2&nbsp; of&nbsp; 4</span>${dominoKaart(1, 2)}</div>` },
      { titel: '2. Draai de kaart indien nodig', tekst: 'Draai de kaart zo dat dezelfde stippen elkaar raken. Hier sluit de 2 aan op de 2.', inhoud: `<div class="popup-domino">${dominoKaart(2, 4)}${dominoKaart(2, 1)}</div>` },
      { titel: '3. Speel al je kaarten', tekst: 'Kun je niets leggen, dan pak je een kaart. Wie als eerste zijn hand leeg speelt, wint.', inhoud: `<div class="popup-domino">${dominoKaart(2, 4)}${dominoKaart(2, 1)}${dominoKaart(1, 5)}</div>` }
    ];
  };
  function toon() {
    const stap = stappen[actief];
    titel.textContent = stap.titel;
    tekst.textContent = stap.tekst;
    stage.innerHTML = stap.inhoud;
    dots.innerHTML = stappen.map((_, i) => `<i class="${i === actief ? 'aan' : ''}"></i>`).join('');
    vorige.disabled = actief === 0;
    volgende.textContent = actief === stappen.length - 1 ? 'Klaar' : 'Volgende';
  }
  function open(type, knop) {
    terugFocus = knop;
    stappen = maakStappen(type);
    actief = 0;
    toon();
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    sluit.focus();
  }
  function dicht() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    if (terugFocus) terugFocus.focus();
  }
  document.querySelectorAll('.uitleg-knop').forEach(knop => knop.addEventListener('click', () => open(knop.dataset.tut, knop)));
  vorige.onclick = () => { if (actief) { actief--; toon(); } };
  volgende.onclick = () => { if (actief < stappen.length - 1) { actief++; toon(); } else dicht(); };
  sluit.onclick = dicht;
  modal.addEventListener('click', e => { if (e.target === modal) dicht(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.classList.contains('open')) dicht(); });
})();