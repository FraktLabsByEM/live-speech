// live-speech-processor.js
class LiveSpeechProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];

    const currentTime = currentFrame / sampleRate;
    // if (input && input[0]) {
    if (currentTime % 1 < 1 / sampleRate){
      const audioData = input[0].slice(0, sampleRate);
      this.port.postMessage(audioData)
      // Send audio to main thread
      // console.log("echo echo")
      // this.port.postMessage(input[0]);
    }
    // Continue processing
    return true;
  }
}

registerProcessor("live-speech-processor", LiveSpeechProcessor);
