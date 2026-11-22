import numpy as np, wave
SR=44100; D=10; N=SR*D; rng=np.random.default_rng(3); t=np.arange(N)/SR
def lpf(x,k):
    y=np.zeros_like(x); a=0
    from scipy.signal import lfilter
    return lfilter([k],[1,-(1-k)],x)
wind=lpf(rng.standard_normal(N),0.01)*(0.6+0.4*np.sin(t*0.7))
wind/=np.abs(wind).max()
inside=np.clip((t-3)/3,0,1)   # quieter wind as camera goes inside
crack=np.zeros(N)
for _ in range(int(D*9)):
    i=rng.integers(0,N-2000); n=rng.integers(80,600); crack[i:i+n]+=rng.standard_normal(n)*np.exp(-np.arange(n)/(n/4))*rng.uniform(.2,1)
crack=crack-lpf(crack,0.2); crack/=np.abs(crack).max()
# soft music: warm pad Fmaj7 -> Cmaj7 + piano notes
mus=np.zeros(N)
for ch,a,b in [([174.6,220,261.6,329.6],0,5),([130.8,196,246.9,329.6],5,10)]:
    m=(t>=a)&(t<b); env=np.clip((t-a)/1.2,0,1)*np.clip((b-t)/1.2,0,1)
    for f in ch: mus+=np.sin(2*np.pi*f*t+np.sin(2*np.pi*.3*t)*.3)*env*0.12
for k,(tt,f) in enumerate([(0.5,523.3),(1.5,659.3),(2.5,784),(3.5,659.3),(5,523.3),(6,587.3),(7,659.3),(8,784),(9,1046.5)]):
    i=int(tt*SR); n=int(1.6*SR); x=np.arange(n)/SR; mus[i:i+n][:min(n,N-i)]+=(np.sin(2*np.pi*f*x)+.3*np.sin(4*np.pi*f*x))[:min(n,N-i)]*np.exp(-x*2.5)[:min(n,N-i)]*0.18
mix=wind*0.18*(1-0.7*inside)+crack*0.10*inside+mus*0.6
fade=np.clip(t/0.5,0,1)*np.clip((D-t)/1.0,0,1); mix*=fade; mix/=np.abs(mix).max()*1.12
w=wave.open('amb.wav','wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix*32767).astype(np.int16).tobytes()); w.close(); print('ok')
