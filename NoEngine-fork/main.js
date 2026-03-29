const cvs = document.querySelector('#c');
const ctx = cvs.getContext('2d');

cvs.width = 1080;
cvs.height = 620;

const CW = cvs.width;
const CH = cvs.height;
const CW2 = CW / 2;
const CH2 = CH / 2;

const texture = new Image();
texture.src = 'wall4.jpg';

let angle = 0;
let cameraZ = 1000;
const fov = 500;

function insertionSort(arr) {
    for (let i = 1; i < arr.length; i++) {
        const key = arr[i];
        let j = i - 1;
        while (j >= 0 && arr[j].z < key.z) {
            arr[j + 1] = arr[j];
            j--;
        }
        arr[j + 1] = key;
    }
}

function fillQuad(tl, tr, br, bl, color, alpha = 0.5, isL = false) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;

    if (isL) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 10; // adjust for strength of glow
    }

    ctx.beginPath();
    ctx.moveTo(tl.x, tl.y);
    ctx.lineTo(tr.x, tr.y);
    ctx.lineTo(br.x, br.y);
    ctx.lineTo(bl.x, bl.y);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
}

const drawLine = (x1, y1, x2, y2, color, alpha = 0.5) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.restore();
}

// Helper to blend color with white
function blendWithWhite(hex, alpha) {
    const rgb = hexToRgb(hex);
    const r = Math.round(255 + (rgb.r - 255) * alpha);
    const g = Math.round(255 + (rgb.g - 255) * alpha);
    const b = Math.round(255 + (rgb.b - 255) * alpha);
    return `rgb(${r}, ${g}, ${b})`;
}

// Convert hex color to RGB object
function hexToRgb(hex) {
    hex = hex.replace(/^#/, '');
    if (hex.length === 3) {
       hex = hex.split('').map(c => c + c).join('');
    }
     const num = parseInt(hex, 16);
    return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255
    };
}

function drawTriangle(p1, p2, p3, color, alpha = 1) {
    const blendedColor = blendWithWhite(color, alpha);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.closePath();
    ctx.fillStyle = blendedColor;
    ctx.fill();
    ctx.restore();
}

function drawTxOnFace(tl, bl, tr, br) {
    const tw = texture.width, th = texture.height;

    ctx.save();

    // Triangle 1: tl, tr, bl
    ctx.beginPath();
    ctx.moveTo(tl.x, tl.y);
    ctx.lineTo(tr.x, tr.y);
    ctx.lineTo(bl.x, bl.y);
    ctx.closePath();
    ctx.save();
    ctx.clip();
    const {a:a1,b:b1,c:c1,d:d1,e:e1,f:f1} = calcTransform(tl,tr,bl,{u:0,v:0},{u:1,v:0},{u:0,v:1},tw,th);
    ctx.setTransform(a1,b1,c1,d1,e1,f1);
    ctx.drawImage(texture, 0, 0);
    ctx.restore();

    // Triangle 2: tr, br, bl
    ctx.beginPath();
    ctx.moveTo(tr.x, tr.y);
    ctx.lineTo(br.x, br.y);
    ctx.lineTo(bl.x, bl.y);
    ctx.closePath();
    ctx.save();
    ctx.clip();
    const {a:a2,b:b2,c:c2,d:d2,e:e2,f:f2} = calcTransform(tr,br,bl,{u:1,v:0},{u:1,v:1},{u:0,v:1},tw,th);
    ctx.setTransform(a2,b2,c2,d2,e2,f2);
    ctx.drawImage(texture, 0, 0);
    ctx.restore();

    ctx.restore();
}

