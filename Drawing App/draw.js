// declares a canvas and temporary canvas and their contexts. TEMPCANVAS
// allow for the drawings to be interactive and retractable
var CANVAS, TEMPCANVAS;
var CONTEXT, TEMPCONTEXT;
var BKGDCONTEXT, BKGDCANVAS;
var PREVIEWCONTEXT, PREVIEWCANVAS; // preview for chosen properties

// declares the tooltype, color, and width
var TOOL;
var COLOR;
var LINEWIDTH;
var HINT;

var EDITCOUNT = -1; // counts how many times user has edited the canvas
var UNDOSTORAGE = []; // array of past saved canvases
var CURRENT; // 2 most recent canvases
var REDOSTORAGE = [] // array of redo canvases

// finds absolute difference between 2 numbers
function diff(x, y) {
	return Math.abs(y - x);
}

function distance(x1, y1, x2, y2) {
	return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
}

// returns the angle (0 at positive x) from point1 to point2
function angle(x1, y1, x2, y2) {
	if (x2 - x1 == 0) {
		if (y2 - y1 > 0) {
			return Math.PI / 2;
		} else {
			return 3 * Math.PI / 2;
		}
	} else if (x2 - x1 < 0) {
		return Math.atan((y2 - y1)/(x2 - x1)) + Math.PI;
	} else if (y2 - y1 < 0) {
		return Math.atan((y2 - y1)/(x2 - x1)) + 2 * Math.PI;
	} else {
		return Math.atan((y2 - y1)/(x2 - x1));
	}
}

