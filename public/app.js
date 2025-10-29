// State
let currentPath = '';
let isAuthenticated = false;

// DOM Elements
const loginModal = document.getElementById('loginModal');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const app = document.getElementById('app');
const dropZone = document.getElementById('dropZone');
const fileList = document.getElementById('fileList');
const fileInput = document.getElementById('fileInput');
const folderInput = document.getElementById('folderInput');
const uploadBtn = document.getElementById('uploadBtn');
const uploadFolderBtn = document.getElementById('uploadFolderBtn');
const newFolderBtn = document.getElementById('newFolderBtn');
const refreshBtn = document.getElementById('refreshBtn');
const logoutBtn = document.getElementById('logoutBtn');
const logsBtn = document.getElementById('logsBtn');
const logsModal = document.getElementById('logsModal');
const closeLogsBtn = document.getElementById('closeLogsBtn');
const refreshLogsBtn = document.getElementById('refreshLogsBtn');
const clearLogsBtn = document.getElementById('clearLogsBtn');
const logsList = document.getElementById('logsList');
const currentPathDisplay = document.getElementById('currentPath');
const statusDisplay = document.getElementById('statusDisplay');
const bucketSizeDisplay = document.getElementById('bucketSize');
const uploadProgress = document.getElementById('uploadProgress');
const progressBarFill = document.getElementById('progressBarFill');
const progressPercent = document.getElementById('progressPercent');
const progressText = document.getElementById('progressText');

// Check authentication on load
checkAuth();

// Event Listeners
loginForm.addEventListener('submit', handleLogin);
logoutBtn.addEventListener('click', handleLogout);
uploadBtn.addEventListener('click', () => fileInput.click());
uploadFolderBtn.addEventListener('click', () => folderInput.click());
fileInput.addEventListener('change', handleFileSelect);
folderInput.addEventListener('change', handleFolderSelect);
newFolderBtn.addEventListener('click', handleNewFolder);
refreshBtn.addEventListener('click', loadFiles);
logsBtn.addEventListener('click', showLogs);
closeLogsBtn.addEventListener('click', () => logsModal.style.display = 'none');
refreshLogsBtn.addEventListener('click', loadLogs);
clearLogsBtn.addEventListener('click', () => logsList.innerHTML = '');

// Drag and drop
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');

    const items = Array.from(e.dataTransfer.items);
    const files = [];

    // Collect all files including those in folders
    for (const item of items) {
        if (item.kind === 'file') {
            const entry = item.webkitGetAsEntry();
            if (entry) {
                await collectFiles(entry, files, '');
            }
        }
    }

    if (files.length > 0) {
        uploadFiles(files, false);
    }
});

// Helper function to recursively collect files from dropped folders
async function collectFiles(entry, files, path) {
    if (entry.isFile) {
        const file = await new Promise((resolve) => entry.file(resolve));
        // Add relative path info
        Object.defineProperty(file, 'webkitRelativePath', {
            value: path + file.name,
            writable: false
        });
        files.push(file);
    } else if (entry.isDirectory) {
        const reader = entry.createReader();
        const entries = await new Promise((resolve) => reader.readEntries(resolve));
        for (const childEntry of entries) {
            await collectFiles(childEntry, files, path + entry.name + '/');
        }
    }
}

// Functions
async function checkAuth() {
    try {
        const response = await fetch('/api/check-auth');
        const data = await response.json();

        if (data.authenticated) {
            isAuthenticated = true;
            showApp();
            loadFiles();
        } else {
            showLogin();
        }
    } catch (error) {
        console.error('Auth check error:', error);
        showLogin();
    }
}

function showLogin() {
    loginModal.style.display = 'flex';
    app.style.display = 'none';
}

function showApp() {
    loginModal.style.display = 'none';
    app.style.display = 'block';
    loadBucketStats();
}

async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            isAuthenticated = true;
            showApp();
            loadFiles();
        } else {
            showError(loginError, data.error || 'Erreur de connexion');
        }
    } catch (error) {
        showError(loginError, 'Erreur de connexion au serveur');
    }
}

async function handleLogout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        isAuthenticated = false;
        currentPath = '';
        showLogin();
    } catch (error) {
        console.error('Logout error:', error);
    }
}

async function loadFiles() {
    try {
        const response = await fetch(`/api/files?prefix=${encodeURIComponent(currentPath)}`);

        if (response.status === 401) {
            showLogin();
            return;
        }

        const data = await response.json();
        console.log('Received items:', data.items);
        data.items.forEach(item => {
            console.log(`Item: ${item.name}, type: ${item.type}, size: ${item.size}`);
        });
        displayFiles(data.items);
        updatePathDisplay();
    } catch (error) {
        console.error('Error loading files:', error);
        alert('Erreur lors du chargement des fichiers');
    }
}

