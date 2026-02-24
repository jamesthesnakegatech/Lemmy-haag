// app/api/_mock/db.ts
// Dev-only in-memory DB used by route handlers — now with STABLE IDs to survive HMR.

export type Id = string;

// ---- API-facing shapes ----
export type FolderRef = {
  id: Id;
  type: 'folder';
  name: string;
  path: string[]; // ancestry names e.g., ["Gallery","Trips","Paris 2025"]
  createdAt: string;
  updatedAt: string;
  counts?: { images: number; folders: number; total: number };
  previewImageUrl?: string;
};

export type ImageRef = {
  id: Id;
  type: 'image';
  name: string;
  path: string[];
  createdAt: string;
  sizeBytes: number;
  mime: string;
  width: number;
  height: number;
  thumbnailUrl: string;
  originalUrl: string;
};

export type GalleryItem = FolderRef | ImageRef;

export type SplatRef = {
  id: Id;
  name: string;
  createdAt: string;
  updatedAt: string;
  status: 'ready' | 'processing' | 'failed';
  previewImageUrl?: string;
  assetUrl?: string;
};

export type JobRef = {
  id: Id;
  createdAt: string;
  status: 'queued' | 'running' | 'failed' | 'completed';
  progress?: { pct: number; detail?: string };
  selectionSnapshot?: { imageIds: Id[]; folderIds: Id[] };
  resultSplatId?: Id;
  error?: string;
};

// ---- internal nodes ----
type FolderNode = {
  id: Id;
  name: string;
  parentId?: Id;
  children: Id[]; // mix of folder & image ids
  createdAt: string;
  updatedAt: string;
};

type ImageNode = {
  id: Id;
  name: string;
  parentId: Id;
  createdAt: string;
  sizeBytes: number;
  mime: string;
  width: number;
  height: number;
};

// ---------- utils ----------
const now = () => new Date().toISOString();
const slug = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

function folderIdForPath(names: string[]): Id {
  // e.g. ["Gallery","Trips","Paris 2025","Day 1"] -> "f:gallery/trips/paris-2025/day-1"
  return 'f:' + names.map(slug).join('/');
}

function imageId(parentFolderId: Id, fileName: string): Id {
  // e.g. parent "f:.../day-1" + "Eiffel_1.jpg" -> "i:.../day-1/eiffel-1-jpg"
  return 'i:' + parentFolderId.slice(2) + '/' + slug(fileName);
}

export class MockDB {
  folders = new Map<Id, FolderNode>();
  images = new Map<Id, ImageNode>();
  splats = new Map<Id, SplatRef>();
  jobs = new Map<Id, JobRef>();

  rootId: Id = folderIdForPath(['Gallery']);

  constructor() {
    if (!this.folders.size) this.seed();
  }

  private ensureFolder(pathNames: string[]) {
    const id = folderIdForPath(pathNames);
    if (this.folders.has(id)) return id;

    const parentNames = pathNames.slice(0, -1);
    const parentId = parentNames.length ? folderIdForPath(parentNames) : undefined;
    if (parentId && !this.folders.has(parentId)) {
      this.ensureFolder(parentNames);
    }

    const node: FolderNode = {
      id,
      name: pathNames[pathNames.length - 1],
      parentId,
      children: [],
      createdAt: now(),
      updatedAt: now(),
    };
    this.folders.set(id, node);
    if (parentId) this.folders.get(parentId)!.children.push(id);
    return id;
  }

  private pushImage(pathNames: string[], fileName: string) {
    // pathNames are folder names from Gallery down to containing folder
    const folderId = this.ensureFolder(pathNames);
    const id = imageId(folderId, fileName);
    if (this.images.has(id)) return id;

    const node: ImageNode = {
      id,
      name: fileName,
      parentId: folderId,
      createdAt: now(),
      sizeBytes: 800_000,
      mime: 'image/jpeg',
      width: 1600,
      height: 900,
    };
    this.images.set(id, node);
    this.folders.get(folderId)!.children.push(id);
    return id;
  }

  seed() {
    // Root
    this.ensureFolder(['Gallery']);

    // Folders
    const trips = this.ensureFolder(['Gallery', 'Trips']);
    const paris = this.ensureFolder(['Gallery', 'Trips', 'Paris 2025']);
    const day1 = this.ensureFolder(['Gallery', 'Trips', 'Paris 2025', 'Day 1']);
    const day2 = this.ensureFolder(['Gallery', 'Trips', 'Paris 2025', 'Day 2']);

    const rome = this.ensureFolder(['Gallery', 'Trips', 'Rome 2024']);
    const colosseum = this.ensureFolder(['Gallery', 'Trips', 'Rome 2024', 'Colosseum']);

    const lab = this.ensureFolder(['Gallery', 'Lab']);
    const devices = this.ensureFolder(['Gallery', 'Lab', 'Devices']);
    const samples = this.ensureFolder(['Gallery', 'Lab', 'Samples']);
    const batchA = this.ensureFolder(['Gallery', 'Lab', 'Samples', 'Batch A']);

    // Images
    for (let i = 1; i <= 8; i++) this.pushImage(['Gallery', 'Trips', 'Paris 2025', 'Day 1'], `Eiffel_${i}.jpg`);
    for (let i = 1; i <= 6; i++) this.pushImage(['Gallery', 'Trips', 'Paris 2025', 'Day 2'], `Louvre_${i}.jpg`);
    for (let i = 1; i <= 4; i++) this.pushImage(['Gallery', 'Trips', 'Rome 2024', 'Colosseum'], `Forum_${i}.jpg`);
    for (let i = 1; i <= 5; i++) this.pushImage(['Gallery', 'Lab'], `Bench_${i}.jpg`);
    for (let i = 1; i <= 4; i++) this.pushImage(['Gallery', 'Lab', 'Devices'], `Microscope_${i}.jpg`);
    for (let i = 1; i <= 3; i++) this.pushImage(['Gallery', 'Lab', 'Samples', 'Batch A'], `Wafer_${i}.jpg`);

    // Splats
    this.splats.set('splat-1', {
      id: 'splat-1',
      name: 'Paris Courtyard',
      createdAt: now(),
      updatedAt: now(),
      status: 'ready',
      previewImageUrl: '/globe.svg',
      assetUrl: 'https://example.com/assets/splat1.splat',
    });
    this.splats.set('splat-2', {
      id: 'splat-2',
      name: 'Lab Bench',
      createdAt: new Date(Date.now() - 86_400_000).toISOString(),
      updatedAt: now(),
      status: 'processing',
      previewImageUrl: '/globe.svg',
    });
  }

