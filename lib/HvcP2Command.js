/* ------------------------------------------------------------------
* node-omron-hvc-p2 - HvcP2Command.js
* Date: 2017-06-23
* ---------------------------------------------------------------- */
'use strict';

/* ------------------------------------------------------------------
* Constructor: HvcP2Image()
* ---------------------------------------------------------------- */
const HvcP2Command = function() {
	// Plublic properties

	// Private properties

};

/* ------------------------------------------------------------------
* Method: parse(cn, buf, params)
* ---------------------------------------------------------------- */
HvcP2Command.prototype.parse = function(cn, buf, params) {
	if(!buf || buf.length < 6 || buf.readUInt8(0) !== 0xFE) {
		return {error: new Error('Unexpected data was received. (1)')};
	}
	let data_length = buf.readInt32LE(2);
	if(buf.length !== data_length + 6) {
		return {error: new Error('Unexpected data was received. (2)')};
	}
	let code = buf.readUInt8(1);
	if(code > 0) {
		let message = this._getResponseCodeMessage(code) + ' (0x' + buf.slice(1, 2).toString('hex') + ')';
		return {error: new Error(message)};
	}

	let dbuf = buf.slice(6);
	let parsed = null;
	if(cn === 0x00) {
		// Get Model and Version
		parsed = this._parse00(dbuf);
	} else if(cn === 0x01) {
		// Set Camera Angle
		parsed = this._parse01(dbuf);
	} else if(cn === 0x02) {
		// Get Camera Angle
		parsed = this._parse02(dbuf);
	} else if(cn === 0x04) {
		// Execute detection
		parsed = this._parse04(dbuf, params);
	} else if(cn === 0x05) {
		// Set Threshold Values
		parsed = this._parse05(dbuf);
	} else if(cn === 0x06) {
		// Get Threshold Values
		parsed = this._parse06(dbuf);
	} else if(cn === 0x07) {
		// Set Detection Size
		parsed = this._parse07(dbuf);
	} else if(cn === 0x08) {
		// Get Detection Size
		parsed = this._parse08(dbuf);
	} else if(cn === 0x09) {
		// Set Face Angle
		parsed = this._parse09(dbuf);
	} else if(cn === 0x0A) {
		// Get Face Angle
		parsed = this._parse0A(dbuf);
	} else if(cn === 0x10) {
		// Register Data (Face Recognition)
		parsed = this._parse10(dbuf);
	} else if(cn === 0x11) {
		// Delete Specified Data (Face Recognition)
		parsed = this._parse11(dbuf);
	} else if(cn === 0x12) {
		// Delete Specified User (Face Recognition)
		parsed = this._parse12(dbuf);
	} else if(cn === 0x13) {
		// Delete All Data (Face Recognition)
		parsed = this._parse13(dbuf);
	} else if(cn === 0x15) {
		// Get Registration Info (Face Recognition)
		parsed = this._parse15(dbuf);
	} else if(cn === 0x20) {
		// Save Album (Face Recognition)
		parsed = this._parse20(dbuf);
	} else if(cn === 0x21) {
		// Load Album (Face Recognition)
		parsed = this._parse21(dbuf);
	} else if(cn === 0x22) {
		// Save Album in Flash ROM (Face Recognition)
		parsed = this._parse22(dbuf);
	} else if(cn === 0x30) {
		// Reformat Flash ROM (Face Recognition)
		parsed = this._parse30(dbuf);
	} else {
		return {error: new Error('Unknown command number: 0x' + Buffer.from([cn]).toString('hex'))};
	}

	if(parsed['data']) {
		return {data: parsed['data']};
	} else if(parsed['error']) {
		return {error: parsed['error']};
	} else {
		return {error: new Error('Failed to parse the received data.')};
	}
};

