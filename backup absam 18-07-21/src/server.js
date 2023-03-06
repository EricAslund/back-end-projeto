import express from 'express';

import routes from './routes.js';

import cors from 'cors';



const app = express();



app.use(cors());

app.use(express.json({

    type: ['application/json', 'text/plain']

}))
app.use(express.urlencoded({ extended: true }));

app.use(routes);



const port = process.env.PORT || 3000;

app.listen(port, function () {

    console.log('Umbler listening on port %s', port);

});



// app.listen(process.env.PORT || 3000);