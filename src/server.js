const express = require('express');
const path = require('path');
const router = require('./router');

const PORT = 3005;
const app = express();

app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/', router);

app.listen(PORT, () => {
  console.log(`Claude Dashboard: http://localhost:${PORT}`);
});
