// <============================================ EJERCICIOS ============================================>
// a) Implementar la función:
//
//      GetModelViewProjection( projectionMatrix, translationX, translationY, translationZ, rotationX, rotationY )
//
//    Si la implementación es correcta, podrán hacer rotar la caja correctamente (como en el video). IMPORTANTE: No
//    es recomendable avanzar con los ejercicios b) y c) si este no funciona correctamente. 
//
// b) Implementar los métodos:
//
//      setMesh( vertPos, texCoords )
//      swapYZ( swap )
//      draw( trans )
//
//    Si la implementación es correcta, podrán visualizar el objeto 3D que hayan cargado, asi como también intercambiar 
//    sus coordenadas yz. Para reenderizar cada fragmento, en vez de un color fijo, pueden retornar: 
//
//      gl_FragColor = vec4(1,0,gl_FragCoord.z*gl_FragCoord.z,1);
//
//    que pintará cada fragmento con un color proporcional a la distancia entre la cámara y el fragmento (como en el video).
//    IMPORTANTE: No es recomendable avanzar con el ejercicio c) si este no funciona correctamente. 
//
// c) Implementar los métodos:
//
//      setTexture( img )
//      showTexture( show )
//
//    Si la implementación es correcta, podrán visualizar el objeto 3D que hayan cargado y su textura.
//
// Notar que los shaders deberán ser modificados entre el ejercicio b) y el c) para incorporar las texturas.  
// <=====================================================================================================>



// Esta función recibe la matriz de proyección (ya calculada), una traslación y dos ángulos de rotación
// (en radianes). Cada una de las rotaciones se aplican sobre el eje x e y, respectivamente. La función
// debe retornar la combinación de las transformaciones 3D (rotación, traslación y proyección) en una matriz
// de 4x4, representada por un arreglo en formato column-major. El parámetro projectionMatrix también es 
// una matriz de 4x4 alamcenada como un arreglo en orden column-major. En el archivo project4.html ya está
// implementada la función MatrixMult, pueden reutilizarla. 

function GetModelViewProjection( projectionMatrix, translationX, translationY, translationZ, rotationX, rotationY )
{

	// Matriz de rotacion en X
	var rotX = [
		1, 0, 0, 0,
		0, Math.cos(rotationX), Math.sin(rotationX), 0,
		0, -Math.sin(rotationX), Math.cos(rotationX),0,
		0, 0, 0, 1
	];

	// Matriz de rotacion en Y
	var rotY = [
		Math.cos(rotationY), 0, -Math.sin(rotationY), 0,
		0, 1, 0, 0,
		Math.sin(rotationY), 0, Math.cos(rotationY),0,
		0, 0, 0, 1
	];

	var rotationXY = MatrixMult(rotX, rotY);

	// Matriz de traslación
	var trans = [
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		translationX, translationY, translationZ, 1
	];

	var mvp = MatrixMult( projectionMatrix, trans );

	return MatrixMult(mvp, rotationXY);
}

