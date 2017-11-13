class Transaction{
    constructor(transType, transId, requestedDate, updatedDate, sender, receiver, transactionAmount, status, priority, enqueue, salt){
        this.transType = transType;
        this.transId = transId;
        this.requestedDate = requestedDate;
        this.updatedDate = updatedDate;
        this.sender = sender;
        this.receiver = receiver;
        this.transactionAmount = transactionAmount;
        this.status = status;
        this.priority = priority;
        this.enqueue = enqueue;
        this.salt = salt;
    }
}

module.exports = Transaction;