// runs init after popup.html loads
document.addEventListener('DOMContentLoaded', function init() {
	// sets up canvases and contexts
	CANVAS = document.getElementById('canvas');
	CONTEXT = CANVAS.getContext('2d');
	TEMPCANVAS = document.getElementById('tempCanvas');
	TEMPCONTEXT = TEMPCANVAS.getContext('2d');
	PREVIEWCANVAS = document.getElementById('preview');
	PREVIEWCONTEXT = PREVIEWCANVAS.getContext('2d');
	BKGDCANVAS = document.getElementById('bkgdCanvas');
	BKGDCONTEXT = BKGDCANVAS.getContext('2d');

	HINT = document.getElementById('hint'); // sets up hint element

	// default TOOL, COLOR, and LINEWIDTH
	TOOL = new Pencil();
	COLOR = '#000000';
	LINEWIDTH = 1;

	previewUpdate(); // draws sample line on preview

	// load previous canvas and background from chrome local storage
	chrome.storage.local.get(handleEdits.newBackup, function(result) {
		if (!(result)) {
			return;
		}
		var img1 = new Image;
		var img2 = new Image;
		img1.onload = function() {
			CONTEXT.drawImage(img1, 0, 0); // draw CANVAS from img1
		}
		img1.src = result['canvas']; // img1's source is from the storage
		img2.onload = function() {
			BKGDCONTEXT.drawImage(img2, 0, 0);
		}
		img2.src = result['background'];
	});

	// listens for changes in tool type
	$('#toolLabel :button').click(function() { 
		var toolSelect = this.value;
		console.log(toolSelect);

		$(this).parent().children().each(function() {
			$(this).css('background-color', '#FFFFFF');
		});
		$(this).css('background-color', '#FFFF00');
		switch (toolSelect) {	
			case 'pencil':
				TOOL = new Pencil();
				EDITCOUNT += 1;
				break;
			case 'line':
				TOOL = new Line();
				break;
			case 'dashedLine':
				TOOL = new DashedLine();
				break;
			case 'arrow':
				TOOL = new Arrow();
				break;
			case 'rect':
				TOOL = new Rect();
				break;
			case 'fill':
				TOOL = new Fill();
				break;
			case 'arc':
				TOOL = new Arc();
				break;
			case 'clearRect':
				TOOL = new ClearRect();
				break;
		}
	});

	// listens for changes in color
	$('#color').change(function() {
		var colorSelect = this.value;
		console.log(colorSelect);
		COLOR = colorSelect;
		previewUpdate();
	})

	// listns for the width slider
	$('#widthSlider').slider({
		min: 1,
		max: 20,
		range: 'min',
		orientation: 'vertical',
		animate: true,
      	slide: function(event, ui) {
        	LINEWIDTH = ui.value - 1; // Sets LINEWIDTH from position
        	previewUpdate();
        	console.log(LINEWIDTH);
    	}
	});

	//listens for changes in bkgd select options
	$('#bkgd').change(function() {
		var backgroundSelect = this.value;
		console.log(backgroundSelect);
		$('#upload').prop('value', 'Image Upload'); // Changes button content to Image Upload
		// disable the input elements, and turn off eventlisteners
		$('#rows, #columns, #xAxis, #yAxis').off('change')
											.prop('disabled', true)
											.val('');
		$('#xAxisLabel, #yAxisLabel').html('');
		BKGDCONTEXT.clearRect(0, 0, BKGDCANVAS.width, BKGDCANVAS.height); 
		switch (backgroundSelect) {
			case 'none':
				handleEdits();
				break;
			case 'grid': // if grids for bkgd, enable only rows and columns
				$('#rows, #columns').change(function() { // listens to change on the bkgd inputs
					console.log('bkgd setting change');
					getGridfromInput(this); // makes grid with inputs
					handleEdits();
				}).prop('disabled', false); // enable rows and columns
				break;
			case 'axis': // if axes for bkgd, enable all options
				$('#rows, #columns, #xAxis, #yAxis').change(function() { // listens to change on the bkgd inputs
					console.log('bkgd setting change');
					getGridfromInput(this); // makes axes with inputs
					handleEdits();
				}).prop('disabled', false); // enable rows, columns, xAxis, yAxis
				break;
			case 'file':
				$('#upload').prop('value', 'Upload Background'); // Changes button content to Upload Background
				break;
		}
	});
	
	function getGridfromInput(inputs) { // gets inputs' values and plug them into makeGrid
		makeGrid(parseInt(inputs.parentNode.rows.value), parseInt(inputs.parentNode.columns.value), inputs.parentNode.xAxis.value, inputs.parentNode.yAxis.value);
		console.log('getgridfrominput: ' + inputs.parentNode.xAxis.value)
	}


	// reads the image file the when upload is clicked
	$('#upload').click(function() {
						upload();
					   }
				);

	//Calls canvasEvent upon event. canvasEvent handles and distinguishes events (e)
	TEMPCANVAS.addEventListener('mousemove', canvasEvent, true);
	TEMPCANVAS.addEventListener('mousedown', canvasEvent, true);
	TEMPCANVAS.addEventListener('mouseup', canvasEvent, true);
	TEMPCANVAS.addEventListener('mouseout', canvasEvent, true);

	TEMPCANVAS.addEventListener('dblclick', inputText, true); // calls inputText for typing text upon doubleclick

	// checks if device supports touch features and adds touch listeners if isTouchDevice
	if ("ontouchstart" in window || window.DocumentTouch && document instanceof DocumentTouch) {
		TEMPCANVAS.addEventListener('touchstart', canvasEvent, true);
		TEMPCANVAS.addEventListener('touchmove', canvasEvent, true);
		TEMPCANVAS.addEventListener('touchend', canvasEvent, true);
	}

	// listener for ctrl-z to undo
	$(document).keydown(function(e) {
		if (e.which == 90 && e.ctrlKey) { // if z and ctrl are pressed
			undo();
		}
	});

	// listener for ctrl-y to redo
	$(document).keydown(function(e) {
		if (e.which == 89 && e.ctrlKey) { // if z and ctrl are pressed
			redo();
		}
	});

	// listeners on page elements
	document.getElementById('clearCanvas').addEventListener('click', function() {
		if (confirm('Are you sure you want to erase EVERYTHING on the canvas?')) { // confirm with user before clearing
			CONTEXT.clearRect(0, 0, CANVAS.width, CANVAS.height);
			handleEdits();
		}
	});
	document.getElementById('clearBkgd').addEventListener('click', function() {
		if (confirm('Are you sure you want to erase EVERYTHING on the background canvas?')) { // confirm with user before clearing
			BKGDCONTEXT.clearRect(0, 0, BKGDCANVAS.width, BKGDCANVAS.height);
			handleEdits();
		}
	});
	document.getElementById('downloadButton').addEventListener('click', download);
	document.getElementById('closeWindow').addEventListener('click', closeWindow);
});

// downloads image from canvas
function download() {
	console.log('download');
	TEMPCONTEXT.drawImage(CANVAS, 0, 0);
	TEMPCONTEXT.drawImage(BKGDCANVAS, 0, 0);
	document.getElementById('downloadButton').href = TEMPCANVAS.toDataURL(); // sets download image to TEMPCANVAS picture
	TEMPCONTEXT.clearRect(0, 0, TEMPCANVAS.width, TEMPCANVAS.height);
}

// counts edits and back up canvas every 5 edits as well as first 10 edits, keeps total edits below 10
function handleEdits() {
	var undoLen;
	EDITCOUNT++;

	// new object with canvas and background info
	var newBackup = {'editcount': EDITCOUNT,
					 'canvas': CONTEXT.getImageData(0, 0, CANVAS.width, CANVAS.height),
					 'background': BKGDCONTEXT.getImageData(0, 0, BKGDCANVAS.width, BKGDCANVAS.height)
	};
	REDOSTORAGE.length = 0;
    if (EDITCOUNT % 5 !== 0 && EDITCOUNT > 12) { // Keeps an immediate backup of 12 edits
        UNDOSTORAGE.splice(12, 1);
    }
    undoLen = UNDOSTORAGE.unshift(CURRENT) // add new backup to beginning of UNDOSTORAGE, returns the new length
	
    CURRENT = newBackup; // sets the current edit
	if (undoLen > 20) {
		UNDOSTORAGE.pop(); // remove elements from the end if too much storage
	}
	// backs up to chrome local storage
	chrome.storage.local.set({'canvas': CANVAS.toDataURL(),
							  'background': BKGDCANVAS.toDataURL()
	});
}

