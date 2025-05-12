export function parse(data) {
  // データの長さを確認
  if (!data || data.length < 60) {
    return { error: "NOT_ENOUGH" };
  }

  // 通算日から月と日を計算する関数
  const getMonthAndDay = (dayOfYear, year) => {
    // うるう年かどうかをチェック
    const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

    // 各月の日数（うるう年の2月は29日）
    const daysInMonth = [
      31, // 1月
      isLeapYear ? 29 : 28, // 2月
      31, // 3月
      30, // 4月
      31, // 5月
      30, // 6月
      31, // 7月
      31, // 8月
      30, // 9月
      31, // 10月
      30, // 11月
      31, // 12月
    ];

    let month = 0;
    let day = dayOfYear;

    // 通算日から月と日を計算
    for (let i = 0; i < daysInMonth.length; i++) {
      if (day <= daysInMonth[i]) {
        month = i + 1;
        break;
      }
      day -= daysInMonth[i];
    }

    return { month, day };
  };

  const findSyncMarkers = (data) => {
    // 毎分0秒のタイミングでMが2連続するパターンを検出
    for (let i = 0; i < data.length - 1; i++) {
      if (data[i] === "M" && data[i + 1] === "M") {
        // 0秒のマーカーを見つけた
        return {
          startIndex: i + 1, // Mの次のビットから開始
          markerPosition: i, // マーカーの位置を記録
        };
      }
    }

    // 有効な開始インデックスが見つからない場合
    return { startIndex: -1, markerPosition: -1 };
  };

  // 特定のビット範囲の値を合計する
  const sumBits = (data, start, end, weights) => {
    let sum = 0;
    for (let i = start; i <= end; i++) {
      if (i - start < weights.length && data[i] === "1") {
        sum += weights[i - start];
      }
    }
    return sum;
  };

  // パリティチェック（偶数パリティ）
  const checkEvenParity = (data, start, end, parityBit) => {
    let count = 0;
    for (let i = start; i <= end; i++) {
      if (data[i] === "1") count++;
    }
    return (
      (count % 2 === 0 && data[parityBit] === "0") ||
      (count % 2 === 1 && data[parityBit] === "1")
    );
  };

  // 停波予告情報を解釈
  const interpretStoppage = (st1, st2, st3, st4, st5, st6) => {
    let stoppage = {};

    // 停波開始予告
    if (st1 === "0" && st2 === "0" && st3 === "0") {
      stoppage.notice = "停波予定なし";
    } else if (st1 === "0" && st2 === "0" && st3 === "1") {
      stoppage.notice = "7日以内に停波";
    } else if (st1 === "0" && st2 === "1" && st3 === "0") {
      stoppage.notice = "3-6日以内に停波";
    } else if (st1 === "0" && st2 === "1" && st3 === "1") {
      stoppage.notice = "2日以内に停波";
    } else if (st1 === "1" && st2 === "0" && st3 === "0") {
      stoppage.notice = "24時間以内に停波";
    } else if (st1 === "1" && st2 === "0" && st3 === "1") {
      stoppage.notice = "12時間以内に停波";
    } else if (st1 === "1" && st2 === "1" && st3 === "0") {
      stoppage.notice = "2時間以内に停波";
    }

    // 昼間のみか終日か
    stoppage.dayOnly = st4 === "1";

    // 停波期間
    if (st5 === "0" && st6 === "0") {
      stoppage.duration = "停波の予定なし";
    } else if (st5 === "0" && st6 === "1") {
      stoppage.duration = "7日以上または期間未定";
    } else if (st5 === "1" && st6 === "0") {
      stoppage.duration = "2-6日";
    } else if (st5 === "1" && st6 === "1") {
      stoppage.duration = "2日未満";
    }

    return stoppage;
  };

  // 曜日の変換
  const getDayOfWeek = (value) => {
    const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    return days[value] || "-";
  };

  // 同期位置を見つける
  const syncResult = findSyncMarkers(data);
  const syncIndex = syncResult.startIndex;
  const markerPosition = syncResult.markerPosition;

  if (syncIndex === -1) {
    return { error: "SYNC_FAILED" };
  }

  // 同期後の位置を調整したデータを作成
  const syncedData = new Array(60).fill("0");
  for (let i = 0; i < 60; i++) {
    if (syncIndex + i < data.length) {
      syncedData[i] = data[syncIndex + i];
    }
  }

  // 特別なケース：15分または45分の場合（モールス符号と停波予告）
  const isSpecialMinute = () => {
    // 40-48秒がモールス符号なら特別な分（15分または45分）
    let hasNonBinaryValues = false;
    for (let i = 40; i <= 48; i++) {
      if (
        syncIndex + i < data.length &&
        syncedData[i] !== "0" &&
        syncedData[i] !== "1"
      ) {
        hasNonBinaryValues = true;
        break;
      }
    }
    return hasNonBinaryValues;
  };

  // 結果オブジェクト
  const result = {};

  // マーカー位置からデータ送信までの経過時間（秒）を計算
  // データの受信位置から毎分0秒のマーカー位置までの要素数で秒数を推定
  if (markerPosition >= 0) {
    const currentPosition = data.length - 1;
    const elementsAfterMarker = currentPosition - markerPosition;
    // 通常、1秒に1要素のペースで受信すると想定
    result.estimatedSeconds = elementsAfterMarker % 60;
  }

  // 分の値を計算 (ビット1-8)
  const minuteWeights = [40, 20, 10, 0, 8, 4, 2, 1];
  result.minute = sumBits(syncedData, 1, 8, minuteWeights);

  // 時の値を計算 (ビット12-18)
  const hourWeights = [20, 10, 0, 8, 4, 2, 1];
  result.hour = sumBits(syncedData, 12, 18, hourWeights);

  // 通算日を計算 (ビット22-33)
  const dayWeights = [200, 100, 0, 80, 40, 20, 10, 0, 8, 4, 2, 1];
  result.dayOfYear = sumBits(syncedData, 22, 33, dayWeights);

  // パリティチェック
  result.parityCheck = {
    hour: checkEvenParity(syncedData, 12, 18, 36),
    minute: checkEvenParity(syncedData, 1, 8, 37),
  };

  if (isSpecialMinute()) {
    // 特別な分の場合、停波予告情報を取得
    result.special = true;
    result.stoppageNotice = interpretStoppage(
      syncedData[50],
      syncedData[51],
      syncedData[52],
      syncedData[53],
      syncedData[54],
      syncedData[55]
    );
  } else {
    // 通常の分の場合、年と曜日の情報を取得
    result.special = false;

    // 年の値を計算 (ビット41-48)
    const yearWeights = [80, 40, 20, 10, 8, 4, 2, 1];
    result.year = 2000 + sumBits(syncedData, 41, 48, yearWeights);

    // 月と日を計算（通算日と年から）
    const { month, day } = getMonthAndDay(result.dayOfYear, result.year);
    result.month = month;
    result.day = day;

    // 曜日を計算 (ビット50-52)
    const dayOfWeekWeights = [4, 2, 1];
    const dayOfWeekValue = sumBits(syncedData, 50, 52, dayOfWeekWeights);
    result.dayOfWeek = getDayOfWeek(dayOfWeekValue);

    // うるう秒情報
    result.leapSecond = {
      scheduled: syncedData[53] === "1",
      type:
        syncedData[53] === "1"
          ? syncedData[54] === "1"
            ? "挿入"
            : "削除"
          : "なし",
    };
  }

  return result;
}