  // ---------- helpers ----------
  getPathNames(folderId?: Id): string[] {
    if (!folderId || folderId === this.rootId) return ['Gallery'];
    const names: string[] = [];
    let cur: Id | undefined = folderId;
    while (cur) {
      const f = this.folders.get(cur);
      if (!f) break;
      names.push(f.name);
      cur = f.parentId;
    }
    names.push('Gallery');
    return names.reverse();
  }

  countDescendants(folderId: Id) {
    let images = 0,
      folders = 0;
    const stack: Id[] = [folderId];
    while (stack.length) {
      const id = stack.pop()!;
      const f = this.folders.get(id)!;
      for (const cid of f.children) {
        if (this.folders.has(cid)) {
          folders++;
          stack.push(cid);
        } else if (this.images.has(cid)) {
          images++;
        }
      }
    }
    return { images, folders };
  }

  private firstImageThumbUnder(folderId: Id): string | undefined {
    const stack: Id[] = [folderId];
    while (stack.length) {
      const id = stack.pop()!;
      const f = this.folders.get(id);
      if (!f) continue;
      for (const cid of f.children) {
        if (this.images.has(cid)) {
          return '/globe.svg'; // in real backend, use that image's thumbnail
        } else if (this.folders.has(cid)) {
          stack.push(cid);
        }
      }
    }
    return undefined;
  }

  // ---------- API projections ----------
  listFolder(parentId?: Id): GalleryItem[] {
    const pid = parentId ?? this.rootId;
    const node = this.folders.get(pid);
    if (!node) throw new Error('Folder not found');

    return node.children.map((cid) => {
      const f = this.folders.get(cid);
      if (f) {
        const counts = this.countDescendants(cid);
        const folder: FolderRef = {
          id: f.id,
          type: 'folder',
          name: f.name,
          path: this.getPathNames(f.id),
          createdAt: f.createdAt,
          updatedAt: f.updatedAt,
          counts: {
            images: counts.images,
            folders: counts.folders,
            total: counts.images + counts.folders,
          },
          previewImageUrl: this.firstImageThumbUnder(f.id),
        };
        return folder;
      }
      const im = this.images.get(cid)!;
      const image: ImageRef = {
        id: im.id,
        type: 'image',
        name: im.name,
        path: this.getPathNames(im.parentId),
        createdAt: im.createdAt,
        sizeBytes: im.sizeBytes,
        mime: im.mime,
        width: im.width,
        height: im.height,
        thumbnailUrl: '/globe.svg',
        originalUrl: 'https://example.com/original.jpg',
      };
      return image;
    });
  }

  resolveSelection(imageIds: Id[], folderIds: Id[]) {
    const resolved = new Set<Id>(imageIds);
    for (const fid of folderIds) {
      const stack = [fid];
      while (stack.length) {
        const id = stack.pop()!;
        const f = this.folders.get(id);
        if (!f) continue;
        for (const cid of f.children) {
          if (this.folders.has(cid)) stack.push(cid);
          else if (this.images.has(cid)) resolved.add(cid);
        }
      }
    }
    return Array.from(resolved);
  }

  createJob(imageIds: Id[], folderIds: Id[], name?: string): JobRef {
    const id = 'job:' + Date.now();
    const job: JobRef = {
      id,
      createdAt: now(),
      status: 'queued',
      progress: { pct: 0, detail: 'Queued' },
      selectionSnapshot: { imageIds, folderIds },
    };
    this.jobs.set(id, job);
    return job;
  }

  getJob(jobId: Id): JobRef | undefined {
    const j = this.jobs.get(jobId);
    if (!j) return undefined;
    const age = Date.now() - new Date(j.createdAt).getTime();
    const pct = Math.min(100, Math.floor(age / 300)); // ~30s to complete
    if (pct < 5) j.status = 'queued';
    else if (pct < 99) j.status = 'running';
    else j.status = 'completed';
    j.progress = {
      pct: j.status === 'completed' ? 100 : pct,
      detail: j.status === 'running' ? 'Processing images' : j.status === 'queued' ? 'Queued' : 'Done',
    };
    if (j.status === 'completed' && !j.resultSplatId) {
      const sid = 'splat:' + Date.now();
      this.splats.set(sid, {
        id: sid,
        name: `Scene ${sid}`,
        createdAt: now(),
        updatedAt: now(),
        status: 'ready',
        previewImageUrl: '/globe.svg',
        assetUrl: `https://example.com/assets/${sid}.splat`,
      });
      j.resultSplatId = sid;
    }
    return j;
  }

  listSplats(limit = 60) {
    const arr = Array.from(this.splats.values())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
    const groups = new Map<string, SplatRef[]>();
    for (const s of arr) {
      const key = s.createdAt.slice(0, 10);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(s);
    }
    return Array.from(groups.entries()).map(([date, items]) => ({ date, items }));
  }
}

export const db = new MockDB();