function calcTransform(p0, p1, p2, uv0, uv1, uv2, tw, th) {
    const sx0=uv0.u*tw, sy0=uv0.v*th;
    const sx1=uv1.u*tw, sy1=uv1.v*th;
    const sx2=uv2.u*tw, sy2=uv2.v*th;
    const denom = (sx1-sx0)*(sy2-sy0) - (sx2-sx0)*(sy1-sy0);
    if (Math.abs(denom) < 0.0001) return {a:1,b:0,c:0,d:1,e:0,f:0};
    const a = ((p1.x-p0.x)*(sy2-sy0) - (p2.x-p0.x)*(sy1-sy0)) / denom;
    const b = ((p1.y-p0.y)*(sy2-sy0) - (p2.y-p0.y)*(sy1-sy0)) / denom;
    const c = ((p2.x-p0.x)*(sx1-sx0) - (p1.x-p0.x)*(sx2-sx0)) / denom;
    const d = ((p2.y-p0.y)*(sx1-sx0) - (p1.y-p0.y)*(sx2-sx0)) / denom;
    const e = p0.x - a*sx0 - c*sy0;
    const f = p0.y - b*sx0 - d*sy0;
    return {a,b,c,d,e,f};
}

let cameraRotX = 0; // look up/down
let cameraRotY = 0; // look left/right

const rotZMat = (angle) => [ // Completely useless???
    [Math.cos(angle), -Math.sin(angle), 0],
    [Math.sin(angle), Math.cos(angle), 0],
    [0, 0, 1]
];

function multMat(matrix, vertex) {
    const x = vertex.x;
    const y = vertex.y;
    const z = vertex.z;

    return {
        x: matrix[0][0] * x + matrix[0][1] * y + matrix[0][2] * z,
        y: matrix[1][0] * x + matrix[1][1] * y + matrix[1][2] * z,
        z: matrix[2][0] * x + matrix[2][1] * y + matrix[2][2] * z
    };
}

function perspectiveProject(point, fov, viewerDistance, isL) {
    const z = viewerDistance + point.z;

    // Prevent division by zero or negative scale
    if (z <= 1) return null;

    const scale = fov / z;
    return {
        x: point.x * scale + CW2,
        y: point.y * scale + CH2,
        z: point.z,
        isL: isL
    };
}

class Vertex {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
}

let cameraPos = new Vertex(0, 0, 0);

const P = [];
const center = new Vertex(CW2, CH2, 0);

let lightPos = { x: 0, y: -200, z: 0 };

class Sphere {
    constructor({ x, y, z, r }) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.r = r;

        this.V = [];
        this.T = [];

        this.triangleBrightness = [];

        this.setUp();
    }

    calcLighting(lightPos, intensity = 250) {
        for (let i = 0; i < this.T.length; i++) {
            let t = this.T[i];
            const i0 = t[0] * 3, i1 = t[1] * 3, i2 = t[2] * 3;
            const cx = (this.V[i0] + this.V[i1] + this.V[i2]) / 3;
            const cy = (this.V[i0+1] + this.V[i1+1] + this.V[i2+1]) / 3;
            const cz = (this.V[i0+2] + this.V[i1+2] + this.V[i2+2]) / 3;
            const dx = cx - lightPos.x, dy = cy - lightPos.y, dz = cz - lightPos.z;
            const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
            this.triangleBrightness[i] = Math.min(0.8, (dist*dist) / (intensity*intensity));
        }
    }

    setUp() {
        this.V.length = 0; // Clear existing points

        const segments = 20; // Higher = smoother
        const vertexCount = (segments + 1) * (segments + 1);
        this.V = new Float32Array(vertexCount * 3);

        let vi = 0;
        for (let i = 0; i <= segments; i++) {
            const theta = i * Math.PI / segments;
            const sinT = Math.sin(theta), cosT = Math.cos(theta);
            for (let j = 0; j <= segments; j++) {
                const phi = j * 2 * Math.PI / segments;
                this.V[vi++] = this.r * sinT * Math.cos(phi) + this.x;
                this.V[vi++] = this.r * sinT * Math.sin(phi) + this.y;
                this.V[vi++] = this.r * cosT + this.z;
            }
        }

        const pointsPerRow = segments + 1;
        for (let i = 0; i < segments; i++) {
            for (let j = 0; j < segments; j++) {
                const a = i * pointsPerRow + j;
                const b = a + 1, c = a + pointsPerRow, d = c + 1;
                this.T.push([a, b, c]);
                this.T.push([b, d, c]);
                this.triangleBrightness.push(1, 1);
            }
        }
    }
}