class MeshDrawer
{
	// El constructor es donde nos encargamos de realizar las inicializaciones necesarias. 
	constructor()
	{
		this.prog = InitShaderProgram(meshVS, meshFS);
		
		// 2. Obtenemos los IDs de las variables uniformes en los shaders

		this.mvp = gl.getUniformLocation(this.prog, 'mvp');

		this.swap = gl.getUniformLocation(this.prog, 'swap');
		
		// Usado para determinar si se usa la textura o el color en el fragment shader
		this.useTexture = gl.getUniformLocation(this.prog, 'useTexture');

		// 3. Obtenemos los IDs de los atributos de los vértices en los shaders

		this.pos = gl.getAttribLocation(this.prog, 'pos');

		this.coord = gl.getAttribLocation(this.prog, 'coord');

		this.buffer = gl.createBuffer();

		this.texCoordsbuffer = gl.createBuffer();

		gl.useProgram(this.prog);

		// Se usa esta matriz por defecto para la funcionalidad de invertir Y y Z que por defecto esta desactivada, por eso
		// usamos la matriz de identidad
		var identityMatrix = [1,0,0,0,
			0,1,0,0,
			0,0,1,0,
			0,0,0,1]
        gl.uniformMatrix4fv(this.swap, false, identityMatrix);

		gl.uniform1i(this.useTexture,0);

		// Por defecto usamos una textura "dummy" con el color todo blanco
		// Para evitar un warning de que no hay textura asociada a la unidad 0 porque se usa en el fragment shader
		// Tambien se podria usar esta textura blanca y multiplicarla por un color en el fragment shader y asociarle el resultado
		// a gl_FragColor, en vez de usar 
		// la variable uniforme de useTexture y tener un condicional. Se podria simplemente al cambiar el estado del checkbox
		// cambiar la textura de la blanca a la que tiene la imagen y el color del blanco a un color a mostrar cuando no se desea mostrar la textura
		this.textura = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D,this.textura);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255,255,255,255]));

		// determina el estado del checkbox para mostrar o no la textura. Arranca por defecto encendido
		this.show = true;
	}
	
	// Esta función se llama cada vez que el usuario carga un nuevo archivo OBJ.
	// En los argumentos de esta función llegan un areglo con las posiciones 3D de los vértices
	// y un arreglo 2D con las coordenadas de textura. Todos los items en estos arreglos son del tipo float. 
	// Los vértices se componen de a tres elementos consecutivos en el arreglo vertexPos [x0,y0,z0,x1,y1,z1,..,xn,yn,zn]
	// De manera similar, las cooredenadas de textura se componen de a 2 elementos consecutivos y se 
	// asocian a cada vértice en orden. 
	setMesh( vertPos, texCoords )
	{
		
		gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordsbuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);

		this.numTriangles = vertPos.length / 3 / 3;
	}
	
	// Esta función se llama cada vez que el usuario cambia el estado del checkbox 'Intercambiar Y-Z'
	// El argumento es un boleano que indica si el checkbox está tildado
	swapYZ( swap )
	{
		gl.useProgram(this.prog);
		if (swap){
			var swap = [1,0,0,0,
			            0,0,1,0,
					    0,1,0,0,
					    0,0,0,1]
			gl.uniformMatrix4fv(this.swap, false, swap);
		} else {
			var identityMatrix = [1,0,0,0,
				                  0,1,0,0,
								  0,0,1,0,
								  0,0,0,1]
			gl.uniformMatrix4fv(this.swap, false, identityMatrix);
		}
	}
	
	// Esta función se llama para dibujar la malla de triángulos
	// El argumento es la matriz de transformación, la misma matriz que retorna GetModelViewProjection
	draw( trans )
	{
		
		// 1. Seleccionamos el shader

		gl.useProgram(this.prog);
	
		// 2. Setear matriz de transformacion
		gl.uniformMatrix4fv(this.mvp, false, trans);

	    // 3.Binding de los buffers

		gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
	
		gl.vertexAttribPointer( this.pos, 3, gl.FLOAT, false, 0, 0 );
		gl.enableVertexAttribArray( this.pos );

		gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordsbuffer);

		gl.vertexAttribPointer( this.coord, 2, gl.FLOAT, false, 0, 0 );
		gl.enableVertexAttribArray( this.coord );
		
		// Dibujamos
		// Solo si hay modelo cargado, para evitar un warning
		if(this.numTriangles > 0){
			gl.drawArrays( gl.TRIANGLES, 0, this.numTriangles * 3);
		}
	}
	
	// Esta función se llama para setear una textura sobre la malla
	// El argumento es un componente <img> de html que contiene la textura. 
	setTexture( img )
	{
		this.textureLoaded = true;
		gl.useProgram(this.prog);
		gl.bindTexture(gl.TEXTURE_2D, this.textura);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE,img);
		gl.generateMipmap(gl.TEXTURE_2D);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.textura);
		var sampler = gl.getUniformLocation(this.prog,'texGPU');
		gl.uniform1i(sampler,0);
		// Si el checkbox para mostrar la textura esta marcado entonces usar la textura
		if(this.show){
			gl.uniform1i(this.useTexture,1);
		}
	}
	
	// Esta función se llama cada vez que el usuario cambia el estado del checkbox 'Mostrar textura'
	// El argumento es un boleano que indica si el checkbox está tildado
	showTexture( show )
	{
		gl.useProgram(this.prog);
		this.show = show;
		if (show && this.textureLoaded){
			gl.uniform1i(this.useTexture,1);
		} else {
			gl.uniform1i(this.useTexture,0);
		}
	}
}

// Vertex Shader
// Si declaras las variables pero no las usas es como que no las declaraste y va a tirar error. Siempre va punto y coma al finalizar la sentencia. 
// Las constantes en punto flotante necesitan ser expresadas como x.y, incluso si son enteros: ejemplo, para 4 escribimos 4.0
var meshVS = `
	attribute vec3 pos;
	attribute vec2 coord;
	uniform mat4 mvp;
	uniform mat4 swap;
	varying vec2 texCoord;
	void main()
	{ 
		gl_Position = mvp * swap * vec4(pos,1) ;
		texCoord = coord;
	}
`;

// Fragment Shader
var meshFS = `
	precision mediump float;
	uniform sampler2D texGPU;
	uniform int useTexture;
	varying vec2 texCoord;
	void main()
	{		
		if (useTexture == 0){
			gl_FragColor = vec4(1,0,gl_FragCoord.z*gl_FragCoord.z,1);
		} else {
			gl_FragColor = texture2D(texGPU,texCoord);
		}
	}
`;
