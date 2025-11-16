import AsrServiceBase, { type AsrService } from "./AsrServiceBase";
import { AudioFormats } from "../../enums";
import type { InputResult } from "../input/InputServiceBase";
import WebWorkerWrapper from "../WebWorkerWrapper";

// FIX #1: The model URL should not have '/public'
import modelURL from '/wav2vec2-base-960h_dynamic.onnx?url';


class AsrWav2VecService extends AsrServiceBase implements AsrService {

    name = "wav2vec-base-960h";
    supportedFormats = [AudioFormats.MP3, AudioFormats.WAV];

    SAMPLE_RATE = 16000;
    AUDIO_LEN_S = 6

    // FIX #2: The worker path must be absolute from the project root.
    worker = new WebWorkerWrapper("/src/services/webworker/Wav2VecWebWorker.ts");

    async prepareService(): Promise<boolean> {
        return await this.worker.initialize(modelURL);
    }

    async transcribeFile(file: InputResult): Promise<string> {
        if (this.worker.initialized === false)
            throw new Error(`Cannot run inference on model \"${this.name}\" because webworker is not initialized`);

        const preProcessedInput = await this.preProcessAudioFile(file.data);
        const transcription = await this.worker.runInference(preProcessedInput);
        return transcription;
    }


    transcribeChunk(chunk: InputResult): Promise<string> {
        throw new Error("Method not implemented.");
    }

    async preProcessAudioFile(file: File) {
        const audioContext = new AudioContext();
        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        const resampledBuffer = await this.resampleAudio(audioBuffer, this.SAMPLE_RATE, audioBuffer.duration);
        const processedData = resampledBuffer.getChannelData(0);
        return processedData;
    }

    async resampleAudio(audioBuffer: AudioBuffer, targetSampleRate: number, targetDuration: number) {
        const offlineCtx = new OfflineAudioContext(
            1, targetSampleRate * targetDuration, targetSampleRate
        );
        const source = offlineCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(offlineCtx.destination);
        source.start();
        return await offlineCtx.startRendering();
    }
}

export default AsrWav2VecService;