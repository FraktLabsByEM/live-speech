# Live Speech

### 📚 Tabla de Contenido

1. [Documentación Descriptiva](#documentación-descriptiva)
   - [Descripción](#descripción)
   - [Despliegue](#despliegue)
   - [Estructura](#estructura)
   - [Tecnologías](#tecnologías)
   - [Funcionalidades](#funcionalidades)
   - [DevOps](#devops)
   - [ToDo](#todo)
2. [Documentación Técnica](#documentación-técnica)
   - [LiveSpeech.js](#livespeechjs)
3. [Conclusiones y Recomendaciones](#conclusiones-y-recomendaciones)

---
Perfecto. Aquí tienes el siguiente *chunk*, correspondiente a la **Documentación Descriptiva** del proyecto **Live Speech**:

---

### 📌 Descripción

**Live Speech** es una librería desarrollada en JavaScript que simula el comportamiento del reconocimiento de voz en vivo, al estilo de la API nativa de `SpeechRecognition`, pero con capacidades personalizables. Está pensada como un recurso comunitario para proyectos experimentales o aplicaciones web que requieran detectar y gestionar eventos de voz, ruido y silencio, sin depender de servicios de terceros.

### 🚀 Despliegue

Actualmente, el proyecto se ejecuta en entorno local y requiere de un backend para reconocimiento de voz como **OpenAI Whisper**. La librería puede integrarse fácilmente en entornos web modernos. No depende de un servidor dedicado, pero sí requiere acceso a un modelo `whisper` vía una URL proporcionada al constructor. El backend puede ser alojado en un servidor personal, remoto o en la nube siempre que sea accesible mediante HTTP POST.

### 🗂️ Estructura

El archivo principal documentado es:

```
LiveSpeech.js
└── src/
    ├── audio_bundle.js       # Módulo de Mediapipe para clasificador de audio
    └── wasm/                 # Archivos WebAssembly necesarios para ejecutar la librería
        └── yamnet.tflite     # Modelo preentrenado de clasificación de audio
```

### 🧪 Tecnologías

- **JavaScript (ES6+)**
- **Web Audio API**: Para captura y procesamiento de audio en tiempo real.
- **MediaPipe Audio (YAMNet)**: Utilizado para clasificación de eventos sonoros y detección de voz.
- **WebAssembly (WASM)**: Requerido para ejecutar los modelos YAMNet con rendimiento optimizado.

### 🔧 Funcionalidades

- Detección de sonido, voz, silencio y ruido en tiempo real.
- Callback personalizados para eventos como `onstart`, `onend`, `onspeechstart`, `onspeechend`, etc.
- Soporte para `speech-to-text` vía API externa (ej. OpenAI Whisper).
- Construcción dinámica de archivos `.wav` a partir de audio detectado.
- Procesamiento continuo o por evento único configurable.

#### Casos de uso posibles:

- Aplicaciones web educativas para entrenamiento de pronunciación.
- Herramientas accesibles para personas con discapacidad.
- Grabadores automáticos de voz al detectar actividad sonora.
- Sistemas de atención al cliente basados en detección de voz.
- Complemento para asistentes virtuales hechos en JavaScript.

---

## 🛠️ Documentación Técnica

### 🔹 Archivo: `LiveSpeech.js`

#### 📄 Descripción

Este archivo contiene la definición de la clase `LiveSpeech`, una herramienta que permite detectar, clasificar y gestionar eventos de audio (voz, ruido, silencio) en tiempo real utilizando la librería YAMNet de Mediapipe. La clase no realiza transcripción por sí misma, sino que administra la captura de audio y lanza eventos personalizados, los cuales pueden conectarse a servicios externos de reconocimiento como OpenAI Whisper.

Su diseño simula la API nativa `SpeechRecognition`, pero con control total sobre las condiciones de inicio, finalización, interrupción y resultados de audio detectado.

#### 📦 Dependencias

```javascript
import audio from "/src/audio_bundle.js";
const { AudioClassifier, FilesetResolver } = audio;
```

Requiere:

- `audio_bundle.js`: proporciona acceso a `AudioClassifier` y `FilesetResolver` de Mediapipe.
- `yamnet.tflite` dentro del directorio `/src/wasm`: modelo entrenado para clasificar sonido.
- Navegador con soporte para Web Audio API.

---

### ⚙️ Funciones

A continuación, se describen las funciones clave agrupadas por propósito.

#### 🔸 Constructor

```js
constructor(audioUri, options)
```

- **audioUri** (`string`, obligatorio): URI del backend de transcripción (ej: Whisper API).
- **options** (`object`, opcional): `lang`, `timeout`, `continuous`.

Inicializa la clase, carga el modelo `yamnet`, define el motor de clasificación y valida configuración.

---

#### 🔸 Procesamiento de Audio

##### `#mainLoop(audioProcessEvent)`

Loop principal ejecutado por cada chunk de audio:

- Clasifica el audio (`speech`, `noise` o `silence`).
- Encola audio si detecta `speech` o `noise`.
- Dispara eventos como `onspeechstart`, `onspeechend`, etc.
- Cuando finaliza un evento, convierte el audio a WAV y lo envía al backend.

##### `#float32ToWav(float32Array, sampleRate)`

Convierte un arreglo `Float32Array` en un archivo `.wav` válido usando `DataView`.

---

#### 🔸 Control de Dispositivo y Motor

##### `start()`

- Inicia el flujo de audio desde el micrófono.
- Crea contexto de audio, media source y conecta nodos.
- Empieza la escucha en tiempo real.

##### `stop(forced = false)`

- Detiene el flujo de audio y desconecta nodos.
- Suspende o cierra el `AudioContext` dependiendo del flag `forced`.

##### `abort()`

- Atajo para `stop(true)`.

##### `#getMediaDevice()`

Promesa que solicita acceso al micrófono.

---

#### 🔸 Eventos y Callbacks

Soporta múltiples callbacks:

- `onresult`, `onerror`, `onstart`, `onend`
- `onsoundstart`, `onsoundend`, `onspeechstart`, `onspeechend`

Permiten integración con UI o lógica externa.

---

### 🧪 Ejemplo de Uso

```js
const reco = new LiveSpeech("http://localhost:5000/transcribe", { model: "whisper-test"} , { lang: "en", timeout: 2 });

reco.onresult = (data) => {
    console.log("Texto transcrito:", data.text);
};

reco.onstart = () => console.log("Motor iniciado");
reco.start();
```

