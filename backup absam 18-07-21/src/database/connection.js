import knex from 'knex';
import 'dotenv/config.js';


// const db = knex({
//   client:'mysql2',
//   connection: {
//     host : 'mysql743.umbler.com',
//     port:41890,
//     user : 'dbsinermarket',
//     password :'NlXaddGjx_#gH8U',
//     database : 'db_sinermarket'
//   },
//   useNullAsDefault:true,
// });

const db = knex({
    client:'mysql2',
    connection: {
      host : process.env.DB_HOST,
      user : process.env.DB_USER,
      port:process.env.DB_PORT,
      password :process.env.DB_PASSWORD,
      database : process.env.DB_DATABASE
    },
    useNullAsDefault:true,
});

export default db;