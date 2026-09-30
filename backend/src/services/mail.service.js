import transporter from "../config/mail.js";

export const sendPasswordResetOtp = async ({email,otp,}) => {
    await transporter.sendMail({
        from: `"BlogPilot" <${process.env.MAIL_USER}>`,
        to: email,
        subject: "BlogPilot Password Reset OTP",
        text: `Your BlogPilot password reset OTP is ${otp}. It is valid for 10 minutes.`,
        html: `
      <div style="font-family: Arial, sans-serif;">
        <h2>BlogPilot Password Reset</h2>

        <p>Your password reset OTP is:</p>

        <h1 style="letter-spacing: 6px;">
          ${otp}
        </h1>

        <p>
          This OTP is valid for <strong>10 minutes</strong>.
        </p>

        <p>
          If you did not request a password reset, you can safely ignore this email.
        </p>
      </div>
    `,
    });
};