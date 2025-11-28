const express = require('express');
const Docker = require('dockerode');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs').promises; // Use Async FS
const fsSync = require('fs');
const path = require('path');
const tar = require('tar-fs'); 
const simpleGit = require('simple-git');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// Docker socket setup (Windows named pipe or Unix socket)
const socketPath = process.platform === 'win32' ? '//./pipe/docker_engine' : '/var/run/docker.sock';
const docker = new Docker({ socketPath });

const app = express();
const PORT = 3001;
const DB_FILE = path.join(__dirname, 'database.json');
const JWT_SECRET = 'YOUR_SUPER_SECRET_KEY_CHANGE_THIS_TO_SOMETHING_RANDOM'; 

// --- SECURITY MIDDLEWARE ---
app.use(helmet()); 
app.use(cors({
  origin: true, 
  methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id'], 
  credentials: true
}));
app.use(bodyParser.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 300 
});
app.use('/api/', limiter);

// --- DATABASE SYSTEM (ASYNC) ---
const DEFAULT_DB = {
  users: [
    { id: 'u1', username: 'admin', passwordHash: '$2a$10$w.2Z0pQLu9.i/i.U/../..', role: 'admin', containerLimit: 100, imageLimit: 100, isBlocked: false },
  ],
  imageMeta: {},
  userConfigs: {}
};

let db = { ...DEFAULT_DB };

// Load DB Synchronously at startup
if (fsSync.existsSync(DB_FILE)) {
  try {
    const data = fsSync.readFileSync(DB_FILE, 'utf8');
    const loadedDb = JSON.parse(data);
    // Merge loaded DB with structure to ensure fields exist
    db = { 
        users: loadedDb.users || DEFAULT_DB.users,
        imageMeta: loadedDb.imageMeta || DEFAULT_DB.imageMeta,
        userConfigs: loadedDb.userConfigs || DEFAULT_DB.userConfigs
    };
  } catch (err) { console.error("Lỗi đọc DB:", err); }
} else {
  fsSync.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

async function saveDB() {
  try {
    await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2));
  } catch (e) {
    console.error("Lỗi ghi DB:", e);
  }
}

// --- AUTH MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; 

  if (!token) return res.status(401).json({ error: "Unauthorized" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Token invalid" });
    req.user = user; 
    next();
  });
};

const isAdminOrDev = (user) => user && (user.role === 'admin' || user.role === 'dev_user');

// --- AUTH ENDPOINTS ---

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = db.users.find(x => x.username === username);
  
  if (!user) return res.status(401).json({ error: 'User not found' });
  if (user.isBlocked) return res.status(403).json({ error: 'Account blocked' });

  let isMatch = false;
  let migrated = false;

  // 1. Ưu tiên kiểm tra Hash (User mới hoặc đã migrate)
  if (user.passwordHash) {
      isMatch = await bcrypt.compare(password, user.passwordHash);
  } 
  // 2. Fallback: Kiểm tra Plain text (User cũ từ database.json cũ)
  else if (user.password) {
      isMatch = (user.password === password);
      if (isMatch) {
          // --- AUTO MIGRATION LOGIC ---
          // Nếu khớp password thường, thực hiện mã hóa và lưu lại ngay
          console.log(`Migrating password for user: ${username}`);
          const salt = await bcrypt.genSalt(10);
          user.passwordHash = await bcrypt.hash(password, salt);
          delete user.password; // Xóa password trần
          await saveDB(); // Lưu DB mới
          migrated = true;
      }
  }

  if (!isMatch) return res.status(401).json({ error: 'Wrong password' });

  // Tạo Token
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
  
  const { password: _, passwordHash: __, ...userInfo } = user;
  res.json({ ...userInfo, token, migrated });
});

app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (db.users.find(x => x.username === username)) return res.status(400).json({ error: 'Username exists' });
  if (!password || password.length < 3) return res.status(400).json({ error: 'Weak password' });

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const newUser = { 
    id: `u${Date.now()}`, 
    username, 
    passwordHash, 
    role: 'free', 
    containerLimit: 5, 
    imageLimit: 1, 
    isBlocked: false 
  };
  
  db.users.push(newUser);
  await saveDB();
  
  const token = jwt.sign({ id: newUser.id, username: newUser.username, role: newUser.role }, JWT_SECRET, { expiresIn: '24h' });
  const { passwordHash: _, ...userInfo } = newUser;
  res.json({ ...userInfo, token });
});

app.post('/api/change-password', authenticateToken, async (req, res) => {
  const user = db.users.find(x => x.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  const salt = await bcrypt.genSalt(10);
  user.passwordHash = await bcrypt.hash(req.body.newPassword, salt);
  if(user.password) delete user.password; 
  
  await saveDB();
  res.json({ success: true });
});

// --- API ENDPOINTS (Protected) ---

app.get('/api/containers', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    try { 
        const c = await docker.listContainers({all:true}); 
        const m = c.map(x => ({
            id: x.Id, 
            name: x.Names[0].replace('/',''), 
            image: x.Image, 
            status: x.State, 
            ownerId: x.Labels['custom.owner'] || 'unknown', 
            role: x.Labels['custom.role'] || 'standalone'
        }));
        
        const currentUser = db.users.find(u => u.id === userId);
        if(isAdminOrDev(currentUser)) res.json(m); 
        else res.json(m.filter(x => x.ownerId === userId)); 
    } catch(e) { res.status(500).json({error:e.message}); }
});

