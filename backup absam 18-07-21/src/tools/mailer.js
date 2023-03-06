import nodemailer from 'nodemailer';
import hbs from 'nodemailer-express-handlebars';
import path from 'path';
import 'dotenv/config.js';


const transport = nodemailer.createTransport({
    host:process.env.HOST,
    port:process.env.PORT_EMAIL,
    tls:{
      rejectUnauthorized: false
 },
    auth: {
      user:process.env.USER_EMAIL,
      pass:process.env.PASS
    }
  });

  transport.use('compile', hbs({
      viewEngine: 'handlebars',
      viewPath: path.resolve('./src/recursos/mail/'),
      extName: '.html',
  }))

  export default transport;