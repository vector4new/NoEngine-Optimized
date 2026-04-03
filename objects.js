export class Cube {
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
            [0, 1, 3, 2], // front (z+)
            [5, 4, 6, 7], // back (z-) - REVERSED order from front
            [4, 0, 2, 6], // left (x-)
            [1, 5, 7, 3], // right (x+)
            [4, 5, 1, 0], // top (y-)
            [2, 3, 7, 6]  // bottom (y+)
        ];

        this.faceBrightness = new Array(6).fill(1);

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
            -w+x, -h+y,  d+z,  // 0: front-top-left
             w+x, -h+y,  d+z,  // 1: front-top-right
            -w+x,  h+y,  d+z,  // 2: front-bottom-left
             w+x,  h+y,  d+z,  // 3: front-bottom-right
            -w+x, -h+y, -d+z,  // 4: back-top-left
             w+x, -h+y, -d+z,  // 5: back-top-right
            -w+x,  h+y, -d+z,  // 6: back-bottom-left
             w+x,  h+y, -d+z,  // 7: back-bottom-right
        ];

        this.V.set(verts);
    }
}

export class Cylinder {
    constructor({x, y, z, r = 100, h = 200, segments = 20}) {
        this.x = x; this.y = y; this.z = z;
        this.r = r; this.h = h; this.segments = segments;
        this.V = []; this.T = [];
        this.triangleBrightness = [];
        this.setUp();
    }

    calcLighting(lightPos, intensity = 325) {
        for (let i = 0; i < this.T.length; i++) {
            const t = this.T[i];

            const i0=t[0]*3, i1=t[1]*3, i2=t[2]*3;

            const cx = (this.V[i0]+this.V[i1]+this.V[i2])/3;
            const cy = (this.V[i0+1]+this.V[i1+1]+this.V[i2+1])/3;
            const cz = (this.V[i0+2]+this.V[i1+2]+this.V[i2+2])/3;

            const dx = cx-lightPos.x, dy=cy-lightPos.y, dz=cz-lightPos.z;
            const dist = Math.sqrt(dx*dx+dy*dy+dz*dz);

            this.triangleBrightness[i] = Math.min(0.8,(dist*dist)/(intensity*intensity));
        }
    }

    setUp() {
        const s = this.segments;
        const verts = [];
        const half = this.h / 2;
        
        let bottomCenterIdx, topCenterIdx;

        verts.push(this.x, this.y - half, this.z);
        bottomCenterIdx = 0;
        
        verts.push(this.x, this.y + half, this.z);
        topCenterIdx = 1;
        
        let nextIdx = 2;
        
        for (let i = 0; i <= s; i++) {
            const a = (i / s) * Math.PI * 2;
            const x = Math.cos(a) * this.r + this.x;
            const z = Math.sin(a) * this.r + this.z;
            
            // Bottom rim vertex
            verts.push(x, this.y - half, z);
            // Top rim vertex  
            verts.push(x, this.y + half, z);
        }
        
        this.V = new Float32Array(verts);
        this.T = [];
        
        const rimStartIdx = 2;
        
        for (let i = 0; i < s; i++) {
            const bottomLeft = rimStartIdx + (i * 2);
            const topLeft = bottomLeft + 1;
            const bottomRight = bottomLeft + 2;
            const topRight = bottomLeft + 3;
            
            // Triangle 1: bottomLeft, bottomRight, topLeft
            this.T.push([bottomLeft, bottomRight, topLeft]);
            // Triangle 2: topLeft, bottomRight, topRight
            this.T.push([topLeft, bottomRight, topRight]);
            this.triangleBrightness.push(1, 1);
        }
        
        for (let i = 0; i < s; i++) {
            const bottomLeft = rimStartIdx + (i * 2);
            const bottomRight = rimStartIdx + ((i + 1) % s) * 2;
            
            this.T.push([bottomCenterIdx, bottomRight, bottomLeft]);
            this.triangleBrightness.push(1);
        }
        
        for (let i = 0; i < s; i++) {
            const topLeft = rimStartIdx + (i * 2) + 1;
            const topRight = rimStartIdx + ((i + 1) % s) * 2 + 1;

            this.T.push([topCenterIdx, topLeft, topRight]);
            this.triangleBrightness.push(1);
        }
    }
}

export class Sphere {
    constructor({ x, y, z, r = 100, segments = 12 }) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.r = r;
        this.segs = segments;

        this.V = [];
        this.T = [];

        this.triangleBrightness = [];

        this.setUp();
    }

    calcLighting(lightPos, intensity = 350) {
        for (let i = 0; i < this.T.length; i++) {
            let t = this.T[i];

            const i0 = t[0] * 3, i1 = t[1] * 3, i2 = t[2] * 3;
            const cx = (this.V[i0] + this.V[i1] + this.V[i2]) / 3;
            const cy = (this.V[i0+1] + this.V[i1+1] + this.V[i2+1]) / 3;
            const cz = (this.V[i0+2] + this.V[i1+2] + this.V[i2+2]) / 3;
            const dx = cx - lightPos.x, dy = cy - lightPos.y, dz = cz - lightPos.z;
            const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);

            this.triangleBrightness[i] = Math.min(0.8,(dist*dist)/(intensity*intensity));
        }
    }

    setUp() {
        this.V.length = 0; // Clear existing points

        const vertexCount = (this.segs + 1) * (this.segs + 1);
        this.V = new Float32Array(vertexCount * 3);

        let vi = 0;
        for (let i = 0; i <= this.segs; i++) {
            const theta = i * Math.PI / this.segs;
            const sinT = Math.sin(theta), cosT = Math.cos(theta);
            for (let j = 0; j <= this.segs; j++) {
                const phi = j * 2 * Math.PI / this.segs;
                this.V[vi++] = this.r * sinT * Math.cos(phi) + this.x;
                this.V[vi++] = this.r * sinT * Math.sin(phi) + this.y;
                this.V[vi++] = this.r * cosT + this.z;
            }
        }

        const pointsPerRow = this.segs + 1;
        for (let i = 0; i < this.segs; i++) {
            for (let j = 0; j < this.segs; j++) {
                const a = i * pointsPerRow + j;
                const b = a + 1, c = a + pointsPerRow, d = c + 1;
                this.T.push([a, b, c]);
                this.T.push([b, d, c]);
                this.triangleBrightness.push(1, 1);
            }
        }
    }
}
