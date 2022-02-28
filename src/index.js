'use strict';

// Generic imports
const Promise = require('bluebird');
const _ = require('lodash');
const os = require('os');
const fs = Promise.promisifyAll(require('fs'));
const glob = Promise.promisify(require('glob'));
const spawn = require('child_process').spawn;

const nodeEnv = process.env.NODE_ENV || 'production';

// Local imports
const EdidParser = require('./edid-parser');

class EdidReader {

  // Source: http://www.komeil.com/blog/fix-edid-monitor-no-signal-dvi#li-comment-845
  static eisaIds = require(`${__dirname}/../data/eisa.json`);
  // Source: https://uefi.org/acpi_id_list
  static pnpIds = require(`${__dirname}/../data/pnp.json`);

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
    .filter((edid) => edid !== '')
    .map(edid => ({filename: null, edid}));
  }

  // Linux fetch EDID
  getLinuxSystemEdids() {
    // /sys/devices/pci0000\:00/0000\:00\:02.0/drm/card0/card0-HDMI-A-1/edid
    return glob('/sys/devices/pci*/0000:*/drm/card*/card*/edid')
      .map((edidFileName) => fs.readFileAsync(edidFileName)
        .then(buffer => ({filename: edidFileName, edid: buffer.toString('hex')})))
      .filter(result => result.edid !== '');
  }

  // Group 2 by 2, hex to int
  static formatEdid({filename, edid}) {
    const rawEdid = edid.split(/(?=(?:..)*$)/);
    return {
      filename,
      edid: _.map(rawEdid, (block) => parseInt(block.toUpperCase(), 16))
    };
  }

  // Scan host for edids
  scan() {
    return this.getSystemEdids()
      .map(this.formatEdid)
      .then((rawEdids) => {
        this.monitors = _.map(rawEdids, ({filename, edid}) => {
          const edidObj = EdidReader.parse(edid);
          edidObj.outputName = EdidReader.cardOutputMapper(filename);
          return edidObj;
        });
      });
  }


  // Parse edid
  static parse(rawEdid) {
    let formatedEdid;
    if (typeof rawEdid === 'string') {
      const chunkedEdid = rawEdid.split(/(?=(?:..)*$)/);
      formatedEdid = _.map(chunkedEdid, (block) => parseInt(block.toUpperCase(), 16))
    } else if (rawEdid instanceof Array) {
      formatedEdid = rawEdid;
    }
    if (!formatedEdid || (formatedEdid.length !== 256 && formatedEdid.length !== 128)) {
      throw new Error('Invalid Edid format');
    }
    const edidParser = new EdidParser();
    edidParser.setEdidData(formatedEdid);
    edidParser.parse();
    const vendor = EdidReader.eisaIds[edidParser.eisaId] || EdidReader.pnpIds[edidParser.eisaId] || {name: '', fullName: ''};
    edidParser.vendor = vendor.name;
    edidParser.vendorFullName = vendor.fullName;
    if (edidParser.bdp && !_.isUndefined(edidParser.bdp.displayType)) {
      edidParser.displayInputType = edidParser.bdp.displayType;
    }
    return edidParser;
  }

  loadString(str) {
    let rawEdid = (str.toString('utf8'));
    rawEdid = rawEdid.replace(/[\ \n]/g, '');
    return Promise.resolve(EdidReader.formatEdid({filename: null, edid: rawEdid}))
      .then(({edid}) => {
        this.monitors.push(EdidReader.parse(edid));
      });
  }

  // Load edid file
  loadFile(path) {
    return fs.readFileAsync(path)
      .then((buffer) => {
        let rawEdid = (buffer.toString('utf8'));
        rawEdid = rawEdid.replace(/[\ \n]/g, '');
        return this.formatEdid({filename: path, edid: rawEdid});
      })
      .then(({filename, edid}) => {
        const edidObj = EdidReader.parse(edid);
        edidObj.outputName = EdidReader.cardOutputMapper(filename);
        this.monitors.push(edidObj);
      });
  }

  static cardOutputMapper(filename) {
    if (!filename || (os.platform() !== 'linux' && nodeEnv !== 'test') || typeof filename !== 'string') return null;
    // card0-HDMI-A-1 => HDMI1
    const outputRegex = /card[0-9]+-([^/]+)\/edid$/;
    const res = filename.match(outputRegex);
    if (!res) return null;
    let origOutputName = res[1];
    if (/^HDMI-A/.test(origOutputName)) {
      origOutputName = origOutputName.replace(/^HDMI-[A-D]/, 'HDMI');
    }
    return origOutputName.replace(/-/g, '');
  }
}

module.exports = EdidReader;
