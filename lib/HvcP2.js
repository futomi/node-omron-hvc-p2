/* ------------------------------------------------------------------
* node-omron-hvc-p2 - HvcP2.js
* Date: 2017-08-06
* ---------------------------------------------------------------- */
'use strict';
const mFs = require('fs');
const mOs = require('os');
const mPath = require('path');
const mSerialPort = require('serialport');
const mHvcP2Command = require('./HvcP2Command.js');
const mHvcP2Image = require('./HvcP2Image.js');

/* ------------------------------------------------------------------
* Constructor: HvcP2()
* ---------------------------------------------------------------- */
const HvcP2 = function() {
	// Plublic properties

	// Private properties
	this._port = null;
	this._connected = false;
	this._ondata = () => {};
	this._request_timer = null;
	this._user_id_list = [];
	this._configurations = {};
	this._DEFAULT_CONFIGURATIONS = {
 		cameraAngle: {
			angle: 0
  		},
		threshold: {
			body: 500,
			hand: 500,
			face: 500,
			recognition: 500
		},
		detectionSize: {
			bodyMin: 30,
			bodyMax: 8192,
			handMin: 40,
			handMax: 8192,
			faceMin: 64,
			faceMax: 8192
		},
		faceAngle: {
			yaw: 0,
			roll: 0
		}
	};
	this._MODEL_NAME = 'B5T-007001';
	this._serial_port_path = '';
	this._model = {};
};

/* ------------------------------------------------------------------
* Method: connect([params])
* - params     | optional | Object |
*   - path     | optional | String | e.g., "COM3", "/dev/tty-usbserial1"
*   - baudRate | optional | Number | 9600, 38400, 115200, 230400, 460800, or 921600 (Default)
* ---------------------------------------------------------------- */
HvcP2.prototype.connect = function(params) {
	let promise = new Promise((resolve, reject) => {
		if(params && typeof(params) !== 'object') {
			reject(new Error('Invaid parameter.'));
			return;
		} else {
			params = {};
		}
		// Check the parameter `path`
		let path = '';
		if('path' in params) {
			path = params['path'];
			if(typeof(path) !== 'string') {
				reject(new Error('The parameter `path` must be a string.'));
				return;
			}
		}
		// Check the parameter `baudRate`
		let rate = 921600;
		if('baudRate' in params) {
			rate = params['baudRate'];
			if(typeof(rate) !== 'number') {
				reject(new Error('The parameter `baudRate` must be a number.'));
				return;
			} else {
				if(!rate.toString().match(/^9600|38400|115200|230400|460800|921600$/)) {
					reject(new Error('The parameter `baudRate` must be 9600, 38400, 115200, 230400, 460800, or 921600.'));
					return;
				}
			}
		}
		// Open the serial port
		this._openSerialPort({
			path: path,
			baudRate: rate
		}).then(() => {
			return this.getConfigurations({cache: false});
		}).then(() => {
			return this.getFaceRecognitionUsers({cache: false});
		}).then(() => {
			resolve();
		}).catch((error) => {
			reject(error);
		});
	});
	return promise;
};

