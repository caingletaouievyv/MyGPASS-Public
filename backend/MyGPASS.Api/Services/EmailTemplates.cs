namespace MyGPASS.Api.Services;

public static class EmailTemplates
{
    public static string GetVerificationEmailBody(string userFirstName, string verificationUrl, int expirationHours = 24)
    {
        return $@"
<!DOCTYPE html>
<html lang=""en"">
<head>
    <meta charset=""UTF-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <title>Verify Your Email</title>
    <style>
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ text-align: center; padding: 20px 0; border-bottom: 1px solid #eee; }}
        .logo {{ font-size: 24px; font-weight: bold; color: #0b3a82; letter-spacing: -0.03em; }}
        .logo-word {{ display: inline-block; }}
        .logo-p {{ display: inline-block; font-size: 1em; font-weight: 800; line-height: 1; vertical-align: middle; transform: translateY(-1px); }}
        .content {{ padding: 30px 0; }}
        .button {{ display: inline-block; padding: 12px 30px; background-color: #0b3a82; color: #fff; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
        .footer {{ text-align: center; padding: 20px 0; border-top: 1px solid #eee; font-size: 12px; color: #666; }}
        .warning {{ color: #d9534f; font-size: 14px; margin-top: 20px; }}
    </style>
</head>
<body>
    <div class=""container"">
        <div class=""header"">
            <div class=""logo""><span class=""logo-word"">Globalport</span></div>
        </div>
        <div class=""content"">
            <p>Hello {userFirstName},</p>
            <p>Thank you for registering with GTI PASS! To complete your registration, please verify your email address by clicking the button below:</p>
            <a href=""{verificationUrl}"" class=""button"">Verify Email Address</a>
            <p>This verification link will expire in {expirationHours} hours.</p>
            <p>If you did not create this account, you can safely ignore this email.</p>
            <div class=""warning"">
                <strong>Security Note:</strong> Never share this link with anyone. GTI PASS will never ask for this information via email.
            </div>
        </div>
        <div class=""footer"">
            <p>Powered by Globalport</p>
            <p>&copy; 2026 GTI PASS. All rights reserved.</p>
        </div>
    </div>
</body>
</html>";
    }

    public static string GetPasswordResetEmailBody(string userFirstName, string resetUrl, int expirationHours = 24)
    {
        return $@"
<!DOCTYPE html>
<html lang=""en"">
<head>
    <meta charset=""UTF-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <title>Reset Your Password</title>
    <style>
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ text-align: center; padding: 20px 0; border-bottom: 1px solid #eee; }}
        .logo {{ font-size: 24px; font-weight: bold; color: #0b3a82; letter-spacing: -0.03em; }}
        .logo-word {{ display: inline-block; }}
        .logo-p {{ display: inline-block; font-size: 1em; font-weight: 800; line-height: 1; vertical-align: middle; transform: translateY(-1px); }}
        .content {{ padding: 30px 0; }}
        .button {{ display: inline-block; padding: 12px 30px; background-color: #0b3a82; color: #fff; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
        .footer {{ text-align: center; padding: 20px 0; border-top: 1px solid #eee; font-size: 12px; color: #666; }}
        .warning {{ color: #d9534f; font-size: 14px; margin-top: 20px; }}
    </style>
</head>
<body>
    <div class=""container"">
        <div class=""header"">
            <div class=""logo""><span class=""logo-word"">Globalport</span></div>
        </div>
        <div class=""content"">
            <p>Hello {userFirstName},</p>
            <p>We received a request to reset your password. If you made this request, please click the button below to reset your password:</p>
            <a href=""{resetUrl}"" class=""button"">Reset Password</a>
            <p>This reset link will expire in {expirationHours} hours.</p>
            <div class=""warning"">
                <strong>Important:</strong> If you did not request a password reset, please ignore this email. Your account remains secure.
            </div>
            <p>For security reasons, never share this link with anyone.</p>
        </div>
        <div class=""footer"">
            <p>Powered by Globalport</p>
            <p>&copy; 2026 GTI PASS. All rights reserved.</p>
        </div>
    </div>
</body>
</html>";
    }
}
