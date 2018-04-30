var StaticArrayBufferProto = new ArrayBuffer().__proto__;

window.signalUtil = {
    randomId: function() {
        return Math.floor((Math.random() * 4000) + 1);
    },
    toString: function (thing) {
        if (typeof thing == 'string') {
            return thing;
        }
        return new dcodeIO.ByteBuffer.wrap(thing).toString('binary');
    },
    toArrayBuffer: function (thing) {
        if (thing === undefined) {
            return undefined;
        }
        if (thing === Object(thing)) {
            if (thing.__proto__ == StaticArrayBufferProto) {
                return thing;
            }
        }

        var str;
        if (typeof thing == "string") {
            str = thing;
        } else {
            throw new Error("Tried to convert a non-string of type " + typeof thing + " to an array buffer");
        }
        return new dcodeIO.ByteBuffer.wrap(thing, 'binary').toArrayBuffer();
    },
    isEqual: function (a, b) {
        // TODO: Special-case arraybuffers, etc
        if (a === undefined || b === undefined) {
            return false;
        }
        a = util.toString(a);
        b = util.toString(b);
        var maxLength = Math.max(a.length, b.length);
        if (maxLength < 5) {
            throw new Error("a/b compare too short");
        }
        return a.substring(0, Math.min(maxLength, a.length)) == b.substring(0, Math.min(maxLength, b.length));
    },
    arrayBufferToBase64: function (buffer) {
        var binary = '';
        var bytes = new Uint8Array(buffer);
        var len = bytes.byteLength;
        for (var i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    },
    base64ToArrayBuffer: function (base64) {
        var binary_string = window.atob(base64);
        var len = binary_string.length;
        var bytes = new Uint8Array(len);
        for (var i = 0; i < len; i++) {
            bytes[i] = binary_string.charCodeAt(i);
        }
        return bytes.buffer;
    },
    stringToBase64(str) {
        return window.btoa(unescape(encodeURIComponent(str)));
    },
    base64ToString(str) {
        return decodeURIComponent(escape(window.atob(str)));
    },
    stringToArrayBuffer(str) {
        let arr = new Uint8Array(str.split(',').map(x => Number(x)));
        return arr.buffer
    },
    arrayBufferToString(buffer) {
        let arr = new Uint8Array(buffer);
        return Array.from(arr).join();
    },
    keyPairToString(keyPair) {
        let obj = {
            pubKey: signalUtil.arrayBufferToString(keyPair.pubKey),
            privKey: signalUtil.arrayBufferToString(keyPair.privKey)
        };
        let str = JSON.stringify(obj);
        return str;
    },
    stringToKeyPair(str) {
        let obj = JSON.parse(str);
        obj = {
            pubKey: signalUtil.stringToArrayBuffer(obj.pubKey),
            privKey: signalUtil.stringToArrayBuffer(obj.privKey)
        };
        return obj;
    },
    stringifyValues(obj) {
        if (typeof obj !== 'object') {
            return obj;
        }
        if (obj instanceof ArrayBuffer) {
            return signalUtil.arrayBufferToString(obj);
        }
        let stringified = {};
        Object.keys(obj).forEach(key => {
            if (obj[key] instanceof ArrayBuffer) {
                stringified[key] = signalUtil.arrayBufferToString(obj[key])
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                stringified[key] = signalUtil.stringifyValues(obj[key])
            } else {
                stringified[key] = obj[key]
            }
        });
        return stringified;
    },
    bufferise(obj) {
        if (typeof obj !== 'string') {
            return obj
        }
        obj = JSON.parse(obj);

        let bufferised = {};
        Object.keys(obj).forEach(key => {
            if (typeof obj[key] === 'string') {
                bufferised[key] = signalUtil.stringToArrayBuffer(obj[key])
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                bufferised[key] = signalUtil.bufferise(obj[key])
            } else {
                bufferised[key] = obj[key]
            }
        });
        return bufferised;
    }
};