// revert canvases to a previously saved state
function undo() {
	var last = UNDOSTORAGE.shift(); // removes most recent history from beginning of UNDOSTORAGE
	if (last) { // checks if last is undefined
	 	var redoLen = REDOSTORAGE.unshift(CURRENT); // add CURRENT to REDOSTORAGE
		if (redoLen > 20) {
			REDOSTORAGE.pop();
		}
		CURRENT = last; // replace CURRENT with previous history
		EDITCOUNT = CURRENT.editcount;
		CONTEXT.putImageData(CURRENT.canvas, 0, 0);
		BKGDCONTEXT.putImageData(CURRENT.background, 0, 0);
	}
}

// redo to reverse the last undo
function redo() {
	var next = REDOSTORAGE.shift(); // removes most recently undone history from REDOSTORAGE
	if (next) {
		var undoLen = UNDOSTORAGE.unshift(CURRENT); // adds current to UNDOSTORAGE
		if (undoLen > 20) {
			UNDOSTORAGE.pop();
		}
		CURRENT = next; // replaces current with the history stored in REDOSTORAGE
		EDITCOUNT = CURRENT.editcount;
		CONTEXT.putImageData(CURRENT.canvas, 0, 0);
		BKGDCONTEXT.putImageData(CURRENT.background, 0, 0);
	}
}

// uploads a image to canvas
function upload() {
	var canvas;
	var context;
	var uploadValue = $('#upload').val(); // checks uploadValue to determine which canvas
	console.log(uploadValue);
	if (uploadValue === 'Image Upload') {
		canvas = CANVAS;
		context = CONTEXT;
	} else {
		canvas = BKGDCANVAS;
		context = BKGDCONTEXT;
	}
	var file = document.getElementById('bkgdImage').files[0]; // get the file from the bkgdImage
	var reader = new FileReader();
	reader.onload = function(event) { // after reader loads, read file
		var img = new Image(); // new image element img
		img.onload = function() { // after img loads:
			context.drawImage(img, 0, 0); // draw image onto canvas
			handleEdits();
		}
		img.src = event.target.result; // set source of img to the file
	}
	reader.readAsDataURL(file); // converts file to dataURL
}

// Updates the preview canvas when user changes the properties
function previewUpdate() {
	PREVIEWCONTEXT.clearRect(0, 0, PREVIEWCANVAS.width, PREVIEWCANVAS.height);
	PREVIEWCONTEXT.beginPath();
	PREVIEWCONTEXT.moveTo(0, PREVIEWCANVAS.height / 2);
	PREVIEWCONTEXT.lineTo(PREVIEWCANVAS.width, PREVIEWCANVAS.height / 2);
	PREVIEWCONTEXT.strokeStyle = COLOR; // sets color
	PREVIEWCONTEXT.lineWidth = LINEWIDTH; // sets width
	PREVIEWCONTEXT.stroke(); // draws the line in
	PREVIEWCONTEXT.stroke(); 
	PREVIEWCONTEXT.stroke(); 
	PREVIEWCONTEXT.stroke(); 
}

// draws the images from TEMPCANVAS to CANVAS then erases TEMPCANVAS
function imageUpdate() {
	CONTEXT.drawImage(TEMPCANVAS, 0, 0); // draw image from TEMPCANVAS to CANVAS
	TEMPCONTEXT.clearRect(0, 0, TEMPCANVAS.width, TEMPCANVAS.height); // clear TEMPCANVAS
}

// shows the typed text in a textbox
function inputText(e) {
	// selects the input with id textBox and move it to click location
	$('#textBox').css({'top': e.pageY + 'px', 
					   'left': e.pageX + 'px', 
					   'font-size': LINEWIDTH * 10 + 'px', 
					   'display': 'block', // shows the input box
					   'width': CANVAS.width - e.pageX + CANVAS.offsetLeft})
				 .focus() // focus to allow typing
				 .blur(function() { // call createText when unfocus
				 	createText($(this).val(), e.pageX, e.pageY)
				 	}
				 ).on('keyup', function(e) { // scroll left automatically
				 	if (e.which > 46) {
				 		$(this).val(parseSymbols($(this).val())); // check typed value for symbols
				 	}
				 	$(this).scrollLeft(0); // keep focusing on the left side of the text
				 });
}

