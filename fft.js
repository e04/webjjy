// --- FFT 関数（Cooley-Tukey, radix-2, 複素数部は0） ---
export function fft(input) {
  const N = input.length;
  if (N <= 1) return [{ re: input[0], im: 0 }];
  if ((N & (N - 1)) !== 0)
    throw new Error("FFT size must be power of 2");
  // 偶数・奇数分割
  const even = fft(input.filter((_, i) => i % 2 === 0));
  const odd = fft(input.filter((_, i) => i % 2 === 1));
  const results = Array(N);
  for (let k = 0; k < N / 2; k++) {
    const t = (-2 * Math.PI * k) / N;
    const exp = { re: Math.cos(t), im: Math.sin(t) };
    const oddVal = odd[k];
    // (a+bi)*(c+di) = (ac-bd) + (ad+bc)i
    const oRe = exp.re * oddVal.re - exp.im * oddVal.im;
    const oIm = exp.re * oddVal.im + exp.im * oddVal.re;
    results[k] = { re: even[k].re + oRe, im: even[k].im + oIm };
    results[k + N / 2] = { re: even[k].re - oRe, im: even[k].im - oIm };
  }
  return results;
}
