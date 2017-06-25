/* ------------------------------------------------------------------
* node-omron-hvc-p2 - HvcP2Image.js
* Date: 2017-06-19
* ---------------------------------------------------------------- */
'use strict';
const mFs = require('fs');
let mGd = null;
try {
	mGd = require('node-gd');
} catch(e) {}

let mLwip = null;
try {
	mLwip = require('lwip');
} catch(e) {}

/* ------------------------------------------------------------------
* Constructor: HvcP2Image()
* ---------------------------------------------------------------- */
const HvcP2Image = function() {
	// Plublic properties

	// Private properties
	this._IMAGE_OPTIONS = {
		png: {
			compression  : 'fast',
			interlaced   : false,
			transparency : 'auto'
		},
		jpg: {
			quality : 100
		},
		gif: {
			colors     : 256,
			interlaced : false,
			threshold  : 0
		}
	};
};

/* ------------------------------------------------------------------
* Method: conv(params, result)
* -params:
*   - width  | required    | Number  | Width of image
*   - height | required    | Number  | Height of image
*   - pixels | required    | Array   | 
*   - type   | required    | Number  | 1: Buffer, 2: Data URL, 3: File
*   - format | optional    | String  | "gif" (default), "jpg", or "png"
*   - path   | conditional | String  | File path with file name (e.g., "/tmp/image.png")
*   - maker  | optional    | Boolean | true or false (default)
* ---------------------------------------------------------------- */
HvcP2Image.prototype.conv = function(params, result) {
	let promise = new Promise((resolve, reject) => {
		if(!mGd && !mLwip) {
			reject(new Error('The node module `node-gd` or `lwip` must be installed.'));
			return;
		}

		let p = {};

		// width
		if('width' in params) {
			let v = params['width'];
			if(typeof(v) === 'number' && v % 1 === 0 && v > 0) {
				p['width'] = v;
			} else {
				reject(new Error('The parameter `width` must be an integer grater than 0.'));
				return;
			}
		} else {
			reject(new Error('The parameter `width` is required.'));
			return;
		}

		// height
		if('height' in params) {
			let v = params['height'];
			if(typeof(v) === 'number' && v % 1 === 0 && v > 0) {
				p['height'] = v;
			} else {
				reject(new Error('The parameter `height` must be an integer grater than 0.'));
				return;
			}
		} else {
			reject(new Error('The parameter `height` is required.'));
			return;
		}

		// pixels
		if('pixels' in params) {
			let v = params['pixels']
			if(Array.isArray(v) && v.length > 0) {
				p['pixels'] = v;
			} else {
				reject(new Error('The parameter `pixels` must be an Array object.'));
				return;
			}
		} else {
			reject(new Error('The parameter `pixels` is required.'));
			return;
		}

		// type
		if('type' in params) {
			let v = params['type'];
			if(typeof(v) === 'number' && v.toString().match(/^(1|2|3)$/)) {
				p['type'] = v;
			} else {
				reject(new Error('The parameter `type` must be 1, 2, or 3.'));
				return;
			}
		} else {
			reject(new Error('The parameter `type` is required.'));
			return;
		}

		// format
		if('format' in params) {
			let v = params['format'];
			if(typeof(v) === 'string' && v.match(/^(gif|jpg|png)$/)) {
				p['format'] = v;
			} else {
				reject(new Error('The parameter `format` must be "gif", "jpg", or "png".'));
				return;
			}
		} else {
			p['format'] = 'gif';
		}

		// path
		if(p['type'] === 3) {
			if('path' in params) {
				let v = params['path'];
				if(typeof(v) === 'string' && v !== '') {
					p['path'] = v;
				} else {
					reject(new Error('The parameter `path` is invalid.'));
					return;
				}
			} else {
				reject(new Error('The parameter `path` is required.'));
				return;
			}
		}

		// marker
		if('marker' in params) {
			let v = params['marker'];
			if(typeof(v) === 'boolean') {
				p['marker'] = v;
			} else {
				reject(new Error('The parameter `marker` must be Boolean.'));
				return;
			}
		} else {
			p['marker'] = false;
		}

		if(mGd) {
			this._convArrayToImageGd(p, result).then((result) => {
				resolve(result);
			}).catch((error) => {
				reject(error);
			});
		} else if(mLwip) {
			this._convArrayToImageLwip(p, result).then((result) => {
				resolve(result);
			}).catch((error) => {
				reject(error);
			});
		} else {
			reject(new Error('The node module `node-gd` or `lwip` must be installed.'));
			return;
		}
	});
	return promise;
};