class Cube {
    constructor({ x, y, z, w = 100, h = 100, d = 100, isL = false }) {
        this.x = x;
        this.y = y;
        this.z = z;

        this.w = w / 2; // half width
        this.h = h / 2; // half height
        this.d = d / 2; // half depth

        this.isL = isL;

        this.V = [];
        this.F = [
            [0, 1, 3, 2], // front
            [4, 5, 7, 6], // back
            [0, 2, 6, 4], // left
            [1, 5, 7, 3], // right
            [0, 4, 5, 1], // top
            [2, 3, 7, 6]  // bottom
        ];

        this.faceBrightness = new Array(6).fill(1); // one brightness per face

        this.setUp();
    }

    calcLighting(lightPos, intensity = 450) {
        for (let i = 0; i < 6; i++) {
            let face = this.F[i];

            let cx = 0, cy = 0, cz = 0;
            for (let j = 0; j < 4; j++) {
                const idx = face[j] * 3;
                cx += this.V[idx];
                cy += this.V[idx + 1];
                cz += this.V[idx + 2];
            }

            cx /= 4; cy /= 4; cz /= 4;

            // Get distance from light
            let dx = cx - lightPos.x;
            let dy = cy - lightPos.y;
            let dz = cz - lightPos.z;

            let dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            let brightness = Math.min(0.8, (dist * dist) / (intensity * intensity));

            this.faceBrightness[i] = brightness;
        }
    }

    setUp() {
        const vertexCount = 8;
        this.V = new Float32Array(vertexCount * 3);

        const x = this.x, y = this.y, z = this.z;
        const w = this.w, h = this.h, d = this.d;

        const verts = [
            -w+x, -h+y, -d+z,
             w+x, -h+y, -d+z,
            -w+x,  h+y, -d+z,
             w+x,  h+y, -d+z,
            -w+x, -h+y,  d+z,
             w+x, -h+y,  d+z,
            -w+x,  h+y,  d+z,
            w+x,  h+y,  d+z,
        ];

        this.V.set(verts);
    }
}

const cube1 = new Cube({ x: 0, y: 100, z: 0, w: 250, h: 100, d: 400 });
const cube2 = new Cube({ x: 0, y: 0, z: 50, w: 250, h: 100, d: 300 });
const cube3 = new Cube({ x: 0, y: -100, z: 100, w: 250, h: 100, d: 200 });
const cube4 = new Cube({ ...lightPos, w: 50, h: 50, d: 50, isL: true });

const sphere1 = new Sphere({ x: 0, y: -300, z: 50, r: 100 });


const cubes = [cube1, cube2, cube3, cube4];
const spheres = [sphere1];

const projectWorld = (obj, objIndex, queue) => {
    let projected = [];

    for (let i = 0; i < obj.V.length / 3; i++) {
        const vx = obj.V[i*3], vy = obj.V[i*3+1], vz = obj.V[i*3+2];
        let translated = {
            x: vx - cameraPos.x,
            y: vy - cameraPos.y,
            z: vz - cameraPos.z,
        };

        let rotated = multMat([[Math.cos(-cameraRotY), 0, Math.sin(-cameraRotY)], [0, 1, 0], [-Math.sin(-cameraRotY), 0, Math.cos(-cameraRotY)]], translated);
        rotated = multMat([[1, 0, 0], [0, Math.cos(-cameraRotX), -Math.sin(-cameraRotX)], [0, Math.sin(-cameraRotX), Math.cos(-cameraRotX)]], rotated);

        let proj2D = perspectiveProject(rotated, fov, cameraZ, obj.isL);

        if (!proj2D) {
            projected.push(null);
            continue;
        }

        proj2D.x -= cameraPos.x;
        proj2D.y -= cameraPos.y;
        proj2D.z = rotated.z; // Keep rotated Z for depth

        projected.push(proj2D);
    }

    // cubes with faces
    if (obj.F) {
        obj.F.forEach((fac, index) => {
            let i1 = fac[0];
            let i2 = fac[1];
            let i3 = fac[2];
            let i4 = fac[3];

            let p1 = projected[i1];
            let p2 = projected[i2];
            let p3 = projected[i3];
            let p4 = projected[i4];

            if (p1 && p2 && p3 && p4) {
                const avgZ = (p1.z + p2.z + p3.z + p4.z) / 4;

                queue.push({
                    p1,
                    p2,
                    p3,
                    p4,
                    z: avgZ,
                    isL: obj.isL,
                    isCube: true,
                    objIndex: objIndex,
                    facIndex: index
                });
            }
        });
    }

    // spheres with triangles
    if (obj.T) {
        obj.T.forEach((tri, index) => {
            const p1 = projected[tri[0]];
            const p2 = projected[tri[1]];
            const p3 = projected[tri[2]];

            if (p1 && p2 && p3) {
                const avgZ = (p1.z + p2.z + p3.z) / 3;

                queue.push({
                    p1,
                    p2,
                    p3,
                    z: avgZ,
                    isCube: false,
                    objIndex: objIndex,
                    triIndex: index
                });
            }
        });
    }
};