// replaces symbols with unicode symbols
function parseSymbols(text) {
	var operDict = [ // dictionary that is always checked
		['<=', '\u2264'],
		['>=', '\u2265'],
		['|=', '\u2260'],
		['+-', '\xB1']
		
	]
	var charDict = [ // dictionary that is only checked if \\ is detected
		['\\degree', '\xB0'],
		['\\dot', '\u2219'],
		['\\sqrt', '\u221A'],
		['\\cubert', '\u221B'],
		['\\fourthrt', '\u221C'],
		['\\prop', '\u221D'],
		['\\inf', '\u221E'],
		['\\union', '\u222A'],
		['\\intersect', '\u2229'],
		['\\int', '\u222B'],
		['\\doubleint', '\u222C'],
		['\\tripleint', '\u222D'],
		['\\partial', '\u2202'],
		['\\nabla', '\u2207'],
		['\\about', '\u2248'],
		['\\Delta', '\u0394'],
		['\\Theta', '\u0398'],
		['\\Pi', '\u03A0'],
		['\\Sigma', '\u03A3'],
		['\\Phi', '\u03A6'],
		['\\Psi', '\u03A8'],
		['\\Omega', '\u03A9'],
		['\\alpha', '\u03B1'],
		['\\beta', '\u03B2'],
		['\\gamma', '\u03B3'],
		['\\delta', '\u03B4'],
		['\\epsilon', '\u03B5'],
		['\\theta', '\u03B8'],
		['\\kappa', '\u03BA'],
		['\\lambda', '\u03BB'],
		['\\mu', '\xB5'],
		['\\nu', '\u03BD'],
		['\\pi', '\u03C0'],
		['\\rho', '\u03C1'],
		['\\sigma', '\u03C3'],
		['\\tau', '\u03C4'],
		['\\phi', '\u03D5'],
		['\\omega', '\u03C9']
	]
	for (var i = 0; i < operDict.length; i++) { // loops thru operDict
	    text = text.replace(operDict[i][0], operDict[i][1]);
	    console.log(operDict[i]);
	}
	var slashIndex = text.indexOf('\\'); // find the index of the slash
	if (slashIndex !== -1) {
		var last = text.slice(slashIndex);
		for (var j = 0; j < charDict.length; j++) { // loops thru charDict
		    last = last.replace(charDict[j][0], charDict[j][1]); // look after slash for special symbols
		    console.log(charDict[j]);
		}
		text = text.slice(0, slashIndex) + last; // add first part to last part again
	}
	return text;
}

// translates the text in textBox to CANVAS
function createText(text, x, y) {
	CONTEXT.fillStyle = COLOR;
  	CONTEXT.font = LINEWIDTH * 10 + "px Arial";screen
  	CONTEXT.fillText(text, x + 0.02 * LINEWIDTH - 1.02, y + 10.547 * LINEWIDTH - 0.547); // sets location on CANVAS
  	$('#textBox').off('blur').css({'display': 'none'}).val(''); // make textBox disappear
  	handleEdits();
}

// draws grids and axes on BKGDCANVAS
function makeGrid(rows, columns, xAxis, yAxis) {
	var width = BKGDCANVAS.width / (columns + 1);
	var height = BKGDCANVAS.height / (rows + 1);
	BKGDCONTEXT.clearRect(0, 0, BKGDCANVAS.width, BKGDCANVAS.height);
	for (var i = 1; i <= rows; i++) { // draws horizontal lines
		BKGDCONTEXT.beginPath();
		BKGDCONTEXT.moveTo(0, i * height);
		BKGDCONTEXT.lineTo(BKGDCANVAS.width, i * height);
		BKGDCONTEXT.lineWidth = 1;
		BKGDCONTEXT.stroke();
	}
	for (var j = 1; j <= columns; j++) { // draws vertical lines
		BKGDCONTEXT.beginPath();
		BKGDCONTEXT.moveTo(j * width, 0);
		BKGDCONTEXT.lineTo(j * width, BKGDCANVAS.height);
		BKGDCONTEXT.lineWidth = 1;
		BKGDCONTEXT.stroke();
	}
	if (xAxis) { // draws xAxis if its name is specified
		BKGDCONTEXT.beginPath();
		BKGDCONTEXT.moveTo(0, height * (Math.floor(rows / 2) + 1));
		BKGDCONTEXT.lineTo(BKGDCANVAS.width, height * (Math.floor(rows / 2) + 1));
		BKGDCONTEXT.lineWidth = 3;
		BKGDCONTEXT.stroke();
		$('#xAxisLabel').html(xAxis).css('top', height * (Math.floor(rows / 2) + 1) - 5);
	}
	if (yAxis) { // draws yAxis if name is specified
		BKGDCONTEXT.beginPath();
		BKGDCONTEXT.moveTo(width * (Math.floor(columns / 2) + 1), 0);
		BKGDCONTEXT.lineTo(width * (Math.floor(columns / 2) + 1), BKGDCANVAS.height);
		BKGDCONTEXT.lineWidth = 3;
		BKGDCONTEXT.stroke();
		$('#yAxisLabel').html(yAxis).css('left', width * (Math.floor(columns / 2) + 1) + 10);
	}
}