/* ------------------------------------------------------------------
* Method: create(cn, params)
* ---------------------------------------------------------------- */
HvcP2Command.prototype.create = function(cn, params) {
	if(cn == 0x00) {
		// Get Model and Version
		return this._create00(params);
	} else if(cn === 0x01) {
		// Set Camera Angle
		return this._create01(params);
	} else if(cn === 0x02) {
		// Get Camera Angle
		return this._create02(params);
	} else if(cn === 0x04) {
		// Execute detection
		return this._create04(params);
	} else if(cn === 0x05) {
		// Set Threshold Values
		return this._create05(params);
	} else if(cn === 0x06) {
		// Get Threshold Values
		return this._create06(params);
	} else if(cn === 0x07) {
		// Set Detection Size
		return this._create07(params);
	} else if(cn === 0x08) {
		// Get Detection Size
		return this._create08(params);
	} else if(cn === 0x09) {
		// Set Face Angle
		return this._create09(params);
	} else if(cn === 0x0A) {
		// Get Face Angle
		return this._create0A(params);
	} else if(cn === 0x10) {
		// Register Data (Face Recognition)
		return this._create10(params);
	} else if(cn === 0x11) {
		// Delete Specified Data (Face Recognition)
		return this._create11(params);
	} else if(cn === 0x12) {
		// Delete Specified User (Face Recognition)
		return this._create12(params);
	} else if(cn === 0x13) {
		// Delete All Data (Face Recognition)
		return this._create13(params);
	} else if(cn === 0x15) {
		// Get Registration Info (Face Recognition)
		return this._create15(params);
	} else if(cn === 0x20) {
		// Save Album (Face Recognition)
		return this._create20(params);
	} else if(cn === 0x21) {
		// Load Album (Face Recognition)
		return this._create21(params);
	} else if(cn === 0x22) {
		// Save Album in Flash ROM (Face Recognition)
		return this._create22(params);
	} else if(cn === 0x30) {
		// Reformat Flash ROM (Face Recognition)
		return this._create30(params);
	} else {
		return {error: new Error('Unknown command number.')};
	}
};

HvcP2Command.prototype._getResponseCodeMessage = function(rcode) {
	if(rcode === 0x00) {
		return 'Normal end';
	} else if(rcode === 0x01) {
		return 'Number of faces that can be registered is 0 (for Registration command only)';
	} else if(rcode === 0x02) {
		return 'Number of detected faces is 2 or more (for Registration command only)';
	} else if(rcode === 0xFF) {
		return 'Undefined error (this happens when an unlisted command is received)';
	} else if(rcode === 0xFE) {
		return 'Internal error';
	} else if(rcode === 0xFD) {
		return 'Improper command';
	} else if(rcode >= 0xFA && rcode <= 0xFC) {
		return 'Transmission error';
	} else if(rcode >= 0xF0 && rcode <= 0xF0) {
		return 'Device error';
	} else if(rcode >= 0xC0 && rcode <= 0xDF) {
		return 'Face Recognition data error';
	} else {
		return 'Unknown error';
	}
};

// Get Model and Version
HvcP2Command.prototype._parse00 = function(buf) {
	if(buf.length === 19) {
		return {
			data: {
				model    : buf.slice(0, 12).toString('ascii').replace(/\s*$/, ''),
				major    : buf.readUInt8(12),
				minor    : buf.readUInt8(13),
				release  : buf.readUInt8(14),
				revision : buf.readUInt32LE(15)
			}
		};
	} else {
		return {error: new Error('Parse error: The data is not for the command number `0x00`.')};
	}
};

HvcP2Command.prototype._create00 = function() {
	let buf = Buffer.from([0xFE, 0x00, 0x00, 0x00]);
	return {buffer: buf};
};

// Set Camera Angle
HvcP2Command.prototype._parse01 = function(buf) {
	return {data:{}};
};

HvcP2Command.prototype._create01 = function(params) {
	/*
	* - params        | required | Object |
	*   - angle       | required | Number | 0: 0º, 1: 90º, 2: 180º, 3: 270º
	*/
	if(!params || typeof(params) !== 'object') {
		return {error: new Error('Invalid parameter.')};
	}
	if(!('angle' in params))	 {
		return {error: new Error('The parameter `angle` is required.')};
	}
	let angle = params['angle'];
	if(typeof(angle) !== 'number' || !angle.toString().match(/^(0|1|2|3)$/)) {
		return {error: new Error('The parameter `angle` must be 0, 1, 2, or 3.')};
	}

	let buf = Buffer.from([0xFE, 0x01, 0x01, 0x00, angle]);
	return {buffer: buf};
};

