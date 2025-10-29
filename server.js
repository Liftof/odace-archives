require('dotenv').config();
const express = require('express');
const session = require('express-session');
const fileUpload = require('express-fileupload');
const { Storage } = require('@google-cloud/storage');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Configure Google Cloud Storage
const storage = new Storage({
  projectId: process.env.GCS_PROJECT_ID,
  credentials: {
    type: 'service_account',
    project_id: process.env.GCS_PROJECT_ID,
    private_key_id: process.env.GCS_PRIVATE_KEY_ID,
    private_key: process.env.GCS_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.GCS_CLIENT_EMAIL,
    client_id: process.env.GCS_CLIENT_ID,
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(process.env.GCS_CLIENT_EMAIL)}`,
    universe_domain: 'googleapis.com'
  }
});

const bucket = storage.bucket(process.env.BUCKET_NAME);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload({
  limits: { fileSize: 5 * 1024 * 1024 * 1024 }, // 5GB max
  useTempFiles: true,
  tempFileDir: '/tmp/'
}));
app.use(session({
  secret: 'odace-secret-key-2025',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));
app.use(express.static('public'));

// Auth middleware
const requireAuth = (req, res, next) => {
  if (req.session.authenticated) {
    next();
  } else {
    res.status(401).json({ error: 'Non autorisé' });
  }
};

// Routes
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
    req.session.authenticated = true;
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Identifiants incorrects' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/check-auth', (req, res) => {
  res.json({ authenticated: !!req.session.authenticated });
});

// List files and folders
app.get('/api/files', requireAuth, async (req, res) => {
  try {
    const prefix = req.query.prefix || '';

    // Get files with delimiter to get "folder" structure
    const [files, , apiResponse] = await bucket.getFiles({
      prefix,
      delimiter: '/',
      autoPaginate: false
    });

    const items = [];
    const folders = new Set();
    const folderSizes = {};

    // Get folders from prefixes (returned by GCS when using delimiter)
    if (apiResponse && apiResponse.prefixes) {
      apiResponse.prefixes.forEach(folderPrefix => {
        const folderName = folderPrefix.substring(prefix.length).replace(/\/$/, '');
        if (folderName) {
          folders.add(folderName);
        }
      });
    }

    // Also detect folders from file paths (in case some files create implicit folders)
    files.forEach(file => {
      const relativePath = file.name.substring(prefix.length);
      const parts = relativePath.split('/');

      // If there's a slash, it means there's a folder
      if (parts.length > 1 && parts[0]) {
        folders.add(parts[0]);
      }
    });

    // Calculate folder sizes
    for (const folder of folders) {
      const folderPrefix = prefix + folder + '/';
      const [folderFiles] = await bucket.getFiles({ prefix: folderPrefix });
      const folderSize = folderFiles.reduce((sum, file) => {
        const fileSize = parseInt(file.metadata.size || 0);
        console.log(`File in folder ${folder}: ${file.name} - size: ${fileSize}`);
        return sum + fileSize;
      }, 0);
      folderSizes[folder] = folderSize;
      console.log(`Folder ${folder} total size: ${folderSize}`);
    }

    // Add folders to items with sizes
    folders.forEach(folder => {
      items.push({
        name: folder,
        type: 'folder',
        path: prefix + folder + '/',
        size: folderSizes[folder] || 0
      });
    });

    // Add files to items (only direct children, not nested)
    files.forEach(file => {
      const relativePath = file.name.substring(prefix.length);
      // Only include files that are direct children (no slash in relative path)
      if (!relativePath.includes('/') && relativePath && !relativePath.endsWith('.placeholder')) {
        items.push({
          name: file.name.split('/').pop(),
          type: 'file',
          size: file.metadata.size,
          contentType: file.metadata.contentType,
          updated: file.metadata.updated,
          path: file.name
        });
      }
    });

    console.log(`Listed ${folders.size} folders and ${items.filter(i => i.type === 'file').length} files in prefix: ${prefix}`);
    res.json({ items, currentPath: prefix });
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ error: error.message });
  }
});

// Upload file
app.post('/api/upload', requireAuth, async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }

    const file = req.files.file;
    // Use filePath if provided (for folder uploads with structure), otherwise use prefix + filename
    const destination = req.body.filePath || ((req.body.prefix || '') + file.name);

    const blob = bucket.file(destination);
    const blobStream = blob.createWriteStream({
      metadata: {
        contentType: file.mimetype
      }
    });

    blobStream.on('error', (err) => {
      console.error('Upload error:', err);
      res.status(500).json({ error: err.message });
    });

    blobStream.on('finish', async () => {
      res.json({
        success: true,
        message: 'Fichier uploadé avec succès',
        path: destination
      });
    });

    blobStream.end(require('fs').readFileSync(file.tempFilePath));
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: error.message });
  }
});

// Download file
app.get('/api/download', requireAuth, async (req, res) => {
  try {
    const filePath = req.query.path;
    if (!filePath) {
      return res.status(400).json({ error: 'Chemin du fichier manquant' });
    }

    const file = bucket.file(filePath);
    const [exists] = await file.exists();

    if (!exists) {
      return res.status(404).json({ error: 'Fichier non trouvé' });
    }

    const [metadata] = await file.getMetadata();
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
    res.setHeader('Content-Type', metadata.contentType || 'application/octet-stream');

    file.createReadStream().pipe(res);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete file or folder
app.delete('/api/delete', requireAuth, async (req, res) => {
  try {
    const { path: itemPath, type } = req.body;

    if (!itemPath) {
      return res.status(400).json({ error: 'Chemin manquant' });
    }

    if (type === 'folder') {
      // Delete all files in folder
      const [files] = await bucket.getFiles({ prefix: itemPath });
      await Promise.all(files.map(file => file.delete()));
    } else {
      const file = bucket.file(itemPath);
      await file.delete();
    }

    res.json({ success: true, message: 'Supprimé avec succès' });
  } catch (error) {
    console.error('Error deleting:', error);
    res.status(500).json({ error: error.message });
  }
});

// Rename/move file
app.post('/api/rename', requireAuth, async (req, res) => {
  try {
    const { oldPath, newPath } = req.body;

    if (!oldPath || !newPath) {
      return res.status(400).json({ error: 'Chemins manquants' });
    }

    const file = bucket.file(oldPath);
    await file.move(newPath);

    res.json({ success: true, message: 'Renommé avec succès' });
  } catch (error) {
    console.error('Error renaming:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create folder
app.post('/api/create-folder', requireAuth, async (req, res) => {
  try {
    const { path: folderPath } = req.body;

    if (!folderPath) {
      return res.status(400).json({ error: 'Nom du dossier manquant' });
    }

    // GCS doesn't have folders, but we create a placeholder file
    const placeholder = bucket.file(folderPath + '.placeholder');
    await placeholder.save('', {
      metadata: { contentType: 'text/plain' }
    });

    res.json({ success: true, message: 'Dossier créé avec succès' });
  } catch (error) {
    console.error('Error creating folder:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get bucket stats (total size)
app.get('/api/bucket-stats', requireAuth, async (req, res) => {
  try {
    const [files] = await bucket.getFiles();
    const totalSize = files.reduce((sum, file) => {
      return sum + parseInt(file.metadata.size || 0);
    }, 0);

    const fileCount = files.filter(f => !f.name.endsWith('.placeholder')).length;

    res.json({
      totalSize,
      fileCount,
      bucket: process.env.BUCKET_NAME
    });
  } catch (error) {
    console.error('Error getting bucket stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Server logs storage
const serverLogs = [];
const MAX_LOGS = 500;

function addLog(level, message, details = {}) {
  const log = {
    timestamp: new Date().toISOString(),
    level,
    message,
    details
  };
  serverLogs.unshift(log);
  if (serverLogs.length > MAX_LOGS) {
    serverLogs.pop();
  }

  const prefix = level === 'error' ? '❌' : level === 'warning' ? '⚠️' : '📝';
  originalLog(`${prefix} [${new Date().toISOString()}] ${message}`, details);
}

// Override console.log for logging
const originalLog = console.log;
const originalError = console.error;

// Get logs
app.get('/api/logs', requireAuth, (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  res.json({ logs: serverLogs.slice(0, limit) });
});

console.log = function(...args) {
  originalLog.apply(console, args);
  if (args[0] && typeof args[0] === 'string') {
    const log = {
      timestamp: new Date().toISOString(),
      level: 'info',
      message: args[0],
      details: args.slice(1)
    };
    serverLogs.unshift(log);
    if (serverLogs.length > MAX_LOGS) {
      serverLogs.pop();
    }
  }
};

console.error = function(...args) {
  originalError.apply(console, args);
  if (args[0] && typeof args[0] === 'string') {
    const log = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message: args[0],
      details: args.slice(1)
    };
    serverLogs.unshift(log);
    if (serverLogs.length > MAX_LOGS) {
      serverLogs.pop();
    }
  }
};

addLog('info', 'Serveur Odace initialisé', { bucket: process.env.BUCKET_NAME });

app.listen(PORT, () => {
  addLog('info', `Serveur Odace démarré sur http://localhost:${PORT}`);
});