HvcP2Image.prototype._convArrayToImageGd = function(p, result) {
	let promise = new Promise((resolve, reject) => {
		mGd.createTrueColor(p['width'], p['height'], (error, image) => {
			let left = 0;
			let top = 0;
			let index = 0;
			p['pixels'].forEach((v, i) => {
				let color = mGd.trueColor(v, v, v);
				image.setPixel(left, top, color)
				left ++;
				if(left >= p['width']) {
					left = 0;
					top ++;
				}
			});

			if(p['marker'] === true) {
				let w = 1600;
				let h = 1200;
				if(p['width'] < p['height']) {
					w = 1200;
					h = 1600;
				}
				if('hand' in result) {
					result['hand'].forEach((o) => {
						let x = o['x'];
						let y = o['y'];
						let s = o['size'];
						let sh = s / 2;
						let color = 0xffff00;
						image.rectangle(
							Math.round(p['width'] * (x - sh) / w),
							Math.round(p['height'] * (y - sh) / h),
							Math.round(p['width'] * (x + sh) / w),
							Math.round(p['height'] * (y + sh) / h),
							color
						);
					});
				}
				if('body' in result) {
					result['body'].forEach((o) => {
						let x = o['x'];
						let y = o['y'];
						let s = o['size'];
						let sh = s / 2;
						let color = 0x00ff00;
						image.rectangle(
							Math.round(p['width'] * (x - sh) / w),
							Math.round(p['height'] * (y - sh) / h),
							Math.round(p['width'] * (x + sh) / w),
							Math.round(p['height'] * (y + sh) / h),
							color
						);
					});
				}
				if('face' in result) {
					result['face'].forEach((o) => {
						if('face' in o) {
							let x = o['face']['x'];
							let y = o['face']['y'];
							let s = o['face']['size'];
							let sh = s / 2;
							let color = 0x00ff00;
							if('gender' in o) {
								if(o['gender']['gender'] === 1) {
									color = 0x0000ff;
								} else if(o['gender']['gender'] === 0) {
									color = 0xff0000;
								}
							}
							let x1 = Math.round(p['width'] * (x - sh) / w);
							let y1 = Math.round(p['height'] * (y - sh) / h);
							let x2 = Math.round(p['width'] * (x + sh) / w);
							let y2 = Math.round(p['height'] * (y + sh) / h);
							image.rectangle(x1, y1, x2, y2, color);
							if('age' in o) {
								let string = 'Age:' + o['age']['age'].toString();
								let font = '/usr/share/fonts/truetype/freefont/FreeMono.ttf';
								if(mFs.existsSync(font)) {
									image.stringFT(color, font, 12, 0, x1, y1-4, string, false);
								}
							}
						}
					});
				}
			}

			let fpath = 'image.tmp';
			if(p['type'] === 3) {
				fpath = p['path'];
			}
			let saveFile = null;
			if(p['format'] === 'gif') {
				saveFile = (cb) => {
					image.saveGif(fpath, (error) => {
						cb(error);
					});
				};
			} else if(p['format'] === 'jpg') {
				saveFile = (cb) => {
					let q = this._IMAGE_OPTIONS['jpg']['quality'];
					image.saveJpeg(fpath, q, (error) => {
						cb(error);
					});
				};
			} else if(p['format'] === 'png') {
				saveFile = (cb) => {
					image.savePng(fpath, 3, (error) => {
						cb(error);
					});
				};
			}
			saveFile((error) => {
				image.destroy();
				if(error) {
					reject(error);
					return;
				}
				if(p['type'] === 1 || p['type'] === 2) {
					mFs.open(fpath, 'r', (error, fd) => {
						if(error) {
							reject(error);
							return;
						}
						mFs.fstat(fd, (error, stats) => {
							let fsize = stats['size'];
							let buf = Buffer.alloc(fsize);
							mFs.read(fd, buf, 0, fsize, 0, (error, bytes, buffer) => {
								mFs.close(fd, () => {
									if(error) {
										reject(error);
										return;
									}
									if(p['type'] === 1) {
										resolve(buffer);
									} else if(p['type'] === 2) {
										resolve('data:image/' + p['format'] + ';base64,' + buffer.toString('base64'));
									}
								});
							});
						});
					});
				} else {
					resolve();
				}
			});
		});
	});
	return promise;
};

