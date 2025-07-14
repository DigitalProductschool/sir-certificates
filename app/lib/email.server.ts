import Mailjet, {
	type SendEmailV3_1,
	type LibraryResponse,
} from "node-mailjet";

const mailjet = new Mailjet({
	apiKey: process.env.MJ_APIKEY_PUBLIC,
	apiSecret: process.env.MJ_APIKEY_PRIVATE,
});

async function mailjetSend(
	mailConfig: SendEmailV3_1.Body,
): Promise<LibraryResponse<SendEmailV3_1.Response>> {
	return mailjet.post("send", { version: "v3.1" }).request(mailConfig);
}

export { mailjetSend };
