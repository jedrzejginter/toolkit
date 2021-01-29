function strip(code) {
  let lines = code.split('\n').filter(Boolean);
  const spaces = lines[0].replace(/^(\s+).+/, '$1').length;

  return lines.map((line) => line.slice(spaces)).join('\n') + '\n';
}

test('one', () => {
  expect(
    strip(`
      function a() {
        const b = 1;
        return b;
      }
  `),
  ).toMatchSnapshot();
});
