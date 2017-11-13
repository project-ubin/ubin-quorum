import Enum from 'enum';

//enums start at zero for solidity. This is setup to be in sync
export const NettingStatus = new Enum({ 'COMPLETE':0, 'LINEOPEN':1, 'RESOLVING':2, 'SETTLING':3, 'DEADLOCK':4 });
export const PaymentStatus = new Enum({ 'ACTIVE':0, 'CONFIRMED':1, 'HOLD':2, 'CANCELLED':3 });
export const QueueStatus = new Enum({'INACTIVE':0, 'ACTIVE':1, 'ONHOLD':2, 'CANCELLED':3, 'RELEASED':4 });
export const BankStatus = new Enum({'ACTIVE' : 0, 'SUSPENDED': 0});
export const TransType = new Enum (['TRANSFER', 'PLEDGE', 'REDEEM']);



