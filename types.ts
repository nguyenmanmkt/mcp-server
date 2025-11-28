export interface User {
  id: string;
  username: string;
  role: 'admin' | 'dev_user' | 'vip' | 'free';
  containerLimit: number;
  imageLimit: number;
  isBlocked?: boolean;
}

export interface Container {
  id: string;
  name: string;
  image: string;
  status: 'running' | 'processing' | 'stopped' | 'exited' | string;
  ownerId: string;
  role?: 'child' | string;
}

export interface Image {
  id: string;
  name: string;
  tag: string;
  size: string;
  created: number;
  ownerId: string;
  visibility: 'public' | 'private' | string;
}

export interface ImageMeta {
  description?: string;
  defaultEnvs?: EnvVar[];
  visibility?: 'public' | 'private' | string;
  accessLevel?: 'free' | 'vip' | 'dev' | string;
  category?: string;
  childImage?: string;
}

export interface EnvVar {
  key: string;
  value: string;
  label?: string;
}

export interface SystemStats {
  containers: number;
  running: number;
  images: number;
  cpus: number;
  memory: number;
  dockerVersion: string;
}