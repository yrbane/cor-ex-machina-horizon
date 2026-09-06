import { clamp, lerp, hash, TAU } from '../util.js';
import { hsl, inks } from '../palette.js';

// Dessin des passages. scene : { W, H, horizon, wTop, tn, hue, disp }. Chaque dessin est fonction de sa taille s et de son sens d.
export function drawEvent(ctx, e, scene, sky) {
  const { W, H, horizon, wTop, tn } = scene, x = e.x * W, y = e.y * horizon, age = tn - e.born, k = inks(sky.day);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const D = DRAW[e.type]; if (D) D(ctx, e, { x, y, age, k, W, H, horizon, wTop, tn, sky, hue: scene.hue || 0, disp: scene.disp });
}

// --- oiseaux -------------------------------------------------------------
export function drawBird(ctx, x, y, size, flap, dir, ink, sp, H) {
  const s = H * .012 * size, glide = sp && sp.glide, w = glide ? Math.sin(flap) * s * .25 : Math.sin(flap) * s * .8;
  ctx.strokeStyle = ink; ctx.lineWidth = Math.max(1, s * .18); ctx.beginPath();
  ctx.moveTo(x - s * dir, y - w); ctx.quadraticCurveTo(x - s * .4 * dir, y + w * .3, x, y); ctx.quadraticCurveTo(x + s * .4 * dir, y + w * .3, x + s * dir, y - w); ctx.stroke();
  if (size > .9) { ctx.fillStyle = ink; ctx.beginPath(); ctx.ellipse(x, y + s * .05, s * .28, s * .12, 0, 0, TAU); ctx.fill(); }   // corps
  if (glide) { for (const side of [-1, 1]) for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x + s * side * dir * .9, y - w); ctx.lineTo(x + s * side * dir * (1.05 + i * .06), y - w - s * (.12 + i * .1)); ctx.stroke(); } } // rémiges
}

function lights(ctx, x, y, tn, s, d) { // feux d'aéronef : balise rouge lente, éclair blanc
  const ph = tn % 1.2;
  if (ph < .12) { ctx.fillStyle = 'rgba(255,60,50,.95)'; ctx.beginPath(); ctx.arc(x - s * 1.4 * d, y - s * .6, Math.max(1, s * .2), 0, TAU); ctx.fill(); }
  if (ph > .6 && ph < .66) { ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.beginPath(); ctx.arc(x + s * 1.6 * d, y, Math.max(1, s * .2), 0, TAU); ctx.fill(); }
}
const R = (ctx, x, y, w, h) => ctx.fillRect(x, y, w, h);
const poly = (ctx, pts) => { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fill(); };