HvcP2.prototype._openSerialPort = function(p) {
	let promise = new Promise((resolve, reject) => {
		if(this._connected === true) {
			resolve();
			return;
		}
		mSerialPort.list().then((com_list) => {
			let candidate_com_list = [];
			let pf = mOs.platform();
			if(p['path']) {
				com_list.forEach((com) => {
					if(com.comName === path) {
						candidate_com_list.push(com);
					}
				});
			} else if(pf === 'linux') {
				// ------------------------------------------------
				// * linux
				// {
				//   "manufacturer": "OMRON Corporation",
				//   "serialNumber": "1",
				//   "pnpId": "usb-OMRON_Corporation_OMRON_HVC-P2_1-if00",
				//   "vendorId": "0590",
				//   "productId": "OMRON HVC-P2",
				//   "comName": "/dev/ttyACM0"
				// }
				// ------------------------------------------------
				com_list.forEach((com) => {
					if(com.manufacturer && com.manufacturer.match(/OMRON/, 'i') && com.vendorId && com.vendorId.match(/0590/) && com.productId && com.productId.match(/HVC\-P2/, 'i')) {
						candidate_com_list.push(com);
					}
				});
			} else if(pf === 'win32') {
				// ------------------------------------------------
				// * win32
				// {
				//   "comName": "COM4",
				//   "manufacturer": "Microsoft",
				//   "serialNumber": "1",
				//   "pnpId": "USB\\VID_0590&PID_00CA\\1",
				//   "locationId": "Port_#0002.Hub_#0009",
				//   "vendorId": "0590",
				//   "productId": "00CA"
				// }
				// ------------------------------------------------
				com_list.forEach((com) => {
					if(com.vendorId && com.vendorId.match(/0590/) && com.productId && com.productId.match(/00CA/, 'i')) {
						candidate_com_list.push(com);
					}
				});
			} else if(pf === 'darwin') {
				// ------------------------------------------------
				// * darwin
				// {
				//   "comName": "/dev/tty.usbmodem1",
				//   "manufacturer": "OMRON Corporation",
				//   "serialNumber": "1",
				//   "locationId": "14110000",
				//   "vendorId": "0590",
				//   "productId": "00ca"
				// }
				// ------------------------------------------------
				com_list.forEach((com) => {
					if(com.comName.match(/usb/) && com.manufacturer && com.manufacturer.match(/OMRON/, 'i') && com.vendorId && com.vendorId.match(/0590/) && com.productId && com.productId.match(/00ca/, 'i')) {
						candidate_com_list.push(com);
					}
				});
			}
			return this._tryOpenSerialPort(p['baudRate'], candidate_com_list);
		}).then(() => {
			resolve();
		}).catch((error) => {
			reject(error);
		});
	});
	return promise;
};

HvcP2.prototype._tryOpenSerialPort = function(baud_rate, com_list) {
	let promise = new Promise((resolve, reject) => {
		let e = null;
		let tryConnect = (callback) => {
			let com = com_list.shift();
			if(!com) {
				callback(e || new Error('No device was found.'));
				return;
			}
			let path = com.comName;
			let port = new mSerialPort(path, {
				baudRate: baud_rate
			});
			port.once('error', (error) => {
				e = error;
				this._connected = false;
				port = null;
				tryConnect(callback);
			});
			port.once('open', () => {
				this._initSerialPort(port);
				this.request(0x00, null).then((res) => {
					if(res['model'] === this._MODEL_NAME) {
						this._model = JSON.parse(JSON.stringify(res));
						callback(null, path);
					} else {
						port.close(() => {
							port = null;
							tryConnect(callback);
						});
					}
				}).catch((error) => {
					tryConnect(cb);
				});
			});
		};
		tryConnect((error, path) => {
			if(error) {
				reject(error);
			} else {
				this._serial_port_path = path;
				resolve()
			}
		});
	});
	return promise;
};

HvcP2.prototype._initSerialPort = function(port) {
	this._connected = true;
	this._port = port;
	this._port.on('data', (buf) => {
		this._ondata(buf);
	});
	this._port.once('close', () => {
		this._port.removeAllListeners('data');
		this._connected = false;
		this._port = null;
		this._serial_port_path = '';
	});
};

/* ------------------------------------------------------------------
* Method: disconnect()
* ---------------------------------------------------------------- */
HvcP2.prototype.disconnect = function() {
	let promise = new Promise((resolve, reject) => {
		if(this._port && this._connected === true) {
			this._port.close(() => {
				resolve();
			});
		} else {
			resolve();
		}
	});
	return promise;
};

/* ------------------------------------------------------------------
* Method: getSerialPortPath()
* ---------------------------------------------------------------- */
HvcP2.prototype.getSerialPortPath = function() {
	return this._serial_port_path;
};

