export function decode(array) {
  // 信号がない場合は空の配列を返す
  if (!array || array.length === 0) {
    return [];
  }

  // サンプリングレート（1秒あたりのサンプル数）
  const samplesPerSecond = 32; // 128サンプル/秒
  // 1ビット（1秒）あたりのサンプル数
  const samplesPerBit = samplesPerSecond;
  // 結果を格納する配列
  const result = [];

  // 信号の立ち上がりを検出するための閾値を動的に決定
  // 信号の最大値と最小値を見つける
  let maxValue = Math.max(...array);
  let minValue = Math.min(...array);

  // 全体の波形の中間点を初期閾値として設定
  // この値は各ビットごとに再計算される
  let globalThreshold = minValue + (maxValue - minValue) * 0.5;

  // 同期位置を検出（最適な立ち上がり位置を見つける）
  let syncPosition = findOptimalSyncPosition(
    array,
    globalThreshold,
    samplesPerBit
  );

  // 入力配列の長さからビット数を計算（完全な秒数分）
  const totalBits = Math.floor(array.length / samplesPerSecond);

  // ビットパターンを解析
  for (let i = 0; i < totalBits; i++) {
    const pos = syncPosition + i * samplesPerBit;

    // 配列の範囲外になった場合は、未検出ビットとして 'U' を追加
    if (pos + samplesPerBit > array.length) {
      continue;
    }

    // 1秒間のサンプルを取得
    const bitSamples = array.slice(pos, pos + samplesPerBit);

    // このビットサンプルに対して個別の閾値を計算
    // 単純な最大値/最小値ではなく、最大3つと最小3つの平均を使用
    const sortedSamples = [...bitSamples].sort((a, b) => a - b);
    const numSamples = Math.min(3, sortedSamples.length);

    const minValues = sortedSamples.slice(0, numSamples);
    const maxValues = sortedSamples.slice(-numSamples);

    const bitMinValue =
      minValues.reduce((sum, val) => sum + val, 0) / numSamples;
    const bitMaxValue =
      maxValues.reduce((sum, val) => sum + val, 0) / numSamples;
    const bitThreshold = bitMinValue + (bitMaxValue - bitMinValue) * 0.5;

    // 高出力状態のサンプル数をカウント（閾値より大きい値）
    const highSamplesCount = bitSamples.filter(
      (sample) => sample > bitThreshold
    ).length;

    // 高出力状態の比率を計算
    const highRatio = highSamplesCount / samplesPerBit;

    // パターンの判定
    // 0ビット: 0.8秒の高出力 → 0.2秒の低出力 (highRatio ≈ 0.8)
    // 1ビット: 0.5秒の高出力 → 0.5秒の低出力 (highRatio ≈ 0.5)
    // マーカー: 0.2秒の高出力 → 0.8秒の低出力 (highRatio ≈ 0.2)

    // ノイズ耐性のため、判定の許容範囲を少し広げる
    if (highRatio >= 0.7) {
      result.push("0");
    } else if (highRatio >= 0.4 && highRatio < 0.7) {
      result.push("1");
    } else if (highRatio < 0.4) {
      result.push("M");
    }
  }

  return result;
}

// より堅牢な同期位置検出 - すべての可能性のある同期位置から最適なものを選択
function findOptimalSyncPosition(array, threshold, samplesPerBit) {
  // 最初の10秒間（32サンプル/秒 × 10秒 = 320サンプル）だけを対象にする
  const maxSearchLength = Math.min(array.length, 32 * 10);

  // すべての立ち上がりエッジを検出（最初の10秒間だけ）
  const edges = [];
  for (let i = 1; i < maxSearchLength; i++) {
    if (array[i] > threshold && array[i - 1] <= threshold) {
      edges.push(i);
    }
  }

  // 立ち上がりが見つからない場合は0を返す
  if (edges.length === 0) {
    return 0;
  }

  // 各エッジ位置の信頼性スコアを計算
  const scores = edges.map((edge) => {
    let score = 0;
    // この位置から始めた場合のビットパターンの一貫性をスコア化
    for (let i = 0; i < 3; i++) {
      // 最初の3ビットを確認
      const pos = edge + i * samplesPerBit;
      if (pos + samplesPerBit > array.length) {
        continue; // 境界外ならスキップ
      }

      // 各ビット内での信号の遷移を確認
      const bitSamples = array.slice(pos, pos + samplesPerBit);

      // 前半と後半で信号のレベルが変わるかを確認（理想的なビットパターンでは変わるはず）
      const firstHalf = bitSamples.slice(0, samplesPerBit / 2);
      const secondHalf = bitSamples.slice(samplesPerBit / 2);

      const firstHalfAvg =
        firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondHalfAvg =
        secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

      // 前半と後半の差が大きいほど、明確な遷移があり信頼性が高い
      const transition = Math.abs(firstHalfAvg - secondHalfAvg);
      score += transition;

      // 同一ビット内で複数回の遷移があると信頼性が下がるので減点
      let transitions = 0;
      for (let j = 1; j < bitSamples.length; j++) {
        if (
          (bitSamples[j] > threshold && bitSamples[j - 1] <= threshold) ||
          (bitSamples[j] <= threshold && bitSamples[j - 1] > threshold)
        ) {
          transitions++;
        }
      }

      // 理想的には1ビットあたり1回だけ遷移があるはず
      const excessTransitions = Math.max(0, transitions - 1); // 1回以上の遷移は過剰
      score -= excessTransitions * 0.5; // 過剰な遷移があるとスコア減少
    }

    return { edge, score };
  });

  // スコアが最も高い位置を選択
  scores.sort((a, b) => b.score - a.score);
  return scores[0]?.edge || 0;
}
