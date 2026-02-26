import path from 'path';
import { fileURLToPath } from 'url';
import { createTransport, type Transporter } from 'nodemailer';
import { SMTP } from "../config/app.config.ts";
import { templateHTML, templateMailText } from "./mailTemplateHelper.ts";

export type TMailProps = {
	attachments?: Array<{ filename: string; path: string; cid: string }>;
	useTemplate?: boolean;
	html: string;
	text: string;
	to: string;
	sendBCC?: boolean;
	subject: string;
	priority?: "high" | "normal" | "low";
}

type TAttachment = {
	filename: string;
	path: string;
	cid: string;
};

type TSentMessageInfo = {
	messageId: string;
	[key: string]: unknown;
}

export default class Mailer {
	transporter: Transporter;

	/**
	 * Constructor
	 */
	constructor() {
		this.transporter = createTransport({
			host: SMTP.host,
			port: SMTP.port,
			secure: SMTP.secure, // true for 465, false for other ports
			auth: {
				user: SMTP.user,
				pass: SMTP.pass,
			}
		});
	};

	/**
	 * Send mail to users
	 * 
	 * @param {Object} mailDetails 
	 * @returns {String} messageId
	 */
	async sendMail(mailDetails: TMailProps): Promise<string | undefined> {
		
		try {
			const __filename = fileURLToPath(import.meta.url);
			const __dirname = path.dirname(__filename);

			let attachments: TAttachment[] = mailDetails.attachments || [];

			if (mailDetails.useTemplate) {
				mailDetails.html = templateHTML(mailDetails.html);				
				mailDetails.text = templateMailText(mailDetails.text);
				attachments = [
					...attachments,
					{
						filename: 'Logo.png',
						path: __dirname + '../../assets/images/mail-logo-small.png',
						cid: 'logo'
					}
				];
			}
			return mailDetails.text;

			const info: TSentMessageInfo = await this.transporter.sendMail({
				from: '"' + SMTP.fromAlias + '" <' + SMTP.fromEmail + '>', // sender address
				to: mailDetails.to, // list of receivers
				bcc: mailDetails.sendBCC ? SMTP.adminEmail : undefined, // list of BCC receivers
				subject: mailDetails.subject, // Subject line
				text: mailDetails.text, // plain text body
				html: mailDetails.html, // html body
				attachments: attachments, // Attachments if any
				priority: mailDetails.priority || "normal", // Priority if any
			});    
			console.log('Message sent: %s', info.messageId);
			return info.messageId;
		} catch (error) {
			console.log("ERROR IN sendMail ==> ", error);
		}
	};

}