//Pencil class
function Pencil() {
	var tool = this; // tool is an instance of Pencil

	this.started = false; // no actions taken yet
	
	this.mousedown = function(e) {
		TEMPCONTEXT.beginPath(); 
		TEMPCONTEXT.moveTo(e.canvasX, e.canvasY); // sets start point
        TEMPCONTEXT.strokeStyle = COLOR; // sets color
        TEMPCONTEXT.lineWidth = LINEWIDTH; // sets width
		tool.started = true; 
	}
	this.mousemove = function(e) {
		if (tool.started) {
			TEMPCONTEXT.lineTo(e.canvasX, e.canvasY); // determine line end point
			TEMPCONTEXT.stroke(); // draws the line in
		}
	}
	this.mouseup = function(e) {
		if (tool.started) {
			imageUpdate(); // transfers the drawing from TEMPCANVAS to CANVAS
			tool.started = false; // ends the line
			TOOL = new Pencil();
		}
	}
}

// Rect (rectangle) class
function Rect() {
	var tool = this
	this.started = false;

	// chooses color then strokes rectangles into TEMPCONTEXT
	this.toolFunc = function(x, y, w, h) {
		TEMPCONTEXT.strokeRect(x, y, w, h);
		TEMPCONTEXT.strokeRect(x, y, w, h);
		TEMPCONTEXT.strokeRect(x, y, w, h);
		TEMPCONTEXT.strokeRect(x, y, w, h);
	}
	
	// chooses start points of rectangle when mouse clicks down
	this.mousedown = function(e) {
		tool.startX = e.canvasX;
		tool.startY = e.canvasY;
		TEMPCONTEXT.strokeStyle = COLOR;
		TEMPCONTEXT.lineWidth = LINEWIDTH;
		tool.started = true;
	}

	this.mousemove = function(e) {
		if (tool.started) {
			TEMPCONTEXT.clearRect(0, 0, TEMPCANVAS.width, TEMPCANVAS.height); // clears TEMPCANVAS
			// draws rectangle in TEMPCANVAS (so its retractable and follows user's mouse)
			tool.toolFunc(Math.min(tool.startX, e.canvasX), 
						  Math.min(tool.startY, e.canvasY), 
						  diff(tool.startX, e.canvasX), 
						  diff(tool.startY, e.canvasY));
		}
	}
	this.mouseup = function(e) { // when user releases click
		if (tool.started) {
			imageUpdate(); // transfers the drawing from TEMPCANVAS to CANVAS
			TOOL = new Rect();
		}
	}
}

// ClearRect class (clears a rectangular region)
function ClearRect() {
	var tool = this;

	// clears a rectangle with top left corner at (x, y), width of w, height of h
	this.toolFunc = function(x, y, w, h) {
        
        TEMPCONTEXT.clearRect(x, y, w, h)
	}

	this.mousedown = function(e) {
		Object.getPrototypeOf(tool).mousedown(e); // inherits from mousedown of Rect
		TEMPCONTEXT.drawImage(CANVAS, 0, 0); // copies CANVAS to TEMPCANVAS
		tool.started = true;
	}
	this.mousemove = function(e) {
		if (tool.started) {
			TEMPCONTEXT.clearRect(0, 0, TEMPCANVAS.width, TEMPCANVAS.height); // clears TEMPCANVAS
			document.getElementById('canvas').style.opacity = 0; // sets CANVAS to invisible
			TEMPCONTEXT.drawImage(CANVAS, 0, 0); // copies CANVAS to TEMPCANVAS
			// clears a rectangle from startXY to current location
			tool.toolFunc(Math.min(tool.startX, e.canvasX), 
						  Math.min(tool.startY, e.canvasY), 
						  diff(tool.startX, e.canvasX), 
						  diff(tool.startY, e.canvasY)); 
		}
	}
	this.mouseup = function(e) {
		if (tool.started) {
			CONTEXT.clearRect(0, 0, TEMPCANVAS.width, TEMPCANVAS.height); // clear CANVAS
			imageUpdate(); // copies TEMPCANVAS to CANVAS and clears TEMPCANVAS
			document.getElementById('canvas').style.opacity = 1; // makes CANVAS visible again
			ClearRect.prototype = new Rect();
			TOOL = new ClearRect();
		}
	}
}
ClearRect.prototype = new Rect(); // ClearRect inherits from Rect tool

