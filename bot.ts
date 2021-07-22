import Slimbot from 'slimbot';
import { program } from 'commander';
import { red, green, yellow } from 'chalk';
const fs = require('fs');
const CSON = require('cson')

import { getDbTools } from './src/db';
import {
    START_COMMANDS,
    STOP_COMMANDS,
    HELP_COMMANDS,
    CONFIRM_COMMANDS,
    DECLINE_COMMANDS,
} from './src/const';
import { makePairs } from './src/helpers';

program.option('-k, --key <type>', 'api key');
program.option('-s, --settings <settings.cson>', 'file with custom settings in CSON format');
program.parse(process.argv);

let apiKey = process.env.npm_config_apikey || program.key;
let messagesFile = process.env.npm_config_settings || program.settings || "settings.cson";
let settings = CSON.parse(fs.readFileSync(messagesFile));

let ADMINS = settings.admins;
let RESERVED_USERS = settings.reserved_users;
let messages = settings.messages;

if (!apiKey) {
    console.error(red('Необходимо указать ключ API бота. yarn start -key "YOUR:KEY"'));
    process.exit();
}

const socks5proxy = {
    socksHost: process.env['SOCKS5_HOST'], //required
    socksPort: process.env['SOCKS5_PORT'], //required
    socksUsername: process.env['SOCKS5_USER'], //optional
    socksPassword: process.env['SOCKS5_PASSWORD'] //optional
};



class Slimbot2 extends Slimbot {
    startPolling(callback) {
      return super.getUpdates(this._offset, callback)
      .then(updates => {
        if (updates !== undefined) {
          this._processUpdates(updates);
        }
        return null;
      })
      .catch(error => {
        if (callback) {
          callback(error);
        }
        else {
          throw error;
        }
      })
      .finally(() => {
        this._timeout = setTimeout(() => this.startPolling(callback), 100);
      });
    }
  
  }

