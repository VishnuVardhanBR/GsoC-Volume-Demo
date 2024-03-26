define(["sugar-web/activity/activity", "three"], function (activity, THREE) {
	var clearMode = false; // clear mode is initially not active
	var scene = new THREE.Scene();
	var camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
	var renderer = new THREE.WebGLRenderer();
	renderer.setClearColor(0xffffff);
	var material = new THREE.MeshBasicMaterial({ color: 0xc22d2d });
	var objects = []; // Array to store both THREE.Mesh and CANNON.Body objects
	// Initialize the physics world

	var CANNON = window.CANNON;
	var world = new CANNON.World();
	world.gravity.set(0, -9.82, 0);
	world.broadphase = new CANNON.NaiveBroadphase();
	world.solver.iterations = 10;
	// Adjusted ground and wall dimensions and positions
	var groundSize = 10; // Size of the ground - width and depth
	var groundThickness = 0.2; // Thickness of the ground, making it more like a base than a thin plane
	var wallHeight = 2; // Reduced wall height for bowl-like structure
	var wallThickness = 0.2; // Thickness of walls

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
		friction: 0.4,   // Adjust friction to your needs
		restitution: 0.3 // Lower restitution reduces bounciness
	});
	world.addContactMaterial(groundObjectContactMaterial);

	// Update material when creating objects
	function addMeshAndBody(mesh, cannonShape) {
		mesh.position.y = 5;
		scene.add(mesh);

		var body = new CANNON.Body({
			mass: 1,
			material: objectMaterial // Use the defined material
		});
		body.addShape(cannonShape);
		body.position.set(mesh.position.x, mesh.position.y, mesh.position.z);
		world.addBody(body);

		objects.push({ mesh: mesh, body: body });
	}
	function animate() {
		requestAnimationFrame(animate);

		// Update the physics world
		var deltaTime = 1 / 60; // Assuming 60 FPS, adjust as necessary
		world.step(deltaTime);

		// Update each mesh position and rotation to match its physics body
		objects.forEach(function (obj) {
			obj.mesh.position.copy(obj.body.position);
			obj.mesh.quaternion.copy(obj.body.quaternion);
		});

		renderer.render(scene, camera);
	}

	requirejs(['domReady!'], function () {
		activity.setup();
		renderer.setSize(window.innerWidth, window.innerHeight / 1.05);
		document.getElementById("board").appendChild(renderer.domElement);
		camera.position.z = 9;
		camera.position.y = 8;
		camera.rotation.x = -Math.PI / 4;
		var ambientLight = new THREE.AmbientLight(0x404040);
		scene.add(ambientLight);

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
		var geometry = new THREE.TetrahedronGeometry(1);
		var mesh = new THREE.Mesh(geometry, material);
		addEdgeLines(mesh);
		addMeshAndBody(mesh, new CANNON.Sphere(0.62)); // Use the bounding sphere as an approximation
	}

	function createCube() {
		var geometry = new THREE.BoxGeometry(1, 1, 1);
		var mesh = new THREE.Mesh(geometry, material);
		addEdgeLines(mesh);
		addMeshAndBody(mesh, new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5)));
	}

	function createOctahedron() {
		var geometry = new THREE.OctahedronGeometry(1);
		var mesh = new THREE.Mesh(geometry, material);
		addEdgeLines(mesh);
		addMeshAndBody(mesh, new CANNON.Sphere(0.62)); // Bounding sphere approximation
	}

	function createDodecahedron() {
		var geometry = new THREE.DodecahedronGeometry(1);
		var mesh = new THREE.Mesh(geometry, material);
		addEdgeLines(mesh);
		addMeshAndBody(mesh, new CANNON.Sphere(0.8)); // Bounding sphere approximation
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
	// Conversion to utilize global objects array for tracking and removal
	function removeObject(selectedObject) {
		// Find corresponding object information in the objects array
		let objectData = objects.find(obj => obj.mesh === selectedObject || obj.mesh.children.includes(selectedObject));
		if (!objectData) {
			return; // Object not found in our tracking array
		}

		// Remove visual representation from the scene
		scene.remove(objectData.mesh);

		// Remove physical body from the physics world
		world.remove(objectData.body);

		// Update the objects array to reflect removal
		objects = objects.filter(obj => obj !== objectData);
	}

	// Attach the click event listener for object removal
	renderer.domElement.addEventListener('click', function (event) {
		if (!clearMode) return; // Skip if we're not in clear mode

		// Calculate mouse position and set up the raycaster
		var mouse = new THREE.Vector2(
			(event.clientX / window.innerWidth) * 2 - 1,
			-(event.clientY / window.innerHeight) * 2 + 1
		);
		var raycaster = new THREE.Raycaster();
		raycaster.setFromCamera(mouse, camera);

		// Perform the raycast to find intersected objects
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