// Get Camera Angle
HvcP2Command.prototype._parse02 = function(buf) {
	if(buf.length === 1) {
		return {
			data: {
				angle : buf.readUInt8(0)
			}
		};
	} else {
		return {error: new Error('Parse error: The data is not for the command number `0x02`.')};
	}
};

HvcP2Command.prototype._create02 = function() {
	let buf = Buffer.from([0xFE, 0x02, 0x00, 0x00]);
	return {buffer: buf};
};

// Execute detection
HvcP2Command.prototype._parse04 = function(buf, p) {
	/*
	* - params        | required | Object |
	*   - body        | optional | Number | Human Body Detection (0: disable, 1: enable)
	*   - hand        | optional | Number | Hand Detection (0: disable, 1: enable)
	*   - face        | optional | Number | Face Detection (0: disable, 1: enable)
	*   - direction   | optional | Number | Face Direction Estimation (0: disable, 1: enable)
	*   - age         | optional | Number | Age Estimation (0: disable, 1: enable)
	*   - gender      | optional | Number | Gender Estimation (0: disable, 1: enable)
	*   - gaze        | optional | Number | Gaze Estimation (0: disable, 1: enable)
	*   - blink       | optional | Number | Blink Estimation (0: disable, 1: enable)
	*   - expression  | optional | Number | Expression Estimation (0: disable, 1: enable)
	*   - recognition | optional | Number | Face Recognition (0: disable, 1: enable)
	*   - image       | optional | Number | Image output (0: disable, 1: 320x240 pixel, 2: 160x120 pixel)
	*/

	// Check the length of the response data
	if(buf.length < 4) {
		return {error: new Error('The length of the response data is too short for the command `0x04`.')};
	}
	let h = {
		body : buf.readUInt8(0),
		hand : buf.readUInt8(1),
		face : buf.readUInt8(2)
	};
	let expected_len = 4 + h['body'] * 8 + h['hand'] * 8;
	if(h['face']) {
		let face_len_each = 0;
		if(p['face']) {
			face_len_each += 8;
		}
		if(p['direction']) {
			face_len_each += 8;
		}
		if(p['age']) {
			face_len_each += 3;
		}
		if(p['gender']) {
			face_len_each += 3;
		}
		if(p['gaze']) {
			face_len_each += 2;
		}
		if(p['blink']) {
			face_len_each += 4;
		}
		if(p['expression']) {
			face_len_each += 6;
		}
		if(p['recognition']) {
			face_len_each += 4;
		}
		let face_len = face_len_each * h['face'];
		expected_len += face_len;
	}
	if(p['image'] === 1) {
		expected_len += 76804;
	} else if(p['image'] === 2) {
		expected_len += 19204;
	}
	if(buf.length !== expected_len) {
		return {error: new Error('The length of the response data is wrong for the command `0x04`.')};
	}

	// Parse the response data
	let data = {};
	let offset = 4;
	// Human Body Detection
	let body = [];
	for(let i=0; i<h['body']; i++) {
		body.push({
			x          : buf.readInt16LE(offset + 0),
			y          : buf.readInt16LE(offset + 2),
			size       : buf.readInt16LE(offset + 4),
			confidence : buf.readInt16LE(offset + 6)
		});
		offset += 8;
	}
	if(p[`body`]) {
		data['body'] = body;
	}
	// Hand Detection
	let hand = [];
	for(let i=0; i<h['hand']; i++) {
		hand.push({
			x          : buf.readInt16LE(offset + 0),
			y          : buf.readInt16LE(offset + 2),
			size       : buf.readInt16LE(offset + 4),
			confidence : buf.readInt16LE(offset + 6)
		});
		offset += 8;
	}
	if(p['hand']) {
		data['hand'] = hand;
	}
	// Face Detection
	let face = [];
	for(let i=0; i<h['face']; i++) {
		let d = {};
		// Face Detection
		if(p['face']) {
			d['face'] = {
				x          : buf.readInt16LE(offset + 0),
				y          : buf.readInt16LE(offset + 2),
				size       : buf.readInt16LE(offset + 4),
				confidence : buf.readInt16LE(offset + 6)
			};
			offset += 8;
		}
		// Face Direction Estimation
		if(p['direction']) {
			d['direction'] = {
				yaw        : buf.readInt16LE(offset + 0),
				pitch      : buf.readInt16LE(offset + 2),
				roll       : buf.readInt16LE(offset + 4),
				confidence : buf.readInt16LE(offset + 6)
			};
			offset += 8;
		}
		// Age Estimation
		if(p['age']) {
			d['age'] = {
				age        : buf.readInt8(offset + 0),
				confidence : buf.readInt16LE(offset + 1)
			};
			offset += 3;
		}
		// Gender Estimation
		if(p['gender']) {
			d['gender'] = {
				gender     : buf.readInt8(offset + 0), // 0: Female, 1: Male
				confidence : buf.readInt16LE(offset + 1)
			};
			offset += 3;
		}
		// Gaze Estimation
		if(p['gaze']) {
			d['gaze'] = {
				yaw   : buf.readInt8(offset + 0),
				pitch : buf.readInt8(offset + 1)
			};
			offset += 2;
		}
		// Blink Estimation
		if(p['blink']) {
			d['blink'] = {
				left  : buf.readInt16LE(offset + 0),
				right : buf.readInt16LE(offset + 2)
			};
			offset += 4;
		}
		// Expression Estimation
		if(p['expression']) {
			d['expression'] = {
				neutral   : buf.readInt8(offset + 0),
				happiness : buf.readInt8(offset + 1),
				surprise  : buf.readInt8(offset + 2),
				anger     : buf.readInt8(offset + 3),
				sadness   : buf.readInt8(offset + 4),
				positive  : buf.readInt8(offset + 5)
			};
			offset += 6;
		}
		// Face Recognition
		if(p['recognition']) {
			d['recognition'] = {
				userId : buf.readInt16LE(offset + 0),
				score  : buf.readInt16LE(offset + 2)
			};
			offset += 4;
		}
		face.push(d);
	}
	if(p['face'] || p['direction'] || p['age'] || p['gender'] || p['gaze'] || p['blink'] || p['expression'] || p['recognition']) {
		data['face'] = face;
	}
	// Image
	if(p['image']) {
		let width = buf.readUInt16LE(offset + 0);
		let height = buf.readUInt16LE(offset + 2);
		let image_buf = buf.slice(offset + 4);
		let pixels = [];
		for(let i=0; i<image_buf.length; i++) {
			pixels.push(image_buf.readUInt8(i));
		}
		data['image'] = {
			width : width,
			height: height,
			pixels: pixels
		};
	}
	//
	return {data: data};
};