function displayFiles(items) {
    fileList.innerHTML = '';

    // Add back button if not at root
    if (currentPath !== '') {
        const backItem = createBackButton();
        fileList.appendChild(backItem);
    }

    // Sort: folders first, then files
    items.sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'folder' ? -1 : 1;
    });

    items.forEach(item => {
        const itemElement = createFileItem(item);
        fileList.appendChild(itemElement);
    });

    // Count folders and files
    const folderCount = items.filter(i => i.type === 'folder').length;
    const fileCount = items.filter(i => i.type === 'file').length;

    // Update status display
    if (items.length === 0) {
        statusDisplay.textContent = 'VIDE';
        const emptyMsg = document.createElement('div');
        emptyMsg.style.cssText = 'text-align: center; padding: 60px 20px; font-size: 1.2em; color: var(--concrete); letter-spacing: 1px;';
        emptyMsg.innerHTML = `
            <div style="margin-bottom: 20px; font-size: 2.5em; font-weight: 700;">∅</div>
            <div style="font-weight: 700; text-transform: uppercase;">Ce répertoire est vide</div>
            <div style="margin-top: 20px; font-size: 0.9em; opacity: 0.7;">
                ${currentPath ? 'Uploadez des fichiers ou retournez au répertoire parent' : 'Commencez par uploader des fichiers ou dossiers'}
            </div>
        `;
        fileList.appendChild(emptyMsg);
    } else {
        const parts = [];
        if (folderCount > 0) parts.push(`${folderCount} dossier${folderCount > 1 ? 's' : ''}`);
        if (fileCount > 0) parts.push(`${fileCount} fichier${fileCount > 1 ? 's' : ''}`);
        statusDisplay.textContent = parts.join(' · ');
    }

    console.log(`Displayed ${folderCount} folders and ${fileCount} files`);
}

function createBackButton() {
    const div = document.createElement('div');
    div.className = 'file-item folder';
    div.innerHTML = `
        <div class="file-header">
            <span class="file-icon">←</span>
        </div>
        <div class="file-name">Retour</div>
    `;
    div.addEventListener('click', () => {
        const parts = currentPath.split('/').filter(p => p);
        parts.pop();
        currentPath = parts.length > 0 ? parts.join('/') + '/' : '';
        loadFiles();
    });
    return div;
}

function createFileItem(item) {
    const div = document.createElement('div');
    div.className = `file-item ${item.type}`;

    const icon = item.type === 'folder' ? '📁' : '📄';
    const size = formatFileSize(item.size);
    const date = item.updated ? new Date(item.updated).toLocaleDateString('fr-FR') : '';

    div.innerHTML = `
        <div class="file-header">
            <span class="file-icon">${icon}</span>
            <div class="file-actions">
                ${item.type === 'folder' ? `
                    <button class="btn btn-small btn-danger" onclick="deleteItem('${item.path}', 'folder', event)">✕</button>
                ` : `
                    <button class="btn btn-small btn-primary" onclick="downloadFile('${item.path}', event)">↓</button>
                    <button class="btn btn-small btn-secondary" onclick="renameItem('${item.path}', '${item.name}', event)">✎</button>
                    <button class="btn btn-small btn-danger" onclick="deleteItem('${item.path}', 'file', event)">✕</button>
                `}
            </div>
        </div>
        <div class="file-name">${item.name}</div>
        <div class="file-meta">
            <span class="file-size">${size}</span>
            ${item.type === 'file' ? `<span class="file-date">${date}</span>` : ''}
        </div>
    `;

    if (item.type === 'folder') {
        div.addEventListener('click', (e) => {
            if (!e.target.closest('.btn')) {
                currentPath = item.path;
                loadFiles();
            }
        });
    }

    return div;
}

function updatePathDisplay() {
    currentPathDisplay.textContent = '/' + currentPath;
}

function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    uploadFiles(files);
    fileInput.value = '';
}

function handleFolderSelect(e) {
    const files = Array.from(e.target.files);
    uploadFiles(files, true);
    folderInput.value = '';
}

async function uploadFiles(files, isFolder = false) {
    if (files.length === 0) return;

    uploadProgress.style.display = 'block';

    // Calculate total size
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    let uploadedSize = 0;
    let completedFiles = 0;
    const startTime = Date.now();

    // Upload en parallèle par lots de 3 fichiers
    const BATCH_SIZE = 3;

    for (let i = 0; i < files.length; i += BATCH_SIZE) {
        const batch = files.slice(i, i + BATCH_SIZE);

        // Upload tous les fichiers du lot en parallèle
        await Promise.all(batch.map(async (file) => {
            const displayPath = file.webkitRelativePath || file.name;

            try {
                await uploadFile(file, isFolder);

                // Update progress
                uploadedSize += file.size;
                completedFiles++;

                const elapsedTime = (Date.now() - startTime) / 1000;
                const speed = uploadedSize / elapsedTime;
                const progress = Math.round((uploadedSize / totalSize) * 100);

                progressBarFill.style.width = progress + '%';
                progressPercent.textContent = progress + '%';

                const speedText = formatSpeed(speed);
                const remainingSize = totalSize - uploadedSize;
                const remainingTime = remainingSize / speed;
                const etaText = formatTime(remainingTime);

                progressText.textContent = `Fichier ${completedFiles} sur ${files.length} • ${speedText} • Temps restant: ${etaText}\nDernier: ${displayPath}`;
            } catch (error) {
                console.error(`Error uploading ${displayPath}:`, error);
            }
        }));
    }

    uploadProgress.style.display = 'none';
    loadFiles();
    loadBucketStats();
}