let lVelx = 0;
let lVelz = 0;

let lastTime = performance.now();
let frameCount = 0;
let fps = 0;

const engine = () => {

    ctx.clearRect(0, 0, cvs.width, cvs.height);
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, cvs.width, cvs.height)

    // Camera control
    if (K.W) cameraRotX -= 0.02;
    if (K.S) cameraRotX += 0.02;
    if (K.A) cameraRotY += 0.02;
    if (K.D) cameraRotY -= 0.02;
    if (K.u) cameraZ -= 10;
    if (K.d) cameraZ += 10;
    if (K.l) {
        cameraPos.x -= Math.cos(cameraRotY) * 4;
        cameraPos.z += Math.sin(cameraRotY) * 4;
    }
    if (K.r) {
        cameraPos.x += Math.cos(cameraRotY) * 4;
        cameraPos.z -= Math.sin(cameraRotY) * 4;
    }

    let objQueue = [];
    let lightCube = cubes[3];

    cubes.forEach((c, i) => {
        projectWorld(c, i, objQueue);

        if (c.isL) {
            // circular light motion
            const radius = 200;
            const speed = 0.002; // radians per frame
            const angle = performance.now() * speed;

            c.x = Math.cos(angle) * radius + lightPos.x;
            c.z = Math.sin(angle) * radius + lightPos.z;

            c.setUp();
        } else {
            c.calcLighting({ x: lightCube.x, y: lightCube.y, z: lightCube.z });
        }
    });

    spheres.forEach((s, i) => {
        projectWorld(s, i, objQueue);

        s.calcLighting({ x: lightCube.x, y: lightCube.y, z: lightCube.z });
    });


    // Sort back to front
    insertionSort(objQueue);

    // Draw sorted faces
    for (let i = 0; i < objQueue.length; i++) {
        let oq = objQueue[i];

        if (oq.isCube) {
            if (!oq.isL) {
                drawTxOnFace(oq.p1, oq.p4, oq.p2, oq.p3);

                //calc brightness
                let obj = cubes[oq.objIndex];
                let bri = obj.faceBrightness[oq.facIndex];
                fillQuad(oq.p1, oq.p2, oq.p3, oq.p4, 'black', bri);

            } else {
                fillQuad(oq.p1, oq.p2, oq.p3, oq.p4, 'yellow', 1, true);
            }
        } else {
            let sq = objQueue[i];

            // //calc brightness
            let obj = spheres[sq.objIndex];
            let bri = obj.triangleBrightness[sq.triIndex];

            drawTriangle(sq.p1, sq.p2, sq.p3, 'white', bri);
        }
    }

    const now = performance.now();
    frameCount++;

    if (now - lastTime >= 1000) {
        fps = frameCount;
        frameCount = 0;
        lastTime = now;
    }

    ctx.fillStyle = 'white';
    ctx.font = `10px arcadeclassic`;
    ctx.fillText(fps, 50, 50);

    requestAnimationFrame(engine);
}

engine();
