import { Cube, Cylinder, Sphere } from './objects.js';
const data = await fetch('./scenes/default.json').then(r => r.json());

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

function drawTxOnFace(tl, tr, br, bl) {
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

const lightCube = new Cube({ ...lightPos, w: 50, h: 50, d: 50, isL: true });
const cubes = [...data.cubes.map(c => new Cube(c)), lightCube];
const spheres = data.spheres.map(s => { const sp = new Sphere(s); sp.type = 'sphere'; return sp; });
const cylinders = data.cylinders.map(cyl => { const c = new Cylinder(cyl); c.type = 'cylinder'; return c; });

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
        proj2D.z = rotated.z;

        projected.push(proj2D);
    }

    // with faces
    if (obj.F) {
        for (let index = 0; index < obj.F.length; index++) {
            const fac = obj.F[index];
            const p1 = projected[fac[0]];
            const p2 = projected[fac[1]];
            const p3 = projected[fac[2]];
            const p4 = projected[fac[3]];

            if (p1 && p2 && p3 && p4) {
                // ZR3D-Lite backface culling for quads (we're stealing now??? ok cool)
                // the reason why we steal is because the behind face of each cube is apparently culled for some odd reason
                const ex1 = p2.x - p1.x, ey1 = p2.y - p1.y;
                const ex2 = p3.x - p1.x, ey2 = p3.y - p1.y;
                const cross = ex1 * ey2 - ey1 * ex2;
                
                if (cross >= 0 && !obj.isL) continue;
                
                const avgZ = (p1.z + p2.z + p3.z + p4.z) / 4;
                queue.push({
                    p1, p2, p3, p4,
                    z: avgZ,
                    isL: obj.isL,
                    isCube: true,
                    objIndex: objIndex,
                    facIndex: index
                });
            }
        }
    }

    // with triangles
    if (obj.T) {
        for (let index = 0; index < obj.T.length; index++) {
            const tri = obj.T[index];
            const p1 = projected[tri[0]];
            const p2 = projected[tri[1]];
            const p3 = projected[tri[2]];

            if (p1 && p2 && p3) {
                // ZR3D-Lite backface culling for triangles
                const ex1 = p2.x - p1.x, ey1 = p2.y - p1.y;
                const ex2 = p3.x - p1.x, ey2 = p3.y - p1.y;
                const cross = ex1 * ey2 - ey1 * ex2;
                
                if (cross <= 0) continue; // inverse so we don't get the inverted hull effect
                
                const avgZ = (p1.z + p2.z + p3.z) / 3;
                queue.push({
                    p1, p2, p3,
                    z: avgZ,
                    isCube: false,
                    type: obj.type,
                    objIndex: objIndex,
                    triIndex: index
                });
            }
        }
    }
};

let lVelx = 0;

let lastTime = performance.now();
let frameCount = 0;
let fps = 0;

let objQueue = [];

const engine = () => {
    const now = performance.now();
    const dt = Math.min((now - lastTime) * 0.001, 0.033);

    objQueue.length = 0;

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
        cameraPos.x -= Math.cos(cameraRotY) * 4 * dt;
        cameraPos.z += Math.sin(cameraRotY) * 4 * dt;
    }
    if (K.r) {
        cameraPos.x += Math.cos(cameraRotY) * 4 * dt;
        cameraPos.z -= Math.sin(cameraRotY) * 4 * dt;
    }

    cubes.forEach((c, i) => {
        projectWorld(c, i, objQueue);
        if (c.isL) {
            const angle = performance.now() * 0.002;
            c.x = Math.cos(angle) * 200 + lightPos.x;
            c.z = Math.sin(angle) * 200 + lightPos.z;
            c.setUp();
        } else {
            c.calcLighting({ x: lightCube.x, y: lightCube.y, z: lightCube.z });
        }
    });

    spheres.forEach((s, i) => {
        projectWorld(s, i, objQueue);

        s.calcLighting({ x: lightCube.x, y: lightCube.y, z: lightCube.z });
    });

    cylinders.forEach((co, i) => {
        projectWorld(co, i, objQueue);

        co.calcLighting({ x: lightCube.x, y: lightCube.y, z: lightCube.z });
    });


    // Sort back to front
    insertionSort(objQueue);

    // Draw sorted faces
    for (let i = 0; i < objQueue.length; i++) {
        let oq = objQueue[i];

        if (oq.isCube) {
            if (!oq.isL) {
                drawTxOnFace(oq.p1, oq.p2, oq.p3, oq.p4);

                //calc brightness
                let obj = cubes[oq.objIndex];
                let bri = obj.faceBrightness[oq.facIndex];
                fillQuad(oq.p1, oq.p2, oq.p3, oq.p4, 'black', bri);

            } else {
                fillQuad(oq.p1, oq.p2, oq.p3, oq.p4, 'yellow', 1, true);
            }
        } else {
            let sq = objQueue[i];
            let bri;

            if (sq.type === 'sphere') {
                bri = spheres[sq.objIndex].triangleBrightness[sq.triIndex];
            } else if (sq.type === 'cylinder') {
                bri = cylinders[sq.objIndex].triangleBrightness[sq.triIndex];
            }

            drawTriangle(sq.p1, sq.p2, sq.p3, 'white', bri);
        }
    }

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