async function uploadFile(file, isFolder = false) {
    const formData = new FormData();
    formData.append('file', file);

    // Si c'est un upload de dossier, on utilise le chemin relatif
    let filePath = currentPath;
    if (isFolder && file.webkitRelativePath) {
        filePath = currentPath + file.webkitRelativePath;
    } else {
        filePath = currentPath + file.name;
    }

    formData.append('filePath', filePath);
    formData.append('prefix', currentPath);

    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Erreur upload');
        }
    } catch (error) {
        console.error('Upload error:', error);
        alert(`Erreur lors de l'upload de ${file.name}: ${error.message}`);
    }
}

async function downloadFile(path, event) {
    event.stopPropagation();

    try {
        window.location.href = `/api/download?path=${encodeURIComponent(path)}`;
    } catch (error) {
        console.error('Download error:', error);
        alert('Erreur lors du téléchargement');
    }
}

async function deleteItem(path, type, event) {
    event.stopPropagation();

    const confirmMessage = type === 'folder'
        ? 'Supprimer ce dossier et tout son contenu?'
        : 'Supprimer ce fichier?';

    if (!confirm(confirmMessage)) return;

    try {
        const response = await fetch('/api/delete', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path, type })
        });

        if (response.ok) {
            loadFiles();
            loadBucketStats();
        } else {
            const data = await response.json();
            alert(data.error || 'Erreur lors de la suppression');
        }
    } catch (error) {
        console.error('Delete error:', error);
        alert('Erreur lors de la suppression');
    }
}

async function renameItem(oldPath, oldName, event) {
    event.stopPropagation();

    const newName = prompt('Nouveau nom:', oldName);
    if (!newName || newName === oldName) return;

    const pathParts = oldPath.split('/');
    pathParts.pop();
    const newPath = pathParts.concat(newName).join('/');

    try {
        const response = await fetch('/api/rename', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ oldPath, newPath })
        });

        if (response.ok) {
            loadFiles();
        } else {
            const data = await response.json();
            alert(data.error || 'Erreur lors du renommage');
        }
    } catch (error) {
        console.error('Rename error:', error);
        alert('Erreur lors du renommage');
    }
}

async function handleNewFolder() {
    const folderName = prompt('Nom du nouveau dossier:');
    if (!folderName) return;

    const folderPath = currentPath + folderName + '/';

    try {
        const response = await fetch('/api/create-folder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: folderPath })
        });

        if (response.ok) {
            loadFiles();
        } else {
            const data = await response.json();
            alert(data.error || 'Erreur lors de la création du dossier');
        }
    } catch (error) {
        console.error('Create folder error:', error);
        alert('Erreur lors de la création du dossier');
    }
}

function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function formatSpeed(bytesPerSecond) {
    if (!bytesPerSecond || bytesPerSecond === 0) return '0 B/s';
    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
    return Math.round(bytesPerSecond / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function formatTime(seconds) {
    if (!seconds || seconds === Infinity || isNaN(seconds)) return '--';
    if (seconds < 60) return Math.round(seconds) + 's';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
}

function showError(element, message) {
    element.textContent = message;
    element.classList.add('show');
    setTimeout(() => {
        element.classList.remove('show');
    }, 5000);
}

async function showLogs() {
    logsModal.style.display = 'flex';
    await loadLogs();
}

async function loadLogs() {
    try {
        const response = await fetch('/api/logs?limit=100');

        if (response.status === 401) {
            showLogin();
            return;
        }

        const data = await response.json();
        displayLogs(data.logs);
    } catch (error) {
        console.error('Error loading logs:', error);
        alert('Erreur lors du chargement des logs');
    }
}

function displayLogs(logs) {
    if (!logs || logs.length === 0) {
        logsList.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--concrete); font-weight: 700;">AUCUN LOG DISPONIBLE</div>';
        return;
    }

    logsList.innerHTML = logs.map(log => {
        const timestamp = new Date(log.timestamp).toLocaleString('fr-FR');
        const detailsStr = log.details && Object.keys(log.details).length > 0
            ? JSON.stringify(log.details, null, 2)
            : '';

        return `
            <div class="log-item ${log.level}">
                <div class="log-timestamp">${timestamp}</div>
                <div>
                    <span class="log-level">${log.level}</span>
                    <span class="log-message">${log.message}</span>
                </div>
                ${detailsStr ? `<div class="log-details">${detailsStr}</div>` : ''}
            </div>
        `;
    }).join('');
}

async function loadBucketStats() {
    try {
        const response = await fetch('/api/bucket-stats');

        if (response.status === 401) {
            return;
        }

        const data = await response.json();
        bucketSizeDisplay.textContent = `Total: ${formatFileSize(data.totalSize)}`;
    } catch (error) {
        console.error('Error loading bucket stats:', error);
        bucketSizeDisplay.textContent = 'Total: Erreur';
    }
}
