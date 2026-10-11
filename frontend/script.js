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
let selectedCells = []; 

// Interaction & Camera State
let isDragging = false;
let isPanning = false;
let isSelecting = false;
let selectionBox = { startX: 0, startY: 0, endX: 0, endY: 0 };
let dragAnchor = { x: 0, y: 0 };
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
        selectedCells = [];
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
    
    if (e.shiftKey) {
        isSelecting = true;
        selectionBox = { startX: x, startY: y, endX: x, endY: y };
        return;
    }

    const snappedX = snapToGrid(x);
    const snappedY = snapToGrid(y);

    const clickedCell = cells.find(c => Math.abs(c.x - snappedX) < GRID_SIZE / 2 && Math.abs(c.y - snappedY) < GRID_SIZE / 2);

    if (clickedCell) {
        if (!selectedCells.includes(clickedCell)) {
            selectedCells = [clickedCell];
        }
        isDragging = true;
        dragAnchor = { x: snappedX, y: snappedY };
        selectedCells.forEach(c => { c.startX = c.x; c.startY = c.y; });
    } else {
        const labelInput = document.getElementById('cell-label').value.trim();
        const newCell = {
            x: snappedX,
            y: snappedY,
            type: currentTool,
            label: (currentTool === 'INPUT' || currentTool === 'OUTPUT') ? labelInput : ''
        };
        cells.push(newCell);
        selectedCells = [newCell];
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

    const { x, y } = getMousePos(e);

    if (isSelecting) {
        selectionBox.endX = x;
        selectionBox.endY = y;
        draw();
        return;
    }

    if (isDragging && selectedCells.length > 0) {
        const snappedX = snapToGrid(x);
        const snappedY = snapToGrid(y);
        const dx = snappedX - dragAnchor.x;
        const dy = snappedY - dragAnchor.y;
        
        selectedCells.forEach(c => {
            c.x = c.startX + dx;
            c.y = c.startY + dy;
        });
        draw();
    }
});

canvas.addEventListener('mouseup', (e) => {
    if (isSelecting) {
        const minX = Math.min(selectionBox.startX, selectionBox.endX);
        const maxX = Math.max(selectionBox.startX, selectionBox.endX);
        const minY = Math.min(selectionBox.startY, selectionBox.endY);
        const maxY = Math.max(selectionBox.startY, selectionBox.endY);

        selectedCells = cells.filter(c => c.x >= minX && c.x <= maxX && c.y >= minY && c.y <= maxY);
    }

    isDragging = false;
    isPanning = false;
    isSelecting = false;
    canvas.style.cursor = 'crosshair';
    draw();
});

window.addEventListener('keydown', (e) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedCells.length > 0) {
        if (document.activeElement.tagName !== 'INPUT') {
            cells = cells.filter(c => !selectedCells.includes(c));
            selectedCells = [];
            draw();
        }
    }
});

