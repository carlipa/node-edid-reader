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

// describe('Edid Parser', () => {
//   const edidReader = new EdidReader();
//   edidReader.scan()
//     .then(() => {
//       console.log(edidReader.monitors);
//     });
// });
