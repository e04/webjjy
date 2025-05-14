# Web JJY Decoder

This is a JJY (Japanese Standard Time Signal) decoder that runs in your web browser. It analyzes the audio signal input from your sound card to decode and display time information.

ブラウザ上で動作するJJY（日本の標準時報）デコーダーです。オーディオインターフェイスに入力された音声信号を解析し、時刻情報をデコードして表示します。

## Overview

This application uses the Web Audio API to capture audio from a microphone and employs FFT (Fast Fourier Transform) to visualize and decode the 40kHz JJY standard time signal. The decoded time is displayed on the screen in real-time.

The 40kHz signal is also down-converted to an audible 800Hz, allowing you to hear it.

このアプリケーションは、Web Audio APIを使用してマイクから音声を取得し、FFT（高速フーリエ変換）を用いて40kHzのJJY標準電波の信号を可視化およびデコードします。デコードされた時刻はリアルタイムで画面に表示されます。

40kHzの信号を800Hzへダウンコンバートして、耳で聞くこともできます。

## Live Demo

You can try the Web JJY Decoder live at: **[https://e04.github.io/webjjy/](https://e04.github.io/webjjy/)**

## Screenshot (Placeholder)

(Please insert an actual screenshot here if the live demo doesn't suffice)

```
+-----------------------------------------------------+
| JJY 40.000                                          |
| +---------------------------------+ +-------------+ |
| |                                 | |             | |
| |      Waterfall Display          | | Level Meter | |
| |                                 | |             | |
| +---------------------------------+ +-------------+ |
| +-------------------------------------------------+ |
| |                  RMS Graph Display                | |
| +-------------------------------------------------+ |
| | M 0 1 0 1 M 0 1 ... (Decoded sequence)          | |
| +-------------------------------------------------+ |
| | ---- (Year)                                     | |
| | --/-- (Month/Day)  (---) (Day of Week)          | |
| |                 --:-- (Hour:Minute)             | |
| +-----------------------------------------------------+
```

## Key Features

  * Real-time audio processing from microphone input.
  * Waterfall display (spectrogram) of the JJY 40kHz signal.
  * Level meter for the input signal.
  * Display of the decoded JJY bit sequence (M, 0, 1).
  * Display of decoded year, month, day, day of the week, and time.

## Operating Environment

  * **Supported Browsers:** Latest versions of Google Chrome.
  * **Input Device:** A sound card that supports a 96kHz sampling rate is required.
