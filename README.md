# Web JJY Receiver

<img width="800" alt="スクリーンショット 2025-05-14 23 23 12" src="https://github.com/user-attachments/assets/e29a22ae-8d41-4854-bc55-0fa463d7d22e" />

https://github.com/user-attachments/assets/12662add-8865-4dd7-bca7-392402758950

This is a JJY (Japanese Standard Time Signal) receive/decoder that runs in your web browser. It analyzes the audio signal input from your sound card to decode and display time information.

ブラウザ上で動作するJJY（日本の標準時報）レシーバー・デコーダーです。オーディオインターフェイスに入力されたJJYの信号を解析し、時刻情報をデコードして表示します。

## Overview

This application uses the Web Audio API to capture audio from a microphone and employs FFT (Fast Fourier Transform) to visualize and decode the 40kHz JJY standard time signal. The decoded time is displayed on the screen in real-time.

The 40kHz signal is also down-converted to an audible 800Hz, allowing you to hear it.

このアプリケーションは、Web Audio APIを使用してJJYの信号を含む音声を取得し、FFT（高速フーリエ変換）を用いて40kHzのJJY標準電波の信号を可視化およびデコードします。デコードされた時刻はリアルタイムで画面に表示されます。

また、40kHzの信号を800Hzへダウンコンバートし、耳で直接聞くことができます。

## Live Demo

You can try the Web JJY Decoder live at: **[https://e04.github.io/webjjy/](https://e04.github.io/webjjy/)**

## Equipments

Connecting a bar antenna and an amplification circuit using a 2SK241 to the audio interface.

バーアンテナと2SK241による増幅回路を通じて、オーディオインターフェースに接続しています。

![IMG_2214](https://github.com/user-attachments/assets/8cc89aa6-4b04-4bec-8e76-b705bca21f15)

![IMG_2213](https://github.com/user-attachments/assets/d3d33805-c677-4d3d-a51a-a6ee7ba21f9c)

## Key Features

  * Real-time audio processing from microphone input.
  * Waterfall display (spectrogram) of the JJY 40kHz signal.
  * Level meter for the input signal.
  * Display of the decoded JJY bit sequence (M, 0, 1).
  * Display of decoded year, month, day, day of the week, and time.

## Operating Environment

  * **Supported Browsers:** Latest versions of Google Chrome.
  * **Input Device:** A sound card that supports a 96kHz sampling rate is required.
