import UserController from "./user-controller.js";

export default class TelegramBotController {
	static async handleRequest(req, res) {
		const { message } = req.body;

		if (message) {
			const { chat, from, text } = message;
			const { type } = chat;

			if (type !== "private") return;

			await TelegramBotController.#handleCommand(from, text);
		}

		res.sendStatus(200);
	}

	static async #sendMessage(chatId, text, keyboard) {
		try {
			const telegramChatEndpoint = `https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`;

			const requestBody = {
				text,
				chat_id: chatId,
				parse_mode: "Markdown",
				reply_markup: keyboard
					? {
							inline_keyboard: [keyboard],
						}
					: undefined,
			};

			const requestOptions = {
				method: "POST",
				body: JSON.stringify(requestBody),
				headers: {
					"Content-Type": "application/json",
				},
			};

			await fetch(telegramChatEndpoint, requestOptions);
		} catch (error) {
			console.log("Telegram webhook error: ", error);
		}
	}

	static async #handleCommand(chat, command) {
		const { id, username, last_name, first_name } = chat;

		if (command.startsWith("/start")) {
			const userExists = await UserController.userExists({ id });
			const containsReferralCode = /^\/start\s[a-zA-Z0-9]{10}$/.test(command);

			if (!userExists) {
				await UserController.createAccount({
					id,
					username,
					lastName: last_name,
					firstName: first_name,
					referredBy: containsReferralCode ? command.split(" ")[1] : undefined,
				});

				containsReferralCode &&
					(await UserController.updateUser(
						{
							referralCode: command.split(" ")[1],
						},
						{
							totalReferrals: { type: "increment" },
							balance: {
								type: "increment",
								step: 10,
							},
						},
					));
			}

			await TelegramBotController.#sendMessage(
				id,
				`👋 Hello ${first_name || "friend"}, welcome to the Ankr Airdrop Bot! \nIt's great to have you on board! 🎉\n\nOpen the app to continue!`,
			);
		}
	}
}
