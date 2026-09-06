# Extraction des données d'analyse : loudness (ebur128) + énergie par bande, pas de 0,5 s → JSON compact
import subprocess, json, re, sys, numpy as np
src = sys.argv[1]; out = sys.argv[2]; sr = 44100; STEP = 0.5
# --- Passe 1 : loudness M (400 ms) et S (3 s) via ebur128, une ligne toutes les 100 ms
p = subprocess.run(["ffmpeg","-v","info","-nostats","-i",src,"-af","ebur128=metadata=1:peak=true,ametadata=mode=print:file=-","-f","null","-"],
                   capture_output=True, text=True)
t=None; M=[]; Sl=[]; T=[]
for line in p.stdout.splitlines():
    m = re.match(r"frame:\d+\s+pts:\d+\s+pts_time:([\d.]+)", line)
    if m: t=float(m.group(1)); continue
    m = re.match(r"lavfi\.r128\.M=(-?[\d.]+|-inf)", line)
    if m and t is not None: T.append(t); M.append(float(m.group(1)) if m.group(1)!="-inf" else -70.0); continue
    m = re.match(r"lavfi\.r128\.S=(-?[\d.]+|-inf)", line)
    if m: Sl.append(float(m.group(1)) if m.group(1)!="-inf" else -70.0)
T=np.array(T); M=np.array(M); Sl=np.array(Sl[:len(T)])
summary = p.stderr[p.stderr.find("Summary:"):]
I = float(re.search(r"I:\s+(-?[\d.]+)", summary).group(1)); LRA=float(re.search(r"LRA:\s+(-?[\d.]+)", summary).group(1))
TP = float(re.search(r"Peak:\s+(-?[\d.]+)", summary).group(1))
# --- Passe 2 : bandes + crête par fenêtre de 0,5 s
N=int(sr*STEP); bands={"sub":(20,60),"bass":(60,250),"mid":(250,2000),"high":(2000,20000)}
freqs=np.fft.rfftfreq(N,1/sr); masks={k:(freqs>=lo)&(freqs<hi) for k,(lo,hi) in bands.items()}; win=np.hanning(N)
q = subprocess.Popen(["ffmpeg","-v","error","-i",src,"-f","f32le","-ac","2","-ar",str(sr),"-"],stdout=subprocess.PIPE)
rows=[]; i=0
while True:
    buf=q.stdout.read(N*8)
    if len(buf)<N*8: break
    x=np.frombuffer(buf,dtype=np.float32).reshape(-1,2).astype(np.float64)
    L,R=x[:,0],x[:,1]; mono=(L+R)/2; side=(L-R)/2
    spec=np.abs(np.fft.rfft(mono*win))**2
    be={k:10*np.log10(spec[m].mean()+1e-12) for k,m in masks.items()}
    peak=20*np.log10(np.abs(x).max()+1e-9)
    width=10*np.log10((side**2).mean()+1e-12)-10*np.log10((mono**2).mean()+1e-12)
    t0=i*STEP; sel=(T>=t0)&(T<t0+STEP)
    rows.append([round(t0,1), round(float(M[sel].mean()) if sel.any() else -70,1), round(float(Sl[sel].mean()) if sel.any() else -70,1),
                 round(peak,1), round(be["sub"],1), round(be["bass"],1), round(be["mid"],1), round(be["high"],1), round(width,1)])
    i+=1
data={"meta":{"title":"EMT — la machine","date":"2026-09-05","duration":rows[-1][0]+STEP,"I":I,"LRA":LRA,"TP":TP,"step":STEP,
      "cols":["t","M","S","peak","sub","bass","mid","high","width"]},"rows":rows}
json.dump(data, open(out,"w"), separators=(",",":"))
print(f"{len(rows)} lignes, I={I} LUFS, LRA={LRA} LU, TP={TP} dBTP")
for k in ("M","S"): 
    a=np.array([r[1 if k=='M' else 2] for r in rows]); print(f"{k}: min {a.min():.1f}, p10 {np.percentile(a,10):.1f}, médiane {np.median(a):.1f}, p90 {np.percentile(a,90):.1f}, max {a.max():.1f}")
for j,k in enumerate(("sub","bass","mid","high"),4):
    a=np.array([r[j] for r in rows]); print(f"{k}: p5 {np.percentile(a,5):.1f}  p95 {np.percentile(a,95):.1f}")