(async () => {
    let dbTools = await getDbTools();
    console.log(yellow('Текущие настройки'), await dbTools.getConfig());
    await dbTools.setConfigOption('confirmation', 1);
    const slimbot = new Slimbot2(apiKey);

    slimbot.on('message', async ({ text = '', chat: { username, id: chatId } }) => {
        try {
			const config = await dbTools.getConfig();
            const message = text.toLowerCase();
            if (START_COMMANDS.includes(message)) {
                if (RESERVED_USERS.includes(username)) {
                    console.log(username);

                    await dbTools.addUser(username, chatId, 1);
                    slimbot.sendMessage(chatId, "Ты резервный пользователь. Если кому-то не хватит пары, он будет общаться с тобой :)")
                }
                if (ADMINS.includes(username)) {
                    slimbot.sendMessage(chatId, "Ты админ, и управляешь всей этой петрушкой!")
                }
                if (!username) {
                    slimbot.sendMessage(chatId, `К сожалению, мы не можем добавить тебя в игру, так как ты зарегистрирован в Телеграме без юзернейма. ` +
                                                `Чтобы это исправить, сделай вот что:\n` +
                                                `— зайди в настройки,\n` +
                                                `— найди раздел «имя пользователя»,\n` +
                                                `— введи новый юзернейм в поле,\n` +
                                                `— подтверди действие в правом верхнем углу,\n` +
                                                `— готово, ты великолепен!\n\n` +
                                                `Теперь вернись в бота и ещё раз введи команду /start, чтобы войти в игру.`
                    ) 
                    return;
                }
                await dbTools.addUser(username, chatId);
                slimbot.sendMessage(chatId, messages.start)
				return;

            } else if (STOP_COMMANDS.includes(message)) {
                await dbTools.deleteUser(username);
				slimbot.sendMessage(chatId, "Пока-пока!");
				return;
            } else if (HELP_COMMANDS.includes(message)) {
                slimbot.sendMessage(chatId, messages.help);
				if (ADMINS.includes(username)){
					slimbot.sendMessage(chatId, 
							`А ещё ты админ, а значит можешь делать следующее: \n` +
							`/users — посмотреть всех зарегистрированных пользователей.\n` +
							`/dusers — посмотреть всех, кто прекратил работу бота командой \stop\n` +
							
							`/reminder — отправить всем пользователям предложение подтвердить своё участие в ближайшем круге знакомств\n` +
							`/mix —  сгенерировать из всех подтвердивших новый набор пар и записать его в базу (чтобы потом не повторять пары)\n` +
							`/pairs — посмотреть все сгенерированные пары в последний запуск \mix\n` +
							`/notify — сообщить всем участникам их напарников по беседе.`
						);
				}
				return;
            } else {
                if (config.confirmation === 1) {
                    if (CONFIRM_COMMANDS.includes(message)) {
                        await dbTools.confirmUser(username);
                        slimbot.sendMessage(chatId, messages.confirm);
                        return;
                    }
                    if (DECLINE_COMMANDS.includes(message)) {
                        slimbot.sendMessage(chatId, messages.decline);
                        return;
                    }
                }
                if (ADMINS.includes(username)) {
                    if (message === '/config') {
                        slimbot.sendMessage(chatId, JSON.stringify(config));
						return;
                    }
                    if (message === '/users') {
                        const users = await dbTools.getAllUsers(null);
                        users
                            .sort((a, b) => (a.active > b.active ? -1 : a.active === b.active ? 0 : 1))
                            .forEach(user => {
                                slimbot.sendMessage(
                                    chatId,
                                    `${user.active ? 'Подтвердил' : 'Не подтвердил'} | ${user.nickname}: ${user.id}`
                                );
                            });
						return;
                    }
                    if (message === '/dusers') {
                        const users = await dbTools.getAllDeletedUsers();
                        users.forEach(user => {
                            slimbot.sendMessage(chatId, user.nickname);
                        });
						return;
                    }
                    if (message === '/pairs') {
                        const lastPairOrderId = await dbTools.getLastPairOrderId();
                        const pairs = await dbTools.getAllPairs(lastPairOrderId);
                        if (!pairs || pairs.length === 0) {
                            slimbot.sendMessage(chatId, 'Нет пар');
                        }
                        pairs.forEach(({ nickname1, nickname2 }) => {
                            slimbot.sendMessage(chatId, `@${nickname1} & @${nickname2}`);
                        });
						return;
                    }
                    if (message === '/mix') {
                        const users = 
							(await dbTools.getAllUsers(1))
							.filter(user => !RESERVED_USERS.includes(user.nickname) && !ADMINS.includes(user.nickname));
							
                        console.log(users.length + " активных без админов и резервных");
						if (users.length < 2) {
                            slimbot.sendMessage(chatId, 'Недостаточно пользователей для формирования пар');
                            return;
                        }
                        const pairs = await dbTools.getAllPairs();
                        const newPairs = makePairs(
							users.map(user => user.nickname),
                            pairs.map(pair => [pair.nickname1, pair.nickname2]),
							RESERVED_USERS
                        );
                        if (!newPairs.length){
                            slimbot.sendMessage(chatId, `Пары кончились. Все со всеми поговорили!`);
                            return;
                        }
                        const lastPairOrderId = await dbTools.getLastPairOrderId();
                        for (const [user1, user2] of newPairs) {
                            await dbTools.addPair(user1, user2, lastPairOrderId + 1);
                            slimbot.sendMessage(chatId, `Составил пару @${user1} c @${user2}`);
                        }
						return;
                    }
                    if (message === '/reminder') {
                        const users = await dbTools.getAllUsers(0);

                        users.forEach((user) => {
                            slimbot.sendMessage(user.id, messages.reminder);
                        })
                        slimbot.sendMessage(chatId, 'Отправили сообщения пользователям для напоминания');
						return;
                    }
                    if (message === '/notify') {
                        const users = await dbTools.getAllUsers(null);
                        const lastPairOrderId = await dbTools.getLastPairOrderId();
                        const pairs = await dbTools.getAllPairs(lastPairOrderId);
                        console.log(users, lastPairOrderId, pairs);
                        pairs.forEach(({ nickname1, nickname2 }) => {
                            const user1 = users.find(user => user.nickname === nickname1);
                            const user2 = users.find(user => user.nickname === nickname2);
                            if (user1)
								slimbot.sendMessage(user1.id, messages.notification.replace("%USERNAME%", user2.nickname));
                            if (user2)
								slimbot.sendMessage(user2.id, messages.notification.replace("%USERNAME%", user1.nickname));
                            console.log(user1?.id, user2?.nickname);
                            console.log(user2?.id, user1?.nickname);
                        });
                        await dbTools.resetUsers();
                        slimbot.sendMessage(chatId, 'Отправили сообщения пользователям для беседы и сбросили активацию');
						return;
                    }
                }
                slimbot.sendMessage(chatId, 'Бот не знает такую команду. Жми /help для вызова подсказки.');
            }
        } catch (e) {
            console.error(e);
			if (ADMINS.includes(username))
				slimbot.sendMessage(chatId, "Ошибка в боте\n\n" + e);
        }
    });

    slimbot.startPolling();
    console.log(green('Бот запущен'));
})();
