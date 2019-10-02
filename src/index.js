'use strict';

// Generic imports
const Promise = require('bluebird');
const _ = require('lodash');
const os = require('os');
const fs = Promise.promisifyAll(require('fs'));
const glob = Promise.promisify(require('glob'));
const spawn = require('child_process').spawn;

// Local imports
const EdidParser = require('./edid-parser');

class EdidReader {

  // Source: http://www.komeil.com/blog/fix-edid-monitor-no-signal-dvi#li-comment-845
  static eisaIds = require(`${__dirname}/../data/eisa.json`);

  constructor() {
    if (!_.includes(['linux', 'darwin'], os.platform())) {
      process.stderr.write('EdidReader not available on this platform\n');
      return;
    }
    this.monitors = [];
  }

  getSystemEdids() {
    if (os.platform() === 'darwin') return this.getDarwinSystemEdids();
    if (os.platform() === 'linux') return this.getLinuxSystemEdids();
    throw new Error('Unsupported platform');
  }

  // Mac OSX fetch EDID
  getDarwinSystemEdids() {
    const shellCommand = 'ioreg -lw0 -r -c "IODisplayConnect" -n "display0" -d 2';
    const child = spawn('sh', ['-c', shellCommand]);
    let data = '';
    return new Promise((resolve) => {
      child.stdout.on('data', (output) => {
        data += output.toString();
      });
      child.on('exit', () => {
        const regex = /"IODisplayEDID" = <([0-f]+)>/g;
        let matches, edids = [];
        while (matches = regex.exec(data)) {
          edids.push(matches[1]);
        }
        resolve(edids);
      });
    })
    .filter((edid) => edid !== '');
  }

  // Linux fetch EDID
  getLinuxSystemEdids() {
    // /sys/devices/pci0000\:00/0000\:00\:02.0/drm/card0/card0-HDMI-A-1/edid
    return glob('/sys/devices/pci*/0000:*/drm/card*/card*/edid')
      .map((edidFileName) => fs.readFileAsync(edidFileName))
      .map((buffer) => buffer.toString('hex'))
      .filter((edid) => edid !== '');
  }

  // Group 2 by 2, hex to int
  formatEdid(edid) {
    const rawEdid = edid.split(/(?=(?:..)*$)/);
    return _.map(rawEdid, (block) => parseInt(block.toUpperCase(), 16));
  }

  // Scan host for edids
  scan() {
    return this.getSystemEdids()
      .map(this.formatEdid)
      .then((rawEdids) => {
        this.monitors = _.map(rawEdids, (rawEdid) => EdidReader.parse(rawEdid));
      });
  }

  

  // Parse edid
  static parse(rawEdid) {
    const edidParser = new EdidParser();
    edidParser.setEdidData(rawEdid);
    edidParser.parse();
    const vendor = EdidReader.eisaIds[edidParser.eisaId] || {name: '', fullName: ''};
    edidParser.vendor = vendor.name;
    edidParser.vendorFullName = vendor.fullName;
    return edidParser;
  }

  loadString(str) {
    let rawEdid = (str.toString('utf8'));
    rawEdid = rawEdid.replace(/[\ \n]/g, '');
    return Promise.resolve(this.formatEdid(rawEdid))
      .then((rawEdid) => {
        this.monitors.push(EdidReader.parse(rawEdid));
      });
  }

  // Load edid file
  loadFile(path) {
    return fs.readFileAsync(path)
      .then((buffer) => {
        let rawEdid = (buffer.toString('utf8'));
        rawEdid = rawEdid.replace(/[\ \n]/g, '');
        return this.formatEdid(rawEdid);
      })
      .then((rawEdid) => {
        this.monitors.push(EdidReader.parse(rawEdid));
      });
  }

  static cardOutputMapper(cardOutputName) {
    // card0-HDMI-A-1 => HDMI1
  }
}

module.exports = EdidReader;
