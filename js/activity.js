define(["sugar-web/activity/activity", "three"], function (activity, THREE) {
	var clearMode = false; // clear mode is initially not active
	var scene = new THREE.Scene();
	var camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
	var renderer = new THREE.WebGLRenderer();
	renderer.setClearColor(0xffffff);
	var material = new THREE.MeshBasicMaterial({ color: 0xc22d2d });
	var objects = [];
	var CANNON = window.CANNON;
	var world = new CANNON.World();
	world.gravity.set(0, -9.82, 0);
	world.broadphase = new CANNON.NaiveBroadphase();
	world.solver.iterations = 10;

	var groundSize = 10;
	var groundThickness = 0.2;
	var wallHeight = 2;
	var wallThickness = 0.2;

	// Clear previous ground and wall bodies
	world.bodies.forEach(body => world.remove(body));

	// Create thicker ground
	var groundShape = new CANNON.Box(new CANNON.Vec3(groundSize / 2, groundThickness / 2, groundSize / 2));
	var groundBody = new CANNON.Body({
		mass: 0,
		position: new CANNON.Vec3(0, -wallHeight / 2, 0) // Adjusted for reduced wall height
	});
	groundBody.addShape(groundShape);
	world.addBody(groundBody);
	var groundGeometry = new THREE.BoxGeometry(groundSize + 2 * wallThickness, groundThickness, groundSize + 2 * wallThickness); // Include wall thickness in ground size for a flush fit
	var groundMaterial = new THREE.MeshBasicMaterial({ color: 0x808080 }); // Gray color
	var groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
	groundMesh.receiveShadow = true;
	groundMesh.position.y = -wallHeight / 1.8; // Position the ground mesh
	addEdgeLines(groundMesh);
	scene.add(groundMesh);
	// Helper function to create walls
	function createWall(position, dimensions) {
		var wallShape = new CANNON.Box(new CANNON.Vec3(dimensions.x / 2, dimensions.y / 2, dimensions.z / 2));
		var wallBody = new CANNON.Body({
			mass: 0,
			position: position
		});
		wallBody.addShape(wallShape);
		world.addBody(wallBody);

		// Visual representation
		var wallMesh = new THREE.Mesh(
			new THREE.BoxGeometry(dimensions.x, dimensions.y, dimensions.z),
			new THREE.MeshBasicMaterial({ color: 0x808080 })
		);
		wallMesh.position.copy(position);
		addEdgeLines(wallMesh);
		wallMesh.receiveShadow = true;
		scene.add(wallMesh);
	}

	// Positions and dimensions for the walls surrounding the ground
	var wallsData = [
		{ position: new CANNON.Vec3(0, 0, -groundSize / 2 - wallThickness / 2), dimensions: new CANNON.Vec3(groundSize + 2 * wallThickness, wallHeight, wallThickness) },
		{ position: new CANNON.Vec3(0, 0, groundSize / 2 + wallThickness / 2), dimensions: new CANNON.Vec3(groundSize + 2 * wallThickness, wallHeight, wallThickness) },
		{ position: new CANNON.Vec3(-groundSize / 2 - wallThickness / 2, 0, 0), dimensions: new CANNON.Vec3(wallThickness, wallHeight, groundSize + 2 * wallThickness) },
		{ position: new CANNON.Vec3(groundSize / 2 + wallThickness / 2, 0, 0), dimensions: new CANNON.Vec3(wallThickness, wallHeight, groundSize + 2 * wallThickness) }
	];

	// Create walls using the helper function
	wallsData.forEach(data => createWall(data.position, data.dimensions));
	var groundMaterial = new CANNON.Material("groundMaterial");
	var objectMaterial = new CANNON.Material("objectMaterial");

	// Contact material between ground and objects
	var groundObjectContactMaterial = new CANNON.ContactMaterial(groundMaterial, objectMaterial, {
		friction: 0.4,  // Adjust friction to your needs
		restitution: 0.3 // Lower restitution reduces bounciness
	});
	world.addContactMaterial(groundObjectContactMaterial);

	// Update material when creating objects
	function addMeshAndBody(mesh, cannonShape) {
		mesh.position.y = 5;
		mesh.castShadow = true;
		scene.add(mesh);
		var body = new CANNON.Body({
			mass: 1,
			material: objectMaterial // Assumed you have defined this material somewhere
		});
		body.addShape(cannonShape);
		body.position.set(mesh.position.x, mesh.position.y, mesh.position.z);
		world.addBody(body);

		objects.push({ mesh: mesh, body: body });
	}
	function animate() {
		requestAnimationFrame(animate);

		// Update the physics world
		var deltaTime = 1 / 60;
		world.step(deltaTime);


		objects.forEach(function (obj) {
			obj.mesh.position.copy(obj.body.position);
			obj.mesh.quaternion.copy(obj.body.quaternion);
		});

		renderer.render(scene, camera);
	}

	requirejs(['domReady!'], function () {
		activity.setup();
		renderer.setSize(window.innerWidth, window.innerHeight / 1.05);
		renderer.shadowMap.enabled = true;
		document.getElementById("board").appendChild(renderer.domElement);
		camera.position.z = 9;
		camera.position.y = 8;
		camera.rotation.x = -Math.PI / 4;
		var ambientLight = new THREE.AmbientLight(0x404040);
		scene.add(ambientLight);
		// Assuming you have a directional light
		var directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
		directionalLight.position.set(10, 20, 10);
		directionalLight.castShadow = true; // Enable casting shadows
		scene.add(directionalLight);
		// Set default shape
		createCube(); // This now adds a Cube that falls due to gravity

		animate();

		// Button event listeners
		document.getElementById("tetrahedron-button").addEventListener('click', function () {
			createTetrahedron();
		});
		document.getElementById("cube-button").addEventListener('click', function () {
			createCube();
		});
		document.getElementById("octahedron-button").addEventListener('click', function () {
			createOctahedron();
		});
		document.getElementById("dodecahedron-button").addEventListener('click', function () {
			createDodecahedron();
		});
		document.getElementById("icosahedron-button").addEventListener('click', function () {
			createIcosahedron();
		});
		// document.getElementById("clear-button").addEventListener('click', function () {
		// 	clearScene();
		// });
	});
	// This function generates a random position within the board limits
	function getRandomPosition(groundSize, margin) {
		let x = (Math.random() - 0.5) * (groundSize - margin);
		let z = (Math.random() - 0.5) * (groundSize - margin);
		return new THREE.Vector3(x, 5, z); // Keeps Y constant at 5 (above the ground)
	}

	function createTetrahedron() {
		const verticesTetra = [
			new CANNON.Vec3(1, 1, 1),
			new CANNON.Vec3(-1, -1, 1),
			new CANNON.Vec3(-1, 1, -1),
			new CANNON.Vec3(1, -1, -1),
		]

		// Define the faces of the tetrahedron (counter-clockwise order)
		const facesTetra = [
			[2, 1, 0],
			[0, 3, 2],
			[1, 3, 0],
			[2, 3, 1],
		]

		const tetrahedronShape = new CANNON.ConvexPolyhedron({
			vertices: verticesTetra,
			faces: facesTetra,
		})

		var geometry = new THREE.TetrahedronGeometry(1);
		var mesh = new THREE.Mesh(geometry, material);
		addEdgeLines(mesh);
		addMeshAndBody(mesh, tetrahedronShape); // Use the bounding sphere as an approximation
	}

	function createCube() {
		var geometry = new THREE.BoxGeometry(1, 1, 1);
		var mesh = new THREE.Mesh(geometry, material);
		addEdgeLines(mesh);
		addMeshAndBody(mesh, new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5)));
	}

	function createOctahedron() {
		const vertices = [
			new CANNON.Vec3(1, 0, 0),
			new CANNON.Vec3(-1, 0, 0),
			new CANNON.Vec3(0, 1, 0),
			new CANNON.Vec3(0, -1, 0),
			new CANNON.Vec3(0, 0, 1),
			new CANNON.Vec3(0, 0, -1),
		]

		const faces = [
			[0, 2, 4],
			[0, 4, 3],
			[0, 3, 5],
			[0, 5, 2],
			[1, 2, 5],
			[1, 5, 3],
			[1, 3, 4],
			[1, 4, 2],
		]


		const octahedronShape = new CANNON.ConvexPolyhedron({
			vertices: vertices,
			faces: faces,
		})
		var geometry = new THREE.OctahedronGeometry(1);
		var mesh = new THREE.Mesh(geometry, material);
		addEdgeLines(mesh);
		addMeshAndBody(mesh, octahedronShape); // Bounding sphere approximation
	}

	function createDodecahedron() {
		// const t = ( 1 + Math.sqrt( 5 ) ) / 2;
		// const r = 1/t;
		// console.log()
		// const vertices = [
		// 	new CANNON.Vec3(-1, -1, -1), new CANNON.Vec3(-1, -1, 1),
		// 	new CANNON.Vec3(-1, 1, -1), new CANNON.Vec3(-1, 1, 1),
		// 	new CANNON.Vec3(1, -1, -1), new CANNON.Vec3(1, -1, 1),
		// 	new CANNON.Vec3(1, 1, -1), new CANNON.Vec3(1, 1, 1),
		// 	new CANNON.Vec3(0, -r, -t), new CANNON.Vec3(0, -r, t),
		// 	new CANNON.Vec3(0, r, -t), new CANNON.Vec3(0, r, t),
		// 	new CANNON.Vec3(-r, -t, 0), new CANNON.Vec3(-r, t, 0),
		// 	new CANNON.Vec3(r, -t, 0), new CANNON.Vec3(r, t, 0),
		// 	new CANNON.Vec3(-t, 0, -r), new CANNON.Vec3(t, 0, -r),
		// 	new CANNON.Vec3(-t, 0, r), new CANNON.Vec3(t, 0, r),
		// ];

		// const faces = [
		// 	[3, 11, 7], [3, 7, 15], [3, 15, 13],
		// 	[7, 19, 17], [7, 17, 6], [7, 6, 15],
		// 	[17, 4, 8], [17, 8, 10], [17, 10, 6],
		// 	[8, 0, 16], [8, 16, 2], [8, 2, 10],
		// 	[0, 12, 1], [0, 1, 18], [0, 18, 16],
		// 	[6, 10, 2], [6, 2, 13], [6, 13, 15],
		// 	[2, 16, 18], [2, 18, 3], [2, 3, 13],
		// 	[18, 1, 9], [18, 9, 11], [18, 11, 3],
		// 	[4, 14, 12], [4, 12, 0], [4, 0, 8],
		// 	[11, 9, 5], [11, 5, 19], [11, 19, 7],
		// 	[19, 5, 14], [19, 14, 4], [19, 4, 17],
		// 	[1, 12, 14], [1, 14, 5], [1, 5, 9],
		// ];

		// const dodecahedronShape = new CANNON.ConvexPolyhedron({
		// 	vertices: vertices,
		// 	faces: faces,
		// })

		var geometry = new THREE.DodecahedronGeometry(1);
		var mesh = new THREE.Mesh(geometry, material);
		addEdgeLines(mesh);
		addMeshAndBody(mesh, new CANNON.Sphere(0.8));
	}

	function createIcosahedron() {
		var geometry = new THREE.IcosahedronGeometry(1);
		var mesh = new THREE.Mesh(geometry, material);
		addEdgeLines(mesh);
		addMeshAndBody(mesh, new CANNON.Sphere(0.8)); // Bounding sphere approximation
	}

	function addMeshAndBody(mesh, cannonShape) {
		mesh.position.copy(getRandomPosition(groundSize, 2)); // Position it above the platform
		scene.add(mesh);

		var body = new CANNON.Body({ mass: 2 });
		body.addShape(cannonShape);
		body.position.set(mesh.position.x, mesh.position.y, mesh.position.z);
		world.addBody(body);

		objects.push({ mesh: mesh, body: body });
	}
	function addToScene(mesh) {
		scene.add(mesh);
	}
	document.getElementById("clear-button").addEventListener('click', function () {
		clearMode = !clearMode; // Toggle clear mode

		// Optionally, visually indicate clear mode is active
		if (clearMode) {
			this.classList.add("active");
		} else {
			this.classList.remove("active");
		}
	});
	function shakeBoard() {
		objects.forEach(function (obj) {
			// Generate random forces for x, y, and z axes
			var forceX = (Math.random() - 0.5) * 10 // Random force between -10 and 10
			var forceY = 4;   // Random upward force between 5 and 25 for a slight lift
			var forceZ = (Math.random() - 0.5) * 10// Random force between -10 and 10

			// Apply the force at the object's current position to shake it
			obj.body.applyImpulse(new CANNON.Vec3(forceX, forceY, forceZ), obj.body.position);
		});
	}
	document.getElementById("shake-board").addEventListener('click', function () {
		shakeBoard(); // Call the shakeBoard function when the button is clicked
	});
	function removeObject(selectedObject) {

		let objectData = objects.find(obj => obj.mesh === selectedObject || obj.mesh.children.includes(selectedObject));
		if (!objectData) {
			return; // Object not found in our tracking array
		}

		scene.remove(objectData.mesh);

		// Remove physical body from the physics world
		world.removeBody(objectData.body);

		// Update the objects array to reflect removal
		objects = objects.filter(obj => obj !== objectData);
	}

	// Attach the click event listener for object removal
	renderer.domElement.addEventListener('click', function (event) {
		if (!clearMode) return;


		var mouse = new THREE.Vector2(
			(event.clientX / window.innerWidth) * 2 - 1,
			-(event.clientY / window.innerHeight) * 2 + 1
		);
		var raycaster = new THREE.Raycaster();
		raycaster.setFromCamera(mouse, camera);

		var intersects = raycaster.intersectObjects(scene.children, true);
		if (intersects.length > 0) {
			// Call removeObject on the first intersected object
			removeObject(intersects[0].object);
		}
	});
	function addEdgeLines(mesh) {
		var edges = new THREE.EdgesGeometry(mesh.geometry); // Create an EdgesGeometry from the mesh's geometry
		var lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 10 }); // Black color, adjust linewidth as needed
		var lines = new THREE.LineSegments(edges, lineMaterial);
		mesh.add(lines); // Add lines as a child of the mesh so they move together
	}

	function clearScene() {
		objects.forEach(function (obj) {
			scene.remove(obj.mesh);
			world.remove(obj.body);
		});
		objects = [];
	}

	var isDragging = false;
	var previousMousePosition = {
		x: 0,
		y: 0
	};
	var cameraAngleLimits = {
		min: -Math.PI / 4, // Adjust as necessary to prevent looking below the ground
		max: Math.PI / 10 // Adjust to limit looking too high
	};
	var cameraRotation = {
		x: -Math.PI / 4, // Initial rotation around the X axis (pitch)
		y: 0  // Initial rotation around the Y axis (yaw)
	};

	// renderer.domElement.addEventListener('mousedown', function (e) {
	// 	isDragging = true;
	// });

	// renderer.domElement.addEventListener('mousemove', function (e) {
	// 	// Check if the mouse is being dragged
	// 	if (isDragging) {
	// 		var deltaX = e.movementX || e.mozMovementX || e.webkitMovementX || 0;
	// 		var deltaY = e.movementY || e.mozMovementY || e.webkitMovementY || 0;

	// 		cameraRotation.y += deltaX * 0.005; // Adjust rotation sensitivity
	// 		cameraRotation.x += deltaY * 0.005; // Adjust rotation sensitivity

	// 		// Limit the pitch
	// 		cameraRotation.x = Math.max(Math.min(cameraRotation.x, cameraAngleLimits.max), cameraAngleLimits.min);

	// 		updateCameraRotation();
	// 	}
	// 	previousMousePosition = {
	// 		x: e.clientX,
	// 		y: e.clientY
	// 	};
	// });

	// renderer.domElement.addEventListener('mouseup', function (e) {
	// 	isDragging = false;
	// });

	function updateCameraRotation() {
		var xQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), cameraRotation.x);
		var yQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), cameraRotation.y);

		camera.quaternion.copy(yQuat.multiply(xQuat));
		camera.position.y = Math.max(1, camera.position.y); // Adjust to prevent moving below ground
	}
	document.getElementById("rotate-button").addEventListener('click', function () {
		rotateScene();
	});
	function rotateScene() {
		var angleToRotate = Math.PI / 4; // 45 degrees in radians
		scene.rotation.y += angleToRotate;
	}
});
