import { User } from './types';

type PairArray = [User['nickname'], User['nickname']];

export const makePairs = (users: User['nickname'][], currentPairs: PairArray[]) => {
    console.log(users, currentPairs);
    const pairs: PairArray[] = [];
    let availableUsers = [...users];
    let i = 0;
    while (availableUsers.length > 1 && i < users.length) {
        const user1 = availableUsers[0];
        i++;
        for (let j = 1; j < availableUsers.length; j++) {
            const user2 = availableUsers[j];
            if (currentPairs.some(([u1, u2]) => (u1 === user1 && u2 === user2) || (u2 === user1 && u1 === user2))) {
                continue;
            }
            pairs.push([user1, user2]);
            availableUsers.splice(0, 1);
            availableUsers.splice(j - 1, 1);
            break;
        }
    }
    if (availableUsers.length !== 0) {
        pairs.push([availableUsers[0], 'kataeva']);
    }
    return pairs;
};
