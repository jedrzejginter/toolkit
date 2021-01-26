const cors = require('cors');
const express = require('express');

const port = process.env.PORT || 3333;
const app = express();

app.use(cors());

app.get('/', (_, res) => {
  // Put your route logic here.
  res.send('Hello, world :)');
});

app.listen(port, () => {
  process.stdout.write(`🚀 Listening on port ${port}\n`);
});
