import * as THREE from 'three';
import { FontLoader } from 'https://unpkg.com/three@0.139.2/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'https://unpkg.com/three@0.139.2/examples/jsm/geometries/TextGeometry.js';
import { Reflector } from 'https://unpkg.com/three@0.139.2/examples/jsm/objects/Reflector.js';
import { TweenMax, Expo, Power1 } from 'https://unpkg.com/gsap@2.1.3/index.js';

const hue = 360 * Math.random();
const darkBackground = `hsl(${hue}, 80%, 5%)`;
const lightBackground = `hsl(${hue}, 78%, 96%)`;

const fontHeight = 60;
const fontPath = './hexagramms.json';
const opacity = 0.8;

const container = document.body;
const cursor = document.querySelector('.cursor');
const overlay = document.querySelector('.overlay');

const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;

const pixelRatio = Math.min(window.devicePixelRatio, 2);
let width = container.clientWidth,
	height = container.clientHeight;

/* --------- Dark and Light Mode --------- */
let dark = JSON.parse(sessionStorage.getItem('dark')) ?? window.matchMedia('(prefers-color-scheme: dark)').matches;
let background = new THREE.Color(dark ? darkBackground : lightBackground);
document.documentElement.style.setProperty('--background', dark ? darkBackground : lightBackground);
document.documentElement.style.setProperty('--color', dark ? '#ffffff' : '#000000');
document.documentElement.style.setProperty('--cursor', `url("data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='3' cy='3' r='3' fill='%23${dark ? 'ffffff' : '000000'}'/%3E%3C/svg%3E") 3 3, auto`);

/* --------- Characters --------- */
let hexagramms = ['乾', '坤', '屯', '需', '師', '比', '火', '履', '泰', '否', '同', '人', '大', '有', '謙', '豫', '噬', '濟', '復', '無', '妄', '坎', '咸', '恆', '壯', '晉', '明', '夷', '家', '睽', '損', '益', '夬', '姤', '萃', '升', '困', '井', '革', '艮', '漸', '旅', '巽', '兌', '渙', '中', '孚', '未', '小'];

let characters = [];
for (let col = 0; col < 7; col++) {
	characters.push([]);
	for (let char = 0; char < 7; char++) {
		let randomIndex = Math.round(Math.random() * hexagramms.length) - 1;
		characters[col].push(hexagramms.splice(randomIndex, 1)[0]);
	}
}

/* --------- Scene --------- */
const scene = new THREE.Scene();
scene.background = background;

/* --------- Camera --------- */
const camera = new THREE.PerspectiveCamera(12, width / height, 1, 2000);
camera.position.set(860, -470, 700);
camera.lookAt(740, -280, 520);

/* --------- Background Mirror --------- */
const mirror = new Reflector(new THREE.PlaneGeometry(1000, 1000), {
	clipBias: 0.001,
	textureWidth: width * pixelRatio,
	textureHeight: height * pixelRatio,
	color: 0x808080
});
mirror.position.set(300, 200, 0);
scene.add(mirror);

/* --------- Character Group --------- */
const group = new THREE.Group();
group.position.z = -2 * fontHeight;
scene.add(group);

/* --------- Characters --------- */
const loader = new FontLoader();
loader.load(fontPath, font => {
	characters.forEach((col, x) =>
		col.forEach((character, y) => {
			let geometry = new TextGeometry(character, {
				font: font,
				size: 70,
				height: fontHeight,
				curveSegments: 10
			});

			let materials = [
				new THREE.MeshStandardMaterial({
					emissive: background
				}),
				new THREE.ShaderMaterial({
					uniforms: {
						color1: {
							value: new THREE.Color(`hsl(${Math.abs(hue + 15 * ((y - x) / 2))}, 100%, 50%)`)
						},
						color2: {
							value: background
						},
						height: {
							value: fontHeight
						},
						opacity: {
							value: opacity
						}
					},
					vertexShader: `
          		  uniform float height;

          		  varying vec2 vUv;

          		  void main() {
          		    vUv.x = position.z / height;
          		    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          		  }
          		`,
					fragmentShader: `
          		  uniform vec3 color1;
          		  uniform vec3 color2;
          		  uniform float opacity;

          		  varying vec2 vUv;

          		  void main() {
          		    gl_FragColor = vec4(mix(color1, color2, vUv.x), opacity);
          		  }
          		`,
					transparent: true
				})
			];

			let mesh = new THREE.Mesh(geometry, materials);
			mesh.position.set(100 * x, 100 * y - 50 * (x % 2), -fontHeight);
			group.add(mesh);
		})
	);
});

/* --------- Raycaster --------- */
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