/* ------------------------------------------------------------------
* Method: request(cn, params)
* ---------------------------------------------------------------- */
HvcP2.prototype.request = function(cn, params) {
	let promise = new Promise((resolve, reject) => {
		if(this._connected !== true) {
			reject(new Error('The device is not connected.'));
			return;
		}
		if(this._request_timer) {
			reject(new Error('The previous process is running.'));
			return;
		}
		let cmd = mHvcP2Command.create(cn, params);
		if(cmd['error']) {
			reject(cmd['error']);
			return;
		}
		let timeout = 1000;
		if(cn === 0x04) {
			timeout = 20000;
		} else if(cn === 0x22) {
			timeout = 5000;
		} else if(cn === 0x30) {
			timeout = 10000;
		}
		this._request_timer = setTimeout(() => {
			this._request_timer = null;
			reject(new Error('Timeout.'));
		}, timeout);

		let data_length = 0;
		let received_length = 0;
		let chunk_list = [];
		this._ondata = (chunk) => {
			if(received_length === 0) {
				if(chunk.readUInt8(0) === 0xFE && chunk.length >= 6) {
					data_length = chunk.readUInt32LE(2);
				} else {
					reject(new Error('Unknown data was came.'));
					return;
				}
			}
			chunk_list.push(chunk);
			received_length += chunk.length;
			if(received_length >= data_length) {
				this._ondata = () => {};
				clearTimeout(this._request_timer);
				this._request_timer = null;
				let buf = Buffer.concat(chunk_list);
				let res = mHvcP2Command.parse(cn, buf, params);
				if(res['error']) {
					reject(res['error']);
				} else {
					resolve(res['data']);
				}
			}
		};
		this._port.write(cmd['buffer']);
	});
	return promise;
};

/* ------------------------------------------------------------------
* Method: getModelVersion([params])
* - params  | optional | Object  |
*   - cache | optional | Boolean | true (default) or false
* ---------------------------------------------------------------- */
HvcP2.prototype.getModelVersion = function(params) {
	let promise = new Promise((resolve, reject) => {
		let cache = true;
		if(params && typeof(params) === 'object') {
			if('cache' in params) {
				let v = params['cache'];
				if(typeof(v) === 'boolean') {
					cache = v;
				} else {
					reject(new Error('The parameter `cache` must be Boolean.'));
					return;
				}
			}
		}
		if(cache === true) {
			console.log('hogehoge');
			resolve(JSON.parse(JSON.stringify(this._model)));
			return;
		}

		this.request(0x00, null).then((res) => {
			resolve(res);
		}).catch((error) => {
			reject(error);
		});
	});
	return promise;
};

/* ------------------------------------------------------------------
* Method: detect(params)
* - params        | required    | Object  |
*   - body        | optional    | Number  | Human Body Detection (0: disable (default), 1: enable)
*   - hand        | optional    | Number  | Hand Detection (0: disable (default), 1: enable)
*   - face        | optional    | Number  | Face Detection (0: disable (default), 1: enable)
*   - direction   | optional    | Number  | Face Direction Estimation (0: disable (default), 1: enable)
*   - age         | optional    | Number  | Age Estimation (0: disable (default), 1: enable)
*   - gender      | optional    | Number  | Gender Estimation (0: disable (default), 1: enable)
*   - gaze        | optional    | Number  | Gaze Estimation (0: disable (default), 1: enable)
*   - blink       | optional    | Number  | Blink Estimation (0: disable (default), 1: enable)
*   - expression  | optional    | Number  | Expression Estimation (0: disable (default), 1: enable)
*   - recognition | optional    | Number  | Face Recognition (0: disable (default), 1: enable)
*   - image       | optional    | Number  | Image output (0: disable (default), 1: 320x240 pixel, 2: 160x120 pixel)
*   - imageType   | optional    | Number  | 0: Array (default), 1: Buffer, 2: Data URL, 3: File
*   - imageFormat | optional    | String  | "gif" (default), "jpg", or "png"
*   - imagePath   | conditional | String  | File path with file name (e.g., "/tmp/image.png")
*   - imageMarker | optional    | Boolean | true or false (default)
* ---------------------------------------------------------------- */
HvcP2.prototype.detect = function(params) {
	let promise = new Promise((resolve, reject) => {
		this.request(0x04, params).then((res) => {
			if(params['imageType']) {
				let opts = {
					width  : res['image']['width'],
					height : res['image']['height'],
					pixels : res['image']['pixels'],
					type   : params['imageType']
				};
				if('imageFormat' in params) {
					opts['format'] = params['imageFormat'];
				}
				if('imagePath' in params) {
					opts['path'] = params['imagePath'];
				}
				if('imageMarker' in params) {
					opts['marker'] = params['imageMarker'];
				}
				mHvcP2Image.conv(opts, res).then((result) => {
					delete res['image']['pixels'];
					if(params['imageType'] === 1) {
						res['image']['buffer'] = result;
					} else if(params['imageType'] === 2) {
						res['image']['dataUrl'] = result;
					}
					resolve(res);
				}).catch((error) => {
					reject(error);
				});
			} else {
				resolve(res);
			}
		}).catch((error) => {
			reject(error);
		});
	});
	return promise;
};

