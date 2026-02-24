// types/three-extras.d.ts
declare module 'three/examples/jsm/controls/OrbitControls' {
  import * as THREE from 'three';
  export class OrbitControls extends THREE.EventDispatcher {
    constructor(object: THREE.Camera, domElement?: HTMLElement);
    object: THREE.Camera;
    domElement: HTMLElement;
    enabled: boolean;
    target: THREE.Vector3;
    enableDamping: boolean;
    dampingFactor: number;
    enableZoom: boolean;
    zoomSpeed: number;
    enableRotate: boolean;
    rotateSpeed: number;
    enablePan: boolean;
    panSpeed: number;
    update(): void;
    dispose(): void;
  }
}

declare module 'three/examples/jsm/loaders/PLYLoader' {
  import * as THREE from 'three';
  export class PLYLoader {
    constructor();
    load(
      url: string,
      onLoad: (geometry: THREE.BufferGeometry) => void,
      onProgress?: (event: ProgressEvent<EventTarget>) => void,
      onError?: (event?: unknown) => void
    ): void;
    parse(data: ArrayBuffer | string): THREE.BufferGeometry;
  }
}