/*
// JJY停波予告情報の型
export interface StoppageNotice {
  notice: string;     // 停波開始予告 (例: "24時間以内に停波")
  dayOnly: boolean;   // 昼間のみの停波かどうか
  duration: string;   // 停波期間 (例: "2日未満")
}

// うるう秒情報の型
export interface LeapSecondInfo {
  scheduled: boolean; // うるう秒予定の有無
  type: "挿入" | "削除" | "なし"; // うるう秒のタイプ
}

// パリティチェック結果の型
export interface ParityCheck {
  hour: boolean;      // 時のパリティ正常か
  minute: boolean;    // 分のパリティ正常か
}

// パース失敗時のエラー型
export type ParseError = {
  error: "NOT_ENOUGH" | "SYNC_FAILED";
};

// 通常の分のデータの型
export interface NormalMinuteData {
  special: false;
  year: number;       // 年 (例: 2023)
  month: number;      // 月 (例: 5)
  day: number;        // 日 (例: 15)
  dayOfWeek: string;  // 曜日 (例: "月曜日")
  leapSecond: LeapSecondInfo;
}

// 特別な分(15分/45分)のデータの型
export interface SpecialMinuteData {
  special: true;
  stoppageNotice: StoppageNotice;
}

// パース結果の基本情報型
export interface BaseParseResult {
  estimatedSeconds?: number; // 推定秒
  minute: number;           // 分の値
  hour: number;             // 時の値
  dayOfYear: number;        // 通算日
  parityCheck: ParityCheck; // パリティチェック結果
}

// パース成功時の戻り値型
export type ParseSuccess = BaseParseResult & (NormalMinuteData | SpecialMinuteData);

// parse関数の最終的な戻り値型
export type ParseResult = ParseSuccess | ParseError;

// parse関数の型定義
export function parse(data: string): ParseResult;
*/
