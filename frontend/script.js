document.getElementById('file-input').addEventListener('change', handleFileSelect);

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    document.getElementById('file-name').textContent = file.name;

    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        const parsedData = parseQCADesignerFile(text);
        renderSimulationResults(parsedData);
    };
    reader.readAsText(file);
}

function parseQCADesignerFile(text) {
    const lines = text.split(/\r?\n/);
    let numberSamples = 0;
    let numberOfTraces = 0;
    const traces = [];

    let currentTrace = null;
    let isReadingTraceData = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        if (line.startsWith('number_samples=')) {
            numberSamples = parseInt(line.split('=')[1], 10);
        } else if (line.startsWith('number_of_traces=')) {
            numberOfTraces = parseInt(line.split('=')[1], 10);
        } else if (line === '[TRACE]') {
            if (currentTrace) {
                traces.push(currentTrace);
            }
            currentTrace = { label: 'Trace', data: [] };
            isReadingTraceData = false;
        } else if (line.startsWith('data_labels=')) {
            if (currentTrace) {
                currentTrace.label = line.split('=')[1];
            }
        } else if (line === '[TRACE_DATA]') {
            isReadingTraceData = true;
        } else if (isReadingTraceData) {
            if (line.startsWith('[')) {
                isReadingTraceData = false;
            } else {
                const values = line.split(/\s+/).map(Number).filter(n => !isNaN(n));
                currentTrace.data.push(...values);
            }
        }
    }

    if (currentTrace) {
        traces.push(currentTrace);
    }

    return { numberSamples, numberOfTraces, traces };
}

function renderSimulationResults({ numberSamples, numberOfTraces, traces }) {
    const metaContainer = document.getElementById('metadata-panel');
    const resultsContainer = document.getElementById('simulation-results');

    metaContainer.innerHTML = `
        <span>Samples: <strong>${numberSamples}</strong></span>
        <span>Traces: <strong>${numberOfTraces || traces.length}</strong></span>
    `;

    resultsContainer.innerHTML = '';

    if (traces.length === 0) {
        resultsContainer.innerHTML = '<div class="placeholder">No trace data found in file.</div>';
        return;
    }

    traces.forEach(trace => {
        const row = document.createElement('div');
        row.className = 'trace-row';

        const label = document.createElement('div');
        label.className = 'trace-label';
        label.textContent = trace.label;

        const canvasWrapper = document.createElement('div');
        canvasWrapper.className = 'trace-canvas-wrapper';

        const canvas = document.createElement('canvas');
        canvasWrapper.appendChild(canvas);

        row.appendChild(label);
        row.appendChild(canvasWrapper);
        resultsContainer.appendChild(row);

        drawTraceCanvas(canvas, trace.data);
    });
}

function drawTraceCanvas(canvas, data) {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio || 1;
    canvas.height = rect.height * window.devicePixelRatio || 1;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Background and Grid
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;

    // Draw center line (0.0 polarization line)
    const midY = height / 2;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(width, midY);
    ctx.stroke();

    if (!data || data.length === 0) return;

    // Waveform plotting (-1.0 maps to bottom, +1.0 maps to top)
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2 * (window.devicePixelRatio || 1);
    ctx.beginPath();

    const stepX = width / (data.length - 1);

    for (let i = 0; i < data.length; i++) {
        const val = Math.max(-1, Math.min(1, data[i]));
        const x = i * stepX;
        // Invert Y-axis because 0 is at top on canvas
        const y = midY - (val * (height / 2 - 8));

        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }

    ctx.stroke();
}
