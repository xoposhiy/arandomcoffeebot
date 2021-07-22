import { User, PairArray} from './types';

export const makePairs = (users: User['nickname'][], currentPairs: PairArray[], reservedUsers: User['nickname'][]) => {
    const pairs: PairArray[] = [];
    let availableUsers = [...users];
    console.log("make pair input", users, currentPairs);
    while (availableUsers.length > 0) {
		const user1 = availableUsers.pop();
        const user2 = getPair(user1, availableUsers, currentPairs) || getPair(user1, reservedUsers, currentPairs);
		if (user2 !== null)
			pairs.push([user1, user2]);
		else{
			console.log(user1 + " has no pair even with reserved users :(");
		}
    }
    return pairs;
};

function getPair(user1: User['nickname'], availableUsers: User['nickname'][], currentPairs: PairArray[]){
	for (let tryIndex = 0; tryIndex < availableUsers.length; tryIndex++) {
		const i = Math.floor(Math.random() * availableUsers.length);
		const user2 = availableUsers[i];
		if (currentPairs.some(([u1, u2]) => (u1 === user1 && u2 === user2) || (u2 === user1 && u1 === user2))) {
			continue;
		}
		availableUsers.splice(i, 1);
		return user2;
	}
	return null;	
}
