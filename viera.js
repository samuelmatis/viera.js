// Viera.js 0.1.4
// (c) 2014 Samuel Matis
// Viera.js may be freely distributed or modified under the MIT license.


(function() {

    var http = require('http');

    /**
     * Constructor
     *
     * @param {String} ipAddress The IP Address of the TV
     */
    var Viera = function(ipAddress) {
        // Check if ipAddress is valid IP address
        var ipRegExp = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/;

        if(ipRegExp.test(ipAddress)) {
            this.ipAddress = ipAddress;
        } else {
            throw new TypeError('You entered invalid IP address!');
        }
    };

    /**
     * Create and send request to the TV
     *
     * @param {String} type    Type of your request                        
     * @param {String} action  The xml action type to perform
     * @param {String} command The command from codes.txt you want to perform
     * @param {Array}  options Options array (mostly for callback)
     */
     Viera.prototype.sendRequest = function(type, action, command, options) {
        var url, urn;
        if(type === 'command') {
            url = '/nrc/control_0';
            urn = 'panasonic-com:service:p00NetworkControl:1';
        } else if (type === 'render') {
            url = '/dmr/control_0';
            urn = 'schemas-upnp-org:service:RenderingControl:1';
        }

        var body = '<?xml version="1.0" encoding="utf-8"?> \
                    <s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/"> \
                    <s:Body> \
                     <u:'+action+' xmlns:u="urn:'+urn+'"> \
                      '+command+' \
                     </u:'+action+'> \
                    </s:Body> \
                    </s:Envelope>';

        var postRequest = {
            host: this.ipAddress,
            path: url,
            port: 55000,
            method: "POST",
            headers: {
                'Content-Length': body.length,
                'Content-Type': 'text/xml; charset="utf-8"',
                'SOAPACTION': '"urn:'+urn+'#'+action+'"'
            }
        };

        var self = this;
        if(options !== undefined) {
            self.callback = options.callback;
        }

        var req = http.request(postRequest, function(res) {
            res.setEncoding('utf8');
            res.on('data', self.callback);
        });

        req.on('error', function(e) {
            console.log('error: ' + e.message);
            console.log(e);
        });

        req.write(body);
        req.end();

        return this;
    };

    /**
     * Send a command to the TV
     *
     * @param {String} command Command from codes.txt
     */
    Viera.prototype.sendCommand = function(command) {
        this.sendRequest('command', 'X_SendKey', '<X_KeyEvent>NRC_' + command.toUpperCase() + '-ONOFF</X_KeyEvent>');
        return this;
    };

    /**
     * Get volume from TV
     *
     * @param {Function} callback 
     */
    Viera.prototype.getVolume = function(callback) {
        var self = this;
        self.volumeCallback = callback;

        this.sendRequest('render', 'GetVolume', '<InstanceID>0</InstanceID><Channel>Master</Channel>',
        {
            callback: function(data){
                var match = /<CurrentVolume>(\d*)<\/CurrentVolume>/gm.exec(data);
                if(match !== null) {
                    var volume = match[1];
                    self.volumeCallback(volume);
                }
            }
        });
    };

    /**
     * Set volume
     *
     * @param {Int} volume Desired volume in range from 0 to 100
     */
    Viera.prototype.setVolume = function(volume) {
        if (volume < 0 || volume > 100) {
            throw new Error("Volume must be in range from 0 to 100");
        }

        this.sendRequest('render', 'SetVolume', '<InstanceID>0</InstanceID><Channel>Master</Channel><DesiredVolume>' + volume + '</DesiredVolume>');
        return this;
    };

    /**
     * Get the current mute setting
     *
     * @param {Function} callback
     */
    Viera.prototype.getMute = function(callback) {
        var self = this;
        self.muteCallback = callback;

        this.sendRequest('render', 'GetMute', '<InstanceID>0</InstanceID><Channel>Master</Channel>',
        {
            callback: function(data) {
                var regex = /<CurrentMute>([0-1])<\/CurrentMute>/gm;
                var match = regex.exec(data);
                if(match !== null) {
                    var mute = (match[1] === '1');
                    self.muteCallback(mute);
                }
            }
        });
    };

    /**
     * Set mute to on/off
     *
     * @param {Boolean} enable The value to set mute to
     */
    Viera.prototype.setMute = function(enable) {
        var mute = (enable)? '1' : '0';
        this.sendRequest('render', 'SetMute', "<InstanceID>0</InstanceID><Channel>Master</Channel><DesiredMute>" + mute + "</DesiredMute>");
        return this;
    };

    // Export the constructor
    module.exports = Viera;

}).call(this);