// Line class
function Line() {
	var tool = this;
	// initializes and draws a lien from startXY to endxy on TEMPCANVAS
	this.toolFunc = function(endx, endy) {
		TEMPCONTEXT.beginPath();
		TEMPCONTEXT.moveTo(tool.startX, tool.startY);
		TEMPCONTEXT.lineTo(endx, endy);
		TEMPCONTEXT.stroke(); // repeated for more bold
		TEMPCONTEXT.stroke();
		TEMPCONTEXT.stroke();
		TEMPCONTEXT.stroke();
	}
	// sets startXY to where mouse clicks down
	this.mousedown = function(e) {
		tool.startX = e.canvasX;
		tool.startY = e.canvasY;
		TEMPCONTEXT.strokeStyle = COLOR; // sets color
		TEMPCONTEXT.lineWidth = LINEWIDTH;
		tool.started = true;
	}
	this.mousemove = function(e) {
		if (tool.started) {
			// clears TEMPCANVAS then draws from CANVAS
			TEMPCONTEXT.clearRect(0, 0, TEMPCANVAS.width, TEMPCANVAS.height);
			TEMPCONTEXT.drawImage(CANVAS, 0, 0);
			tool.toolFunc(e.canvasX, e.canvasY); // draws line from start to current location
		}
	}
	this.mouseup = function(e) {
		if (tool.started) {
			imageUpdate(); // transfer TEMPCANVAS to CANVAS
			TOOL = new Line();
		}
	}
}

function DashedLine() {
	var tool = this;
	this.lineLen = 12;
	this.spaceLen = 7;
	this.toolFunc = function(endx, endy) {
		// calculate how many dashes there should be
		var dist = distance(tool.startX, tool.startY, endx, endy);
		var repeat = Math.floor(dist/(tool.lineLen + tool.spaceLen));

		// calculate total change in x and y
		var xDisp = endx - tool.startX;
		var yDisp = endy - tool.startY;

		// calculate the change in x and y of a dash and a space combined
		var dx = xDisp / repeat;
		var dy = yDisp / repeat;

		// calculate the faction of dx and dy that is line
		var fracLine = tool.lineLen / (tool.lineLen + tool.spaceLen);
		
		// starts path
		TEMPCONTEXT.beginPath();
		
		for (i = 0; i < repeat; i++) { // moves and draws each segment
			TEMPCONTEXT.moveTo(tool.startX + i * dx, tool.startY + i * dy);
			TEMPCONTEXT.lineTo(tool.startX + (i + fracLine) * dx, tool.startY + (i + fracLine) * dy);
		}

		TEMPCONTEXT.stroke(); // repeated for more bold
		TEMPCONTEXT.stroke();
		TEMPCONTEXT.stroke();
		TEMPCONTEXT.stroke();
	}
	// sets startXY to where mouse clicks down
	this.mousedown = function(e) {
		Object.getPrototypeOf(tool).mousedown(e); // Line object's mousedown
		Object.getPrototypeOf(tool).toolFunc = tool.toolFunc; // replace Line's toolFunc
	}
	this.mouseup = function(e) {
		if (tool.started) {
			imageUpdate(); // transfer TEMPCANVAS to CANVAS
			DashedLine.prototype = new Line();
			TOOL = new DashedLine();
		}
	}
}
DashedLine.prototype = new Line(); // prototype of DashedLine is Line

function Arrow() {
	var tool = this;
	this.toolFunc = function(endx, endy) {
		var arrowLen = Math.log(LINEWIDTH + 1) * 15; // sets the arrow's sides' lengths based on width

		TEMPCONTEXT.beginPath(); // draws the line
		TEMPCONTEXT.moveTo(tool.startX, tool.startY);
		TEMPCONTEXT.lineTo(endx, endy);
		
		var lineAng = angle(tool.startX, tool.startY, endx, endy); // angle of the line
		var arrowAng1 = lineAng + Math.PI / 9; // angle of one side of the arrow tip
		var arrowAng2 = lineAng - Math.PI / 9; // angle of the other side
		
		// use angles to calculate and draw the arrow tips
		TEMPCONTEXT.lineTo(endx - arrowLen * Math.cos(arrowAng1), endy - arrowLen * Math.sin(arrowAng1));
		TEMPCONTEXT.moveTo(endx, endy);
		TEMPCONTEXT.lineTo(endx - arrowLen * Math.cos(arrowAng2), endy - arrowLen * Math.sin(arrowAng2));

		TEMPCONTEXT.stroke(); // repeated for more bold
		TEMPCONTEXT.stroke();
		TEMPCONTEXT.stroke();
		TEMPCONTEXT.stroke();
	}
	this.mousedown = function(e) {
		Object.getPrototypeOf(tool).mousedown(e); // Line object's mousedown
		Object.getPrototypeOf(tool).toolFunc = tool.toolFunc; // replace Line's toolFunc
	}
	this.mouseup = function(e) {
		if (tool.started) {
			imageUpdate(); // transfer TEMPCANVAS to CANVAS
			Arrow.prototype = new Line(); // resets the prototype
			TOOL = new Arrow();
		}
	}
}
Arrow.prototype = new Line();

