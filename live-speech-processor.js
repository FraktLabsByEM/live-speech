// // live-speech-processor.js
// class LiveSpeechProcessor extends AudioWorkletProcessor {
//   constructor() {
//     super();
//   }

//   process(inputs, outputs, parameters) {
//     const input = inputs[0];

//     const currentTime = currentFrame / sampleRate;
//     // if (input && input[0]) {
//     if (currentTime % 1 < 1 / sampleRate){
//       const audioData = input[0].slice(0, sampleRate);
//       this.port.postMessage(audioData)
//     }
//     // Continue processing
//     return true;
//   }
// }

// registerProcessor("live-speech-processor", LiveSpeechProcessor);
class LiveSpeechProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = new Float32Array(16000);
    this._offset = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (input && input[0]) {
      const inputData = input[0];

      // Copiar muestras al buffer interno
      for (let i = 0; i < inputData.length; i++) {
        if (this._offset < this._buffer.length) {
          this._buffer[this._offset++] = inputData[i];
        }
      }

      // Cuando el buffer alcanza 16000 muestras
      if (this._offset >= this._buffer.length) {
        this.port.postMessage(this._buffer); // Enviar 1 segundo
        this._offset = 0; // Reiniciar el buffer
      }
    }

    return true;
  }
}

registerProcessor("live-speech-processor", LiveSpeechProcessor);
