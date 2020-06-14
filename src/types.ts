export type Config = {
    confirmation: 0 | 1;
}

export type User = {
    nickname: string;
    id: string;
    active: 0 | 1;
}

export type Pair = {
    nickname1: User['nickname'];
    nickname2: User['nickname'];
    orderId: number;
}

export type DeletedUser = Pick<User, 'nickname'>;
export type PairArray = [User['nickname'], User['nickname']];
