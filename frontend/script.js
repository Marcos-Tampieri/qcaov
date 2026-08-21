const canvas = document.getElementById('qca-canvas');
const ctx = canvas.getContext('2d');
const container = document.querySelector('.canvas-container');

// QCA Grid Constants
const GRID_SIZE = 20;
const CELL_SIZE = 18;
const DOT_SIZE = 5;

// State
let cells = [];
let currentTool = 'NORMAL'; 
let selectedCell = null;

// Interaction & Camera State
let isDragging = false;
let isPanning = false;
let dragOffsetX = 0;
let dragOffsetY = 0;
let panX = 0;
let panY = 0;
let zoom = 1.0;
let lastMouseX = 0;
let lastMouseY = 0;

// Resize Canvas
function resizeCanvas() {
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    draw();
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Event Listeners for Toolbar
document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentTool = e.target.dataset.tool;
    });
});

document.getElementById('btn-clear').addEventListener('click', () => {
    if (confirm('Clear the entire grid?')) {
        cells = [];
        selectedCell = null;
        draw();
    }
});

// Canvas Mouse Interactions
function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (e.clientX - rect.left - panX) / zoom,
        y: (e.clientY - rect.top - panY) / zoom
    };
}

function snapToGrid(val) {
    return Math.round(val / GRID_SIZE) * GRID_SIZE;
}

// Mouse Wheel Zoom
canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = 1.1;
    const prevZoom = zoom;

    if (e.deltaY < 0) {
        zoom = Math.min(zoom * zoomFactor, 5.0);
    } else {
        zoom = Math.max(zoom / zoomFactor, 0.2);
    }

    panX = mouseX - (mouseX - panX) * (zoom / prevZoom);
    panY = mouseY - (mouseY - panY) * (zoom / prevZoom);

    draw();
}, { passive: false });

canvas.addEventListener('mousedown', (e) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
        isPanning = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        canvas.style.cursor = 'grabbing';
        return;
    }

    if (e.button !== 0) return;

    const { x, y } = getMousePos(e);
    const snappedX = snapToGrid(x);
    const snappedY = snapToGrid(y);

    selectedCell = cells.find(c => Math.abs(c.x - snappedX) < GRID_SIZE / 2 && Math.abs(c.y - snappedY) < GRID_SIZE / 2);

    if (selectedCell) {
        isDragging = true;
        dragOffsetX = selectedCell.x - x;
        dragOffsetY = selectedCell.y - y;
    } else {
        const labelInput = document.getElementById('cell-label').value.trim();
        const newCell = {
            x: snappedX,
            y: snappedY,
            type: currentTool,
            label: (currentTool === 'INPUT' || currentTool === 'OUTPUT') ? labelInput : ''
        };
        cells.push(newCell);
        selectedCell = newCell;
    }
    draw();
});

canvas.addEventListener('mousemove', (e) => {
    if (isPanning) {
        panX += e.clientX - lastMouseX;
        panY += e.clientY - lastMouseY;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        draw();
        return;
    }

    if (isDragging && selectedCell) {
        const { x, y } = getMousePos(e);
        selectedCell.x = snapToGrid(x + dragOffsetX);
        selectedCell.y = snapToGrid(y + dragOffsetY);
        draw();
    }
});

canvas.addEventListener('mouseup', () => {
    isDragging = false;
    isPanning = false;
    canvas.style.cursor = 'crosshair';
});

// Handle Delete Key
window.addEventListener('keydown', (e) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedCell) {
        if (document.activeElement.tagName !== 'INPUT') {
            cells = cells.filter(c => c !== selectedCell);
            selectedCell = null;
            draw();
        }
    }
});