// Flood fill tool
function Fill() {
	var tool = this;
	// returns a representation of the color of the point (x, y) on img
    function getPixelColor(img, x, y) {
    	var data = img.data;
	    var offset = (y * img.width + x) * 4; // start index of the pixel (x, y) in the data array
	    var result = data[offset] << 32; // bit manipulate r
	    result |= data[offset + 1] << 24; // bit manipulate g and merge it to r
	    result |= data[offset + 2] << 16; // b
	    result |= data[offset + 3] << 8; // a
	    return result;
	}
	// sets the color of a point (x, y) on img with a color representation
	function setPixelColor(img, x, y, color) {
		var data = img.data;
	    var offset = (y * img.width + x) * 4; // start index of the pixel (x, y) in the data array
	    data[offset] = (color >> 32) & 0xFF; // // bit manipulate and set r
	    data[offset + 1] = (color >> 24) & 0xFF; // bit manipulate and set g
	    data[offset + 2] = (color >> 16) & 0xFF; // b
	    data[offset + 3] = (color >>  8) & 0xFF; // a
	}
    this.mousedown = function(e) {
    	// get desired color's fillData from the preview's appearance
		var fillData = PREVIEWCONTEXT.getImageData(PREVIEWCANVAS.width / 2, PREVIEWCANVAS.height / 2, 1, 1);
		this.fillColor = getPixelColor(fillData, 0, 0); // color representation of the desired color
		tool.started = true;
	}
	this.mouseup = function(e) {
		if (tool.started) { // has to be after mousedown
			var fillColor = this.fillColor; // color representation of desired color
			var W = CANVAS.width; // canvas width
			var H = CANVAS.height;
			var x = e.canvasX; // x of the click
	        var y = e.canvasY; // y of the click
	        var dx = [-1, 0, +1, 0]; // array of next point's x
    		var dy = [0, -1, 0, +1]; // array of next point's y
	        var img = CONTEXT.getImageData(0, 0, CANVAS.width, CANVAS.height); // data of the whole canvas
	        var hitColor = getPixelColor(img, x, y); // color representation of the clicked pixel
	        var stack = []; // array of points that need to be changed
	        if (hitColor === fillColor) { // if the clicked pixel is same color as desired color, end the function
	        	TOOL = new Fill();
	        	return
	        }
	        stack.push(x); // add clicked point coordinates to stack
	        stack.push(y);
	        setPixelColor(img, x, y, fillColor);  // change clicked pixel
	        while (stack.length > 0) { // while there are still pixels to be changed
	            var curY = stack.pop(); // pop the last pixel Y value
	            var curX = stack.pop(); // pop the last pixel X value
	            // add the pixels on top, bottom, left, and right to stack if they qualify
	            for (var i = 0; i < 4; i++) {
	            	var nextX = curX + dx[i];
	            	var nextY = curY + dy[i];
	            	// if pixel is out of bound or a different color than the clicked, then don't include it in stack
	                if (nextX < 0 || nextY < 0 || nextX >= W || nextY >= H || (getPixelColor(img, nextX, nextY) !== hitColor)) {
	                    continue;
	                }
	                setPixelColor(img, nextX, nextY, fillColor); // change color of qualified pixels into the data
	                stack.push(nextX); // add qualified pixel to the stack
	                stack.push(nextY);
	            }
	        }
	        CONTEXT.putImageData(img, 0, 0); // add the data of the whole canvas back to the canvas
		}
		TOOL = new Fill();
	}
}

