document.getElementById('submit-btn').addEventListener('click', runSimulation);

async function runSimulation() {
    const inputContent = document.getElementById('qca-input').value;
    const resultsContainer = document.getElementById('simulation-results');
    const metaContainer = document.getElementById('metadata-panel');
    const submitBtn = document.getElementById('submit-btn');

    if (!inputContent.trim()) {
        alert("Please enter QCA configuration data.");
        return;
    }

    // Update UI to show loading state
    submitBtn.textContent = 'Running...';
    submitBtn.disabled = true;
    resultsContainer.innerHTML = '<div class="placeholder">Running simulation, please wait...</div>';
    metaContainer.innerHTML = '';

    try {
        const response = await fetch('/simulate', {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: inputContent
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || response.statusText);
        }

        const text = await response.text();
        const parsedData = parseQCADesignerFile(text);
        renderSimulationResults(parsedData);

    } catch (error) {
        console.error("Simulation failed:", error);
        resultsContainer.innerHTML = `<div class="placeholder" style="color: #ef4444;">Error: ${error.message}</div>`;
    } finally {
        submitBtn.textContent = 'Run Simulation';
        submitBtn.disabled = false;
    }
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
        resultsContainer.innerHTML = '<div class="placeholder">No trace data found in output file.</div>';
        return;
    }

    traces.forEach(trace => {
        const row = document.createElement('div');
        row.className = 'trace-row';

        const label = document.createElement('div');
        label.className = 'trace-label';
        label.textContent = trace.label;
        label.title = trace.label; // Tooltip for long labels

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

    // Draw center line
    const midY = height / 2;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(width, midY);
    ctx.stroke();

    if (!data || data.length === 0) return;

    // Waveform plotting
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2 * (window.devicePixelRatio || 1);
    ctx.beginPath();

    const stepX = width / (data.length - 1);

    for (let i = 0; i < data.length; i++) {
        const val = Math.max(-1, Math.min(1, data[i]));
        const x = i * stepX;
        const y = midY - (val * (height / 2 - 8));

        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }

    ctx.stroke();
}