HvcP2Command.prototype._create04 = function(params) {
	/*
	* - params        | required | Object |
	*   - body        | optional | Number | Human Body Detection (0: disable (default), 1: enable)
	*   - hand        | optional | Number | Hand Detection (0: disable (default), 1: enable)
	*   - face        | optional | Number | Face Detection (0: disable (default), 1: enable)
	*   - direction   | optional | Number | Face Direction Estimation (0: disable (default), 1: enable)
	*   - age         | optional | Number | Age Estimation (0: disable (default), 1: enable)
	*   - gender      | optional | Number | Gender Estimation (0: disable (default), 1: enable)
	*   - gaze        | optional | Number | Gaze Estimation (0: disable (default), 1: enable)
	*   - blink       | optional | Number | Blink Estimation (0: disable (default), 1: enable)
	*   - expression  | optional | Number | Expression Estimation (0: disable (default), 1: enable)
	*   - recognition | optional | Number | Face Recognition (0: disable (default), 1: enable)
	*   - image       | optional | Number | Image output (0: disable (default), 1: 320x240 pixel, 2: 160x120 pixel)
	*/

	if(!params || typeof(params) !== 'object') {
		return {error: new Error('Invalid parameter.')};
	}
	let error = null;
	let p = {};
	['body', 'hand', 'face', 'direction', 'age', 'gender', 'gaze', 'blink', 'expression', 'recognition'].forEach((k) => {
		if(k in params) {
			let v = params[k];
			if(typeof(v) === 'number' && v.toString().match(/^(0|1)$/)) {
				p[k] = v;
			} else {
				error = new Error('The parameter `' + k + '` must be 0 or 1.');
			}
		} else {
			p[k] = 0;
		}
	});
	if(error) {
		return {error: error};
	}

	if('image' in params) {
		let v = params['image'];
		if(typeof(v) === 'number' && v.toString().match(/^(0|1|2)$/)) {
			p['image'] = v;
		} else {
			error = new Error('The parameter `' + k + '` must be 0, 1, or 2.');
		}
	} else {
		p['image'] = 0;
	}

	let d1 = 0;
	['body', 'hand', 'face', 'direction', 'age', 'gender', 'gaze', 'blink'].forEach((k, i) => {
		if(p[k] === 1) {
			d1 = d1 | (1 << i);
		}
	});
	let d2 = 0;
	['expression', 'recognition'].forEach((k, i) => {
		if(p[k] === 1) {
			d2 = d2 | (1 << i);
		}
	});
	let d3 = p['image'];

	let buf = Buffer.from([0xFE, 0x04, 0x03, 0x00, d1, d2, d3]);
	return {buffer: buf};
};