/* --------- Renderer --------- */
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(pixelRatio);
renderer.setSize(width, height);
container.appendChild(renderer.domElement);

const render = () => {
	renderer.clear();
	renderer.render(scene, camera);
	raycaster.setFromCamera(pointer, camera);
};

/* --------- Window Resize --------- */
window.onresize = () => {
	width = container.clientWidth;
	height = container.clientHeight;

	camera.aspect = width / height;
	camera.updateProjectionMatrix();

	renderer.setSize(width, height);
};

/* --------- Mouse Events --------- */
const updateCursorPosition = ({ clientX, clientY }) => {
	pointer.x = 2 * (clientX / width) - 1;
	pointer.y = -(Math.min(clientY + window.scrollY, 1.5 * height) / height) * 2 + 1;

	let point = raycaster.intersectObject(mirror)[0].point;
	group.children.forEach(mesh => {
		let a = point.x - mesh.position.x;
		let b = point.y - mesh.position.y;
		let c = Math.sqrt(a * a + b * b);

		//mesh.position.z = -fontHeight / (1 + Math.pow(1.04, -c + 110)) + fontHeight;
		TweenMax.to(mesh.position, 0.5, {
			z: -fontHeight / (1 + Math.pow(1.04, -c + 110)) + fontHeight,
			ease: Expo.easeOut
		});
	});

	if (touch) return;

	TweenMax.to(cursor, 0.2, {
		top: clientY + 'px',
		left: clientX + 'px',
		ease: Expo.easeOut
	});
	TweenMax.to(overlay, 0.2, {
		top: 0.01 * (0.5 * height - clientY) + 'px',
		left: 0.01 * (0.5 * width - clientX) + 'px'
	});
};

if (touch) {
	TweenMax.to(group.position, 5, {
		z: -fontHeight,
		ease: Expo.easeOut,
		delay: 0.5
	});

	let pos = {
		x: Math.random() * width,
		y: Math.random() * height
	};

	TweenMax.to(pos, 10, {
		x: Math.random() * width,
		y: Math.random() * height,
		ease: Power1.easeInOut
	});

	setInterval(() => {
		TweenMax.to(pos, 10, {
			x: Math.random() * width,
			y: Math.random() * height,
			ease: Power1.easeInOut
		});
	}, 10000);

	TweenMax.ticker.fps(30);
	TweenMax.ticker.addEventListener('tick', () =>
		updateCursorPosition({
			clientX: pos.x,
			clientY: pos.y
		})
	);
} else {
	document.onmousemove = updateCursorPosition;

	document.onmouseover = () => {
		cursor.style.opacity = 1;

		TweenMax.to(group.position, 0.5, {
			z: -fontHeight,
			ease: Expo.easeOut
		});
	};

	document.onmouseout = () => {
		cursor.style.opacity = 0;

		TweenMax.to(group.position, 0.3, { z: -2 * fontHeight });
	};
}

Array.from(document.querySelectorAll('a')).forEach(el => {
	el.onmouseover = () => {
		cursor.style.width = '100px';
		cursor.style.height = '100px';
	};
	el.onmouseout = () => {
		cursor.style.width = '45px';
		cursor.style.height = '45px';
	};
});

const animate = () => {
	requestAnimationFrame(animate);
	render();
};

animate();

/* --------- Dark and Light Mode Change --------- */
const colorMode = isDark => {
	dark = isDark;

  sessionStorage.setItem('dark', dark)

	document.documentElement.style.setProperty('--background', dark ? darkBackground : lightBackground);
	document.documentElement.style.setProperty('--color', dark ? '#ffffff' : '#000000');
	document.documentElement.style.setProperty('--cursor', `url("data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='3' cy='3' r='3' fill='%23${dark ? 'ffffff' : '000000'}'/%3E%3C/svg%3E") 3 3, auto`);

	background = new THREE.Color(dark ? darkBackground : lightBackground);

	TweenMax.to(scene.background, 0.2, {
		r: background.r,
		g: background.g,
		b: background.b
	});

	group.children.forEach(({ material }) => {
		TweenMax.to(material[0].emissive, 0.2, {
			r: background.r,
			g: background.g,
			b: background.b
		});
		TweenMax.to(material[1].uniforms.color2.value, 0.2, {
			r: background.r,
			g: background.g,
			b: background.b
		});
	});
};

window.matchMedia('(prefers-color-scheme: dark)').onchange = ({ matches }) => {
	colorMode(matches);
};

document.querySelector('.dark-mode').textContent = dark ? 'dark' : 'light';

document.querySelector('.dark-mode').onclick = e => {
	colorMode(!dark);
	e.target.textContent = dark ? 'dark' : 'light';
};
