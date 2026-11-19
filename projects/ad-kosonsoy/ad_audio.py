import wave, numpy as np
SR=44100; DUR=29.0; N=int(SR*DUR); rng=np.random.default_rng(5)
mus=np.zeros(N); sfx=np.zeros(N)
def add(b,s,t,g=1.0):
    i=int(t*SR); s=s[:max(0,N-i)]; b[i:i+len(s)]+=s*g
def ld(n):
    with wave.open(f"/root/shorts/trucks/sfx/{n}.wav") as w: return np.frombuffer(w.readframes(w.getnframes()),np.int16)/32768
def noise(d): return rng.standard_normal(int(d*SR))
def hp(x,fc):
    X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); return np.fft.irfft(X*(f>fc),len(x))
def lp(x,fc):
    X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); return np.fft.irfft(X/(1+(f/fc)**4),len(x))
BPM=126; b=60/BPM
t=np.arange(int(.3*SR))/SR
kick=np.sin(2*np.pi*55*t*(1+3*np.exp(-t*35)))*np.exp(-t*10)
clap=hp(noise(.2),1200)*np.exp(-np.arange(int(.2*SR))/SR*25)
hat=hp(noise(.05),7000)*np.exp(-np.arange(int(.05*SR))/SR*80)
N2M=lambda m:440*2**((m-69)/12)
def bass(m,d):
    tt=np.arange(int(d*SR))/SR; s=2*((tt*N2M(m))%1)-1; return lp(s,500)*np.exp(-tt*4)
def stab(ch,d):
    tt=np.arange(int(d*SR))/SR; s=sum(2*((tt*N2M(m)*k)%1)-1 for m in ch for k in (1,1.006)); return lp(s,2200)*np.exp(-tt*6)/6
prog=[(57,[69,72,76]),(53,[65,69,72]),(48,[67,72,76]),(55,[67,71,74])]
beat_i=0; tt0=0.0
while tt0<DUR-0.2:
    bar=int(beat_i//4); root,ch=prog[bar%4]
    drop = 18.4<tt0<20.6
    if not drop:
        add(mus,kick,tt0,.9)
        if beat_i%2==1: add(mus,clap,tt0,.5)
        add(mus,bass(root-12,b/2),tt0+b/2,.5)
    add(mus,hat,tt0+b/2,.35)
    if beat_i%4 in (0,) : add(mus,stab(ch,b*1.5),tt0,.5)
    beat_i+=1; tt0+=b
WH=ld("whoosh-reverse"); POP=ld("cartoon-zip"); BOOM=ld("deep-boom")
for ts in (1.81,4.41,8.54,13.99,16.89,18.55,20.66,24.13): add(sfx,WH,ts-.5,.5)
for ts in (8.54,9.57,10.21,10.82,11.61,12.66): add(sfx,POP,ts,.6)
for i in range(7): add(sfx,POP,4.6+i*.15,.35)
add(sfx,ld("air-horn"),0.0,.35); add(sfx,BOOM,0.75,.6)
add(sfx,ld("glitch-hit"),3.1,.5)
tk=np.arange(int(.06*SR))/SR
def thunk():
    tt=np.arange(int(.3*SR))/SR; return np.sin(2*np.pi*90*tt*(1+np.exp(-tt*25)))*np.exp(-tt*14)
add(sfx,thunk(),15.6,.7)
def ching():
    tt=np.arange(int(.8*SR))/SR
    return (np.sin(2*np.pi*2093*tt)+.6*np.sin(2*np.pi*2637*tt))*np.exp(-tt*5)+hp(noise(.8),5000)*np.exp(-tt*20)*.3
add(sfx,ching(),16.0,.5)
add(sfx,ld("tada"),16.9,.4) if False else add(sfx,ld("swell-short"),16.7,.4)
for k in range(int((20.6-18.55)/.25)):
    tick=hp(noise(.03),3000)*np.exp(-np.arange(int(.03*SR))/SR*120)
    add(sfx,tick,18.55+k*.25,.6)
add(sfx,ld("riser-short"),18.6,.35)
add(sfx,BOOM,20.66,.5)
add(sfx,thunk(),22.0,.5); add(sfx,thunk(),22.9,.5)
add(sfx,ld("error-beep"),25.5,.4); add(sfx,ld("error-beep"),25.8,.4)
add(sfx,ching(),26.6,.5)
mus[-int(1.2*SR):]*=np.linspace(1,0,int(1.2*SR))
def save(n,x):
    p=(np.clip(x/np.abs(x).max()*.9,-1,1)*32767).astype(np.int16)
    with wave.open(n,"wb") as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(p.tobytes())
save("music.wav",mus); save("sfx.wav",sfx); print("ok")
