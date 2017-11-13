pragma solidity ^0.4.11;

import "./Owned.sol";

/* To be deploy by PaymentAgent, so that no human has owner access */
contract Stash is Owned {
  bytes32 bankName;
  int balance;
  /* Stash contract is keeping track of its position continuously as it will
     need to know its position continuously during the gridlock resolution
     process */
  int position; 	/* position = inflows + balance - outflows */
  bool controlled;	/* @private */

  function Stash(bytes32 _bankName) {
    bankName = _bankName;
  }

  function credit(int _crAmt) onlyOwner {
    balance += _crAmt;
  }

  function debit(int _dAmt) onlyOwner {
    balance -= _dAmt;
  }

  function safe_debit(int _dAmt) onlyOwner {
    if (_dAmt > balance) throw;
    balance -= _dAmt;
  }

  function inc_position(int amt) onlyOwner {
    position += amt;
  }

  function dec_position(int amt) onlyOwner {
    position -= amt;
  }

  function getBalance() constant returns (int) {
    return balance;
  }

  function getPosition() constant returns (int) {
    return position;
  }

  function isSolvent() constant returns (bool) {
    return position >= 0;
  }

  function mark() onlyOwner {
    controlled = true;
  }

  function isControlled() constant returns (bool) {
    return controlled;
  }
}
