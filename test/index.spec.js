import expect from 'expect';
import fixtures from './fixtures/edidParser';
import EdidReader from '../src/';

describe('Edid Parser', () => {
  fixtures.forEach((fixture, index) => {
    it(`should match Edid #${index + 1}`, () => {
      const edidReader = new EdidReader();
      return edidReader.loadString(fixture.edid)
        .then(() => {
          expect(edidReader.monitors[0].displaySize[0]).toBe(fixture.displaySize[0]);
          expect(edidReader.monitors[0].displaySize[1]).toBe(fixture.displaySize[1]);
          expect(edidReader.monitors[0].serialNumber).toBe(fixture.serialNumber);
          expect(edidReader.monitors[0].modelName).toBe(fixture.modelName);
          expect(edidReader.monitors[0].eisaId).toBe(fixture.eisaId);
          expect(edidReader.monitors[0].edidVersion).toBe(fixture.edidVersion);
          expect(edidReader.monitors[0].manufactureDate).toBe(fixture.manufactureDate);
        });
    });
  });
});

describe('Output Mapper', () => {
  // /sys/devices/pci0000:00/0000:00:02.0/drm/card0/card0-DP-1/edid
  it('should match output DP1', () => {
    const outputName = EdidReader.cardOutputMapper('/sys/devices/pci0000:00/0000:00:02.0/drm/card0/card0-DP-1/edid');
    expect(outputName).toBe('DP1');
  });
  it('should match output DP2', () => {
    const outputName = EdidReader.cardOutputMapper('/sys/devices/pci0000:00/0000:00:02.0/drm/card0/card0-DP-2/edid');
    expect(outputName).toBe('DP2');
  });
  it('should match output HDMI1', () => {
    const outputName = EdidReader.cardOutputMapper('/sys/devices/pci0000:00/0000:00:02.0/drm/card0/card0-HDMI-A-1/edid');
    expect(outputName).toBe('HDMI1');
  });
});

describe('String parser', () => {
  it('should accept string EDID', () => {
    const edid = EdidReader.parse('00ffffffffffff00132e01000101010101140103811009780a4611a456509d26105054210800d1c081c0010101010101010101010101023a801871382d40582c4500a05a0000001e000000fd003a3e1e5310000a202020202020000000fc0044796e615363616e2048444d4900000011000000000000000000000000000001800203134144010304902309070465030c00100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010');
    expect(edid.validHeader).toBe('OK');
    expect(edid.eisaId).toBe('DYN');
    expect(edid.serialNumber).toBe(16843009);
  });

  it('should accept raw array EDID', () => {
    const edid = EdidReader.parse([0,255,255,255,255,255,255,0,19,46,1,0,1,1,1,1,1,20,1,3,129,16,9,120,10,70,17,164,86,80,157,38,16,80,84,33,8,0,209,192,129,192,1,1,1,1,1,1,1,1,1,1,1,1,2,58,128,24,113,56,45,64,88,44,69,0,160,90,0,0,0,30,0,0,0,253,0,58,62,30,83,16,0,10,32,32,32,32,32,32,0,0,0,252,0,68,121,110,97,83,99,97,110,32,72,68,77,73,0,0,0,17,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,128,2,3,19,65,68,1,3,4,144,35,9,7,4,101,3,12,0,16,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,16]);
    expect(edid.validHeader).toBe('OK');
    expect(edid.eisaId).toBe('DYN');
    expect(edid.serialNumber).toBe(16843009);
  });

  it('should throw error on invalid EDID', () => {
    try {
      const edid = EdidReader.parse([0,255,255]);
    } catch(err) {
      expect(err instanceof Error).toBe(true);
    }
  });

  it('should throw error on invalid EDID', () => {
    try {
      const edid = EdidReader.parse('aabbaa00');
    } catch(err) {
      expect(err instanceof Error).toBe(true);
    }
  });

  it('should throw error on invalid EDID', () => {
    try {
      const edid = EdidReader.parse(0);
    } catch(err) {
      expect(err instanceof Error).toBe(true);
    }
  });
});

// describe('Edid Parser', () => {
//   const edidReader = new EdidReader();
//   edidReader.scan()
//     .then(() => {
//       console.log(edidReader.monitors);
//     });
// });
