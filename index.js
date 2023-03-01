import express from 'express';

const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.send('Hello World!');
});

// Start the webserver
app.listen(port, () => {
  console.log(`Broker is listening on port ${port}`);
});