const DRAW = {
  bird(ctx, e, c) { drawBird(ctx, c.x, c.y + Math.sin(c.tn * 1.3 + e.ph) * c.H * .006 * e.wob, e.size, c.tn * e.sp.flap + e.ph, e.dir, e.sp.dark ? c.k.ink : (c.sky.day > .5 ? 'rgba(40,44,60,.85)' : c.k.ink), e.sp, c.H); },
  flock(ctx, e, c) { for (const o of e.off) drawBird(ctx, c.x + o.dx * c.W * e.dir, c.y + o.dy * c.horizon + Math.sin(c.tn * 1.1 + o.ph) * c.H * .004, e.size * o.size, c.tn * e.sp.flap * o.sp + o.ph, e.dir, c.k.ink, e.sp, c.H); },

  airliner(ctx, e, c) {
    const s = c.H * .024 * e.size, d = e.dir, { x, y, k, sky } = c;
    // Traînées de condensation, une par réacteur, en segments qui s'estompent
    if (e.trail.length > 1 && sky.day > .25) {
      ctx.lineWidth = Math.max(1.5, s * .16);
      for (let i = 1; i < e.trail.length; i++) { const p = e.trail[i], q = e.trail[i - 1]; if (p.a <= 0) continue; ctx.strokeStyle = `rgba(245,245,252,${p.a * .5 * sky.day})`; for (const off of [.55, 1]) { ctx.beginPath(); ctx.moveTo(q.x * c.W - s * 1.2 * d, q.y * c.horizon + s * off); ctx.lineTo(p.x * c.W - s * 1.2 * d, p.y * c.horizon + s * off); ctx.stroke(); } }
    }
    // Aile lointaine, plus sombre, derrière le fuselage
    ctx.fillStyle = k.shade; poly(ctx, [[x + s * .3 * d, y - s * .1], [x - s * 1.1 * d, y - s * 1.1], [x - s * 1.7 * d, y - s * 1.1], [x - s * .6 * d, y - s * .1]]);
    // Fuselage : corps, ventre ombré, nez
    ctx.fillStyle = k.white; ctx.beginPath(); ctx.ellipse(x, y, s * 2.6, s * .46, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.ellipse(x, y, s * 2.6, s * .46, 0, 0, TAU); ctx.clip(); ctx.fillStyle = k.shade; ctx.globalAlpha = .55; R(ctx, x - s * 2.6, y + s * .12, s * 5.2, s * .4); ctx.globalAlpha = 1;
    ctx.fillStyle = e.livery; R(ctx, x - s * 2.6, y - s * .02, s * 5.2, s * .08); ctx.restore();                                        // liseré de compagnie
    // Dérive et stabilisateur, avec la couleur de la compagnie
    ctx.fillStyle = e.livery; poly(ctx, [[x - s * 1.9 * d, y - s * .1], [x - s * 2.7 * d, y - s * 1.3], [x - s * 2.25 * d, y - s * 1.3], [x - s * 1.3 * d, y - s * .1]]);
    ctx.fillStyle = k.white; poly(ctx, [[x - s * 2.2 * d, y - s * .05], [x - s * 2.75 * d, y - s * .5], [x - s * 2.5 * d, y - s * .05]]);
    // Aile proche, réacteurs, ailette
    ctx.fillStyle = k.white; poly(ctx, [[x + s * .55 * d, y + s * .05], [x - s * 1.15 * d, y + s * 1.3], [x - s * 1.85 * d, y + s * 1.3], [x - s * .45 * d, y + s * .05]]);
    ctx.fillStyle = k.shade; R(ctx, x - s * 1.9 * d - (d > 0 ? 0 : s * .1), y + s * 1.05, s * .1, s * .35);                             // ailette
    for (const [ox, oy] of [[-.55, .72], [-1.2, 1.05]]) { ctx.fillStyle = k.shade; ctx.beginPath(); ctx.ellipse(x + ox * s * d, y + oy * s, s * .5, s * .2, 0, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(30,34,50,.9)'; ctx.beginPath(); ctx.ellipse(x + (ox + .45) * s * d, y + oy * s, s * .08, s * .18, 0, 0, TAU); ctx.fill(); }
    // Cockpit et hublots, allumés la nuit
    ctx.fillStyle = k.glass; poly(ctx, [[x + s * 2.35 * d, y - s * .12], [x + s * 1.9 * d, y - s * .3], [x + s * 1.55 * d, y - s * .3], [x + s * 1.7 * d, y - s * .08]]);
    ctx.fillStyle = sky.day > .5 ? k.glass : k.lit; for (let i = 0; i < 10; i++) R(ctx, x + (1.2 - i * .34) * s * d - s * .06, y - s * .2, s * .12, s * .12);
    lights(ctx, x, y, c.tn, s, d);
  },

  prop(ctx, e, c) {
    const s = c.H * .017 * e.size, d = e.dir, { x, y, k, tn } = c;
    if (e.banner) { // corde, banderole qui ondule, texte « EMT » toujours lisible
      const len = s * 7.5, bx0 = x - d * s * 3.2, wave = i => Math.sin(tn * 5 + i * .9) * s * .28;
      ctx.strokeStyle = k.shade; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - s * 1.7 * d, y); ctx.lineTo(bx0, y + wave(0)); ctx.stroke();
      ctx.fillStyle = '#f7f4ea'; ctx.beginPath();
      for (let i = 0; i <= 10; i++) ctx.lineTo(bx0 - d * len * i / 10, y - s * .55 + wave(i));
      for (let i = 10; i >= 0; i--) ctx.lineTo(bx0 - d * len * i / 10, y + s * .55 + wave(i));
      ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.stroke();
      // Chaque lettre suit l'onde : posée à sa hauteur locale, inclinée selon la pente, dans l'ordre de lecture à l'écran
      const text = e.bannerText || 'EMT', left = Math.min(bx0, bx0 - d * len), waveAtX = px => wave((bx0 - px) * d / len * 10);
      ctx.fillStyle = '#1b2a4a'; ctx.font = `bold ${Math.round(s * .95)}px "Avenir Next", "Helvetica Neue", Arial, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let j = 0; j < text.length; j++) {
        const px = left + len * ((j + .5) / text.length * .6 + .2), slope = (waveAtX(px + 2) - waveAtX(px - 2)) / 4;
        ctx.save(); ctx.translate(px, y + waveAtX(px)); ctx.rotate(Math.atan(slope)); ctx.fillText(text[j], 0, 0); ctx.restore();
      }
    }
    ctx.fillStyle = k.shade; ctx.beginPath(); ctx.ellipse(x - s * .2 * d, y + s * .95, s * .18, s * .18, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(x + s * .9 * d, y + s * .95, s * .18, s * .18, 0, 0, TAU); ctx.fill(); // roues
    ctx.strokeStyle = k.shade; ctx.lineWidth = Math.max(1, s * .1); ctx.beginPath(); ctx.moveTo(x - s * .2 * d, y + s * .8); ctx.lineTo(x - s * .1 * d, y + s * .3); ctx.moveTo(x + s * .9 * d, y + s * .8); ctx.lineTo(x + s * .7 * d, y + s * .3); ctx.stroke();
    ctx.fillStyle = e.col; ctx.beginPath(); ctx.ellipse(x, y, s * 1.9, s * .5, 0, 0, TAU); ctx.fill();                                 // fuselage
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(x, y + s * .2, s * 1.7, s * .25, 0, 0, TAU); ctx.fill();          // ventre
    ctx.fillStyle = e.col; R(ctx, x - s * 1.1 * (d > 0 ? 1 : -1) - (d > 0 ? 0 : s * 2.2), y - s * .62, s * 2.2, s * .2);              // aile haute
    ctx.strokeStyle = k.shade; ctx.beginPath(); ctx.moveTo(x - s * .3 * d, y - s * .45); ctx.lineTo(x - s * .7 * d, y - s * .1); ctx.moveTo(x + s * .3 * d, y - s * .45); ctx.lineTo(x + s * .5 * d, y - s * .1); ctx.stroke(); // haubans
    ctx.fillStyle = e.col; poly(ctx, [[x - s * 1.4 * d, y - s * .2], [x - s * 2.1 * d, y - s * 1], [x - s * 1.75 * d, y - s * .2]]); // dérive
    ctx.fillStyle = k.shade; poly(ctx, [[x - s * 1.5 * d, y], [x - s * 2.1 * d, y - s * .3], [x - s * 1.9 * d, y + s * .05]]);        // stabilisateur
    ctx.fillStyle = k.glass; R(ctx, x + s * .1 * d - s * .35, y - s * .38, s * .7, s * .22); R(ctx, x - s * .7 * d - s * .2, y - s * .34, s * .4, s * .18); // vitres
    ctx.fillStyle = 'rgba(230,230,240,.35)'; ctx.beginPath(); ctx.ellipse(x + s * 2 * d, y, s * .15, s * 1, 0, 0, TAU); ctx.fill();  // disque de l'hélice
    ctx.strokeStyle = 'rgba(230,230,240,.7)'; ctx.lineWidth = Math.max(1, s * .12); const pr = s * .95 * Math.sin(tn * 40); ctx.beginPath(); ctx.moveTo(x + s * 2 * d, y - pr); ctx.lineTo(x + s * 2 * d, y + pr); ctx.stroke();
    ctx.fillStyle = k.shade; ctx.beginPath(); ctx.arc(x + s * 2 * d, y, s * .14, 0, TAU); ctx.fill();                                   // casserole
  },

  heli(ctx, e, c) {
    const s = c.H * .018 * e.size, d = e.dir, { x, k, tn } = c, y = c.y + Math.sin(tn * 2 + e.ph) * s * .3;
    ctx.fillStyle = e.col; if (d > 0) R(ctx, x - s * 3, y - s * .12, s * 3, s * .24); else R(ctx, x, y - s * .12, s * 3, s * .24);   // poutre
    poly(ctx, [[x - s * 2.9 * d, y], [x - s * 3.1 * d, y - s * .85], [x - s * 2.55 * d, y - s * .1]]);                              // dérive
    ctx.beginPath(); ctx.ellipse(x, y, s * 1.25, s * .62, 0, 0, TAU); ctx.fill();                                                       // cabine
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(x, y + s * .25, s * 1.1, s * .3, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = k.glass; poly(ctx, [[x + s * .2 * d, y - s * .55], [x + s * 1.15 * d, y - s * .25], [x + s * 1.2 * d, y + s * .15], [x + s * .3 * d, y + s * .05]]); // verrière
    ctx.strokeStyle = k.shade; ctx.lineWidth = Math.max(1, s * .1); ctx.beginPath(); ctx.moveTo(x - s * 1.1, y + s * .95); ctx.lineTo(x + s * 1.1, y + s * .95); ctx.moveTo(x - s * .6, y + s * .55); ctx.lineTo(x - s * .7, y + s * .95); ctx.moveTo(x + s * .6, y + s * .55); ctx.lineTo(x + s * .7, y + s * .95); ctx.stroke(); // patins
    ctx.beginPath(); ctx.moveTo(x, y - s * .6); ctx.lineTo(x, y - s * .95); ctx.stroke();                                              // mât
    ctx.fillStyle = 'rgba(230,230,240,.2)'; ctx.beginPath(); ctx.ellipse(x, y - s * .95, s * 2.3, s * .14, 0, 0, TAU); ctx.fill();     // disque rotor
    ctx.strokeStyle = 'rgba(230,230,240,.75)'; const rot = Math.cos(tn * 30) * s * 2.2; ctx.beginPath(); ctx.moveTo(x - rot, y - s * .95); ctx.lineTo(x + rot, y - s * .95); ctx.stroke();
    const tr = Math.sin(tn * 50) * s * .4; ctx.beginPath(); ctx.moveTo(x - s * 3 * d, y - s * .45 - tr); ctx.lineTo(x - s * 3 * d, y - s * .45 + tr); ctx.stroke(); // rotor de queue
    lights(ctx, x, y, tn, s, d);
  },

  balloon(ctx, e, c) {
    const s = c.H * .03 * e.size, { x, y, k, tn } = c;
    ctx.beginPath(); ctx.arc(x, y, s, 0, TAU); ctx.fillStyle = e.cols[0]; ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, s, 0, TAU); ctx.clip();
    ctx.fillStyle = e.cols[1]; for (let i = -2; i <= 2; i += 2) R(ctx, x + i * s * .4 - s * .2, y - s, s * .4, s * 2);                 // fuseaux
    const g = ctx.createLinearGradient(x - s, y, x + s, y); g.addColorStop(0, 'rgba(0,0,0,.35)'); g.addColorStop(.45, 'rgba(0,0,0,0)'); g.addColorStop(.7, 'rgba(255,255,255,.18)'); g.addColorStop(1, 'rgba(0,0,0,.15)');
    ctx.fillStyle = g; R(ctx, x - s, y - s, s * 2, s * 2); ctx.restore();                                                                // modelé
    ctx.fillStyle = e.cols[0]; poly(ctx, [[x - s * .7, y + s * .72], [x + s * .7, y + s * .72], [x + s * .16, y + s * 1.5], [x - s * .16, y + s * 1.5]]);
    const fl = .6 + .4 * Math.sin(tn * 23 + e.ph); ctx.fillStyle = `rgba(255,${160 + fl * 60},60,${.5 + fl * .4})`; poly(ctx, [[x - s * .1, y + s * 1.55], [x + s * .1, y + s * 1.55], [x, y + s * 1.55 - s * .3 * fl]]); // flamme du brûleur
    ctx.strokeStyle = k.ink; ctx.lineWidth = 1; ctx.beginPath(); for (const o of [-.16, -.06, .06, .16]) { ctx.moveTo(x + o * s, y + s * 1.5); ctx.lineTo(x + o * s * .8, y + s * 1.95); } ctx.stroke(); // suspentes
    ctx.fillStyle = '#8a5a2b'; R(ctx, x - s * .22, y + s * 1.95, s * .44, s * .28); ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); for (let i = 1; i < 3; i++) { ctx.moveTo(x - s * .22, y + s * (1.95 + i * .09)); ctx.lineTo(x + s * .22, y + s * (1.95 + i * .09)); } ctx.stroke(); // nacelle tressée
  },

  zeppelin(ctx, e, c) {
    const s = c.H * .02 * e.size, d = e.dir, { x, y, k, tn } = c;
    const g = ctx.createLinearGradient(x, y - s, x, y + s); g.addColorStop(0, k.white); g.addColorStop(.6, k.shade); g.addColorStop(1, 'rgba(70,75,95,.95)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, s * 3.3, s * .95, 0, 0, TAU); ctx.fill();                                      // enveloppe
    ctx.strokeStyle = 'rgba(0,0,0,.15)'; ctx.lineWidth = 1; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.ellipse(x + i * s * .9, y, s * .12, s * .95 * Math.sqrt(1 - Math.pow(i * .9 / 3.3, 2)), 0, 0, TAU); ctx.stroke(); } // couples
    ctx.fillStyle = k.shade; poly(ctx, [[x - s * 2.6 * d, y], [x - s * 3.7 * d, y - s * 1.15], [x - s * 3.2 * d, y]]); poly(ctx, [[x - s * 2.6 * d, y], [x - s * 3.7 * d, y + s * 1.15], [x - s * 3.2 * d, y]]); // empennages
    ctx.fillStyle = e.livery || '#c9463d'; poly(ctx, [[x - s * 2.9 * d, y - s * .5], [x - s * 3.45 * d, y - s * 1.05], [x - s * 3.3 * d, y - s * .5]]);
    ctx.fillStyle = 'rgba(60,70,90,.95)'; R(ctx, x - s * .9, y + s * .8, s * 1.8, s * .42);                                             // nacelle
    ctx.fillStyle = c.sky.day > .5 ? k.glass : k.lit; for (let i = 0; i < 5; i++) R(ctx, x - s * .75 + i * s * .34, y + s * .9, s * .18, s * .16);
    ctx.fillStyle = k.shade; ctx.beginPath(); ctx.arc(x + s * 3.3 * d, y, s * .12, 0, TAU); ctx.fill();                                 // nez
    lights(ctx, x, y + s * .9, tn, s, d);
  },

  paraglider(ctx, e, c) {
    const s = c.H * .022 * e.size, { x, y, k, tn } = c, sway = Math.sin(tn * 1.1 + e.ph) * s * .3, cx = x + sway, cy = y + s * .6, rr = s * 1.3;
    for (let i = 0; i < 7; i++) { const a0 = Math.PI * (1.15 + i * .1), a1 = a0 + Math.PI * .1; ctx.strokeStyle = i % 2 ? e.col : '#f5f5f5'; ctx.lineWidth = Math.max(2, s * .26); ctx.beginPath(); ctx.arc(cx, cy, rr, a0, a1); ctx.stroke(); } // caissons
    ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, rr + s * .13, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    ctx.strokeStyle = 'rgba(200,200,210,.5)'; ctx.beginPath(); for (const a of [1.2, 1.35, 1.5, 1.65, 1.8]) { ctx.moveTo(cx + Math.cos(Math.PI * a) * rr, cy + Math.sin(Math.PI * a) * rr); ctx.lineTo(x, y + s * .85); } ctx.stroke(); // suspentes
    ctx.fillStyle = e.col; R(ctx, x - s * .16, y + s * .8, s * .32, s * .4);                                                             // sellette
    ctx.fillStyle = k.ink; ctx.beginPath(); ctx.arc(x, y + s * .72, s * .14, 0, TAU); ctx.fill();                                       // tête
    ctx.strokeStyle = k.ink; ctx.lineWidth = Math.max(1, s * .1); ctx.beginPath(); ctx.moveTo(x - s * .08, y + s * 1.2); ctx.lineTo(x - s * .18, y + s * 1.5); ctx.moveTo(x + s * .08, y + s * 1.2); ctx.lineTo(x + s * .2, y + s * 1.45); ctx.stroke(); // jambes
  },

  satellite(ctx, e, c) {
    const { x, y, tn } = c, s = c.H * .006, g = .6 + .4 * Math.sin(tn * 5 + e.ph);
    ctx.fillStyle = `rgba(200,210,230,${.6 + .4 * g})`; R(ctx, x - s * .4, y - s * .4, s * .8, s * .8);
    ctx.fillStyle = `rgba(120,150,220,${.5 + .5 * g})`; R(ctx, x - s * 2.2, y - s * .25, s * 1.5, s * .5); R(ctx, x + s * .7, y - s * .25, s * 1.5, s * .5); // panneaux
    if (g > .9) { ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(x, y, s * 1.2, 0, TAU); ctx.fill(); }               // reflet
  },

  ufo(ctx, e, c) {
    const s = c.H * .017 * e.size, { x, tn, sky } = c, y = c.y + Math.sin(tn * 6) * s * .15;
    if (Math.sin(tn * .7 + e.ph) > .8) { const g = ctx.createLinearGradient(x, y, x, y + s * 6); g.addColorStop(0, 'rgba(160,255,200,.35)'); g.addColorStop(1, 'rgba(160,255,200,0)'); ctx.fillStyle = g; poly(ctx, [[x - s * .6, y], [x + s * .6, y], [x + s * 2.6, y + s * 6], [x - s * 2.6, y + s * 6]]); } // rayon
    const body = ctx.createLinearGradient(x, y - s * .5, x, y + s * .5); body.addColorStop(0, 'rgba(225,232,245,.95)'); body.addColorStop(.6, 'rgba(150,160,185,.95)'); body.addColorStop(1, 'rgba(70,78,100,.95)');
    ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(x, y, s * 2.1, s * .55, 0, 0, TAU); ctx.fill();                                   // soucoupe
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y - s * .12, s * 1.6, s * .25, 0, 0, TAU); ctx.stroke(); // arête
    ctx.fillStyle = 'rgba(160,230,255,.55)'; ctx.beginPath(); ctx.arc(x, y - s * .3, s * .85, Math.PI, 0); ctx.fill();                  // dôme
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(x - s * .15, y - s * .45, s * .55, Math.PI * 1.15, Math.PI * 1.55); ctx.stroke(); // reflet du dôme
    for (let i = 0; i < 6; i++) { const a = tn * 2.5 + i / 6 * TAU, lx = x + Math.cos(a) * s * 1.7, ly = y + s * .22 + Math.sin(a) * s * .3, hh = (tn * 200 + i * 60) % 360; ctx.fillStyle = `hsla(${hh},95%,62%,${.6 + .4 * Math.sin(tn * 9 + i)})`; ctx.beginPath(); ctx.arc(lx, ly, s * .16, 0, TAU); ctx.fill(); } // feux tournants
    ctx.fillStyle = `rgba(160,255,200,${.35 + .25 * Math.sin(tn * 12)})`; ctx.beginPath(); ctx.arc(x, y + s * .45, s * .22, 0, TAU); ctx.fill(); // feu ventral
  },

  shooting(ctx, e, c) {
    const f = e.life / e.ttl, len = c.H * .12 * Math.sin(f * Math.PI), hx = c.x + e.dx * f * c.W * .25, hy = c.y + e.dy * f * c.H * .25;
    const g = ctx.createLinearGradient(hx - e.dx * len, hy - e.dy * len, hx, hy); g.addColorStop(0, 'rgba(234,231,221,0)'); g.addColorStop(1, `rgba(255,250,240,${.9 * (1 - f)})`);
    ctx.strokeStyle = g; ctx.lineWidth = Math.max(1, c.H * .003); ctx.beginPath(); ctx.moveTo(hx - e.dx * len, hy - e.dy * len); ctx.lineTo(hx, hy); ctx.stroke();
  },
  comet(ctx, e, c) {
    const { x, y, hue } = c, len = c.W * .22, tx = x - e.dir * len, ty = y - e.dy * c.W * 8;
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(tx, ty, x, y); g.addColorStop(0, hsl(hue, 'bass', 60, 80, 0)); g.addColorStop(.7, hsl(hue, 'bass', 60, 85, .25)); g.addColorStop(1, 'rgba(255,255,255,.9)');
    ctx.strokeStyle = g; ctx.lineWidth = Math.max(2, c.H * .012); ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(x, y); ctx.stroke();
    const g2 = ctx.createLinearGradient(tx, ty - c.H * .04, x, y); g2.addColorStop(0, 'rgba(120,170,255,0)'); g2.addColorStop(1, 'rgba(120,170,255,.5)');     // queue ionique, bleutée
    ctx.strokeStyle = g2; ctx.lineWidth = Math.max(1, c.H * .005); ctx.beginPath(); ctx.moveTo(tx, ty - c.H * .04); ctx.lineTo(x, y); ctx.stroke();
    const h = ctx.createRadialGradient(x, y, 0, x, y, c.H * .03); h.addColorStop(0, 'rgba(255,255,255,.95)'); h.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = h; ctx.beginPath(); ctx.arc(x, y, c.H * .03, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  },

  balloons(ctx, e, c) {
    const s = c.H * .012 * e.size, cols = ['#e8402f', '#f2c230', '#2f7fe8', '#1fbf8a', '#8e44ad', '#ff7ab6'], { x, y, tn } = c;
    for (let i = 0; i < e.n; i++) {
      const bx = x + Math.sin(tn * .8 + i * 1.3) * s * 1.2 + (hash(i + e.ph) - .5) * s * 2.5, by = y - hash(i + 9 + e.ph) * s * 2.5;
      ctx.strokeStyle = 'rgba(220,220,230,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(bx, by + s); ctx.quadraticCurveTo(bx, by + s * 2.5, x, y + s * 3.5); ctx.stroke();
      ctx.fillStyle = cols[i % cols.length]; ctx.beginPath(); ctx.ellipse(bx, by, s * .8, s, 0, 0, TAU); ctx.fill();
      poly(ctx, [[bx - s * .12, by + s * .95], [bx + s * .12, by + s * .95], [bx, by + s * 1.15]]);                                     // nœud
      ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.beginPath(); ctx.ellipse(bx - s * .3, by - s * .4, s * .18, s * .28, .5, 0, TAU); ctx.fill(); // reflet
    }
  },

  kite(ctx, e, c) {
    const s = c.H * .02 * e.size, { tn, k } = c, kx = c.x + Math.sin(tn * 1.5 + e.ph) * s, ky = c.y + Math.cos(tn * 1.1 + e.ph) * s * .6, d = e.dir;
    ctx.fillStyle = e.col; poly(ctx, [[kx, ky - s], [kx + s * .7, ky], [kx, ky + s * 1.3]]); ctx.fillStyle = e.col2; poly(ctx, [[kx, ky - s], [kx - s * .7, ky], [kx, ky + s * 1.3]]);
    ctx.strokeStyle = k.ink; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(kx, ky - s); ctx.lineTo(kx, ky + s * 1.3); ctx.moveTo(kx - s * .7, ky); ctx.lineTo(kx + s * .7, ky); ctx.stroke(); // armature
    ctx.strokeStyle = e.col; ctx.lineWidth = Math.max(1, s * .1); ctx.beginPath(); ctx.moveTo(kx, ky + s * 1.3); const pts = []; for (let i = 1; i <= 6; i++) { const px = kx + Math.sin(tn * 6 + i) * s * .4 - d * i * s * .3, py = ky + s * 1.3 + i * s * .45; ctx.lineTo(px, py); pts.push([px, py]); } ctx.stroke();
    ctx.fillStyle = e.col2; for (const [px, py] of pts.filter((_, i) => i % 2)) { poly(ctx, [[px - s * .2, py - s * .12], [px, py], [px - s * .2, py + s * .12]]); poly(ctx, [[px + s * .2, py - s * .12], [px, py], [px + s * .2, py + s * .12]]); } // nœuds de la queue
    ctx.strokeStyle = 'rgba(220,220,230,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(kx, ky); ctx.quadraticCurveTo(kx - d * s * 2, ky + s * 6, kx - d * s * 6, ky + s * 9); ctx.stroke(); // fil
  },

  butterflies(ctx, e, c) {
    const s = c.H * .005, { x, y, tn } = c;
    for (let i = 0; i < e.n; i++) {
      const bx = x + Math.sin(tn * 1.7 + i * 2.1) * s * 6 + i * s * 4, by = y + Math.sin(tn * 2.3 + i * 1.7) * s * 5, w = Math.abs(Math.sin(tn * 18 + i)) * s * 1.6 + s * .3;
      ctx.fillStyle = e.col; ctx.beginPath(); ctx.ellipse(bx - w * .6, by - s * .3, w, s * .9, .3, 0, TAU); ctx.ellipse(bx + w * .6, by - s * .3, w, s * .9, -.3, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(bx - w * .5, by + s * .6, w * .7, s * .6, -.3, 0, TAU); ctx.ellipse(bx + w * .5, by + s * .6, w * .7, s * .6, .3, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(20,18,30,.7)'; ctx.beginPath(); ctx.arc(bx - w * .7, by - s * .3, s * .25, 0, TAU); ctx.arc(bx + w * .7, by - s * .3, s * .25, 0, TAU); ctx.fill(); R(ctx, bx - s * .1, by - s * .8, s * .2, s * 1.6); // ocelles et corps
    }
  },

  bat(ctx, e, c) {
    const s = c.H * .012 * e.size, { x, y, tn } = c, f = Math.sin(tn * 16 + e.ph) * s;
    ctx.fillStyle = 'rgba(20,18,30,.9)'; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - s * .8, y - s - f, x - s * 1.6, y - f * .5); ctx.quadraticCurveTo(x - s * .9, y + s * .2, x, y + s * .3); ctx.quadraticCurveTo(x + s * .9, y + s * .2, x + s * 1.6, y - f * .5); ctx.quadraticCurveTo(x + s * .8, y - s - f, x, y); ctx.fill();
    poly(ctx, [[x - s * .12, y - s * .1], [x - s * .22, y - s * .4], [x - s * .02, y - s * .15]]); poly(ctx, [[x + s * .12, y - s * .1], [x + s * .22, y - s * .4], [x + s * .02, y - s * .15]]); // oreilles
  },

  seeds(ctx, e, c) {
    const { x, y, tn } = c;
    for (let i = 0; i < e.n; i++) {
      const sx = x + (hash(i + e.ph) - .5) * c.W * .08 + Math.sin(tn * .9 + i) * c.H * .01, sy = y + (hash(i + 3 + e.ph) - .5) * c.H * .1 + Math.sin(tn * 1.3 + i * 2) * c.H * .012, r = 1.2 + hash(i + 5) * 1.5;
      ctx.strokeStyle = 'rgba(245,245,240,.45)'; ctx.lineWidth = 1; ctx.beginPath(); for (let j = 0; j < 5; j++) { const a = j / 5 * TAU + tn * .3; ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(a) * r * 2.2, sy + Math.sin(a) * r * 2.2); } ctx.stroke(); // aigrette
      ctx.fillStyle = 'rgba(245,245,240,.8)'; ctx.beginPath(); ctx.arc(sx, sy, r * .6, 0, TAU); ctx.fill();
    }
  },

  sailboat(ctx, e, c) {
    const { wTop, H, sky, tn, x, k } = c, s = H * (.012 + e.d * .04), yy = wTop + e.d * (H - wTop) * .35, d = e.dir, heel = Math.sin(tn * .8 + e.ph) * .04, night = sky.day < .5;
    ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - s * 1.2 * d, yy + s * .3); ctx.lineTo(x - s * 4 * d, yy + s * .5); ctx.moveTo(x - s * 1.2 * d, yy + s * .35); ctx.lineTo(x - s * 3 * d, yy + s * .7); ctx.stroke(); // sillage
    ctx.save(); ctx.translate(x, yy); ctx.rotate(heel);
    const hull = ctx.createLinearGradient(0, 0, 0, s * .4); hull.addColorStop(0, e.col); hull.addColorStop(1, 'rgba(0,0,0,.6)');
    ctx.fillStyle = night ? 'rgba(20,22,34,.95)' : hull; poly(ctx, [[-s * 1.25, 0], [s * 1.25, 0], [s * .95, s * .38], [-s * .9, s * .38]]);
    ctx.fillStyle = night ? 'rgba(30,32,44,.95)' : '#f4f4f6'; R(ctx, -s * .5, -s * .22, s * .8, s * .22);                              // rouf
    ctx.strokeStyle = night ? 'rgba(200,204,220,.8)' : '#3a3f4c'; ctx.lineWidth = Math.max(1, s * .08); ctx.beginPath(); ctx.moveTo(-s * .1 * d, 0); ctx.lineTo(-s * .1 * d, -s * 2.3); ctx.moveTo(-s * .1 * d, -s * .2); ctx.lineTo(s * 1.05 * d, -s * .2); ctx.stroke(); // mât et bôme
    const sail = night ? 'rgba(210,214,230,.9)' : '#f7f7f9'; ctx.fillStyle = sail;
    poly(ctx, [[-s * .05 * d, -s * .25], [-s * .05 * d, -s * 2.25], [s * 1.0 * d, -s * .25]]);                                        // grand-voile
    ctx.fillStyle = 'rgba(0,0,0,.08)'; poly(ctx, [[-s * .05 * d, -s * .25], [s * .4 * d, -s * 1.1], [s * 1.0 * d, -s * .25]]);
    ctx.fillStyle = sail; poly(ctx, [[-s * .25 * d, -s * .25], [-s * .25 * d, -s * 1.75], [-s * 1.15 * d, -s * .25]]);                // foc
    ctx.fillStyle = '#e8402f'; poly(ctx, [[-s * .1 * d, -s * 2.3], [-s * .1 * d, -s * 2.1], [s * .28 * d, -s * 2.2]]);                  // flamme en tête de mât
    if (night) { ctx.fillStyle = 'rgba(255,240,200,.9)'; ctx.beginPath(); ctx.arc(-s * .1 * d, -s * 2.3, Math.max(1, s * .12), 0, TAU); ctx.fill(); }
    ctx.restore();
    ctx.globalAlpha = .22; ctx.save(); ctx.translate(x, yy + s * .42); ctx.scale(1, -1); ctx.fillStyle = sail; poly(ctx, [[-s * .05 * d, -s * .05], [-s * .05 * d, -s * 2], [s * 1.0 * d, -s * .1]]); ctx.restore(); ctx.globalAlpha = 1; // reflet
  },

  ship(ctx, e, c) {
    const { wTop, H, sky, tn, x, k } = c, s = H * (.01 + e.d * .03), yy = wTop + e.d * (H - wTop) * .3, d = e.dir, night = sky.day < .5;
    ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - s * 3.5 * d, yy + s * .4); ctx.lineTo(x - s * 7 * d, yy + s * .6); ctx.stroke(); // sillage
    ctx.fillStyle = night ? 'rgba(22,24,36,.95)' : '#3a4152'; poly(ctx, [[x - s * 3.6 * d, yy - s * .1], [x + s * 3.6 * d, yy - s * .1], [x + s * 3.1 * d, yy + s * .6], [x - s * 3.3 * d, yy + s * .6]]); // coque
    ctx.fillStyle = night ? 'rgba(90,30,26,.95)' : '#c9463d'; R(ctx, x - s * 3.6, yy - s * .1, s * 7.2, s * .12);                       // ligne de flottaison
    const cols = ['#2f7fe8', '#e8402f', '#f2c230', '#1fbf8a', '#8e44ad']; for (let r = 0; r < 2; r++) for (let i = 0; i < 6; i++) { ctx.fillStyle = night ? 'rgba(40,44,60,.95)' : cols[(i + r * 2) % cols.length]; R(ctx, x - s * 2.6 + i * s * .72, yy - s * .5 - r * s * .42, s * .66, s * .38); } // conteneurs
    ctx.fillStyle = night ? 'rgba(60,64,80,.95)' : '#e9ebf0'; R(ctx, x + s * 2.2 * d - s * .5, yy - s * 1.5, s, s * 1.4);                 // château
    ctx.fillStyle = night ? k.lit : k.glass; for (let i = 0; i < 3; i++) R(ctx, x + s * 2.2 * d - s * .35 + i * s * .3, yy - s * 1.35, s * .18, s * .14);
    ctx.fillStyle = night ? 'rgba(60,64,80,.95)' : '#c9463d'; R(ctx, x + s * 2.2 * d - s * .15, yy - s * 2, s * .3, s * .5);              // cheminée
    for (let i = 0; i < 3; i++) { const f = ((tn * .3 + i * .33) % 1); ctx.fillStyle = `rgba(200,200,210,${.35 * (1 - f)})`; ctx.beginPath(); ctx.arc(x + s * 2.2 * d - d * f * s * 2, yy - s * 2.1 - f * s * 1.2, s * (.15 + f * .35), 0, TAU); ctx.fill(); } // fumée
    ctx.strokeStyle = night ? 'rgba(200,204,220,.6)' : '#3a3f4c'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - s * 3 * d, yy - s * .1); ctx.lineTo(x - s * 3 * d, yy - s * 1.6); ctx.stroke(); // mât
    if (night) { ctx.fillStyle = 'rgba(255,230,180,.9)'; for (let i = 0; i < 4; i++) R(ctx, x - s * 2.5 + i * s * 1.3, yy + s * .05, Math.max(1, s * .2), Math.max(1, s * .15)); }
  },

  fish(ctx, e, c) {
    const { wTop, H, x } = c, f = e.life / e.ttl, s = H * (.006 + e.d * .012), yy = wTop + e.d * (H - wTop) * .5, fx = x + (f - .5) * s * 6 * e.dir, fy = yy - Math.sin(f * Math.PI) * s * 3.5, ang = Math.atan2(-Math.cos(f * Math.PI) * s * 3.5 * Math.PI, s * 6 * e.dir);
    ctx.save(); ctx.translate(fx, fy); ctx.rotate(ang);
    ctx.fillStyle = 'rgba(200,215,235,.9)'; ctx.beginPath(); ctx.ellipse(0, 0, s * 1.2, s * .45, 0, 0, TAU); ctx.fill(); poly(ctx, [[-s, 0], [-s * 1.7, -s * .5], [-s * 1.7, s * .5]]);
    ctx.fillStyle = 'rgba(120,150,200,.7)'; poly(ctx, [[-s * .2, -s * .4], [s * .3, -s * .75], [s * .5, -s * .4]]);                      // nageoire dorsale
    ctx.fillStyle = 'rgba(20,20,30,.9)'; ctx.beginPath(); ctx.arc(s * .7, -s * .1, s * .1, 0, TAU); ctx.fill();                          // œil
    ctx.restore();
    const spl = f < .25 ? 1 - f * 4 : f > .75 ? (f - .75) * 4 : 0;
    if (spl > 0) { ctx.fillStyle = `rgba(220,235,255,${.6 * spl})`; for (let i = 0; i < 7; i++) { const sx = (f < .25 ? x - s * 3 * e.dir : x + s * 3 * e.dir) + (hash(i + 3) - .5) * s * 3, sy = yy - hash(i + 8) * s * 2 * (spl + .2); ctx.beginPath(); ctx.arc(sx, sy, s * .25, 0, TAU); ctx.fill(); } }
  },

  whale(ctx, e, c) {
    const { wTop, H, sky, x } = c, f = e.life / e.ttl, s = H * (.02 + e.d * .03), yy = wTop + e.d * (H - wTop) * .5, rise = Math.sin(Math.min(1, f * 1.6) * Math.PI) * s * .9, body = sky.day > .5 ? '#1f2a3a' : 'rgba(14,16,26,.95)';
    if (f < .7) { ctx.fillStyle = body; ctx.beginPath(); ctx.moveTo(x - s * 2.5, yy + 1); ctx.quadraticCurveTo(x - s * .5, yy - rise * 1.6, x + s * 1.6, yy - rise * .4); ctx.lineTo(x + s * 2.5, yy + 1); ctx.fill();
      poly(ctx, [[x - s * .6, yy - rise * 1.1], [x - s * .3, yy - rise * 1.5 - s * .4 * (rise / s)], [x + s * .1, yy - rise * 1.0]]); }     // aileron
    if (f > .1 && f < .55) { const sp = Math.sin((f - .1) / .45 * Math.PI); ctx.fillStyle = `rgba(230,240,255,${.55 * sp})`; for (let i = 0; i < 10; i++) { const px = x - s * .9 + (hash(i + 2) - .5) * s * 1.6 * sp, py = yy - rise - hash(i + 7) * s * 3 * sp; ctx.beginPath(); ctx.arc(px, py, s * .12 + hash(i) * s * .15, 0, TAU); ctx.fill(); } } // souffle
    if (f > .72) { const g = Math.sin((f - .72) / .28 * Math.PI), fx = x + s * 2.2 * e.dir; ctx.fillStyle = body; poly(ctx, [[fx, yy + 1], [fx - s * .3, yy - s * 1.6 * g], [fx - s * 1.3, yy - s * 2 * g], [fx - s * .2, yy - s * 1.2 * g], [fx + s * .9, yy - s * 2 * g], [fx + s * .1, yy - s * 1.6 * g]]); } // queue qui sort
  },
};
