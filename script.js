import { fft } from "./fft.js";
import { calcSpectrum, getColor } from "./util.js";
import { decode } from "./decode.js";
import { parse } from "./parse.js";

document.addEventListener("DOMContentLoaded", () => {
  const elements = getDOMElements();
  let state = initializeState();

  setupEventListeners(elements, state);
  initFrequencyBins(state);
  processAudioFrame(elements, state);
  startAutoDecode(elements, state);
});

function getDOMElements() {
  const startOverlay = document.getElementById("startOverlay");
  const decodedResult = document.getElementById("decodedResult");
  const canvas = document.getElementById("waterfall");
  const ctx = canvas.getContext("2d");
  const levelMeter = document.getElementById("levelMeter");
  const meterCtx = levelMeter.getContext("2d");
  const rmsCanvas = document.getElementById("rmsCanvas");
  const rmsCtx = rmsCanvas.getContext("2d");
  const timeDisplay = document.getElementById("timeDisplay");
  const yearDisplay = document.getElementById("yearDisplay");
  const mmddDisplay = document.getElementById("mmddDisplay");
  const dayDisplay = document.getElementById("dayDisplay");

  return {
    startOverlay,
    decodedResult,
    canvas,
    ctx,
    levelMeter,
    meterCtx,
    rmsCanvas,
    rmsCtx,
    timeDisplay,
    yearDisplay,
    mmddDisplay,
    dayDisplay,
  };
}

function initializeState() {
  let meterValue = 0;
  const rmsCanvasWidth = 800; // rmsCanvas.width; // DOM取得後に設定
  const rmsCanvasHeight = 24; // rmsCanvas.height; // DOM取得後に設定
  let rmsDrawOffset = rmsCanvasWidth - 1;

  let audioContext;
  let microphone;
  let processor;
  let meterProcessor;
  let animationId;
  let waterfall = [];
  let fftSize = 2048;
  let binCount = fftSize / 2;
  let pcmBuffer = new Float32Array(fftSize);
  let pcmBufferOffset = 0;
  let sampledRmsArray = [];

  const minFreq = 35000;
  const maxFreq = 45000;
  let minBin, maxBin, displayBinCount;

  let autoDecodeIntervalId = null;

  const width = 780; // canvas.width; // DOM取得後に設定
  const height = 300; // canvas.height; // DOM取得後に設定

  return {
    meterValue,
    rmsCanvasWidth,
    rmsCanvasHeight,
    rmsDrawOffset,
    audioContext,
    microphone,
    processor,
    meterProcessor,
    animationId,
    waterfall,
    fftSize,
    binCount,
    pcmBuffer,
    pcmBufferOffset,
    sampledRmsArray,
    minFreq,
    maxFreq,
    minBin,
    maxBin,
    displayBinCount,
    autoDecodeIntervalId,
    width,
    height,
  };
}

function setupEventListeners(elements, state) {
  if (elements.startOverlay) {
    elements.startOverlay.addEventListener("click", () =>
      startCapture(elements, state)
    );
  }
}

function initFrequencyBins(state) {
  const sampleRate = 96000; // state.audioContext.sampleRate; // AudioContext生成後に設定
  const frequencyStep = sampleRate / state.fftSize;

  state.minBin = Math.floor(state.minFreq / frequencyStep);
  state.maxBin = Math.ceil(state.maxFreq / frequencyStep);
  state.displayBinCount = state.maxBin - state.minBin;
}

function drawWaterfall(elements, state) {
  elements.ctx.drawImage(
    elements.canvas,
    0,
    0,
    state.width - 1,
    state.height,
    1,
    0,
    state.width - 1,
    state.height
  );

  if (state.waterfall.length > 0) {
    const latestData = state.waterfall[state.waterfall.length - 1];
    const binHeight = state.height / state.displayBinCount;

    for (let i = 0; i < state.displayBinCount; i++) {
      const spectrumIndex = i + state.minBin;
      const value = latestData[spectrumIndex];
      const [r, g, b] = getColor(value);
      elements.ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      elements.ctx.fillRect(
        0,
        state.height - (i + 1) * binHeight,
        1,
        binHeight
      );
    }
  }
}

function drawLevelMeter(elements, state) {
  elements.meterCtx.clearRect(
    0,
    0,
    elements.levelMeter.width,
    elements.levelMeter.height
  );
  const percent = state.meterValue;
  const barHeight = Math.round(elements.levelMeter.height * percent);
  elements.meterCtx.fillStyle = percent > 0.3 ? "#0f0" : "#888";
  elements.meterCtx.fillRect(
    0,
    elements.levelMeter.height - barHeight,
    elements.levelMeter.width,
    barHeight
  );
}

function drawRmsCanvas(elements, state, rms) {
  elements.rmsCtx.drawImage(
    elements.rmsCanvas,
    0,
    0,
    state.rmsCanvasWidth - 1,
    state.rmsCanvasHeight,
    1,
    0,
    state.rmsCanvasWidth - 1,
    state.rmsCanvasHeight
  );
  const v = Math.max(0, Math.min(1, rms));
  const barHeight = Math.round(v * state.rmsCanvasHeight);

  elements.rmsCtx.fillStyle = "black";
  elements.rmsCtx.fillRect(0, 0, 1, state.rmsCanvasHeight);

  elements.rmsCtx.fillStyle = "white";
  elements.rmsCtx.fillRect(0, state.rmsCanvasHeight - barHeight, 1, barHeight);
}