app.post('/api/containers', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const user = db.users.find(u => u.id === userId);
    if (!user) return res.status(401).json({ error: "Auth required" });

    const { name, image, env } = req.body;
    const meta = db.imageMeta[image] || {};

    if (meta.visibility === 'private' && meta.ownerId !== userId && !isAdminOrDev(user)) {
        return res.status(403).json({ error: "Image Private" });
    }
    
    // Check Quota
    const all = await docker.listContainers({ all: true });
    // Filter by label is safer than DB lookup for containers since DB doesn't store containers permanently
    if (all.filter(c => c.Labels && c.Labels['custom.owner'] === userId).length >= user.containerLimit) {
        return res.status(403).json({ error: 'Quota exceeded' });
    }
    
    const safeEnv = Array.isArray(env) ? env : [];

    try { 
        const mainContainer = await docker.createContainer({
            Image: image, 
            name: name, 
            Env: safeEnv.map(e => `${e.key}=${e.value}`), 
            Labels: {'custom.owner': userId, 'custom.role': 'parent'}, 
            HostConfig: { AutoRemove: false }
        }); 
        await mainContainer.start(); 

        if (meta.childImage) {
            const childName = `${name}-child-${Math.floor(Math.random()*1000)}`;
            const childContainer = await docker.createContainer({
                Image: meta.childImage,
                name: childName,
                Env: safeEnv.map(e => `${e.key}=${e.value}`),
                Labels: {
                    'custom.owner': userId, 
                    'custom.role': 'child',
                    'custom.parent': mainContainer.id
                },
                HostConfig: { AutoRemove: false }
            });
            await childContainer.start();
        }

        res.json({ id: mainContainer.id }); 
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/containers/:id/:action', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const user = db.users.find(u => u.id === userId);
    const { id, action } = req.params;

    try {
        const performAction = async (containerId) => {
            const container = docker.getContainer(containerId);
            const info = await container.inspect().catch(() => null);
            if (!info) return;

            if (!isAdminOrDev(user) && info.Config.Labels['custom.owner'] !== userId) {
                throw new Error('Permission denied');
            }

            if (action === 'start') await container.start().catch(() => {});
            if (action === 'stop') await container.stop().catch(() => {});
            if (action === 'delete') await container.remove({ force: true }).catch(() => {});
        };

        await performAction(id);

        const allContainers = await docker.listContainers({ all: true });
        const children = allContainers.filter(c => c.Labels && c.Labels['custom.parent'] === id);
        
        for (const child of children) {
            await performAction(child.Id);
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/containers/:id/logs', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const user = db.users.find(u => u.id === userId);
  
  try { 
    const container = docker.getContainer(req.params.id); 
    const info = await container.inspect();
    
    if (!isAdminOrDev(user) && info.Config.Labels['custom.owner'] !== userId) 
        return res.status(403).json({ error: 'Denied' });
    
    const logsBuffer = await container.logs({ stdout: true, stderr: true, tail: 200, timestamps: true });
    res.send(logsBuffer.toString('utf-8')); 
  } catch (err) { res.status(500).send(`Error: ${err.message}`); }
});

app.get('/api/images', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const user = db.users.find(u => u.id === userId);
    
    try {
        const images = await docker.listImages();
        let formatted = images.flatMap(img => {
             if (!img.RepoTags) return [];
             return img.RepoTags.map(t => {
                const lastColonIndex = t.lastIndexOf(':'); 
                let name = t, tag = 'latest';
                if (lastColonIndex > -1) { 
                    name = t.substring(0, lastColonIndex); 
                    tag = t.substring(lastColonIndex + 1); 
                }
                const key = `${name}:${tag}`; 
                const meta = db.imageMeta[key] || {};
                return { 
                    id: img.Id.substring(7,19), 
                    name, 
                    tag, 
                    size: (img.Size/1e6).toFixed(2)+' MB', 
                    created: img.Created, 
                    ownerId: meta.ownerId||'system', 
                    visibility: meta.visibility||'public' 
                };
             });
        });
        
        if (!isAdminOrDev(user)) { 
            formatted = formatted.filter(img => img.ownerId === 'system' || img.ownerId === userId || img.visibility === 'public'); 
        }
        res.json(formatted);
    } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/build', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const user = db.users.find(u => u.id === userId);
    
    const allMeta = Object.values(db.imageMeta); 
    const cnt = allMeta.filter(m => m.ownerId === userId).length;
    
    if(!isAdminOrDev(user) && cnt >= (user.imageLimit || 1)) 
        return res.status(403).json({error: `Limit ${user.imageLimit}`});

    const { imageName, repoUrl } = req.body;
    
    // Simple Validation
    if (!/^[a-zA-Z0-9_\-.:/]+$/.test(imageName)) return res.status(400).json({error: "Invalid image name"});
    
    const buildId = Date.now().toString(); 
    const tempDir = path.join(__dirname, 'temp_builds', buildId); 
    const git = simpleGit();

    try { 
        if(!fsSync.existsSync(tempDir)) await fs.mkdir(tempDir, {recursive:true}); 
        await git.clone(repoUrl, tempDir);
        
        if(!fsSync.existsSync(path.join(tempDir, 'Dockerfile'))) throw new Error("No Dockerfile found in root");

        const tarStream = tar.pack(tempDir); 
        const stream = await docker.buildImage(tarStream, {t: imageName});
        
        db.imageMeta[imageName] = {
            ownerId: userId, 
            visibility: 'private', 
            description: `Built from ${repoUrl}`, 
            defaultEnvs: [], 
            accessLevel: 'free', 
            category: 'Personal'
        }; 
        await saveDB();

        res.writeHead(200, {'Content-Type': 'application/json'}); 
        
        stream.on('data', c => res.write(c)); 
        stream.on('end', () => {
            res.end(); 
            fs.rm(tempDir, {recursive: true, force: true}).catch(()=>{});
        }); 
        stream.on('error', e => {
            res.write(JSON.stringify({error: e.message})); 
            res.end();
        });
        
    } catch(e) { 
        if(!res.headersSent) res.status(500).json({error: e.message}); 
        else { res.write(JSON.stringify({error: e.message})); res.end(); }
        fs.rm(tempDir, {recursive: true, force: true}).catch(()=>{});
    }
});

// Admin User Management
app.get('/api/admin/users', authenticateToken, (req, res) => { 
    const u = db.users.find(x => x.id === req.user.id); 
    if(!isAdminOrDev(u)) return res.status(403).json({}); 
    // Exclude password hash from response
    res.json(db.users.map(({password, passwordHash, ...r}) => r)); 
});

app.post('/api/admin/users/:id/update', authenticateToken, async (req, res) => { 
    const u = db.users.find(x => x.id === req.user.id); 
    if(!isAdminOrDev(u)) return res.status(403).json({}); 
    
    const t = db.users.find(x => x.id === req.params.id); 
    if(!t) return res.status(404).json({}); 
    
    Object.assign(t, req.body); 
    await saveDB(); 
    res.json({success: true}); 
});

app.delete('/api/admin/users/:id', authenticateToken, async (req, res) => { 
    const u = db.users.find(x => x.id === req.user.id); 
    if(!isAdminOrDev(u)) return res.status(403).json({}); 
    
    db.users = db.users.filter(x => x.id !== req.params.id); 
    await saveDB(); 
    res.json({success: true}); 
});

// Meta & Configs
app.get('/api/meta', authenticateToken, (req, res) => res.json(db.imageMeta || {}));
app.post('/api/meta', authenticateToken, async (req, res) => {
  const { id, meta } = req.body;
  const currentMeta = db.imageMeta[id] || {};
  db.imageMeta[id] = { ...currentMeta, ...meta };
  await saveDB(); res.json({ success: true });
});

app.get('/api/configs', authenticateToken, (req, res) => res.json(db.userConfigs[req.user.id] || {savedVars:[]}));
app.post('/api/configs', authenticateToken, async (req, res) => { 
    db.userConfigs[req.user.id] = req.body; 
    await saveDB(); 
    res.json({success:true}); 
});

// Prune
app.post('/api/images/prune', authenticateToken, async (req, res) => {
  const user = db.users.find(u => u.id === req.user.id);
  if (!isAdminOrDev(user)) return res.status(403).json({ error: 'Permission denied' });
  try {
    const report = await docker.pruneImages({ filters: { dangling: { 'true': true } } });
    res.json({ success: true, report });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/images/:id', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const user = db.users.find(u => u.id === userId);
  const imageIdOrName = decodeURIComponent(req.params.id);
  const meta = db.imageMeta[imageIdOrName] || {};
  
  if (!isAdminOrDev(user) && meta.ownerId !== userId) return res.status(403).json({ error: 'Permission denied' });
  
  try { 
      const image = docker.getImage(imageIdOrName); 
      await image.remove({ force: true }); 
      if (db.imageMeta[imageIdOrName]) { 
          delete db.imageMeta[imageIdOrName]; 
          await saveDB(); 
      } 
      res.json({ success: true }); 
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/system', authenticateToken, async (req, res) => {
    const u = db.users.find(x => x.id === req.user.id);
    if(!u) return res.status(403).json({});
    try { 
        const i = await docker.info(); 
        const v = await docker.version(); 
        res.json({
            containers: i.Containers, 
            running: i.ContainersRunning, 
            paused: i.ContainersPaused, 
            stopped: i.ContainersStopped, 
            images: i.Images, 
            cpus: i.NCPU, 
            memory: i.MemTotal, 
            os: i.OperatingSystem, 
            dockerVersion: v.Version
        }); 
    } catch(e){ res.status(500).json({error:e.message}); }
});

app.listen(PORT, () => console.log(`Secure Server running on port ${PORT}`));