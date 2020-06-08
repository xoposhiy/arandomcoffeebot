import Slimbot from 'slimbot';
import { program } from 'commander';
import chalk from 'chalk';

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
    console.error(chalk.red('Необходимо указать ключ API бота. yarn start -key "YOUR:KEY"'));
    process.exit();
}

(async () => {
    let dbTools = await getDbTools();
    console.log(chalk.yellow('Текущие настройки'), await dbTools.getConfig());
    await dbTools.setConfigOption('confirmation', 1);
    const slimbot = new Slimbot(apiKey);

    slimbot.on('message', async ({ text = '', chat: { username, id: chatId } }) => {
        try {
            const config = await dbTools.getConfig();
            const message = text.toLowerCase();
            if (START_COMMANDS.includes(message)) {
                if (RESERVED_USERS.includes(username)) {
                    await dbTools.addUser(username, chatId, 1);
                    return;
                }
                if (ADMINS.includes(username)) {
                    return;
                }
                await dbTools.addUser(username, chatId);
            } else if (STOP_COMMANDS.includes(message)) {
                await dbTools.deleteUser(username);
            } else if (HELP_COMMANDS.includes(message)) {
                slimbot.sendMessage(chatId, 'Хз чем тебе помочь');
            } else {
                if (config.confirmation === 1) {
                    if (CONFIRM_COMMANDS.includes(message)) {
                        await dbTools.confirmUser(username);
                        slimbot.sendMessage(
                            chatId,
                            'Ваше участие подтверждено, скоро мы пришлем вам информацию о вашем напарнике'
                        );
                        return;
                    }
                    if (DECLINE_COMMANDS.includes(message)) {
                        slimbot.sendMessage(
                            chatId,
                            'Жаль что вы не подтвердили участие, увидемся завтра!\n' +
                                'Если не хотите больше принимать участие, просто напишите /stop'
                        );
                        return;
                    }
                }
                if (ADMINS.includes(username)) {
                    if (message === '/config') {
                        slimbot.sendMessage(chatId, JSON.stringify(config));
                    }
                    if (message === '/users') {
                        const users = await dbTools.getAllUsers();
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
                        const users = await dbTools.getAllUsers(true);
                        if (users.length < 2) {
                            slimbot.sendMessage(chatId, 'Недостаточно пользователей для формирования пар');
                            return;
                        }
                        const pairs = await dbTools.getAllPairs();
                        const newPairs = makePairs(
                            users.map(user => user.nickname),
                            pairs.map(pair => [pair.nickname1, pair.nickname2])
                        );
                        const lastPairOrderId = await dbTools.getLastPairOrderId();
                        for (const [user1, user2] of newPairs) {
                            await dbTools.addPair(user1, user2, lastPairOrderId + 1);
                        }
                    }
                    if (message === '/notify') {
                        const users = await dbTools.getAllUsers();
                        const lastPairOrderId = await dbTools.getLastPairOrderId();
                        const pairs = await dbTools.getAllPairs(lastPairOrderId);
                        console.log(users, lastPairOrderId, pairs);
                        pairs.forEach(({ nickname1, nickname2 }) => {
                            const user1 = users.find(user => user.nickname === nickname1);
                            const user2 = users.find(user => user.nickname === nickname2);
                            // slimbot.sendMessage(user1.id, `Вы в паре с ${user2.nickname}`);
                            // slimbot.sendMessage(user2.id, `Вы в паре с ${user1.nickname}`);
                            console.log(user1.id, user2.nickname);
                            console.log(user2.id, user1.nickname);
                        });
                    }
                    return;
                }
                slimbot.sendMessage(chatId, 'Неизвестная команда. /help для вызова подсказки');
            }
        } catch (e) {
            console.error(e);
        }
    });

    slimbot.startPolling();
    console.log(chalk.green('Бот запущен'));
})();
