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

// --- MIDDLEWARE ---
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
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
    { id: 'u3', username: 'user', password: '123', role: 'free', containerLimit: 5, imageLimit: 1, isBlocked: false }, 
    { id: 'u4', username: 'vip', password: '123', role: 'vip', containerLimit: 10, imageLimit: 5, isBlocked: false }
  ],
  imageMeta: {}, // { "name:tag": { ..., category: "IoT", childImage: "redis:alpine" } }
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

// --- API PRUNE IMAGES (Xóa image rác <none>) ---
app.post('/api/images/prune', async (req, res) => {
  const userId = req.headers['x-user-id'];
  const user = db.users.find(u => u.id === userId);
  
  if (!isAdminOrDev(user)) return res.status(403).json({ error: 'Permission denied' });

  try {
    // Prune images that are dangling (tag is <none>)
    const report = await docker.pruneImages({ filters: { dangling: { 'true': true } } });
    res.json({ success: true, report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- CONTAINER OPS (UPDATED: CHILDREN SUPPORT) ---

app.post('/api/containers', async (req, res) => {
    const userId = req.headers['x-user-id']; 
    const user = db.users.find(x => x.id === userId); 
    if (!user) return res.status(401).json({ error: "Auth required" });

    const { name, image, env } = req.body;
    const meta = db.imageMeta[image] || {};

    // Check quyền access Image
    if (meta.visibility === 'private' && meta.ownerId !== userId && !isAdminOrDev(user)) {
        return res.status(403).json({ error: "Image Private" });
    }
    
    // Check Quota
    const all = await docker.listContainers({ all: true });
    if (all.filter(c => c.Labels && c.Labels['custom.owner'] === userId).length >= user.containerLimit) {
        return res.status(403).json({ error: 'Quota exceeded' });
    }
    
    const safeEnv = Array.isArray(env) ? env : [];

    try { 
        // 1. Tạo Container Chính (Main)
        const mainContainer = await docker.createContainer({
            Image: image, 
            name: name, 
            Env: safeEnv.map(e => `${e.key}=${e.value}`), 
            Labels: {'custom.owner': userId, 'custom.role': 'parent'}, 
            HostConfig: { AutoRemove: false }
        }); 
        await mainContainer.start(); 

        // 2. Tạo Container Con (Children) nếu có cấu hình
        if (meta.childImage) {
            const childName = `${name}-child-${Math.floor(Math.random()*1000)}`;
            const childContainer = await docker.createContainer({
                Image: meta.childImage,
                name: childName,
                Env: safeEnv.map(e => `${e.key}=${e.value}`), // Kế thừa ENV từ cha
                Labels: {
                    'custom.owner': userId, 
                    'custom.role': 'child',
                    'custom.parent': mainContainer.id // Link với cha
                },
                HostConfig: { AutoRemove: false }
            });
            await childContainer.start();
            console.log(`Started child container ${childName} for parent ${name}`);
        }

        res.json({ id: mainContainer.id }); 
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/containers/:id/:action', async (req, res) => {
    const user = db.users.find(x => x.id === req.headers['x-user-id']);
    const { id, action } = req.params;

    try {
        // Helper function để thực hiện action lên 1 container
        const performAction = async (containerId) => {
            const container = docker.getContainer(containerId);
            const info = await container.inspect().catch(() => null);
            if (!info) return; // Container not found/already deleted

            // Check quyền owner
            if (!isAdminOrDev(user) && info.Config.Labels['custom.owner'] !== user.id) {
                throw new Error('Permission denied');
            }

            if (action === 'start') await container.start().catch(() => {});
            if (action === 'stop') await container.stop().catch(() => {});
            if (action === 'delete') await container.remove({ force: true }).catch(() => {});
        };

        // 1. Thực hiện với container chính
        await performAction(id);

        // 2. Tìm và thực hiện với các container con (Children)
        // Logic: Tìm container có label 'custom.parent' == id
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

// ... CÁC API KHÁC GIỮ NGUYÊN (Copy từ version trước) ...
// (Login, Register, Build, Images, Meta, System, Logs...)

// --- COPY LẠI CÁC API CŨ CHO ĐẦY ĐỦ ---
app.post('/api/meta', (req, res) => {
  const { id, meta } = req.body;
  const currentMeta = db.imageMeta[id] || {};
  db.imageMeta[id] = { ...currentMeta, ...meta };
  saveDB(); res.json({ success: true });
});

app.get('/api/images', async (req, res) => {
  const userId = req.headers['x-user-id']; const user = db.users.find(u => u.id === userId);
  try { const images = await docker.listImages();
    let formatted = images.flatMap(img => {
      if (!img.RepoTags) return [];
      return img.RepoTags.map(t => {
        const lastColonIndex = t.lastIndexOf(':'); let name = t, tag = 'latest';
        if (lastColonIndex > -1) { name = t.substring(0, lastColonIndex); tag = t.substring(lastColonIndex + 1); }
        const key = `${name}:${tag}`; const meta = db.imageMeta[key] || {};
        return { id: img.Id.substring(7, 19), name, tag, size: (img.Size / 1000000).toFixed(2) + ' MB', created: img.Created, ownerId: meta.ownerId || 'system', visibility: meta.visibility || 'public', category: meta.category || 'Uncategorized', childImage: meta.childImage };
      });
    });
    if (!isAdminOrDev(user)) { formatted = formatted.filter(img => img.ownerId === 'system' || img.ownerId === user.id || img.visibility === 'public'); }
    res.json(formatted);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/images/:id', async (req, res) => {
  const userId = req.headers['x-user-id']; const user = db.users.find(u => u.id === userId); const imageIdOrName = decodeURIComponent(req.params.id);
  const meta = db.imageMeta[imageIdOrName] || {};
  if (!isAdminOrDev(user) && meta.ownerId !== userId) return res.status(403).json({ error: 'Permission denied' });
  try { const image = docker.getImage(imageIdOrName); await image.remove({ force: true }); if (db.imageMeta[imageIdOrName]) { delete db.imageMeta[imageIdOrName]; saveDB(); } res.json({ success: true }); } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/containers', async (req, res) => {
    const u = db.users.find(u=>u.id===req.headers['x-user-id']); if(!u) return res.status(401).json({});
    try { const c=await docker.listContainers({all:true}); const m=c.map(x=>({id:x.Id, name:x.Names[0].replace('/',''), image:x.Image, status:x.State, ownerId:x.Labels['custom.owner']||'unknown', role: x.Labels['custom.role']||'standalone', parent: x.Labels['custom.parent']}));
    if(isAdminOrDev(u)) res.json(m); else res.json(m.filter(x=>x.ownerId===u.id)); } catch(e){res.status(500).json({error:e.message});}
});

app.get('/api/containers/:id/logs', async (req, res) => {
  const user = db.users.find(u => u.id === req.headers['x-user-id']); if (!user) return res.status(401).json({ error: 'Auth required' });
  try { const container = docker.getContainer(req.params.id); const info = await container.inspect();
    if (!isAdminOrDev(user) && info.Config.Labels['custom.owner'] !== user.id) return res.status(403).json({ error: 'Denied' });
    const logsBuffer = await container.logs({ stdout: true, stderr: true, tail: 200, timestamps: true });
    res.send(logsBuffer.toString('utf-8')); } catch (err) { res.status(500).send(`Error: ${err.message}`); }
});

app.get('/api/system', async (req, res) => {
    const u = db.users.find(u=>u.id===req.headers['x-user-id']); 
    // Allow all users to see basic system stats for dashboard charts, or restrict if needed.
    // Here allowing all logged in users to see basic stats for the new Dashboard request
    if(!u) return res.status(403).json({});
    try { const i=await docker.info(); const v=await docker.version(); res.json({containers:i.Containers, running:i.ContainersRunning, paused:i.ContainersPaused, stopped:i.ContainersStopped, images:i.Images, cpus:i.NCPU, memory: i.MemTotal, os:i.OperatingSystem, dockerVersion:v.Version}); } catch(e){res.status(500).json({error:e.message});}
});

app.get('/api/admin/users', (req, res) => { const u=db.users.find(x=>x.id===req.headers['x-user-id']); if(!isAdminOrDev(u)) return res.status(403).json({}); res.json(db.users.map(({password,...r})=>r)); });
app.post('/api/admin/users/:id/update', (req, res) => { /*...*/ const u=db.users.find(x=>x.id===req.headers['x-user-id']); if(!isAdminOrDev(u)) return res.status(403).json({}); const t=db.users.find(x=>x.id===req.params.id); if(!t) return res.status(404).json({}); Object.assign(t, req.body); saveDB(); res.json(t); });
app.delete('/api/admin/users/:id', (req, res) => { /*...*/ const u=db.users.find(x=>x.id===req.headers['x-user-id']); if(!isAdminOrDev(u)) return res.status(403).json({}); db.users=db.users.filter(x=>x.id!==req.params.id); saveDB(); res.json({success:true}); });
app.post('/api/login', (req, res) => { const {username,password}=req.body; const u=db.users.find(x=>x.username===username&&x.password===password); if(!u)return res.status(401).json({error:'Fail'}); if(u.isBlocked)return res.status(403).json({error:'Blocked'}); const {password:_,...i}=u; res.json(i); });
app.post('/api/register', (req, res) => { const {username,password}=req.body; if(db.users.find(x=>x.username===username))return res.status(400).json({error:'Exist'}); const n={id:`u${Date.now()}`,username,password,role:'free',containerLimit:5,imageLimit:1,isBlocked:false}; db.users.push(n); saveDB(); const {password:_,...i}=n; res.json(i); });
app.post('/api/change-password', (req, res) => { const u=db.users.find(x=>x.id===req.headers['x-user-id']); if(!u)return res.status(404).json({}); u.password=req.body.newPassword; saveDB(); res.json({success:true}); });
app.get('/api/meta', (req, res) => res.json(db.imageMeta || {}));
app.get('/api/configs', (req, res) => res.json(db.userConfigs[req.headers['x-user-id']] || {savedVars:[]}));
app.post('/api/configs', (req, res) => { db.userConfigs[req.headers['x-user-id']]=req.body; saveDB(); res.json({success:true}); });
app.post('/api/build', async (req, res) => { /* ... (Reuse previous build logic) ... */ 
    const userId=req.headers['x-user-id']; const user=db.users.find(u=>u.id===userId); if(!user) return res.status(401).json({error:"Auth"});
    const allMeta=Object.values(db.imageMeta); const cnt=allMeta.filter(m=>m.ownerId===userId).length;
    if(!isAdminOrDev(user) && cnt>=(user.imageLimit||1)) return res.status(403).json({error:`Limit ${user.imageLimit}`});
    const {imageName, repoUrl}=req.body; const buildId=Date.now().toString(); const tempDir=path.join(__dirname,'temp_builds',buildId); const git=simpleGit();
    try { if(!fs.existsSync(tempDir)) fs.mkdirSync(tempDir,{recursive:true}); await git.clone(repoUrl, tempDir);
    if(!fs.existsSync(path.join(tempDir,'Dockerfile'))) throw new Error("No Dockerfile");
    const tarStream=tar.pack(tempDir); const stream=await docker.buildImage(tarStream,{t:imageName});
    db.imageMeta[imageName]={ownerId:userId, visibility:'private', description:`Built from ${repoUrl}`, defaultEnvs:[], accessLevel:'free', category: 'Personal'}; saveDB();
    res.writeHead(200,{'Content-Type':'application/json'}); stream.on('data',c=>res.write(c)); stream.on('end',()=>{res.end();fs.rm(tempDir,{recursive:true,force:true},()=>{})}); stream.on('error',e=>{res.write(JSON.stringify({error:e.message}));res.end()});
    } catch(e){ if(!res.headersSent)res.status(500).json({error:e.message}); else{res.write(JSON.stringify({error:e.message}));res.end();} if(fs.existsSync(tempDir))fs.rm(tempDir,{recursive:true,force:true},()=>{}); }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
