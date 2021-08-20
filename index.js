const express = require('express')
const path = require('path')
const { Client } = require('pg');
const pepper = require('./pepper.js');

const PORT = process.env.PORT || 5000

const ssl = process.env.DATABASE_URL.startsWith('postgres://localhost')
  ? false
  : { rejectUnauthorized: false }
const db = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl
});
db.connect();
console.log("Database connected");

express()
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/leaders', async (req, res) => {
    const results  = await pepper.leadersResults(db);
      res.render('pages/leaders', {'results': results})
  })
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))