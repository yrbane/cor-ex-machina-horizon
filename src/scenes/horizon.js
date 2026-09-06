import { WATER_TYPES, BEHIND_CLOUDS } from '../events.js';

// Scène « Horizon » : montagnes au bord de l'eau, reflets ondulés, passages du ciel et de l'eau
export const horizonGeometry = H => ({ horizon: H * .74, wTop: H * .74 + H * .06 });

export function renderHorizon(ctx, S, D) {
  const { W, H, t, sky, wx, events } = S, g = horizonGeometry(H), horizon = g.horizon, wTop = g.wTop, scene = { ...S, horizon, wTop };
  D.drawSky(ctx, S, horizon);
  const { src, srcVis } = D.drawBodies(ctx, S, horizon);
  if (wx.rainbow > 0 && sky.day > .3 && src && src.kind === 'sun') D.drawRainbow(ctx, wx.rainbow * sky.day, src.x, horizon, W, H);
  D.drawStreaks(ctx, S, horizon);
  for (const e of events) if (BEHIND_CLOUDS.includes(e.type)) D.drawEvent(ctx, e, scene, sky);
  D.drawClouds(ctx, S, horizon);
  for (const e of events) if (!WATER_TYPES.includes(e.type) && !BEHIND_CLOUDS.includes(e.type)) D.drawEvent(ctx, e, scene, sky);
  S.layers.forEach((L, i) => { D.drawLayer(ctx, L, t, scene, sky, i); if (i === 1 && wx.w === 'fog') D.drawFog(ctx, wx.k, horizon, W, H); });
  if (wx.w === 'rain' || wx.w === 'storm') D.drawRain(ctx, t, wx.k, S.wind, wx.w === 'storm', W, H);
  if (wx.w === 'snow') D.drawSnow(ctx, t, wx.k, W, H);
  D.drawWater(ctx, S, horizon, wTop, src, srcVis);
  for (const e of events) if (WATER_TYPES.includes(e.type)) D.drawEvent(ctx, e, scene, sky);
  return { src, srcVis, horizon, wTop, layerGeom: i => ({ y0: horizon + H * .02 * i, amp: H * S.layers[i].h * (.85 + S.disp[S.layers[i].band] * .15) }) };
}
