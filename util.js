// --- パワースペクトル計算 ---
export function calcSpectrum(pcm, fft) {
  const N = pcm.length;
  const fftResult = fft(pcm);
  const spectrum = new Uint8Array(N / 2);
  for (let i = 0; i < N / 2; i++) {
    const mag = Math.sqrt(fftResult[i].re ** 2 + fftResult[i].im ** 2);
    // 対数スケールで0-255に正規化
    const db = 20 * Math.log10(mag + 1e-8);
    // ダイナミックレンジを狭めて、より多くの色が表示されるように調整
    const norm = Math.max(0, Math.min(255, Math.round((db + 20) * 3)));
    spectrum[i] = norm;
  }
  return spectrum;
}

// 色の計算関数
export function getColor(value) {
  // 値を0～255の範囲に正規化
  const v = Math.min(255, Math.max(0, value));

  // 黒(0,0,0)→青(0,0,255)→緑(0,255,0)→黄(255,255,0)→赤(255,0,0)のグラデーション
  let r, g, b;

  if (v < 51) {
    // 黒から青
    r = 0;
    g = 0;
    b = Math.floor((v / 51) * 255);
  } else if (v < 102) {
    // 青から緑
    r = 0;
    g = Math.floor(((v - 51) / 51) * 255);
    b = 255 - Math.floor(((v - 51) / 51) * 255);
  } else if (v < 153) {
    // 緑から黄
    r = Math.floor(((v - 102) / 51) * 255);
    g = 255;
    b = 0;
  } else {
    // 黄から赤
    r = 255;
    g = Math.floor(255 - ((v - 153) / 102) * 255);
    b = 0;
  }

  return [r, g, b];
}
