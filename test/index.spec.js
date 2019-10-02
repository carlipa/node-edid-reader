import expect from 'expect';
import fixtures from './fixtures/edidParser';
import EdidReader from '../src/';

describe('Edid Parser', () => {
  fixtures.forEach((fixture, index) => {
    it(`should match Edid #${index + 1}`, () => {
      const edidReader = new EdidReader();
      return edidReader.loadString(fixture.edid)
        .then(() => {
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

// describe('Edid Parser', () => {
//   const edidReader = new EdidReader();
//   edidReader.scan()
//     .then(() => {
//       console.log(edidReader.monitors);
//     });
// });