// Rendering Logic for Placer Canvas
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
        else if (cell.type === 'FIXED0' || cell.type === 'FIXED1') { strokeColor = '#f97316'; fillColor = 'rgba(249, 115, 22, 0.2)'; }
        else { strokeColor = '#22c55e'; fillColor = 'rgba(34, 197, 94, 0.2)'; }

        if (selectedCells.includes(cell)) {
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
            { x: cx - offset, y: cy - offset, id: 'TL' }, 
            { x: cx + offset, y: cy + offset, id: 'BR' }, 
            { x: cx + offset, y: cy - offset, id: 'TR' }, 
            { x: cx - offset, y: cy + offset, id: 'BL' }  
        ];

        dotPositions.forEach(pos => {
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, dotRadius, 0, Math.PI * 2);
            
            let isFilled = true;
            if (cell.type === 'FIXED0' && (pos.id === 'TL' || pos.id === 'BR')) isFilled = false;
            if (cell.type === 'FIXED1' && (pos.id === 'TR' || pos.id === 'BL')) isFilled = false;

            if (isFilled) {
                ctx.fill();
            } else {
                ctx.stroke();
            }
        });

        if (cell.label) {
            ctx.fillStyle = strokeColor;
            ctx.font = `${12 / zoom}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(cell.label, cx, cy - CELL_SIZE/2 - (5 / zoom));
        }
    });

    if (isSelecting) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1 / zoom;
        const boxWidth = selectionBox.endX - selectionBox.startX;
        const boxHeight = selectionBox.endY - selectionBox.startY;
        ctx.fillRect(selectionBox.startX, selectionBox.startY, boxWidth, boxHeight);
        ctx.strokeRect(selectionBox.startX, selectionBox.startY, boxWidth, boxHeight);
    }

    ctx.restore();
}

// ==========================================
// DATA GENERATION & FILE MANAGEMENT
// ==========================================

function getColors(type) {
    if (type === 'INPUT') return { r: 0, g: 0, b: 65535 };
    if (type === 'OUTPUT') return { r: 65535, g: 65535, b: 0 };
    if (type === 'FIXED0' || type === 'FIXED1') return { r: 65535, g: 32768, b: 0 };
    return { r: 0, g: 65535, b: 0 };
}

function generateQCADataString() {
    let qcaData = `[VERSION]\nqcadesigner_version=2.000000\n[#VERSION]\n[TYPE:DESIGN]\n[TYPE:QCADLayer]\ntype=3\nstatus=1\npszDescription=Drawing Layer\n[#TYPE:QCADLayer]\n[TYPE:QCADLayer]\ntype=0\nstatus=1\npszDescription=Substrate\n[TYPE:QCADSubstrate]\n[TYPE:QCADStretchyObject]\n[TYPE:QCADDesignObject]\nx=3000.000000\ny=1500.000000\nbSelected=FALSE\nclr.red=65535\nclr.green=65535\nclr.blue=65535\nbounding_box.xWorld=0.000000\nbounding_box.yWorld=0.000000\nbounding_box.cxWorld=6000.000000\nbounding_box.cyWorld=3000.000000\n[#TYPE:QCADDesignObject]\n[#TYPE:QCADStretchyObject]\ngrid_spacing=20.000000\n[#TYPE:QCADSubstrate]\n[#TYPE:QCADLayer]\n[TYPE:QCADLayer]\ntype=1\nstatus=0\npszDescription=Main Cell Layer\n`;

    cells.forEach(cell => {
        const c = getColors(cell.type);
        const isFixed0 = cell.type === 'FIXED0';
        const isFixed1 = cell.type === 'FIXED1';
        const cellFunction = (isFixed0 || isFixed1) ? 'QCAD_CELL_FIXED' : `QCAD_CELL_${cell.type}`;

        const q_e = '1.602176e-19';
        const q_0 = '0.000000e+00';
        
        let c_TR = '8.010882e-20', c_BR = '8.010882e-20', c_BL = '8.010882e-20', c_TL = '8.010882e-20';
        let s_TR = '-0.000000', s_BR = '13.653000', s_BL = '0.000000', s_TL = '0.000000';
        
        if (isFixed0) {
            c_TR = q_e; c_BR = q_0; c_BL = q_e; c_TL = q_0;
            s_TR = '-330449524386642983680197724733440.000000'; s_BR = '13.653000'; s_BL = '0.000000'; s_TL = '0.000000';
        } else if (isFixed1) {
            c_TR = q_0; c_BR = q_e; c_BL = q_0; c_TL = q_e;
            s_TR = '-330449524386642983680197724733440.000000'; s_BR = '13.653000'; s_BL = '0.000000'; s_TL = '0.000000';
        }

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
cell_function=${cellFunction}
number_of_dots=4
[TYPE:CELL_DOT]
x=${(cell.x + 4.5).toFixed(6)}
y=${(cell.y - 4.5).toFixed(6)}
diameter=5.000000
charge=${c_TR}
spin=${s_TR}
potential=0.000000
[#TYPE:CELL_DOT]
[TYPE:CELL_DOT]
x=${(cell.x + 4.5).toFixed(6)}
y=${(cell.y + 4.5).toFixed(6)}
diameter=5.000000
charge=${c_BR}
spin=${s_BR}
potential=0.000000
[#TYPE:CELL_DOT]
[TYPE:CELL_DOT]
x=${(cell.x - 4.5).toFixed(6)}
y=${(cell.y + 4.5).toFixed(6)}
diameter=5.000000
charge=${c_BL}
spin=${s_BL}
potential=0.000000
[#TYPE:CELL_DOT]
[TYPE:CELL_DOT]
x=${(cell.x - 4.5).toFixed(6)}
y=${(cell.y - 4.5).toFixed(6)}
diameter=5.000000
charge=${c_TL}
spin=${s_TL}
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
            const funcMatch = block.match(/cell_function=QCAD_CELL_([A-Z_]+)/);
            const labelMatch = block.match(/psz=(.*)/);

            if (xMatch && yMatch && funcMatch) {
                let type = funcMatch[1];
                
                if (type === 'FIXED') {
                    const charges = [...block.matchAll(/charge=([0-9.e+-]+)/g)].map(m => parseFloat(m[1]));
                    if (charges.length >= 4 && charges[0] > 0) {
                        type = 'FIXED0';
                    } else {
                        type = 'FIXED1';
                    }
                }

                cells.push({
                    x: parseFloat(xMatch[1]),
                    y: parseFloat(yMatch[1]),
                    type: type,
                    label: labelMatch ? labelMatch[1].trim() : ''
                });
            }
        }
        selectedCells = [];
        draw();
    };
    reader.readAsText(file);
    e.target.value = '';
});

// ==========================================
// SIMULATION RUNNER & TRACE RENDER LOGIC
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

    // Determine trace bounds categories based on QCADesigner specifications
    const traceRenderInfo = traces.map(trace => {
        const isClock = trace.label.toUpperCase().includes('CLOCK');
        // Check if trace matches an output cell label
        const isOutput = cells.some(c => c.type === 'OUTPUT' && c.label === trace.label);

        let minVal, maxVal, minStr, maxStr;
        if (isClock) {
            minVal = 3.80e-23;
            maxVal = 9.80e-22;
            minStr = '3,80e-23';
            maxStr = '9,80e-22';
        } else if (isOutput) {
            minVal = -5.62e-01;
            maxVal = 5.62e-01;
            minStr = '-5,62e-01';
            maxStr = '5,62e-01';
        } else {
            minVal = -1.00e+00;
            maxVal = 1.00e+00;
            minStr = '-1,00e+00';
            maxStr = '1,00e+00';
        }

        return { trace, minVal, maxVal, minStr, maxStr };
    });

    const activeRows = [];

    traceRenderInfo.forEach(({ trace, minVal, maxVal, minStr, maxStr }) => {
        const row = document.createElement('div');
        row.className = 'trace-row';

        const labelDiv = document.createElement('div');
        labelDiv.className = 'trace-label';

        const topSpan = document.createElement('span');
        topSpan.className = 'label-top';
        topSpan.textContent = `max: ${maxStr}`;

        const midSpan = document.createElement('span');
        midSpan.className = 'label-mid';
        midSpan.textContent = trace.label;
        midSpan.title = trace.label;

        const botSpan = document.createElement('span');
        botSpan.className = 'label-bot';
        botSpan.textContent = `min: ${minStr}`;

        labelDiv.appendChild(topSpan);
        labelDiv.appendChild(midSpan);
        labelDiv.appendChild(botSpan);

        const canvasWrapper = document.createElement('div');
        canvasWrapper.className = 'trace-canvas-wrapper';

        const canvas = document.createElement('canvas');
        canvasWrapper.appendChild(canvas);

        row.appendChild(labelDiv);
        row.appendChild(canvasWrapper);
        resultsContainer.appendChild(row);

        activeRows.push({ canvas, data: trace.data, minVal, maxVal, topSpan, botSpan, maxStr, minStr });
    });

    // Draw all traces initially
    activeRows.forEach(item => drawTraceCanvas(item.canvas, item.data, item.minVal, item.maxVal, null));

    // Synchronized Hover across all trace rows
    resultsContainer.addEventListener('mousemove', (e) => {
        const firstWrapper = activeRows[0].canvas.parentElement;
        const rect = firstWrapper.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        
        if (mouseX < 0 || mouseX > firstWrapper.clientWidth) {
            // Mouse outside active plot area
            activeRows.forEach(item => {
                drawTraceCanvas(item.canvas, item.data, item.minVal, item.maxVal, null);
                item.topSpan.textContent = `max: ${item.maxStr}`;
                item.topSpan.style.color = '';
                item.botSpan.textContent = `min: ${item.minStr}`;
            });
            return;
        }

        const ratio = Math.max(0, Math.min(1, mouseX / firstWrapper.clientWidth));
        
        activeRows.forEach(item => {
            const sampleIndex = Math.round(ratio * (item.data.length - 1));
            const currentVal = item.data[sampleIndex];
            
            // Draw canvas with hover red line
            drawTraceCanvas(item.canvas, item.data, item.minVal, item.maxVal, ratio);

            // Update label: upper line shows exact value in red, lower line is empty
            item.topSpan.textContent = `current value: ${currentVal.toExponential(2).replace('e', 'e+')}`;
            item.topSpan.style.color = '#ef4444';
            item.botSpan.textContent = '';
        });
    });

    resultsContainer.addEventListener('mouseleave', () => {
        activeRows.forEach(item => {
            drawTraceCanvas(item.canvas, item.data, item.minVal, item.maxVal, null);
            item.topSpan.textContent = `max: ${item.maxStr}`;
            item.topSpan.style.color = '';
            item.botSpan.textContent = `min: ${item.minStr}`;
        });
    });
}

function drawTraceCanvas(canvas, data, minVal, maxVal, hoverRatio) {
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

    const range = maxVal - minVal;

    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2 * (window.devicePixelRatio || 1);
    ctx.beginPath();

    const stepX = width / (data.length - 1);

    for (let i = 0; i < data.length; i++) {
        const normalized = (data[i] - minVal) / (range === 0 ? 1 : range);
        const x = i * stepX;
        const y = (height - 8) - (normalized * (height - 16));

        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.stroke();

    // Draw vertical red line on hover
    if (hoverRatio !== null && hoverRatio !== undefined) {
        const hoverX = hoverRatio * width;
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2 * (window.devicePixelRatio || 1);
        ctx.beginPath();
        ctx.moveTo(hoverX, 0);
        ctx.lineTo(hoverX, height);
        ctx.stroke();
    }
}