HvcP2Image.prototype._convArrayToImageLwip = function(p, result) {
	let promise = new Promise((resolve, reject) => {
		mLwip.create(p['width'], p['height'], {r: 0, g: 0, b: 0, a: 0}, (error, image) => {
			if(error) {
				reject(error);
				return;
			}
			let left = 0;
			let top = 0;
			let index = 0;
			let setPixel = (cb) => {
				let g = p['pixels'][index];
				index ++;
				image.setPixel(left, top, [g, g, g, 100], (e, img) => {
					image = img;
					left ++;
					if(left >= p['width']) {
						left = 0;
						top ++;
					}
					if(top >= p['height']) {
						if(p['marker'] === true) {
							this._convArrayToImageLwipMarkers(image, p, result, () => {
								cb();
							});
						} else {
							cb();
						}
					} else {
						setPixel(cb);
					}
				});
			};
			setPixel(() => {
				if(p['type'] === 1 || p['type'] === 2) {
					image.toBuffer(p['format'], this._IMAGE_OPTIONS[p['format']], (error, buf) => {
						if(error) {
							reject(error);
						} else {
							if(p['type'] === 1) {
								resolve(buf);
							} else if(p['type'] === 2) {
								resolve('data:image/' + p['format'] + ';base64,' + buf.toString('base64'));
							}
						}
					});
				} else if(p['type'] === 3) {
					image.writeFile(p['path'], p['format'], this._IMAGE_OPTIONS[p['format']], (error, buf) => {
						if(error) {
							reject(error);
						} else {
							resolve();
						}
					});
				}
			});
		});
	});
	return promise;
};

HvcP2Image.prototype._convArrayToImageLwipMarkers = function(image, p, result, cb) {
	let w = 1600;
	let h = 1200;
	if(p['width'] < p['height']) {
		w = 1200;
		h = 1600;
	}
	this._convArrayToImageLwipMarkerFace(image, p, result, w, h).then(() => {
		return this._convArrayToImageLwipMarkerHand(image, p, result, w, h);
	}).then(() => {
		return this._convArrayToImageLwipMarkerBody(image, p, result, w, h);
	}).then(() => {
		cb();
	}).catch((error) => {
		throw error;
	});
};

HvcP2Image.prototype._convArrayToImageLwipMarkerFace = function(image, p, result, w, h) {
	let promise = new Promise((resolve, reject) => {
		if(!('face' in result)) {
			resolve();
			return;
		}
		let rect_num = result['face'].length;
		let rect_idx = 0;
		let drawRectangle = (cb) => {
			if(rect_idx === rect_num) {
				cb();
				return;
			}
			let o = result['face'][rect_idx];
			let x = o['face']['x'];
			let y = o['face']['y'];
			let s = o['face']['size'];
			let sh = s / 2;
			let color = [0, 255, 0, 100];
			if('gender' in o) {
				if(o['gender']['gender'] === 1) {
					color = [0, 0, 255, 100];
				} else if(o['gender']['gender'] === 0) {
					color = [255, 0, 0, 100];
				}
			}
			let x1 = Math.round(p['width'] * (x - sh) / w);
			let y1 = Math.round(p['height'] * (y - sh) / h);
			let x2 = Math.round(p['width'] * (x + sh) / w);
			let y2 = Math.round(p['height'] * (y + sh) / h);
			this._convArrayToImageLwipMarkerRectangle(image, x1, y1, x2, y2, color).then(() => {
				rect_idx ++;
				drawRectangle(cb);
			}).catch((error) => {
				cb(error);
			});
		};
		drawRectangle((error) => {
			if(error) {
				reject(error);
			} else {
				resolve();
			}
		});
	});
	return promise;
};