// Set Threshold Values
HvcP2Command.prototype._parse05 = function(buf) {
	return {data:{}};
};

HvcP2Command.prototype._create05 = function(params) {
	/*
	* - params        | required | Object |
	*   - body        | optional | Number | Human Body Detection (1 - 1000)
	*   - hand        | optional | Number | Hand Detection (1 - 1000)
	*   - face        | optional | Number | Face Detection (1 - 1000)
	*   - recognition | optional | Number | Face Recognition (0 - 1000)
	*/

	if(!params || typeof(params) !== 'object') {
		return {error: new Error('Invalid parameter.')};
	}
	let error = null;
	let p = {};
	['body', 'hand', 'face', 'recognition'].forEach((k) => {
		if(k in params) {
			let v = params[k];
			let min = (k === 'recognition') ? 0 : 1;
			if(typeof(v) === 'number' && v >= min && v <= 1000 && v % 1 === 0) {
				p[k] = v;
			} else {
				error = new Error('The parameter `' + k + '` must be an integer between ' + min + ' and 1000.');
			}
		} else {
			p[k] = 500;
		}
	});
	if(error) {
		return {error: error};
	}

	let buf1 = Buffer.from([0xFE, 0x05, 0x08, 0x00]);
	let buf2 = Buffer.alloc(8);
	['body', 'hand', 'face', 'recognition'].forEach((k, i) => {
		buf2.writeUInt16LE(p[k], i*2);
	});
	let buf = Buffer.concat([buf1, buf2]);
	return {buffer: buf};
};

// Get Threshold Values
HvcP2Command.prototype._parse06 = function(buf) {
	if(buf.length === 8) {
		return {
			data: {
				body : buf.readUInt16LE(0),
				hand : buf.readUInt16LE(2),
				face : buf.readUInt16LE(4),
				recognition : buf.readUInt16LE(6)
			}
		};
	} else {
		return {error: new Error('Parse error: The data is not for the command number `0x06`.')};
	}
};

HvcP2Command.prototype._create06 = function() {
	let buf = Buffer.from([0xFE, 0x06, 0x00, 0x00]);
	return {buffer: buf};
};

// Set Detection Size
HvcP2Command.prototype._parse07 = function(buf) {
	return {data:{}};
};

