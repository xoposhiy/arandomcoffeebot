import { User , PairArray} from './types';


export const makePairs = (users: User['nickname'][], currentPairs: PairArray[]) => {
    const pairs: PairArray[] = [];
    let availableUsers = [...users];
    let i = 0;

    console.log("make pair input", users, currentPairs);
    while (availableUsers.length > 1 && i < users.length) {
        const user1 = availableUsers[0];
        i++;
        for (let j = 1; j < availableUsers.length; j++) {
            
            const user2 = availableUsers[j];
            console.log(user2)
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
        let orphan = availableUsers[0];
        if (orphan !== 'kataeva') {
            if (!currentPairs.some(([u1, u2]) => (u1 === orphan && u2 === 'kataeva') || (u2 === orphan && u1 === 'kataeva'))) {
                pairs.push([orphan, 'kataeva']);
            }
        }
    }
    return pairs;
};
