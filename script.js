const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const predictButton = document.getElementById('predict-button');
const clearButton = document.getElementById('clear-button');
const predictionSpan = document.getElementById('prediction');

let isDrawing = false;
let session;

ctx.lineWidth = 20;
ctx.lineCap = 'square';
ctx.strokeStyle = 'white';

async function loadModel() {
    try {
        session = await ort.InferenceSession.create('./mnist_model.onnx');
        console.log("Modèle ONNX chargé avec succès.");
        predictButton.disabled = false;
    } catch (e) {
        console.error(`Erreur lors du chargement du modèle : ${e}`);
        predictionSpan.innerText = "Erreur modèle.";
    }
}

function startDrawing(e) {
    isDrawing = true;
    draw(e);
}

function stopDrawing() {
    isDrawing = false;
    ctx.beginPath();
}

function draw(e) {
    if (!isDrawing) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
}

function clearCanvas() {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    predictionSpan.innerText = '...';
}

async function predict() {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 28;
    tempCanvas.height = 28;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(canvas, 0, 0, 28, 28);
    const resizedImageData = tempCtx.getImageData(0, 0, 28, 28);

    const inputData = new Float32Array(28 * 28);
    for (let i = 0; i < 28 * 28; i++) {
        let r = resizedImageData.data[i * 4 + 0];
        let g = resizedImageData.data[i * 4 + 1];
        let b = resizedImageData.data[i * 4 + 2];
        let gray = (r + g + b) / 3;
        let pixel = gray / 255.0;

        inputData[i] = (pixel - 0.1307) / 0.3081;
    }

    showModelInputPreview(inputData);

    const inputTensor = new ort.Tensor('float32', inputData, [1, 1, 28, 28]);

    try {
        const feeds = { 'input': inputTensor };
        const results = await session.run(feeds);
        const outputData = results.output.data;

        const predictedIndex = outputData.indexOf(Math.max(...outputData));
        predictionSpan.innerText = predictedIndex;

    } catch (e) {
        console.error(`Erreur lors de la prédiction : ${e}`);
    }
}

function showModelInputPreview(inputData) {
    const previewCanvas = document.getElementById('preview-canvas');
    const ctxPreview = previewCanvas.getContext('2d');

    ctxPreview.clearRect(0, 0, 28, 28);

    const image = ctxPreview.createImageData(28, 28);
    for (let i = 0; i < 28 * 28; i++) {
        const gray = Math.floor((inputData[i] * 0.3081 + 0.1307) * 255);
        image.data[i * 4 + 0] = gray;
        image.data[i * 4 + 1] = gray;
        image.data[i * 4 + 2] = gray;
        image.data[i * 4 + 3] = 255;
    }

    ctxPreview.putImageData(image, 0, 0);
}

canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mousemove', draw);
clearButton.addEventListener('click', clearCanvas);
predictButton.addEventListener('click', predict);

window.onload = () => {
    clearCanvas();
    predictButton.disabled = true;
    predictionSpan.innerText = "Chargement...";
    loadModel();
};
