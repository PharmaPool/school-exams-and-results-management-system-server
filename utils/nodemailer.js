const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
dotenv.config();

const mailer = async (email, subject, message, code) => {
  const mail = process.env.EMAIL;
  const pass = process.env.PASS;

  const transporter = await nodemailer.createTransport({
    host: "smtp.zoho.com",
    port: 465,
    secure: true,
    auth: {
      user: mail,
      pass: pass,
    },
  });

  const mailOptions = {
    from: "Pharmapool <info@pharmapoolng.com>",
    to: email,
    subject: subject,
    html: `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta charset="utf-8"> <!-- utf-8 works for most cases -->
    <meta name="viewport" content="width=device-width"> <!-- Forcing initial-scale shouldn't be necessary -->
    <meta http-equiv="X-UA-Compatible" content="IE=edge"> <!-- Use the latest (edge) version of IE rendering engine -->
    <meta name="x-apple-disable-message-reformatting">  <!-- Disable auto-scale in iOS 10 Mail entirely -->
    <title></title> <!-- The title tag shows in email notifications, like Android 4.4. -->

    <link href="https://fonts.googleapis.com/css?family=Lato:300,400,700" rel="stylesheet">
</head>

<body width="100%" style="margin: 0; padding: 0 !important; mso-line-height-rule: exactly; background-color: #f1f1f1;">
	<center style="width: 100%; background-color: #f1f1f1;">
    <div style="display: none; font-size: 1px;max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all; font-family: sans-serif;">
      &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
    </div>
    <div style="max-width: 600px; margin: 0px auto;" class="email-container">
    	<!-- BEGIN BODY -->
      <table align="center" role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: auto; background-color: white;">
      	<tr>
          <td valign="top" class="bg_white" style="padding: 1em 2.5em 0 2.5em;">
          	<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          		<tr>
          			<td class="logo" style="text-align: center;">
			            <img src="https://res.cloudinary.com/muyi-hira-app/image/upload/v1732449959/unn_euoshu.png" alt="" style="width: 60px; max-width: 100px; height: auto; margin: auto; display: block;">
			          </td>
          		</tr>
          	</table>
          </td>
	      </tr><!-- end tr -->
          <tr>
          <td valign="top" class="bg_white" style="padding: auto;">
          	<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          		<tr>
          			<td class="logo" style="text-align: center;">
<h2 style="margin-bottom: 0rem;">Faculty of Pharmaceutical Sciences</h2>
<h3 style="margin-top: 0rem;">University of Nigeria Nsukka</h3>
			          </td>
          		</tr>
          	</table>
          </td>
	      </tr>

          <tr>
          <td valign="top" class="bg_white" style="padding: auto;">
          	<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          		<tr>
          			<td class="logo" style="text-align: center;">
<div class="text" style="padding: 0 2.5em; text-align: center;">
						<h1 style="margin-top: 0px; text-align: center; color: black;">${subject}</h1>
						<div style="padding: 1em 0 1em 0;"></div>
						<h3 style="font-weight: bold; color: black;">Dear ${email},</h3>
						<h3 style="color: black;">${message}</h3>
              <h2 style="background-color: #004d40; color: #fff; border: none; padding: 1rem; font-size: x-large; font-weight: bolder;">${code}</h2>
            			</div>
			          </td>
          		</tr>
          	</table>
          </td>
	      </tr>
	      <tr>
          <!-- <td valign="middle" class="hero bg_white" style="padding: 3em 0 2em 0;">
           
          </td> -->
	      </tr><!-- end tr -->
		
      <!-- 1 Column Text + Button : END -->
      </table>
      <table align="center" role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: auto;">
        <tr>
          <td class="bg_light" style="text-align: center; background-color: black; color: white;">
          	<p>© 2024 University of Nigeria Nsukka | All Rights Reserved</p>
          </td>
        </tr>
      </table>

    </div>
  </center>
</body>
</html>
`,
  };

  await transporter.sendMail(mailOptions, (error, info) => {
    if (error) console.log(error);
    else console.log("email sent successfully: " + info.response);
  });
};

module.exports = mailer;
