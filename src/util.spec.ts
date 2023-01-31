import { split } from './util';

describe('utils', () => {
  test('split', () => {
    expect(split('a1b23', '1', '2', '3')).toEqual(['a', 'b', '']);
  });
});