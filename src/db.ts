import { Config, DeletedUser, Pair, User } from './types';

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(process.env.DB_PATH || 'db');

type Tools = {
    getConfig(): Promise<Config>;
    setConfigOption(option: keyof Config, value: number | string): Promise<void>;
    getAllUsers(active?: Number | null): Promise<User[]>;
    getAllDeletedUsers(): Promise<DeletedUser[]>;
    getAllPairs(orderId?: Pair['orderId'] | null): Promise<Pair[]>;
    getLastPairOrderId(): Promise<Pair['orderId']>;
    addUser(nickname: User['nickname'], id: User['id'], active?: User['active']): Promise<void>;
    confirmUser(nickname: User['nickname']): Promise<void>;
    deleteUser(nickname: User['nickname']): Promise<void>;
    resetUsers(): Promise<void>;
    addPair(nickname1: Pair['nickname1'], nickname2: Pair['nickname2'], orderId: Pair['orderId']): Promise<void>;
}

export const getDbTools = (): Promise<Tools> => {
    return new Promise(returnDbTools => {
        db.serialize(async function() {
            const execute = (command, ...rest) => {
                return new Promise((resolve, reject) => {
                    db.run(command, ...rest, (err, res) => {
                        if (err) {
                            console.log(err);
                            reject(err);
                        } else {
                            resolve(res);
                        }
                    });
                });
            };

            try {
                await Promise.allSettled([
                    execute('CREATE TABLE IF NOT EXISTS users (nickname varchar(255), id varchar(255) UNIQUE, active int)'),
                    execute('CREATE TABLE IF NOT EXISTS pairs (nickname1 varchar(255), nickname2 varchar2(255), orderId int)'),
                    execute('CREATE TABLE IF NOT EXISTS deletedUsers (nickname varchar(255))'),
                    execute('CREATE TABLE IF NOT EXISTS config (confirmation int)')
                ]);
            } catch (e) {
                console.log(e);
            }

            returnDbTools({
                getConfig: () => {
                    return new Promise(resolve => {
                        db.get('SELECT * FROM config', (err, res) => {
                            if (res) {
                                resolve(res);
                            } else {
                                execute('INSERT INTO config VALUES (0)').then(() => {
                                    db.get('SELECT * FROM config', (err, res) => resolve(res));
                                });
                            }
                        });
                    });
                },
                setConfigOption: async (option, value) => {
                    await execute(`UPDATE config SET ${option} = ?`, value);
                },
                getAllUsers: (active = 1) => {
                    return new Promise(resolve => {
                        console.log(active);
                        if (active !== null) {
                            db.all('SELECT * FROM users WHERE active = ?', active, (err, res) => resolve(res));
                        } else {
                            db.all('SELECT * FROM users', (err, res) => resolve(res));
                        }
                    });
                },
                getAllDeletedUsers: () => {
                    return new Promise(resolve => {
                        db.all('SELECT * FROM deletedUsers', (err, res) => resolve(res));
                    });
                },
                getAllPairs: (orderId = null) => {
                    return new Promise(resolve => {
                        if (orderId !== null) {
                            db.all('SELECT nickname1, nickname2 FROM pairs WHERE orderId = ?', orderId, (err, res) => resolve(res));
                        } else {
                            db.all('SELECT nickname1, nickname2 FROM pairs', (err, res) => resolve(res));
                        }
                    });
                },
                getLastPairOrderId: () => {
                    return new Promise(resolve => {
                        db.get('SELECT MAX(orderId) "id" FROM pairs', (err, { id }) => resolve(id ?? 0));
                    });
                },
                addUser: (nickname, id, active = 0) => {
                    return new Promise(resolve => {
                                db.run(
                                    `INSERT INTO users (nickname, id, active) VALUES (?, ?, ?) ON CONFLICT DO NOTHING`,
                                    nickname,
                                    id,
                                    active,
                                    (err, res) => resolve(res)
                                );
                                resolve();
                    });
                },
                confirmUser: async nickname => {
                    await execute('UPDATE users SET active = 1 WHERE nickname = ?', nickname);
                },
                resetUsers: async () => {
                    await execute('UPDATE users SET active = 0');
                },
                deleteUser: async nickname => {
                    await execute('DELETE FROM users WHERE nickname = ?', nickname);
                    await execute('INSERT INTO deletedUsers (nickname) VALUES (?)', nickname);
                },
                addPair: async (nickname1, nickname2, orderId) => {
                    try {
                        await execute(`INSERT INTO pairs VALUES (?, ?, ?)`, nickname1, nickname2, orderId);
                    } catch (e) {
                        console.log(e);
                    }
                }
            });
        });
    });
};