HvcP2Image.prototype._convArrayToImageLwipMarkerHand = function(image, p, result, w, h) {
	let promise = new Promise((resolve, reject) => {
		if(!('hand' in result)) {
			resolve();
			return;
		}
		let rect_num = result['hand'].length;
		let rect_idx = 0;
		let drawRectangle = (cb) => {
			if(rect_idx === rect_num) {
				cb();
				return;
			}
			let o = result['hand'][rect_idx];
			let x = o['x'];
			let y = o['y'];
			let s = o['size'];
			let sh = s / 2;
			let color = [255, 255, 0, 100];
			let x1 = Math.round(p['width'] * (x - sh) / w);
			let y1 = Math.round(p['height'] * (y - sh) / h);
			let x2 = Math.round(p['width'] * (x + sh) / w);
			let y2 = Math.round(p['height'] * (y + sh) / h);
			this._convArrayToImageLwipMarkerRectangle(image, x1, y1, x2, y2, color).then(() => {
				rect_idx ++;
				drawRectangle(cb);
			}).catch((error) => {
				cb(error);
			});
		};
		drawRectangle((error) => {
			if(error) {
				reject(error);
			} else {
				resolve();
			}
		});
	});
	return promise;
};

HvcP2Image.prototype._convArrayToImageLwipMarkerBody = function(image, p, result, w, h) {
	let promise = new Promise((resolve, reject) => {
		if(!('body' in result)) {
			resolve();
			return;
		}
		let rect_num = result['body'].length;
		let rect_idx = 0;
		let drawRectangle = (cb) => {
			if(rect_idx === rect_num) {
				cb();
				return;
			}
			let o = result['body'][rect_idx];
			let x = o['x'];
			let y = o['y'];
			let s = o['size'];
			let sh = s / 2;
			let color = [255, 255, 0, 100];
			let x1 = Math.round(p['width'] * (x - sh) / w);
			let y1 = Math.round(p['height'] * (y - sh) / h);
			let x2 = Math.round(p['width'] * (x + sh) / w);
			let y2 = Math.round(p['height'] * (y + sh) / h);
			this._convArrayToImageLwipMarkerRectangle(image, x1, y1, x2, y2, color).then(() => {
				rect_idx ++;
				drawRectangle(cb);
			}).catch((error) => {
				cb(error);
			});
		};
		drawRectangle((error) => {
			if(error) {
				reject(error);
			} else {
				resolve();
			}
		});
	});
	return promise;
};

HvcP2Image.prototype._convArrayToImageLwipMarkerRectangle = function(image, x1, y1, x2, y2, color) {
	let promise = new Promise((resolve, reject) => {
		let x_min = Math.min(x1, x2);
		let x_max = Math.max(x1, x2);
		let y_min = Math.min(y1, y2);
		let y_max = Math.max(y1, y2);
		let x = x_min;
		let y = y_min;
		let side = 'top';
		let drawPixel = (cb) => {
			if(y > y_max) {
				cb();
				return;
			}
			image.setPixel(x, y, color, (e, img) => {
				if(e) {
					cb(e);
				} else {
					if(side === 'top') {
						x ++;
						if(x === x_max) {
							side = 'right';
							y ++;
						}
						drawPixel(cb);
					} else if(side === 'right') {
						y ++;
						if(y === y_max) {
							side = 'bottom';
							x --;
						}
						drawPixel(cb);
					} else if(side === 'bottom') {
						x --;
						if(x === x_min) {
							side = 'left';
							y --;
						}
						drawPixel(cb);
					} else if(side === 'left') {
						y --;
						if(y === y_min) {
							cb();
						} else {
							drawPixel(cb);
						}
					}
				}
			});
		};
		drawPixel((error) => {
			if(error) {
				reject(error);
			} else {
				resolve();
			}
		});
	});
	return promise;
};

module.exports = new HvcP2Image();