HvcP2Command.prototype._create07 = function(params) {
	/*
	* - params    | required | Object |
	*   - bodyMin | optional | Number | Human Body Detection (20 - 8192)
	*   - bodyMax | optional | Number | Human Body Detection (20 - 8192)
	*   - handMin | optional | Number | Hand Detection (20 - 8192)
	*   - handMax | optional | Number | Hand Detection (20 - 8192)
	*   - faceMin | optional | Number | Face Detection (20 - 8192)
	*   - faceMax | optional | Number | Face Detection (20 - 8192)
	*/

	if(!params || typeof(params) !== 'object') {
		return {error: new Error('Invalid parameter.')};
	}
	let error = null;
	let p = {};
	let defaults = {
		bodyMin: 30,
		bodyMax: 8192,
		handMin: 40,
		handMax: 8192,
		faceMin: 64,
		faceMax: 8192
	};
	['bodyMin', 'bodyMax', 'handMin', 'handMax', 'faceMin', 'faceMax'].forEach((k) => {
		if(k in params) {
			let v = params[k];
			if(typeof(v) === 'number' && v >= 20 && v <= 8192 && v % 1 === 0) {
				p[k] = v;
			} else {
				error = new Error('The parameter `' + k + '` must be an integer between 20 and 8192.');
			}
		} else {
			p[k] = defaults[k];
		}
	});
	if(error) {
		return {error: error};
	}

	['body', 'hand', 'face'].forEach((k) => {
		if(p[k + 'Min'] > p[k + 'Max']) {
			error = new Error('The `' + k + 'Min` must be less than or equal to the `' + k + 'Max`.');
		}
	});
	if(error) {
		return {error: error};
	}

	let buf1 = Buffer.from([0xFE, 0x07, 0x0C, 0x00]);
	let buf2 = Buffer.alloc(12);
	['body', 'hand', 'face'].forEach((k, i) => {
		buf2.writeUInt16LE(p[k + 'Min'], i*4);
		buf2.writeUInt16LE(p[k + 'Max'], i*4 + 2);
	});
	let buf = Buffer.concat([buf1, buf2]);
	return {buffer: buf};
};

// Get Detection Size
HvcP2Command.prototype._parse08 = function(buf) {
	if(buf.length === 12) {
		return {
			data: {
				bodyMin : buf.readUInt16LE(0),
				bodyMax : buf.readUInt16LE(2),
				handMin : buf.readUInt16LE(4),
				handMax : buf.readUInt16LE(6),
				faceMin : buf.readUInt16LE(8),
				faceMax : buf.readUInt16LE(10)
			}
		};
	} else {
		return {error: new Error('Parse error: The data is not for the command number `0x08`.')};
	}
};

HvcP2Command.prototype._create08 = function() {
	let buf = Buffer.from([0xFE, 0x08, 0x00, 0x00]);
	return {buffer: buf};
};

// Set Face Angle
HvcP2Command.prototype._parse09 = function(buf) {
	return {data:{}};
};

HvcP2Command.prototype._create09 = function(params) {
	/*
	* - params | required | Object |
	*   - yaw  | optional | Number | Yaw angle range (0: ±30º, 1: ±60º, 2: ±90º)
	*   - roll | optional | Number | Roll angle range (0: ±15º, 1: ±45º)
	*/
	if(!params || typeof(params) !== 'object') {
		return {error: new Error('Invalid parameter.')};
	}
	let p = {};
	if('yaw' in params) {
		let v = params['yaw'];
		if(typeof(v) === 'number' && v.toString().match(/^(0|1|2)$/)) {
			p['yaw'] = v;
		} else {
			return {error: new Error('The parameter `yaw` must be 0, 1, or 2.')};
		}
	} else {
		p['yaw'] = 0;
	}
	if('roll' in params) {
		let v = params['roll'];
		if(typeof(v) === 'number' && v.toString().match(/^(0|1)$/)) {
			p['roll'] = v;
		} else {
			return {error: new Error('The parameter `roll` must be 0 or 1.')};
		}
	} else {
		p['roll'] = 0;
	}
	let buf = Buffer.from([0xFE, 0x09, 0x02, 0x00, p['yaw'], p['roll']]);
	return {buffer: buf};
};

// Get Face Angle
HvcP2Command.prototype._parse0A = function(buf) {
	if(buf.length === 2) {
		return {
			data: {
				yaw  : buf.readUInt8(0),
				roll : buf.readUInt8(1)
			}
		};
	} else {
		return {error: new Error('Parse error: The data is not for the command number `0x0A`.')};
	}
};

HvcP2Command.prototype._create0A = function() {
	let buf = Buffer.from([0xFE, 0x0A, 0x00, 0x00]);
	return {buffer: buf};
};