/* ------------------------------------------------------------------
* Method: getConfigurations([params])
* - params  | optional | Object  |
*   - cache | optional | Boolean | true (default) or false
* ---------------------------------------------------------------- */
HvcP2.prototype.getConfigurations = function(params) {
	let promise = new Promise((resolve, reject) => {
		let cache = true;
		if(params && typeof(params) === 'object') {
			if('cache' in params) {
				let v = params['cache'];
				if(typeof(v) === 'boolean') {
					cache = v;
				} else {
					reject(new Error('The parameter `cache` must be Boolean.'));
					return;
				}
			}
		}
		if(cache === true) {
			resolve(JSON.parse(JSON.stringify(this._configurations)));
			return;
		}
		let c = {};
		// Get Camera Angle
		this.request(0x02).then((res) => {
			c['cameraAngle'] = res;
			// Get Threshold Values
			return this.request(0x06);
		}).then((res) => {
			c['threshold'] = res;
			// Get Detection Size
			return this.request(0x08);
		}).then((res) => {
			c['detectionSize'] = res;
			// Get Face Angle
			return this.request(0x0A);
		}).then((res) => {
			c['faceAngle'] = res;
			this._configurations = c;
			resolve(JSON.parse(JSON.stringify(c)));
		}).catch((error) => {
			reject(error);
		});
	});
	return promise;
};

/* ------------------------------------------------------------------
* Method: setConfigurations(configrations)
* - configurations  | required | Object |
*   - cameraAngle   | optional | Object | Camera Angle
*     - angle       | optional | Number | 0: 0º, 1: 90º, 2: 180º, 3: 270º
*   - threshold     | optional | Object | Threshold Values
*     - body        | optional | Number | Human Body Detection threshold (1 - 1000)
*     - hand        | optional | Number | Hand Detection threshold (1 - 1000)
*     - face        | optional | Number | Face Detection threshold (1 - 1000)
*     - recognition | optional | Number | Face Recognition threshold (0 - 1000)
*   - detectionSize | optional | Object | Detection Size
*     - bodyMin     | optional | Number | Human Body Detection minimum size (20 - 8192)
*     - bodyMax     | optional | Number | Human Body Detection maximum size (20 - 8192)
*     - handMin     | optional | Number | Hand Detection minimum size (20 - 8192)
*     - handMax     | optional | Number | Hand Detection maximum size (20 - 8192)
*     - faceMin     | optional | Number | Face Detection minimum size (20 - 8192)
*     - faceMax     | optional | Number | Face Detection maximum size (20 - 8192)
*   - faceAngle     | optional | Object | Face Angle Range
*     - yaw         | optional | Number | Yaw angle range (0: ±30º, 1: ±60º, 2: ±90º)
*     - roll        | optional | Number | Roll angle range (0: ±15º, 1: ±45º)
* ---------------------------------------------------------------- */
HvcP2.prototype.setConfigurations = function(configurations) {
	let promise = new Promise((resolve, reject) => {
		if(!configurations || typeof(configurations) !== 'object') {
			reject(new Error('The argument `configurations` is invalid.'));
			return;
		}
		let update_conf = {};
		// Get the current configurations
		this.getConfigurations().then((current_conf) => {
			['cameraAngle', 'threshold', 'detectionSize', 'faceAngle'].forEach((k) => {
				if((k in configurations) && typeof(configurations[k]) === 'object') {
					let update_prop_num = 0;
					let o = {};
					for(var prop in this._configurations[k]) {
						if(prop in configurations[k]) {
							o[prop] = configurations[k][prop];
							update_prop_num ++;
						} else {
							o[prop] = this._configurations[k][prop];
						}
					}
					if(update_prop_num > 0) {
						update_conf[k] = o;
					}
				}
			});
			if(Object.keys(update_conf).length === 0) {
				reject(new Error('No configuraion value is specified in the parameters.'));
				return;
			}
			// Set Camera Angle
			return this._setConfigurationsRequest(0x01, update_conf['cameraAngle']);
		}).then(() => {
			// Set Threshold Values
			return this._setConfigurationsRequest(0x05, update_conf['threshold']);
		}).then(() => {
			// Set Detection Size
			return this._setConfigurationsRequest(0x07, update_conf['detectionSize']);
		}).then(() => {
			// Set Face Angle
			return this._setConfigurationsRequest(0x09, update_conf['faceAngle']);
		}).then(() => {
			// Get the latest configurations
			return this.getConfigurations({cache: false});
		}).then((new_conf) => {
			resolve(new_conf);
		}).catch((error) => {
			reject(error);
		});
	});
	return promise;
};

