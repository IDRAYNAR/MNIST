// --- Initialisation ---
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const predictButton = document.getElementById('predict-button');
const clearButton = document.getElementById('clear-button');
const predictionSpan = document.getElementById('prediction');

let isDrawing = false;
let session;

// Configuration du dessin
ctx.lineWidth = 20; // Épaisseur du trait, important pour ressembler à MNIST
ctx.lineCap = 'square';
ctx.strokeStyle = 'white';

// Charger le modèle ONNX au chargement de la page
async function loadModel() {
    try {
        // Crée une session d'inférence avec ONNX Runtime
        session = await ort.InferenceSession.create('./mnist_model.onnx');
        console.log("Modèle ONNX chargé avec succès.");
        predictButton.disabled = false;
    } catch (e) {
        console.error(`Erreur lors du chargement du modèle : ${e}`);
        predictionSpan.innerText = "Erreur modèle.";
    }
}

// --- Gestion du dessin sur le canvas ---
function startDrawing(e) {
    isDrawing = true;
    draw(e);
}

function stopDrawing() {
    isDrawing = false;
    ctx.beginPath(); // Réinitialise le chemin pour le prochain trait
}

function draw(e) {
    if (!isDrawing) return;
    // Calcule la position de la souris relative au canvas
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
}

// --- Fonctions des boutons ---
function clearCanvas() {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    predictionSpan.innerText = '...';
}

async function predict() {
    // 1. Obtenir les données de l'image du grand canvas
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // 2. Prétraiter l'image : la redimensionner en 28x28
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 28;
    tempCanvas.height = 28;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(canvas, 0, 0, 28, 28);
    const resizedImageData = tempCtx.getImageData(0, 0, 28, 28);
    
    // 3. Transformer les données en un tableau Float32Array normalisé
    const inputData = new Float32Array(28 * 28);
    for (let i = 0; i < 28 * 28; i++) {
        // Moyenne des canaux R, G, B (valeur en niveaux de gris)
        let r = resizedImageData.data[i * 4 + 0];
        let g = resizedImageData.data[i * 4 + 1];
        let b = resizedImageData.data[i * 4 + 2];
        let gray = (r + g + b) / 3;
        let pixel = gray / 255.0;

        // Normalisation (comme MNIST)
        inputData[i] = (pixel - 0.1307) / 0.3081;
    }

    // Affichage de l'image envoyée
    showModelInputPreview(inputData);

    // 4. Créer le tenseur d'entrée pour le modèle
    const inputTensor = new ort.Tensor('float32', inputData, [1, 1, 28, 28]);

    // 5. Exécuter l'inférence
    try {
        const feeds = { 'input': inputTensor }; // Le nom 'input' doit correspondre à celui défini dans le script Python
        const results = await session.run(feeds);
        const outputData = results.output.data;

        // 6. Trouver le chiffre avec la plus haute probabilité
        const predictedIndex = outputData.indexOf(Math.max(...outputData));
        predictionSpan.innerText = predictedIndex;

    } catch (e) {
        console.error(`Erreur lors de la prédiction : ${e}`);
    }
}

// Fonction pour afficher l'image prétraitée
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



// --- Lier les événements ---
canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mousemove', draw);
clearButton.addEventListener('click', clearCanvas);
predictButton.addEventListener('click', predict);

// Initialisation au chargement de la page
window.onload = () => {
    clearCanvas();
    predictButton.disabled = true; // Désactivé jusqu'à ce que le modèle soit chargé
    predictionSpan.innerText = "Chargement...";
    loadModel();
};