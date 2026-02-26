import { SMTP } from "../config/app.config.ts";

/**
 * Add common HTML template to the mails
 * 
 * @param {string} content 
 * @returns {string} mailHtml
 */
export const templateHTML = (content: string): string => {
	const header = `
		<!DOCTYPE html>
		<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>Email Notification</title>
				<style>
					h1-yag {
						color: #FFA500; /* Orange */
					}
					p1 {
						color: #333; /* Dark Gray */
					}
					.highlight {
						color: #28A745; /* Green */
					}
					.social-links a {
						margin: 0 10px;
						color: #007BFF; /* Blue */
						text-decoration: none;
					}
				</style>
			</head>
		<body style="font-family: Arial, sans-serif; margin: 0px auto; padding: 0px auto; background-color: #fefefe;">
		<div style="width: 100%;
					max-width: 700px;
					margin: 20px auto;
					border: 12px solid #E5E5E5;
					border-radius: 8px;
					background-color: #E5E5E5;
					box-shadow: 0px 0px 8px rgba(0, 0, 0, 0.1);
					overflow: hidden;">
			<div style="background-color: #ffffff; color: #ffffff; padding: 24px 24px 0px 24px; border-radius: 8px 8px 0px 0px; text-align: center;">
				<img style="width: 60px;" alt="Logo" src="cid:logo" style="max-height: 20px;">
			</div>
			<div style="padding: 24px; background-color: #ffffff; border-radius: 0 0 8px 8px;">
	`;

	const footer = `
				<p><b>Sincerely,<br/>${SMTP.fromAlias}</b></p></div>
				<div style="background-color: #E5E5E5; text-align: center; padding: 12px;">
					<p>Contact us: support@yourwebsite.com | +123 456 7890</p>
					<div class="social-links">
						<a href="#">Facebook</a>
						<a href="#">Twitter</a>
						<a href="#">Instagram</a>
					</div>
				</div>
			</div>
		</body>
		</html>
	`;
	let htmlContent = header;
	htmlContent += content;
	htmlContent += ``;
	htmlContent += footer;

	return htmlContent;
};

/**
 * Add template to the text of mails
 * 
 * @param {string} content 
 * @returns {string} mailHtml
 */
export const templateMailText = (content: string): string => {
	let textContent = content;
	textContent += "\n\n\nSincerely,\n" + SMTP.fromAlias;

	return textContent;
};