HvcP2.prototype._setConfigurationsRequest = function(command_number, conf) {
	let promise = new Promise((resolve, reject) => {
		if(!conf || typeof(conf) !== 'object') {
			resolve();
			return;
		}
		this.request(command_number, conf).then((res) => {
			resolve();
		}).catch((error) => {
			reject(error);
		});
	});
	return promise;
};

/* ------------------------------------------------------------------
* Method: resetConfigurations()
* ---------------------------------------------------------------- */
HvcP2.prototype.resetConfigurations = function() {
	let promise = new Promise((resolve, reject) => {
		// Set Camera Angle
		this._setConfigurationsRequest(0x01, this._DEFAULT_CONFIGURATIONS['cameraAngle']).then(() => {
			// Set Threshold Values
			return this._setConfigurationsRequest(0x05, this._DEFAULT_CONFIGURATIONS['threshold']);
		}).then(() => {
			// Set Detection Size
			return this._setConfigurationsRequest(0x07, this._DEFAULT_CONFIGURATIONS['detectionSize']);
		}).then(() => {
			// Set Face Angle
			return this._setConfigurationsRequest(0x09, this._DEFAULT_CONFIGURATIONS['faceAngle']);
		}).then(() => {
			// Get the latest configurations
			return this.getConfigurations({cache: false});
		}).then((new_conf) => {
			resolve(new_conf);
		}).catch((error) => {
			reject(error);
		});
	});
	return promise;
};

/* ------------------------------------------------------------------
* Method: saveAlbum(params)
* - params  | optional | Object |
*   - path  | optional | String | File path
* ---------------------------------------------------------------- */
HvcP2.prototype.saveAlbum = function(params) {
	let promise = new Promise((resolve, reject) => {
		let path = ''
		if(params) {
			if(typeof(params) !== 'object') {
				reject(new Error('The argument `params` is invalid.'));
				return;
			}
			if('path' in params) {
				let v = params['path'];
				if(typeof(v) !== 'string' || v === '') {
					reject(new Error('The parameter `path` must be a string representing a file path.'));
					return;
				}
				path = v;
			}
		}

		this.request(0x20, null).then((res) => {
			let buf = res['album'];
			if(path) {
				mFs.open(path, 'w', (error, fd) => {
					if(error) {
						reject(error);
					} else {
						mFs.write(fd, buf, 0, buf.length, null, (error) => {
							if(error) {
								reject(error);
							} else {
								mFs.close(fd, () => {
									resolve(res);
								});
							}
						});
					}
				});
			} else {
				resolve(res);
			}
		}).catch((error) => {
			reject(error);
		});
	});
	return promise;
};

