import soundfile as sf, numpy as np, sys
for f in sys.argv[1:]:
    x, sr = sf.read(f); x = x.mean(1)
    n = len(x)//sr
    r = [20*np.log10(np.sqrt(np.mean(x[i*sr:(i+1)*sr]**2))+1e-9) for i in range(n)]
    print(f, f'{n}s')
    print(' '.join(f'{int(v)}' for v in r))
