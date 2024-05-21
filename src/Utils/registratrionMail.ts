import nodemailer from "nodemailer";

//Defining the sendMail function
const sendEmail = async function (subject: string, message: string, email: string): Promise<void> {
  try {
    // Create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USERNAME!, 
        pass: process.env.SMTP_PASSWORD!    
      }
    });

    // Send mail with defined transport object
    await transporter.sendMail({
      from: process.env.SMTP_FROM_EMAIL, // Sender address
      to: email, // Recipient's email
      subject: subject, // Subject 
      html: message, // HTML body
    });
  } catch (error) {
    // Handle error
    console.error("Error sending email:", error);
    throw error;
  }
};

//Exporting sendEmail
export default sendEmail;