function runAutoDecode(elements, state) {
  if (state.sampledRmsArray.length > 0) {
    const decodedData = decode(state.sampledRmsArray);

    const parsed = parse(decodedData.slice(-120));

    if (parsed && !parsed.error) {
      if (parsed.hour !== undefined && parsed.minute !== undefined) {
        const hour = String(parsed.hour).padStart(2, "0");
        const minute = String(parsed.minute).padStart(2, "0");
        elements.timeDisplay.textContent = `${hour}:${minute}`;
      }

      if (parsed.year !== undefined && !parsed.special) {
        elements.yearDisplay.textContent = parsed.year;
      }

      if (parsed.month !== undefined && parsed.day !== undefined) {
        elements.mmddDisplay.textContent = `${parsed.month}/${parsed.day}`;
      }

      if (parsed.dayOfWeek !== undefined) {
        elements.dayDisplay.textContent = `(${parsed.dayOfWeek})`;
      }
    }

    const result = decodedData
      .toReversed()
      .map((char) => {
        switch (char) {
          case "M":
            return `<span style="display: inline-block;background-color: #2E7D32;width: 30px;text-align: center;">${char}</span>`;
          case "0":
            return `<span style="display: inline-block;width: 30px;text-align: center;">${char}</span>`;
          case "1":
            return `<span style="display: inline-block;background-color: #FFFFFF;color: black;width: 30px;text-align: center;">${char}</span>`;
        }
      })
      .join("");

    elements.decodedResult.innerHTML = result;
  }
}

function startAutoDecode(elements, state) {
  state.autoDecodeIntervalId = setInterval(
    () => runAutoDecode(elements, state),
    1000
  );
}

function processAudioFrame(elements, state) {
  if (state.pcmBufferOffset === state.fftSize) {
    const spectrum = calcSpectrum(state.pcmBuffer, fft);
    state.waterfall.push(spectrum);
    if (state.waterfall.length > state.width) state.waterfall.shift();
    drawWaterfall(elements, state);
    state.pcmBufferOffset = 0;
  }
  state.animationId = requestAnimationFrame(() =>
    processAudioFrame(elements, state)
  );
}

function startCapture(elements, state) {
  if (elements.startOverlay) {
    elements.startOverlay.style.display = "none";
  }

  navigator.mediaDevices
    .getUserMedia({
      audio: {
        sampleRate: 96000,
        channelCount: 1,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    })
    .then((stream) => {
      state.audioContext = new window.AudioContext({ sampleRate: 96000 });
      state.microphone = state.audioContext.createMediaStreamSource(stream);
      state.processor = state.audioContext.createScriptProcessor(
        state.fftSize,
        1,
        1
      );
      // 800Hz中心のバンドパスフィルター
      const bandpass = state.audioContext.createBiquadFilter();
      bandpass.type = "bandpass";
      bandpass.frequency.value = 800;
      bandpass.Q.value = 10;
      let mixerPhase = 0;
      const mixerFreq = 40800;
      const sampleRate = state.audioContext.sampleRate;
      state.microphone.connect(state.processor);
      state.processor.connect(bandpass);
      state.meterProcessor = state.audioContext.createScriptProcessor(
        256,
        1,
        1
      );
      bandpass.connect(state.meterProcessor);
      state.meterProcessor.connect(state.audioContext.destination);
      const sampleProcessorBufferSize = 4096;
      const sampleProcessor = state.audioContext.createScriptProcessor(
        sampleProcessorBufferSize,
        1,
        1
      );
      let rmsSum = 0;
      let rmsCount = 0;
      let samples = Math.round(sampleRate / 32);
      let sampleCounter = 0;
      bandpass.connect(sampleProcessor);
      sampleProcessor.connect(state.audioContext.destination);
      sampleProcessor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        for (let i = 0; i < input.length; i++) {
          rmsSum += input[i] * input[i];
          rmsCount++;
          sampleCounter++;
          if (sampleCounter >= samples) {
            const rms = Math.sqrt(rmsSum / rmsCount);
            state.sampledRmsArray.push(rms);
            drawRmsCanvas(elements, state, rms); // ここで描画
            rmsSum = 0;
            rmsCount = 0;
            sampleCounter = 0;
          }
        }
      };
      state.meterProcessor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        let sum = 0;
        for (let i = 0; i < input.length; i++) {
          sum += input[i] * input[i];
        }
        const rms = Math.sqrt(sum / input.length);
        state.meterValue = Math.min(1, rms);
        drawLevelMeter(elements, state);
      };
      bandpass.connect(state.audioContext.destination);
      state.waterfall = [];
      state.pcmBuffer = new Float32Array(state.fftSize);
      state.pcmBufferOffset = 0;
      state.rmsDrawOffset = state.rmsCanvasWidth - 1;
      elements.ctx.fillStyle = "black";
      elements.ctx.fillRect(0, 0, state.width, state.height);
      state.processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        const output = e.outputBuffer.getChannelData(0);
        let remain = state.fftSize - state.pcmBufferOffset;
        if (input.length <= remain) {
          state.pcmBuffer.set(input, state.pcmBufferOffset);
          state.pcmBufferOffset += input.length;
        } else {
          state.pcmBuffer.set(input.subarray(0, remain), state.pcmBufferOffset);
          state.pcmBufferOffset = state.fftSize;
        }
        for (let i = 0; i < input.length; i++) {
          const gain = 500;
          const mixer = Math.sin(2 * Math.PI * mixerPhase);
          output[i] = input[i] * gain * mixer;
          mixerPhase += mixerFreq / sampleRate;
          if (mixerPhase >= 1) mixerPhase -= 1;
        }
      };
      initFrequencyBins(state);
      processAudioFrame(elements, state);
    });
}