// Register Data (Face Recognition)
HvcP2Command.prototype._parse10 = function(buf) {
	if(buf.length === 4100) {
		let width = buf.readUInt16LE(0);
		let height = buf.readUInt16LE(2);
		let pixels = [];
		for(let i=4; i<buf.length; i++) {
			pixels.push(buf.readUInt8(i));
		}
		return {
			data: {
				width  : width, 
				height : height,
				pixels : pixels
			}
		};
	} else {
		return {error: new Error('Parse error: The data is not for the command number `0x10`.')};
	}
};

HvcP2Command.prototype._create10 = function(params) {
	/*
	* - params   | required | Object |
	*   - userId | required | Number | 0 - 99
	*   - dataId | required | Number | 0-9
	*/
	if(!params || typeof(params) !== 'object') {
		return {error: new Error('Invalid parameter.')};
	}
	let p = {};
	if('userId' in params) {
		let v = params['userId'];
		if(typeof(v) === 'number' && v >= 0 && v <= 99 && v % 1 === 0) {
			p['userId'] = v;
		} else {
			return {error: new Error('The parameter `userId` must be an integer between 0 and 99.')};
		}
	} else {
		return {error: new Error('The parameter `userId` is required')};
	}
	if('dataId' in params) {
		let v = params['dataId'];
		if(typeof(v) === 'number' && v >= 0 && v <= 9 && v % 1 === 0) {
			p['dataId'] = v;
		} else {
			return {error: new Error('The parameter `dataId` must be an integer between 0 and 9.')};
		}
	} else {
		return {error: new Error('The parameter `dataId` is required')};
	}
	let buf1 = Buffer.from([0xFE, 0x10, 0x03, 0x00]);
	let buf2 = Buffer.alloc(3);
	buf2.writeUInt16LE(p['userId'], 0);
	buf2.writeUInt8(p['dataId'], 2);
	let buf = Buffer.concat([buf1, buf2]);
	return {buffer: buf};
};

// Delete Specified Data (Face Recognition)
HvcP2Command.prototype._parse11 = function(buf) {
	return {data:{}};
};

HvcP2Command.prototype._create11 = function(params) {
	/*
	* - params   | required | Object |
	*   - userId | required | Number | 0 - 99
	*   - dataId | required | Number | 0-9
	*/
	if(!params || typeof(params) !== 'object') {
		return {error: new Error('Invalid parameter.')};
	}
	let p = {};
	if('userId' in params) {
		let v = params['userId'];
		if(typeof(v) === 'number' && v >= 0 && v <= 99 && v % 1 === 0) {
			p['userId'] = v;
		} else {
			return {error: new Error('The parameter `userId` must be an integer between 0 and 99.')};
		}
	} else {
		return {error: new Error('The parameter `userId` is required')};
	}
	if('dataId' in params) {
		let v = params['dataId'];
		if(typeof(v) === 'number' && v >= 0 && v <= 9 && v % 1 === 0) {
			p['dataId'] = v;
		} else {
			return {error: new Error('The parameter `dataId` must be an integer between 0 and 9.')};
		}
	} else {
		return {error: new Error('The parameter `dataId` is required')};
	}
	let buf1 = Buffer.from([0xFE, 0x11, 0x03, 0x00]);
	let buf2 = Buffer.alloc(3);
	buf2.writeUInt16LE(p['userId'], 0);
	buf2.writeUInt8(p['dataId'], 2);
	let buf = Buffer.concat([buf1, buf2]);
	return {buffer: buf};
};

// Delete Specified User (Face Recognition)
HvcP2Command.prototype._parse12 = function(buf) {
	return {data:{}};
};

HvcP2Command.prototype._create12 = function(params) {
	/*
	* - params   | required | Object |
	*   - userId | required | Number | 0 - 99
	*/
	if(!params || typeof(params) !== 'object') {
		return {error: new Error('Invalid parameter.')};
	}
	let p = {};
	if('userId' in params) {
		let v = params['userId'];
		if(typeof(v) === 'number' && v >= 0 && v <= 99 && v % 1 === 0) {
			p['userId'] = v;
		} else {
			return {error: new Error('The parameter `userId` must be an integer between 0 and 99.')};
		}
	} else {
		return {error: new Error('The parameter `userId` is required')};
	}
	let buf1 = Buffer.from([0xFE, 0x12, 0x02, 0x00]);
	let buf2 = Buffer.alloc(2);
	buf2.writeUInt16LE(p['userId'], 0);
	let buf = Buffer.concat([buf1, buf2]);
	return {buffer: buf};
};