// circular Arc class
function Arc() {
	var tool =  this;
	this.center = false; // no center set
	this.radius = false; // no radius set
	this.direction = false; // default direction = ccw
	this.toolFunc = function(endx, endy) {
		var angleDiff;
		var radius = distance(tool.centerX, tool.centerY, endx, endy);
		
		tool.secondAngle = angle(tool.centerX, tool.centerY, endx, endy); // calculates the end angle

		// if second point radius bigger, go ccw around the circle
		tool.direction = (radius > tool.radius);

		// if second angle is closer than 0.1 radians to first angle, default to full circle
		if (diff(tool.secondAngle, tool.firstAngle) < 0.1 || diff(tool.secondAngle, tool.firstAngle) > Math.PI * 2 - 0.1) {
			tool.secondAngle = tool.firstAngle + Math.PI * 2;
		}

		// calculates the displayed angle difference from first to second point
		angleDiff = Math.round(100 * (tool.secondAngle + ((tool.firstAngle > tool.secondAngle) ? 2 * Math.PI : 0) - tool.firstAngle) * 180 / Math.PI) / 100;
		
        // if counterclockwise trace, subtract angle from 360 degrees
		if (tool.direction) {
			angleDiff = Math.round(100 * (360 - angleDiff)) / 100;
			if (angleDiff === 0) {
				angleDiff = 360; // if angle at 360 degrees, keep it at 360 degrees
			}
		}
		HINT.innerHTML = angleDiff + '\xB0'; // displays the angle in text with a degree sign

		// draws in arc
		TEMPCONTEXT.beginPath();
		//Specifies the center, radius, start angle (angle in radians), end angle, false= clockwise
		TEMPCONTEXT.arc(tool.centerX, tool.centerY, tool.radius, tool.firstAngle, tool.secondAngle, tool.direction);
		TEMPCONTEXT.stroke();
		TEMPCONTEXT.stroke();

	}
	// sets centerXY to where mouse clicks down
	this.mousedown = function(e) {
		if (!tool.center) { // before the center is set
			tool.centerX = e.canvasX;
			tool.centerY = e.canvasY;

			// draws a marker at the center point
			TEMPCONTEXT.beginPath();
			TEMPCONTEXT.strokeStyle = '#000000';
			TEMPCONTEXT.lineWidth = 1;
			TEMPCONTEXT.moveTo(tool.centerX + 4, tool.centerY);
			TEMPCONTEXT.lineTo(tool.centerX - 4, tool.centerY);
			TEMPCONTEXT.moveTo(tool.centerX, tool.centerY + 4);
			TEMPCONTEXT.lineTo(tool.centerX, tool.centerY - 4);
			TEMPCONTEXT.stroke();
            
            TEMPCONTEXT.strokeStyle = COLOR; // sets color
            TEMPCONTEXT.lineWidth = LINEWIDTH;

			tool.center = true; // center has been set
		} else { // after center is set, choose first point of arc
			tool.firstAngle = angle(tool.centerX, tool.centerY, e.canvasX, e.canvasY); // angle of 1st point
			tool.radius = distance(e.canvasX, e.canvasY, tool.centerX, tool.centerY); // radius of 1st point
			TEMPCONTEXT.clearRect(tool.centerX - 4, tool.centerY - 4, 8, 8); // clears center marker
			HINT.innerHTML = '';
		}
	}
	this.mousemove = function(e) {
		HINT.style.left = (e.pageX + 5) + 'px';
		HINT.style.top = (e.pageY + 5) + 'px';
		if (tool.center && tool.radius) {
			// clears TEMPCANVAS then draws from CANVAS
			TEMPCONTEXT.clearRect(0, 0, TEMPCANVAS.width, TEMPCANVAS.height);
			TEMPCONTEXT.drawImage(CANVAS, 0, 0);
			tool.toolFunc(e.canvasX, e.canvasY); // draws arc from start to current location
		} else if (!tool.center) { // set hint to 'choose center' if center has not been chosen
			HINT.innerHTML = 'choose center';
		} else { // set hint to 'choose start point' if center set but radius not set
			HINT.innerHTML = 'click arc start point then hold/drag';
		}
	}
	this.mouseup = function(e) {
		if (tool.center && tool.radius) {
			imageUpdate(); // transfer TEMPCANVAS to CANVAS
			TOOL = new Arc();
			HINT.innerHTML = ''; // clears HINT
		}
	}
	this.mouseout = function(e) {
		HINT.innerHTML = ''; // clears HINT if mouse is out of screen
	}
}

//Used to handle different events
function canvasEvent(e) {
	var incrementEdit = false; // whether or not to add 1 to number of edits and store edit
	//Gets coordinates and set them as attributes of e
	e.canvasX = e.pageX - CANVAS.offsetLeft;
	e.canvasY = e.pageY - CANVAS.offsetTop;
	// console.log(e.type);
	
	// sets actions to 
	var action = TOOL[e.type];

	// touchscreen interface
    switch(e.type) {
        case 'touchend':
            e.canvasX = e.changedTouches[0].pageX; // gets touch coordinates
            e.canvasY = e.changedTouches[0].pageY;
            incrementEdit = true; // increment EDITCOUNT only on touchend and mouseup
            action = TOOL['mouseup'];
            break;
        case 'touchstart':
            e.canvasX = e.touches[0].pageX;
            e.canvasY = e.touches[0].pageY;
            action = TOOL['mousedown'];
            break;
        case 'touchmove':
            e.canvasX = e.touches[0].pageX;
            e.canvasY = e.touches[0].pageY;
            action = TOOL['mousemove'];
            break;
        case 'mouseup':
            incrementEdit = true;
            break;
	}

	//Checks that the function exists and chooses the function to use
	//based on the type of the event
	if (action) {
		action(e);
		if (incrementEdit) {
			handleEdits();
		}
	}
}

//Closes the window
function closeWindow() {
	handleEdits();
	location.reload();
	window.close();
}
