pragma solidity ^0.4.11;

contract Owned {
  address owner;

  function Owned() {
    owner = msg.sender;
  }

  modifier onlyOwner() {
    if (msg.sender!=owner) {
        throw; 
    }
    _;
  }

  function getOwner() constant returns (address) {
    return owner;
  }

  function changeOwner(address _newOwner) onlyOwner {
    owner = _newOwner;
  }
}
