const odbc = require('odbc');

async function connect() {
  try {
    const connection = await odbc.connect(`Driver={ODBC};Server=unique.adress,1433;Database=procudata;Uid=HP;Pwd=admin;Encrypt=yes;TrustServerCertificate=yes;`);
    const result = await connection.query('SELECT * FROM mytable');
    console.log(result);
    await connection.close();
  } catch (err) {
    console.error(err);
  }
}

connect();