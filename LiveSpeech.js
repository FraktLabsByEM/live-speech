// Mediapipe dependencies - YAMNET audio classifier
import audio from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-audio@0.10.0";
const { AudioClassifier, AudioClassifierResult, FilesetResolver } = audio;
// Instance of audio classifier
const __audio__resolver = await FilesetResolver.forAudioTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-audio@0.10.0/wasm"
  );

/** Properties */
// lang
// continuous
/** methods */
// start
// stop
// abort

export class LiveSpeech {
    // Mediapipe Engine
    #ENGINE;
    #READY = false;
    // Pipeline references
    #STREAM;
    #AUDIO_CONTEXT;
    #mediaSource;
    #audioNode;
    // Properties
    #RECO_URI;
    #RECO_PATH;
    continuous = false;
    lang = "en";
    timeout = 1;

    #VOICE_CATEGORIES = [ 
        "Speech", "Child speech, kid speaking", "Conversation", "Narration, monologue", 
        "Speech synthesizer"
    ];

    #SILENCE_CATEGORIES = [ 
        "Silence", "Inside, small room", "Inside, large room or hall", "Inside, public space", 
        "Outside, rural or natural", "White noise", "Pink noise", "Environmental noise", "Static", 
        "Mains hum", "Reverberation", "Echo", "Room tone", "Background music", "Hum", "Room ambience"
    ];

    // Default Listeners
    /**
     * On error result. Called when an error occurs.
     * @param {string} err Error.
     */
    onerror = (err) => {
        console.error(`LiveSpeech Error: ${err}`);
    }

    /**
     * On result callback. Called when any speech event ends.
     * @param {object} result 
     */
    onresult = (result) => {
        console.warn(`LiveSpeech warning: You have not implemented your own "onresult" callback.\n Speech recognition result:\n${JSON.stringify(result)}`);
    }


    /**
     * Callback executed when speech recognition engine starts
     */
    onstart;
    /**
     * Callback executed when speech recognition engine ends
     */
    onend;
    /**
     * Callback executed when any kind of sound is detected for the first time (at the begining or after a result)
     */
    onsoundstart;
    /**
     * Callback executed when the engine stops listening any kind of sound.
     */
    onsoundend;
    /**
     * Callback executed when speech recognition engine detects any kind of voice.
     */
    onspeechstart;
    /**
     * Callback executed when speech recognition engine stops listening any kind of voice (Generally fired after on result)
     */
    onspeechend;

    /**
     * Live Speech recognition object
     * @param {string} audioUri Uri where to request speech recognition.
     * @description LiveSpeech doesn't perform speech recognition, just manages live speech events for custom speech recognition engines.
     */
    constructor(audioUri, options){
        if(!audioUri) throw new Error('LiveSpeech API requires a speech recognition URI. Param "audioUri" is required');
        // Assign back end properties
        this.#RECO_URI = audioUri;
        // Assign optional properties
        if(options){
            if(options.lang) this.lang = options.lang;
            if(options.continuous) this.continuous = options.continuous;
            if(options.timeout) this.timeout = options.timeout;
        }
        // Load mediapipe yamnet task
        AudioClassifier.createFromOptions(__audio__resolver, {
                baseOptions: {
                    modelAssetPath: "https://storage.googleapis.com/mediapipe-models/audio_classifier/yamnet/float32/1/yamnet.tflite"
                }
            }).then(result => {
                // Define speech recognition engine
                this.#ENGINE = result;
                this.#READY = true;
            })
    }

    #getMediaDevice = () => {
        // Return a promise that attempts to get user media
        return new Promise((resolve, reject) => {
            navigator.mediaDevices.getUserMedia({ audio: true })
                .catch(err => reject(`LiveSpeech error: ${err}`))
                .then(stream => resolve(stream));
        })
    }

    #audioQueue = [];
    #lastSpeechTimestamp;
    #noiseDetected = false;
    #running = false;

    #mainLoop = async (audioProcessEvent) => {
        if(!this.#running && this.onstart != undefined){
            this.#running = true;
            this.onstart();
        }
        try {
            // Retrieve audio chunk
            const buffer = audioProcessEvent.inputBuffer;
            const data = buffer.getChannelData(0);
            // Request prediction
            const results = await this.#ENGINE.classify(data, this.#AUDIO_CONTEXT.sampleRate);
            const categories = results[0].classifications[0].categories.slice(0,3);
            // Validate predictions
            let result = "silence"; // Default event 'noise';
            for(let category of categories){
                // Check speech events
                if(this.#VOICE_CATEGORIES.includes(category.categoryName) && category.score > 0.4){
                    result = "speech";
                    break;
                }
                // Check silence events
                else if(!this.#SILENCE_CATEGORIES.includes(category.categoryName) && category.score > 0.4) result = "noise";
            }
            const currentTime = new Date().getTime();
            // Process result
            switch(result){
                case "speech":
                    // Add chunk to audio queue
                    this.#audioQueue.push([...data]);
                    this.#lastSpeechTimestamp = currentTime; // Update timestamp
                    // Dispatch speech start event callback
                    if(this.#audioQueue.length == 0 && this.onspeechstart != undefined) this.onspeechstart();
                    break;
                case "noise":
                    if(!this.#noiseDetected){
                        // Update state
                        this.#noiseDetected = true;
                        // Dispatch sound start event callback
                        if(this.onsoundstart != undefined) this.onsoundstart();
                    }
                    // If audio speech is currently working, add chunk to queue
                    if(this.#audioQueue.length > 0 && (currentTime - this.#lastSpeechTimestamp) / 1000 < this.timeout) this.#audioQueue.push([...data]);
                    break;
                default:
                    if(this.#audioQueue.length > 0){
                        if((currentTime - this.#lastSpeechTimestamp) / 1000 > this.timeout){
                            // console.log(this.#audioQueue)
                            // Dispatch speech end event callback
                            if(this.onspeechend != undefined) this.onspeechend();
                            // Dispatch sound end event callback
                            if(this.onsoundend != undefined) this.onsoundend();
                            // Build audio file
                            const fullAudio = Float32Array.from(this.#audioQueue.flat());
                            // Clean pipeline variables
                            this.#audioQueue = [];
                            this.#lastSpeechTimestamp = undefined;
                            this.#noiseDetected = false;
                            // Validate continuous speech recognition
                            if(!this.continuous) this.stop();
                            // Convert audio chunks into wav file
                            const wavBlob = this.#float32ToWav(fullAudio);
                            // Fill form
                            const formData = new FormData();
                            formData.append('file', wavBlob, 'audio.wav');
                            formData.append('model', 'whisper-1');
                            formData.append('model', 'whisper-1');

                            const aud = document.createElement("audio");
                            aud.src = URL.createObjectURL(wavBlob);
                            aud.controls = true;
                            document.body.appendChild(aud);
                            // fetch(this.#RECO_URI, {
                            //     method: 'POST',
                            //     body: formData
                            // })
                            // .then(response => response.json())
                            // .then(data => {
                            //     this.onresult(data);
                            // })
                            // .catch(err => {
                            //     console.error(`Transcription error: ${err}`);
                            // });
                        } else {
                            // Add audio chunk to queue
                            this.#audioQueue.push([...data])
                        }
                    }
                    break;
            }
        } catch (error) {
            this.onerror(error);
        }
        
    }

    start = async () => {
        if(!this.#READY){
            console.info("Engine is not ready.");
            setTimeout(() => {
                this.start();
            }, 500);
        }
        // Retrieve audio device.
        this.#getMediaDevice().then(strm => {
            // Update media stream reference
            this.#STREAM = strm;
            // If audio context doesn't exists, create it
            if (!this.#AUDIO_CONTEXT || this.#AUDIO_CONTEXT.state == "closed") {
                this.#AUDIO_CONTEXT = new AudioContext({ sampleRate: 16000 });
            }
            // Resume if audio ctx is suspended.
            if (this.#AUDIO_CONTEXT.state == "suspended") this.#AUDIO_CONTEXT.resume();
            this.#mediaSource = this.#AUDIO_CONTEXT.createMediaStreamSource(strm);
            this.#audioNode = this.#AUDIO_CONTEXT.createScriptProcessor(16384, 1, 1);
            // Init main loop for listening and event capture.
            this.#audioNode.onaudioprocess = this.#mainLoop;
            // Connect nodes into a pipeline
            this.#mediaSource.connect(this.#audioNode); // Connect mediasource to audio processing node
            this.#audioNode.connect(this.#AUDIO_CONTEXT.destination); // Connect audio processing node to mic
        });
    }
    

    stop = (forced) => {
        if(this.#running && this.onend != undefined) this.onend();
        // Release mic
        if(this.#STREAM) this.#STREAM.getTracks().forEach(track => track.stop());
        // Disconnect nodes
        if(this.#mediaSource){
            this.#mediaSource.disconnect();
            this.#mediaSource = undefined;
        }
        if(this.#audioNode){
            this.#audioNode.disconnect();
            this.#audioNode.onaudioprocess = undefined;
            this.#audioNode = undefined;
        }
        // Stop audio context
        if(this.#AUDIO_CONTEXT) {
            if(!forced && this.#AUDIO_CONTEXT.state == "running") return this.#AUDIO_CONTEXT.suspend();
            if(forced) {
                this.#AUDIO_CONTEXT.close();
                this.#AUDIO_CONTEXT = undefined;
            }
        }
    }
    

    abort = () => {
        this.stop(true)
    }

    #float32ToWav = (float32Array, sampleRate = 16000) => {
        const bufferLength = float32Array.length;
        const wavBuffer = new ArrayBuffer(44 + bufferLength * 2);
        const view = new DataView(wavBuffer);
    
        // WAV header
        function writeString(view, offset, string) {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        }
    
        writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + bufferLength * 2, true);
        writeString(view, 8, 'WAVE');
        writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        writeString(view, 36, 'data');
        view.setUint32(40, bufferLength * 2, true);
    
        // PCM samples
        let offset = 44;
        for (let i = 0; i < float32Array.length; i++, offset += 2) {
            let s = Math.max(-1, Math.min(1, float32Array[i]));
            view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }
    
        return new Blob([view], { type: 'audio/wav' });
    }
    
}