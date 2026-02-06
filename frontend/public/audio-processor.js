// Audio Worklet Processor for capturing microphone input
// This runs in a separate audio thread for better performance

class AudioInputProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.bufferSize = 4096;
        this.buffer = new Float32Array(this.bufferSize);
        this.bufferIndex = 0;
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (!input || !input[0]) return true;

        const inputChannel = input[0];

        for (let i = 0; i < inputChannel.length; i++) {
            this.buffer[this.bufferIndex++] = inputChannel[i];

            if (this.bufferIndex >= this.bufferSize) {
                // Send buffer to main thread
                this.port.postMessage({
                    type: 'audio',
                    buffer: this.buffer.slice()
                });
                this.bufferIndex = 0;
            }
        }

        return true;
    }
}

registerProcessor('audio-input-processor', AudioInputProcessor);