/* ------------------------------------------------------------------
* Method: loadAlbum(params)
* - params   | requreid | Object |
*   - buffer | optional | Buffer | Buffer object
*   - path   | optional | String | File path
* ---------------------------------------------------------------- */
HvcP2.prototype.loadAlbum = function(params) {
	let promise = new Promise((resolve, reject) => {
		let buffer = null;
		let path = ''
		if(params) {
			if(typeof(params) !== 'object') {
				reject(new Error('The argument `params` is invalid.'));
				return;
			}
			if('buffer' in params) {
				let v = params['buffer'];
				if(!Buffer.isBuffer(v)) {
					reject(new Error('The parameter `buffer` must be a Buffer object.'));
					return;
				}
				buffer = v;
			}
			if(!buffer) {
				if('path' in params) {
					let v = params['path'];
					if(typeof(v) !== 'string' || v === '') {
						reject(new Error('The parameter `path` must be a string representing a file path.'));
						return;
					}
					path = v;
				}
			}
		} else {
			reject(new Error('The argument `params` is required.'));
			return;
		}
	
		if(path) {
			mFs.readFile(path, (error, data) => {
				if(error) {
					reject(error);
				} else {
					this.request(0x21, {album: data}).then(() => {
						resolve();
					}).catch((error) => {
						reject(error);
					});
				}
			});
		} else {
			this.request(0x21, {album: buffer}).then(() => {
				resolve();
			}).catch((error) => {
				reject(error);
			});
		}
	});
	return promise;
};

/* ------------------------------------------------------------------
* Method: saveAlbumOnFlashROM()
* ---------------------------------------------------------------- */
HvcP2.prototype.saveAlbumOnFlashROM = function() {
	let promise = new Promise((resolve, reject) => {
		this.request(0x22, null).then(() => {
			resolve();
		}).catch((error) => {
			reject(error);
		});
	});
	return promise;
};

/* ------------------------------------------------------------------
* Method: reformatFlashROM()
* ---------------------------------------------------------------- */
HvcP2.prototype.reformatFlashROM = function() {
	let promise = new Promise((resolve, reject) => {
		this.request(0x30, null).then(() => {
			resolve();
		}).catch((error) => {
			reject(error);
		});
	});
	return promise;
};

/* ------------------------------------------------------------------
* Method: addFaceRecognitionData(params)
* - params        | required    | Object |
*   - userId      | required    | Number | 0 - 99
*   - dataId      | required    | Number | 0-9
*   - imageType   | optional    | Number | 0: Array (default), 1: Buffer, 2: Data URL, 3: File
*   - imageFormat | optional    | String | "gif" (default), "jpg", or "png"
*   - imagePath   | conditional | String | File path with file name (e.g., "/tmp/image.png")
* ---------------------------------------------------------------- */
HvcP2.prototype.addFaceRecognitionData = function(params) {
	let promise = new Promise((resolve, reject) => {
		if(!params || typeof(params) !== 'object') {
			reject(new Error('The argument `params` is invalid.'));
			return;
		}

		this.request(0x10, {
			userId: params['userId'],
			dataId: params['dataId']
		}).then((res) => {
			if(params['imageType']) {
				let opts = {
					width  : res['width'],
					height : res['height'],
					pixels : res['pixels'],
					type   : params['imageType']
				};
				if('imageFormat' in params) {
					opts['format'] = params['imageFormat'];
				}
				if('imagePath' in params) {
					opts['path'] = params['imagePath'];
				}
				mHvcP2Image.conv(opts).then((result) => {
					delete res['pixels'];
					if(params['imageType'] === 1) {
						res['buffer'] = result;
					} else if(params['imageType'] === 2) {
						res['dataUrl'] = result;
					}
					resolve(res);
				}).catch((error) => {
					reject(error);
				});
			} else {
				resolve(res);
			}
		}).catch((error) => {
			reject(error);
		});
	});
	return promise;
};

