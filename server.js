const express = require('express');
const Docker = require('dockerode');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const tar = require('tar-fs'); 
const simpleGit = require('simple-git');

const docker = new Docker({ socketPath: '/var/run/docker.sock' });
const app = express();
const PORT = 3001;
const DB_FILE = path.join(__dirname, 'database.json');

// --- DEBUGGING MIDDLEWARE ---
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] Request: ${req.method} ${req.url}`);
  next();
});

app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-user-id', 'Authorization'],
  credentials: true
}));

app.use(bodyParser.json());

// --- DATABASE SYSTEM ---
const DEFAULT_DB = {
  users: [
    { id: 'u1', username: 'admin', password: '123', role: 'admin', containerLimit: 100, imageLimit: 100, isBlocked: false },
    { id: 'u2', username: 'dev', password: '123', role: 'dev_user', containerLimit: 50, imageLimit: 50, isBlocked: false },
    { id: 'u3', username: 'user', password: '123', role: 'free', containerLimit: 2, imageLimit: 1, isBlocked: false }, 
    { id: 'u4', username: 'vip', password: '123', role: 'vip', containerLimit: 10, imageLimit: 5, isBlocked: false }
  ],
  imageMeta: {}, 
  userConfigs: {}
};

let db = { ...DEFAULT_DB };
if (fs.existsSync(DB_FILE)) {
  try {
    db = { ...DEFAULT_DB, ...JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) };
    db.users = db.users.map(u => ({ ...DEFAULT_DB.users.find(du => du.role === u.role) || {}, ...u }));
  } catch (err) { console.error("Lỗi đọc DB:", err); }
} else {
  saveDB();
}

function saveDB() {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

const isAdminOrDev = (user) => user && (user.role === 'admin' || user.role === 'dev_user');

// --- KHÔNG CÒN SỬ DỤNG FIXED_FILES NỮA ---
// Server sẽ tin tưởng hoàn toàn vào code trong Repo GitHub của bạn.

// --- API IMAGES ---
app.get('/api/images', async (req, res) => {
  const userId = req.headers['x-user-id'];
  const user = db.users.find(u => u.id === userId);

  try {
    const images = await docker.listImages();
    let formatted = images.flatMap(img => {
      if (!img.RepoTags) return [];
      return img.RepoTags.map(t => {
        const lastColonIndex = t.lastIndexOf(':');
        let name = t, tag = 'latest';
        if (lastColonIndex > -1) { name = t.substring(0, lastColonIndex); tag = t.substring(lastColonIndex + 1); }
        
        const key = `${name}:${tag}`;
        const meta = db.imageMeta[key] || {};
        
        return { 
          id: img.Id.substring(7, 19), 
          name, tag, 
          size: (img.Size / 1000000).toFixed(2) + ' MB',
          created: img.Created,
          ownerId: meta.ownerId || 'system',
          visibility: meta.visibility || 'public'
        };
      });
    });

    if (!isAdminOrDev(user)) {
      formatted = formatted.filter(img => {
        if (img.ownerId === 'system') return true;
        if (img.ownerId === user.id) return true;
        if (img.visibility === 'public') return true;
        return false; 
      });
    }

    res.json(formatted);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/meta', (req, res) => {
  const userId = req.headers['x-user-id'];
  const user = db.users.find(u => u.id === userId);
  const { id, meta } = req.body;
  
  const currentMeta = db.imageMeta[id] || {};
  if (!isAdminOrDev(user) && currentMeta.ownerId && currentMeta.ownerId !== userId) {
    return res.status(403).json({ error: "Bạn không có quyền sửa image này" });
  }
  db.imageMeta[id] = { ...currentMeta, ...meta };
  if (currentMeta.ownerId) db.imageMeta[id].ownerId = currentMeta.ownerId; 
  saveDB();
  res.json({ success: true });
});

app.delete('/api/images/:id', async (req, res) => {
  const userId = req.headers['x-user-id'];
  const user = db.users.find(u => u.id === userId);
  const imageIdOrName = decodeURIComponent(req.params.id);
  const meta = db.imageMeta[imageIdOrName] || {};
  const isOwner = meta.ownerId === userId;
  
  if (!isAdminOrDev(user) && !isOwner) return res.status(403).json({ error: 'Permission denied' });

  try {
    const image = docker.getImage(imageIdOrName);
    await image.remove({ force: true });
    if (db.imageMeta[imageIdOrName]) { delete db.imageMeta[imageIdOrName]; saveDB(); }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- API BUILDER ---
app.post('/api/build', async (req, res) => {
  const userId = req.headers['x-user-id'];
  const user = db.users.find(u => u.id === userId);
  
  if (!user) return res.status(401).json({ error: "Auth required" });

  const allMeta = Object.values(db.imageMeta);
  const userImageCount = allMeta.filter(m => m.ownerId === userId).length;

  if (!isAdminOrDev(user) && userImageCount >= (user.imageLimit || 1)) {
      return res.status(403).json({ error: `Bạn đã đạt giới hạn tạo ${user.imageLimit} image.` });
  }

  const { imageName, repoUrl } = req.body;
  const buildId = Date.now().toString();
  const tempDir = path.join(__dirname, 'temp_builds', buildId);
  const git = simpleGit();

  try {
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    
    // 1. Clone Code từ GitHub
    await git.clone(repoUrl, tempDir);
    
    // 2. Kiểm tra Dockerfile
    if (!fs.existsSync(path.join(tempDir, 'Dockerfile'))) throw new Error("Repo thiếu Dockerfile!");

    // --- LOẠI BỎ PHẦN INJECT FILE ---
    // Chúng ta KHÔNG ghi đè mcp_config.json hay mcp_pipe.py nữa.
    // Code sẽ được build nguyên bản như trên GitHub.
    
    const tarStream = tar.pack(tempDir);
    const stream = await docker.buildImage(tarStream, { t: imageName });

    db.imageMeta[imageName] = {
        ownerId: userId,
        visibility: 'private',
        description: `Built from ${repoUrl}`,
        defaultEnvs: [],
        accessLevel: 'free'
    };
    saveDB();

    res.writeHead(200, { 'Content-Type': 'application/json' });
    stream.on('data', (chunk) => res.write(chunk));
    stream.on('end', () => {
      res.end();
      fs.rm(tempDir, { recursive: true, force: true }, () => {});
    });
    stream.on('error', (err) => {
      res.write(JSON.stringify({ error: err.message }));
      res.end();
    });
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: err.message });
    else { res.write(JSON.stringify({ error: err.message })); res.end(); }
    if (fs.existsSync(tempDir)) fs.rm(tempDir, { recursive: true, force: true }, () => {});
  }
});

// --- CONTAINER OPS ---
app.post('/api/containers', async (req, res) => {
    const userId=req.headers['x-user-id']; const u=db.users.find(x=>x.id===userId); if(!u) return res.status(401).json({});
    const { name, image, env } = req.body;

    const meta = db.imageMeta[image] || {};
    if(meta.visibility === 'private' && meta.ownerId !== userId && !isAdminOrDev(u)) return res.status(403).json({error:"Image Private"});
    
    const all=await docker.listContainers({all:true}); if(all.filter(c=>c.Labels&&c.Labels['custom.owner']===userId).length>=u.containerLimit) return res.status(403).json({error:'Quota exceeded'});
    
    const safeEnv = Array.isArray(env) ? env : [];

    try { 
        const container = await docker.createContainer({
            Image: image, 
            name: name, 
            Env: safeEnv.map(e => `${e.key}=${e.value}`), 
            Labels: {'custom.owner': userId}, 
            HostConfig: { AutoRemove: false }
        }); 
        await container.start(); 
        res.json({id:container.id}); 
    } catch(e){
        res.status(500).json({error:e.message});
    }
});

app.post('/api/containers/:id/:action', async (req, res) => {
    const u=db.users.find(x=>x.id===req.headers['x-user-id']); try { const c=docker.getContainer(req.params.id); const i=await c.inspect();
    if(!isAdminOrDev(u) && i.Config.Labels['custom.owner']!==u.id) return res.status(403).json({error:'Denied'});
    if(req.params.action==='start') await c.start(); if(req.params.action==='stop') await c.stop(); if(req.params.action==='delete') await c.remove({force:true}); res.json({success:true}); } catch(e){res.status(500).json({error:e.message});}
});

app.get('/api/containers/:id/logs', async (req, res) => {
  const user = db.users.find(u => u.id === req.headers['x-user-id']);
  if (!user) return res.status(401).json({ error: 'Auth required' });
  
  try {
    const container = docker.getContainer(req.params.id);
    const info = await container.inspect();
    
    if (!isAdminOrDev(user) && info.Config.Labels['custom.owner'] !== user.id) return res.status(403).json({ error: 'Denied' });

    const logsBuffer = await container.logs({
      stdout: true,
      stderr: true,
      tail: 200,
      timestamps: true
    });

    let logs = logsBuffer.toString('utf-8');
    
    if (info.State && !info.State.Running) {
        let debugInfo = `\n[SYSTEM] Container is NOT running.\nStatus: ${info.State.Status}`;
        if (info.State.ExitCode !== 0) debugInfo += `\nExit Code: ${info.State.ExitCode}`;
        if (info.State.Error) debugInfo += `\nError: ${info.State.Error}`;
        if (info.State.OOMKilled) debugInfo += `\nOOM Killed: Yes (Out of Memory)`;
        debugInfo += `\n---------------------------------\n`;
        logs = debugInfo + logs;
    }
    res.send(logs);
  } catch (err) { res.status(500).send(`Error: ${err.message}`); }
});

app.post('/api/admin/users/:id/update', (req, res) => { 
  const requester = db.users.find(u => u.id === req.headers['x-user-id']);
  if (!isAdminOrDev(requester)) return res.status(403).json({ error: 'Denied' });
  const target = db.users.find(u => u.id === req.params.id);
  if (!target) return res.status(404).json({ error: 'Not found' });
  if (req.body.containerLimit !== undefined) target.containerLimit = parseInt(req.body.containerLimit);
  if (req.body.imageLimit !== undefined) target.imageLimit = parseInt(req.body.imageLimit);
  if (req.body.isBlocked !== undefined) target.isBlocked = req.body.isBlocked;
  if (req.body.role !== undefined) target.role = req.body.role;
  saveDB(); res.json(target);
});
app.post('/api/login', (req, res) => { 
    const { username, password } = req.body;
    const user = db.users.find(u => u.username === username && u.password === password);
    if (!user) return res.status(401).json({ error: 'Sai thông tin' });
    if (user.isBlocked) return res.status(403).json({ error: 'Blocked' });
    const { password: _, ...userInfo } = user; res.json(userInfo);
});
app.post('/api/register', (req, res) => { 
    const { username, password } = req.body;
    if (db.users.find(u => u.username === username)) return res.status(400).json({ error: 'Existed' });
    const newUser = { id: `u${Date.now()}`, username, password, role: 'free', containerLimit: 2, imageLimit: 1, isBlocked: false };
    db.users.push(newUser); saveDB();
    const { password: _, ...userInfo } = newUser; res.json(userInfo);
});
app.post('/api/change-password', (req, res) => { 
    const u = db.users.find(u=>u.id===req.headers['x-user-id']); if(!u) return res.status(404).json({}); u.password=req.body.newPassword; saveDB(); res.json({success:true});
});
app.get('/api/system', async (req, res) => {
    const u = db.users.find(u=>u.id===req.headers['x-user-id']); if(!isAdminOrDev(u)) return res.status(403).json({});
    try { const i=await docker.info(); const v=await docker.version(); res.json({containers:i.Containers, running:i.ContainersRunning, paused:i.ContainersPaused, stopped:i.ContainersStopped, images:i.Images, cpus:i.NCPU, memory:(i.MemTotal/1073741824).toFixed(2)+' GB', os:i.OperatingSystem, dockerVersion:v.Version}); } catch(e){res.status(500).json({error:e.message});}
});
app.get('/api/admin/users', (req, res) => { 
    const u = db.users.find(u=>u.id===req.headers['x-user-id']); if(!isAdminOrDev(u)) return res.status(403).json({}); res.json(db.users.map(({password,...r})=>r));
});
app.delete('/api/admin/users/:id', (req, res) => { 
    const u = db.users.find(u=>u.id===req.headers['x-user-id']); if(!isAdminOrDev(u)) return res.status(403).json({});
    if(req.params.id===u.id) return res.status(400).json({}); db.users=db.users.filter(x=>x.id!==req.params.id); delete db.userConfigs[req.params.id]; saveDB(); res.json({success:true});
});
app.get('/api/meta', (req, res) => res.json(db.imageMeta || {}));
app.get('/api/configs', (req, res) => res.json(db.userConfigs[req.headers['x-user-id']] || {savedVars:[]}));
app.post('/api/configs', (req, res) => { db.userConfigs[req.headers['x-user-id']]=req.body; saveDB(); res.json({success:true}); });
app.get('/api/containers', async (req, res) => {
    const u = db.users.find(u=>u.id===req.headers['x-user-id']); if(!u) return res.status(401).json({});
    try { const c=await docker.listContainers({all:true}); const m=c.map(x=>({id:x.Id, name:x.Names[0].replace('/',''), image:x.Image, status:x.State, ownerId:x.Labels['custom.owner']||'unknown'}));
    if(isAdminOrDev(u)) res.json(m); else res.json(m.filter(x=>x.ownerId===u.id)); } catch(e){res.status(500).json({error:e.message});}
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
