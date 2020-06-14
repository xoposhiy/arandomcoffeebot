import Slimbot from 'slimbot';
import { program } from 'commander';
import { red, green, yellow } from 'chalk';

import { getDbTools } from './src/db';
import {
    ADMINS,
    START_COMMANDS,
    STOP_COMMANDS,
    HELP_COMMANDS,
    CONFIRM_COMMANDS,
    DECLINE_COMMANDS,
    RESERVED_USERS
} from './src/const';
import { makePairs } from './src/helpers';

let apiKey = process.env.npm_config_apikey;

if (!apiKey) {
    program.option('-k, --key <type>', 'api key');
    program.parse(process.argv);
    apiKey = program.key;
}

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
                    slimbot.sendMessage(chatId, "Ты резервный!") // todo
                    return;
                }
                if (ADMINS.includes(username)) {
                    slimbot.sendMessage(chatId, "Ты админ!") // todo
                    return;
                }
                if (!username) {
                    slimbot.sendMessage(chatId, "У тебя нет username добавь его и начни с начала!") // todo
                    return;
                }
                await dbTools.addUser(username, chatId);
                slimbot.sendMessage(chatId, 
                    `Привет 👋 \n\nМы в Контуре придумали как компенсировать офлан-знакомства ` +
                    `и смоллтоки у кулера в удалённом формате и написали бота, который раз в ` +
                    `день случайно распределяет всех участников на пары. Игру мы разработали в ` +
                    `преддверии конференций JUG Ru Group по нашим любимым направлениям. Поэтому в ` +
                    `основном тут будут обитать дотнет-разработчики, тестировщики и фронтендеры. \n\n` +
                    
                    `Ты постучался в бота, а значит, уже стал участником ` +
                    `В 11:00 (Мск) бот попросит тебя подтвердить участие в ближайшем круге. Ты сможешь:\n` +
                    `— согласиться при помощи команды /go, \n` +
                    `— отказаться на сутки при командой /nottoday \n` +
                    `— или остановить бота командой /stop.\n\n` +

                    `Если запутаешься или забудешь команды, набирай /help.`
                )

            } else if (STOP_COMMANDS.includes(message)) {
                await dbTools.deleteUser(username);
            } else if (HELP_COMMANDS.includes(message)) {
                slimbot.sendMessage(chatId, 
                        `Ты можешь общаться с ботом при помощи этих команд: \n` +
                        `/start — стать участником \n` +
                        `/stop — выйти из игры \n\n` +
                        
                        `/help — получить список доступных команд \n\n` +
                        
                        `За час до распределения бот спросит у тебя подтверждение на участие ` +
                        `в ближайшем круге: \n`+
                        `/go — участвовать в ближайшие сутки \n` +
                        `/nottoday — не беспокоить до завтра`    
                    );
            } else {
                if (config.confirmation === 1) {
                    if (CONFIRM_COMMANDS.includes(message)) {
                        await dbTools.confirmUser(username);
                        slimbot.sendMessage(
                            chatId,
                            'Отлично! Скоро мы пришлём тебе имя собеседника на сегодня.'
                        );
                        return;
                    }
                    if (DECLINE_COMMANDS.includes(message)) {
                        slimbot.sendMessage(
                            chatId,
                                'Жаль, сегодня не увидимся. До завтра!\n' +
                                `Может, пока посмотришь ТехКонтур.ТВ? \n` +
                                `https://www.youtube.com/watch?v=NSJqnhc3FvI&feature=youtu.be \n\n` +
                                'Если хочешь остановить бота насовсем, просто введи команду /stop.'
                        );
                        return;
                    }
                }
                if (ADMINS.includes(username)) {
                    if (message === '/config') {
                        slimbot.sendMessage(chatId, JSON.stringify(config));
                    }
                    if (message === '/users') {
                        const users = await dbTools.getAllUsers(null);
                        users
                            .sort((a, b) => (a.active > b.active ? -1 : a.active === b.active ? 0 : 1))
                            .forEach(user => {
                                slimbot.sendMessage(
                                    chatId,
                                    `${user.active ? 'Активен' : 'Не активен'} | ${user.nickname}: ${user.id}`
                                );
                            });
                    }
                    if (message === '/dusers') {
                        const users = await dbTools.getAllDeletedUsers();
                        users.forEach(user => {
                            slimbot.sendMessage(chatId, user.nickname);
                        });
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
                    }
                    if (message === '/mix') {
                        const users = await dbTools.getAllUsers(1);
                        if (users.length < 2) {
                            slimbot.sendMessage(chatId, 'Недостаточно пользователей для формирования пар');
                            return;
                        }
                        const pairs = await dbTools.getAllPairs();
                        const newPairs = makePairs(
                            users.map(user => user.nickname),
                            pairs.map(pair => [pair.nickname1, pair.nickname2])
                        );
                        if (!newPairs.length){
                            slimbot.sendMessage(chatId, `Пары кончились`);
                            return;
                        }
                        const lastPairOrderId = await dbTools.getLastPairOrderId();
                        for (const [user1, user2] of newPairs) {
                            await dbTools.addPair(user1, user2, lastPairOrderId + 1);
                            slimbot.sendMessage(chatId, `Составил пару @${user1} c @${user2}`);
                        }
                    }
                    if (message === '/reminder') {
                        const users = await dbTools.getAllUsers(0);

                        users.forEach((user) => {
                            slimbot.sendMessage(user.id, "Активируй слыш!");
                        })
                        slimbot.sendMessage(chatId, 'Отправили сообщения пользователям для напоминия');
                    }
                    if (message === '/notify') {
                        const users = await dbTools.getAllUsers(null);
                        const lastPairOrderId = await dbTools.getLastPairOrderId();
                        const pairs = await dbTools.getAllPairs(lastPairOrderId);
                        console.log(users, lastPairOrderId, pairs);
                        pairs.forEach(({ nickname1, nickname2 }) => {
                            const user1 = users.find(user => user.nickname === nickname1);
                            const user2 = users.find(user => user.nickname === nickname2);
                            slimbot.sendMessage(user1.id, `Вжух! Мы нашли тебе собеседника. Сегодня это @${user2.nickname}. Наливай чашечку кофе и скорее договоривайся о созвоне!`);
                            slimbot.sendMessage(user2.id, `Вжух! Мы нашли тебе собеседника. Сегодня это @${user1.nickname}. Наливай чашечку кофе и скорее договоривайся о созвоне!`);
                            console.log(user1?.id, user2?.nickname);
                            console.log(user2?.id, user1?.nickname);
                        });
                        await dbTools.resetUsers();
                        slimbot.sendMessage(chatId, 'Отправили сообщения пользователям для беседы и сбросили активацию');
                    }
                    return; 
                }
                slimbot.sendMessage(chatId, 'Неизвестная команда. Жми /help для вызова подсказки.');
            }
        } catch (e) {
            console.error(e);
        }
    });

    slimbot.startPolling();
    console.log(green('Бот запущен'));
})();