/* ------------------------------------------------------------------
* Method: deleteFaceRecognitionData(params)
* - params        | required    | Object |
*   - userId      | required    | Number | 0 - 99
*   - dataId      | required    | Number | 0-9
* ---------------------------------------------------------------- */
HvcP2.prototype.deleteFaceRecognitionData = function(params) {
	let promise = new Promise((resolve, reject) => {
		if(!params || typeof(params) !== 'object') {
			reject(new Error('The argument `params` is invalid.'));
			return;
		}
		if(!('userId' in params)) {
			reject(new Error('The parameter `userId` is required.'));
			return;
		}
		if(this._user_id_list.indexOf(params['userId']) === -1) {
			reject(new Error('The specified `userId` is not registered.'));
			return;
		}
		this.request(0x15, params).then((res) => {
			if(res['dataIdList'].indexOf(params['dataId']) >= 0) {
				this.request(0x11, params).then(() => {
					if(res['dataIdList'].length === 1) {
						let new_user_id_list = [];
						this._user_id_list.forEach((id) => {
							if(id !== params['userId']) {
								new_user_id_list.push(id);
							}
						});
						this._user_id_list = new_user_id_list;
					}
					resolve();
				}).catch((error) => {
					reject(error);
				});
			} else {
				reject(new Error('The specified `dataId` is not registered for the specified `userId`.'));
			}
		}).catch((error) => {
			reject(error);
		});
	});
	return promise;	
};

/* ------------------------------------------------------------------
* Method: deleteFaceRecognitionUser(params)
* - params        | required    | Object |
*   - userId      | required    | Number | 0 - 99
* ---------------------------------------------------------------- */
HvcP2.prototype.deleteFaceRecognitionUser = function(params) {
	let promise = new Promise((resolve, reject) => {
		if(!params || typeof(params) !== 'object') {
			reject(new Error('The argument `params` is invalid.'));
			return;
		}
		if(!('userId' in params)) {
			reject(new Error('The parameter `userId` is required.'));
			return;
		}
		if(this._user_id_list.indexOf(params['userId']) === -1) {
			reject(new Error('The specified `userId` is not registered.'));
			return;
		}
		this.request(0x12, params).then(() => {
			resolve();
		}).catch((error) => {
			reject(error);
		});
	});
	return promise;	
};

/* ------------------------------------------------------------------
* Method: clearFaceRecognitionData()
* ---------------------------------------------------------------- */
HvcP2.prototype.clearFaceRecognitionData = function() {
	let promise = new Promise((resolve, reject) => {
		this.request(0x13, null).then(() => {
			resolve();
		}).catch((error) => {
			reject(error);
		});
	});
	return promise;	
};

/* ------------------------------------------------------------------
* Method: getFaceRecognitionData(params)
* - params        | required    | Object |
*   - userId      | required    | Number | 0 - 99
* ---------------------------------------------------------------- */
HvcP2.prototype.getFaceRecognitionData = function(params) {
	let promise = new Promise((resolve, reject) => {
		if(!params || typeof(params) !== 'object') {
			reject(new Error('The argument `params` is invalid.'));
			return;
		}
		if(!('userId' in params)) {
			reject(new Error('The parameter `userId` is required.'));
			return;
		}
		if(this._user_id_list.indexOf(params['userId']) === -1) {
			reject(new Error('The specified `userId` is not registered.'));
			return;
		}
		this.request(0x15, params).then((res) => {
			resolve(res);
		}).catch((error) => {
			reject(error);
		});
	});
	return promise;	
};

/* ------------------------------------------------------------------
* Method: getFaceRecognitionUsers([params])
* - params  | optional | Object  |
*   - cache | optional | Boolean | true (default) or false
* ---------------------------------------------------------------- */
HvcP2.prototype.getFaceRecognitionUsers = function(params) {
	let promise = new Promise((resolve, reject) => {
		let cache = true;
		if(params && typeof(params) === 'object') {
			if('cache' in params) {
				let v = params['cache'];
				if(typeof(v) === 'boolean') {
					cache = v;
				} else {
					reject(new Error('The parameter `cache` must be Boolean.'));
					return;
				}
			}
		}
		if(cache === true) {
			resolve({userIdList: this._user_id_list});
			return;
		}		

		let user_id_list = [];
		let id = 0;
		let getData = (cb) => {
			this.request(0x15, {
				userId: id
			}).then((res) => {
				if(res['dataIdList'].length > 0) {
					user_id_list.push(id);
				}
				id ++;
				if(id > 99) {
					cb();
				} else {
					getData(cb);
				}
			}).catch((error) => {
				reject(error);
			});
		};
		getData(() => {
			this._user_id_list = user_id_list;
			resolve({
				userIdList: JSON.parse(JSON.stringify(user_id_list))
			});
		});
	});
	return promise;	
};

module.exports = HvcP2;