// Rendering Logic
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(zoom, zoom);

    const startX = Math.floor(-panX / zoom / GRID_SIZE) * GRID_SIZE;
    const endX = startX + canvas.width / zoom + GRID_SIZE * 2;
    const startY = Math.floor(-panY / zoom / GRID_SIZE) * GRID_SIZE;
    const endY = startY + canvas.height / zoom + GRID_SIZE * 2;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1 / zoom;
    ctx.beginPath();
    for (let x = startX; x <= endX; x += GRID_SIZE) {
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
    }
    for (let y = startY; y <= endY; y += GRID_SIZE) {
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
    }
    ctx.stroke();

    cells.forEach(cell => {
        const cx = cell.x;
        const cy = cell.y;

        let strokeColor, fillColor;
        if (cell.type === 'INPUT') { strokeColor = '#3b82f6'; fillColor = 'rgba(59, 130, 246, 0.2)'; }
        else if (cell.type === 'OUTPUT') { strokeColor = '#eab308'; fillColor = 'rgba(234, 179, 8, 0.2)'; }
        else { strokeColor = '#22c55e'; fillColor = 'rgba(34, 197, 94, 0.2)'; }

        if (cell === selectedCell) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2 / zoom;
        } else {
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 1.5 / zoom;
        }

        ctx.fillStyle = fillColor;
        ctx.fillRect(cx - CELL_SIZE/2, cy - CELL_SIZE/2, CELL_SIZE, CELL_SIZE);
        ctx.strokeRect(cx - CELL_SIZE/2, cy - CELL_SIZE/2, CELL_SIZE, CELL_SIZE);

        ctx.fillStyle = strokeColor;
        const offset = 4.5;
        const dotRadius = DOT_SIZE / 2;
        
        const dotPositions = [
            { x: cx - offset, y: cy - offset }, 
            { x: cx + offset, y: cy + offset }, 
            { x: cx + offset, y: cy - offset }, 
            { x: cx - offset, y: cy + offset }  
        ];

        ctx.beginPath();
        dotPositions.forEach(pos => {
            ctx.moveTo(pos.x + dotRadius, pos.y);
            ctx.arc(pos.x, pos.y, dotRadius, 0, Math.PI * 2);
        });
        ctx.fill();

        if (cell.label) {
            ctx.fillStyle = strokeColor;
            ctx.font = `${12 / zoom}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(cell.label, cx, cy - CELL_SIZE/2 - (5 / zoom));
        }
    });

    ctx.restore();
}

// ==========================================
// DATA GENERATION & FILE MANAGEMENT
// ==========================================

function getColors(type) {
    if (type === 'INPUT') return { r: 0, g: 0, b: 65535 };
    if (type === 'OUTPUT') return { r: 65535, g: 65535, b: 0 };
    return { r: 0, g: 65535, b: 0 };
}

// Extracted the string building to its own function to be shared by Export and Simulation
function generateQCADataString() {
    let qcaData = `[VERSION]\nqcadesigner_version=2.000000\n[#VERSION]\n[TYPE:DESIGN]\n[TYPE:QCADLayer]\ntype=3\nstatus=1\npszDescription=Drawing Layer\n[#TYPE:QCADLayer]\n[TYPE:QCADLayer]\ntype=0\nstatus=1\npszDescription=Substrate\n[TYPE:QCADSubstrate]\n[TYPE:QCADStretchyObject]\n[TYPE:QCADDesignObject]\nx=3000.000000\ny=1500.000000\nbSelected=FALSE\nclr.red=65535\nclr.green=65535\nclr.blue=65535\nbounding_box.xWorld=0.000000\nbounding_box.yWorld=0.000000\nbounding_box.cxWorld=6000.000000\nbounding_box.cyWorld=3000.000000\n[#TYPE:QCADDesignObject]\n[#TYPE:QCADStretchyObject]\ngrid_spacing=20.000000\n[#TYPE:QCADSubstrate]\n[#TYPE:QCADLayer]\n[TYPE:QCADLayer]\ntype=1\nstatus=0\npszDescription=Main Cell Layer\n`;

    cells.forEach(cell => {
        const c = getColors(cell.type);
        qcaData += `[TYPE:QCADCell]
[TYPE:QCADDesignObject]
x=${cell.x.toFixed(6)}
y=${cell.y.toFixed(6)}
bSelected=FALSE
clr.red=${c.r}
clr.green=${c.g}
clr.blue=${c.b}
bounding_box.xWorld=${(cell.x - 9).toFixed(6)}
bounding_box.yWorld=${(cell.y - 9).toFixed(6)}
bounding_box.cxWorld=18.000000
bounding_box.cyWorld=18.000000
[#TYPE:QCADDesignObject]
cell_options.cxCell=18.000000
cell_options.cyCell=18.000000
cell_options.dot_diameter=5.000000
cell_options.clock=0
cell_options.relax=1
cell_options.relax_in=1
cell_options.mode=QCAD_CELL_MODE_NORMAL
cell_function=QCAD_CELL_${cell.type}
number_of_dots=4
[TYPE:CELL_DOT]
x=${(cell.x + 4.5).toFixed(6)}
y=${(cell.y - 4.5).toFixed(6)}
diameter=5.000000
charge=8.010882e-20
spin=-0.000000
potential=0.000000
[#TYPE:CELL_DOT]
[TYPE:CELL_DOT]
x=${(cell.x + 4.5).toFixed(6)}
y=${(cell.y + 4.5).toFixed(6)}
diameter=5.000000
charge=8.010882e-20
spin=13.653000
potential=0.000000
[#TYPE:CELL_DOT]
[TYPE:CELL_DOT]
x=${(cell.x - 4.5).toFixed(6)}
y=${(cell.y + 4.5).toFixed(6)}
diameter=5.000000
charge=8.010882e-20
spin=0.000000
potential=0.000000
[#TYPE:CELL_DOT]
[TYPE:CELL_DOT]
x=${(cell.x - 4.5).toFixed(6)}
y=${(cell.y - 4.5).toFixed(6)}
diameter=5.000000
charge=8.010882e-20
spin=0.000000
potential=0.000000
[#TYPE:CELL_DOT]
`;
        if (cell.label) {
            qcaData += `[TYPE:QCADLabel]\n[TYPE:QCADStretchyObject]\n[TYPE:QCADDesignObject]\nx=${(cell.x - 2).toFixed(6)}\ny=${(cell.y - 20.5).toFixed(6)}\nbSelected=FALSE\nclr.red=${c.r}\nclr.green=${c.g}\nclr.blue=${c.b}\nbounding_box.xWorld=${(cell.x - 9).toFixed(6)}\nbounding_box.yWorld=${(cell.y - 31).toFixed(6)}\nbounding_box.cxWorld=14.000000\nbounding_box.cyWorld=21.000000\n[#TYPE:QCADDesignObject]\n[#TYPE:QCADStretchyObject]\npsz=${cell.label}\n[#TYPE:QCADLabel]\n`;
        }
        qcaData += `[#TYPE:QCADCell]\n`;
    });

    qcaData += `[#TYPE:QCADLayer]\n[#TYPE:DESIGN]\n`;
    return qcaData;
}

document.getElementById('btn-export').addEventListener('click', () => {
    const qcaData = generateQCADataString();
    const blob = new Blob([qcaData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'circuit.qca';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

document.getElementById('file-import').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
        const content = ev.target.result;
        cells = [];
        const blocks = content.split('[TYPE:QCADCell]');
        
        for (let i = 1; i < blocks.length; i++) {
            const block = blocks[i];
            const xMatch = block.match(/x=([0-9.]+)/);
            const yMatch = block.match(/y=([0-9.]+)/);
            const funcMatch = block.match(/cell_function=QCAD_CELL_([A-Z]+)/);
            const labelMatch = block.match(/psz=(.*)/);

            if (xMatch && yMatch && funcMatch) {
                cells.push({
                    x: parseFloat(xMatch[1]),
                    y: parseFloat(yMatch[1]),
                    type: funcMatch[1],
                    label: labelMatch ? labelMatch[1].trim() : ''
                });
            }
        }
        selectedCell = null;
        draw();
    };
    reader.readAsText(file);
    e.target.value = '';
});

// ==========================================
// SIMULATION RUNNER LOGIC
// ==========================================

document.getElementById('submit-btn').addEventListener('click', runSimulation);

async function runSimulation() {
    if (cells.length === 0) {
        alert("Please place QCA cells on the grid before running the simulation.");
        return;
    }

    const inputContent = generateQCADataString();
    const resultsContainer = document.getElementById('simulation-results');
    const metaContainer = document.getElementById('metadata-panel');
    const submitBtn = document.getElementById('submit-btn');

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
        label.title = trace.label;

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

    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;

    const midY = height / 2;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(width, midY);
    ctx.stroke();

    if (!data || data.length === 0) return;

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
