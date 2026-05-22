// Using global THREE and SimplexNoise variables instead of imports

// Scene Setup
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
// Fog to fade out edges
scene.fog = new THREE.FogExp2(0x1a1b1e, 0.02);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
// Architectural isometric-ish angle
camera.position.set(-15, 15, -15);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(0x1a1b1e, 1);
container.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.5;
controls.maxPolarAngle = Math.PI / 2.2;

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 2);
dirLight.position.set(10, 20, 10);
scene.add(dirLight);

const blueLight = new THREE.PointLight(0x6d98b6, 5, 50);
blueLight.position.set(-5, 5, -5);
scene.add(blueLight);

// Topography Generation
const simplex = new SimplexNoise();

let planeMesh, wireframeMesh;
const segments = 100;
const size = 30;

function createTopography(dataArray) {
    if (planeMesh) {
        scene.remove(planeMesh);
        scene.remove(wireframeMesh);
        planeMesh.geometry.dispose();
        planeMesh.material.dispose();
        wireframeMesh.material.dispose();
    }

    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    
    // Smooth data into a grid
    // We'll treat the data array as a series of "peaks" distributed randomly or in a circle
    const peaks = dataArray.map((val, i) => {
        const angle = (i / dataArray.length) * Math.PI * 2;
        const radius = 5 + (simplex.noise2D(i, 0) * 2);
        return {
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius,
            height: val * 0.5 // scale height
        };
    });

    const positions = geometry.attributes.position.array;

    for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        
        let z = 0;
        
        // Base noise
        z += simplex.noise2D(x * 0.1, y * 0.1) * 0.5;
        z += simplex.noise2D(x * 0.5, y * 0.5) * 0.1;

        // Add influence from data peaks
        let dataInfluence = 0;
        peaks.forEach(peak => {
            const dx = x - peak.x;
            const dy = y - peak.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            // Gaussian influence
            const influence = Math.exp(-(dist * dist) / 10);
            dataInfluence += influence * peak.height;
        });

        z += dataInfluence;

        // Apply a terracing effect to look like topography lines
        const terraceStep = 0.5;
        z = Math.floor(z / terraceStep) * terraceStep;

        positions[i + 2] = z;
    }

    geometry.computeVertexNormals();
    // Rotate to lie flat
    geometry.rotateX(-Math.PI / 2);
    // Center geometry
    geometry.translate(0, -2, 0);

    const material = new THREE.MeshStandardMaterial({
        color: 0x2a2b2e,
        roughness: 0.8,
        metalness: 0.2,
        flatShading: true
    });

    planeMesh = new THREE.Mesh(geometry, material);
    scene.add(planeMesh);

    // Add wireframe for architectural look
    const wireframeMaterial = new THREE.MeshBasicMaterial({
        color: 0x6d98b6,
        wireframe: true,
        transparent: true,
        opacity: 0.15
    });
    
    wireframeMesh = new THREE.Mesh(geometry, wireframeMaterial);
    wireframeMesh.scale.set(1.001, 1.001, 1.001);
    scene.add(wireframeMesh);
}

// Initial Data
const initialData = [7, 5, 8, 6, 7.5, 9, 6.5, 7, 8, 5, 6, 7, 8, 7.5];
createTopography(initialData);

// Animation Loop
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    controls.update();

    const time = clock.getElapsedTime();

    // Gentle breathing effect on the blue light
    blueLight.intensity = 3 + Math.sin(time * 2) * 2;

    renderer.render(scene, camera);
}
animate();

// Handle Window Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// UI Controls
document.getElementById('update-btn').addEventListener('click', () => {
    const input = document.getElementById('data-input').value;
    const dataArray = input.split(',').map(n => parseFloat(n.trim())).filter(n => !isNaN(n));
    if (dataArray.length > 0) {
        createTopography(dataArray);
    }
});