// Delete All Data (Face Recognition)
HvcP2Command.prototype._parse13 = function(buf) {
	return {data:{}};
};

HvcP2Command.prototype._create13 = function() {
	let buf = Buffer.from([0xFE, 0x13, 0x00, 0x00]);
	return {buffer: buf};
};

// Get Registration Info (Face Recognition)
HvcP2Command.prototype._parse15 = function(buf) {
	if(buf.length === 2) {
		let list = [];
		let d1 = buf.readUInt8(0);
		for(let i=0; i<8; i++) {
			if(d1 & (1 << i)) {
				list.push(i);
			}
		}
		let d2 = buf.readUInt8(1);
		for(let i=0; i<8; i++) {
			if(d2 & (1 << i)) {
				list.push(i + 8);
			}
		}
		return {
			data: {
				dataIdList  : list
			}
		};
	} else {
		return {error: new Error('Parse error: The data is not for the command number `0x15`.')};
	}
};

HvcP2Command.prototype._create15 = function(params) {
	/*
	* - params   | required | Object |
	*   - userId | required | Number | 0 - 99
	*/
	if(!params || typeof(params) !== 'object') {
		return {error: new Error('Invalid parameter.')};
	}
	let p = {};
	if('userId' in params) {
		let v = params['userId'];
		if(typeof(v) === 'number' && v >= 0 && v <= 99 && v % 1 === 0) {
			p['userId'] = v;
		} else {
			return {error: new Error('The parameter `userId` must be an integer between 0 and 99.')};
		}
	} else {
		return {error: new Error('The parameter `userId` is required')};
	}
	let buf1 = Buffer.from([0xFE, 0x15, 0x02, 0x00]);
	let buf2 = Buffer.alloc(2);
	buf2.writeUInt16LE(p['userId'], 0);
	let buf = Buffer.concat([buf1, buf2]);
	return {buffer: buf};
};

// Save Album (Face Recognition)
HvcP2Command.prototype._parse20 = function(buf) {
	if(buf.length >= 0x28 && buf.length <= 0x027E5C) {
		return {
			data: {
				album : buf
			}
		};
	} else {
		return {error: new Error('Parse error: The data is not for the command number `0x20`.')};
	}
};

HvcP2Command.prototype._create20 = function() {
	let buf = Buffer.from([0xFE, 0x20, 0x00, 0x00]);
	return {buffer: buf};
};

// Load Album (Face Recognition)
HvcP2Command.prototype._parse21 = function(buf) {
	return {data:{}};
};

HvcP2Command.prototype._create21 = function(params) {
	/*
	* - params   | required | Object |
	*   - album  | required | Buffer |
	*/
	if(!params || typeof(params) !== 'object') {
		return {error: new Error('Invalid parameter.')};
	}
	let p = {};
	if('album' in params) {
		let v = params['album'];
		if(Buffer.isBuffer(v)) {
			p['album'] = v;
		} else {
			return {error: new Error('The parameter `album` must be a `Buffer` object.')};
		}
	} else {
		return {error: new Error('The parameter `album` is required')};
	}
	let buf1 = Buffer.from([0xFE, 0x21, 0x04, 0x00]);
	let buf2 = Buffer.alloc(4);
	buf2.writeUInt32LE(p['album'].length, 0);
	let buf = Buffer.concat([buf1, buf2, p['album']]);
	return {buffer: buf};
};

// Save Album in Flash ROM (Face Recognition)
HvcP2Command.prototype._parse22 = function(buf) {
	return {data:{}};
};

HvcP2Command.prototype._create22 = function() {
	let buf = Buffer.from([0xFE, 0x22, 0x00, 0x00]);
	return {buffer: buf};
};

// Reformat Flash ROM (Face Recognition)
HvcP2Command.prototype._parse30 = function(buf) {
	return {data:{}};
};

HvcP2Command.prototype._create30 = function() {
	let buf = Buffer.from([0xFE, 0x30, 0x00, 0x00]);
	return {buffer: buf};
};

module.exports = new HvcP2Command();
