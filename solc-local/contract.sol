contract Owned{
  address owner;

  function Owned() {
    owner = msg.sender;
  }

  modifier onlyOwner() {
    if(msg.sender!=owner) throw; _
  }

  function getOwner() constant returns (address) {
    return owner;
  }

  function changeOwner(address _newOwner) onlyOwner {
    owner = _newOwner;
  }
}


// Copyright 2017 Zerocoin Electric Coin Company LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 @title Abstract contract for built-in function
 */
contract ZSLPrecompileSHA256Compress {
    function run(bytes) constant returns (bytes32);
}

/**
 @title Abstract contract for built-in function
 */
contract ZSLPrecompileVerify {
    function run(bytes, bytes32, bytes32, uint64) constant returns (bytes32);
}

/**
 @title Abstract contract for built-in function
 */
contract ZSLPrecompileVerifyTransfer {
    function run(bytes, bytes32, bytes32, bytes32, bytes32, bytes32, bytes32, bytes32) constant returns (bytes32);
}

/**
 @title Abstract contract for built-in function
 */
contract ZSLPrecompileVerifyABC {
    function run(bytes, bytes32, bytes32, bytes32) constant returns (bytes32);
}

/**
 @title ZSL contract
 */
contract ZSLPrecompile {

    ZSLPrecompileSHA256Compress private compressContract;
    ZSLPrecompileVerifyTransfer private verifyShieldedTransferContract;
    ZSLPrecompileVerify private verifyShieldingContract;
    ZSLPrecompileVerify private verifyUnshieldingContract;
    ZSLPrecompileVerifyABC private verifyABCContract;

    // @dev Address of precompiles must match those in the Geth/Quorum client
    function ZSLPrecompile() {
        compressContract = ZSLPrecompileSHA256Compress(0x000000000000000000000000000000005a534c01);
        verifyShieldedTransferContract = ZSLPrecompileVerifyTransfer(0x000000000000000000000000000000005a534c02);
        verifyShieldingContract = ZSLPrecompileVerify(0x000000000000000000000000000000005a534c03);
        verifyUnshieldingContract = ZSLPrecompileVerify(0x000000000000000000000000000000005a534c04);
        verifyABCContract = ZSLPrecompileVerifyABC(0x000000000000000000000000000000005a534c05);
    }

    // @param input Input data block must be 64 bytes (512 bits) in length
    function SHA256Compress(bytes input) constant external returns (bytes32 result) {
        require(input.length == 64);
        return compressContract.run(input);
    }

    // @param input The ZK Proof to verify
    function verifyShieldedTransfer(
        bytes proof,
        bytes32 anchor,
        bytes32 spend_nf_1,
        bytes32 spend_nf_2,
        bytes32 send_nf_1,
        bytes32 send_nf_2,
        bytes32 cm_1,
        bytes32 cm_2
    ) constant external returns (bool) {
        bytes32 buffer = verifyShieldedTransferContract.run(
            proof, anchor, spend_nf_1, spend_nf_2,
            send_nf_1, send_nf_2, cm_1, cm_2);
        byte b = buffer[0];
        if (b == 0x00) {
            return false;
        } else if (b == 0x01) {
            return true;
        }
        assert(false);
    }


    // @param input The ZK Proof to verify
    function verifyShielding(bytes proof, bytes32 send_nf, bytes32 cm, uint64 value) constant external returns (bool) {
        bytes32 buffer = verifyShieldingContract.run(proof, send_nf, cm, value);
        byte b = buffer[0];
        if (b == 0x00) {
            return false;
        } else if (b == 0x01) {
            return true;
        }
        assert(false);
    }



    // @param input The ZK Proof to verify
    function verifyUnshielding(bytes proof, bytes32 spend_nf, bytes32 rt, uint64 value) constant external returns (bool) {
        bytes32 buffer = verifyUnshieldingContract.run(proof, spend_nf, rt, value);
        byte b = buffer[0];
        if (b == 0x00) {
            return false;
        } else if (b == 0x01) {
            return true;
        }
        assert(false);
    }


    // @param input The ZK Proof to verify
    function verifyABC(bytes proof, bytes32 h1, bytes32 h2, bytes32 h3) constant external returns (bool) {
        bytes32 buffer = verifyABCContract.run(proof, h1, h2, h3);
        byte b = buffer[0];
        if (b == 0x00) {
            return false;
        } else if (b == 0x01) {
            return true;
        }
        /* assert(false); */
    }

    // Fallback function for unknown function signature to prevent accidental sending of ether
    function () {
        revert();
    }

    /*
      Utility functions when compiling with solidity 0.3.6
    */
    function assert(bool assertion) internal {
      if (!assertion) {
        throw;
      }
    }

    function require(bool requirement) internal {
      if (!requirement) {
        throw;
      }
    }

    function revert() internal {
      throw;
    }

}


// TODOS:
// state machine safeguards

contract SGDz is Owned { // to be deployed by MAS

  // ZSL contract
  ZSLPrecompile private zsl;
  address private zsl_address;

  mapping (address => bytes32) public shieldedBalances; // stash name to balance

  /* Shielded payment */
  struct ShieldedPayment {
    address sender;
    address receiver;
    bytes32 amountHash;
    BalanceProposal senderProposal;
    BalanceProposal receiverProposal;
    bool processed;
  }
  mapping (bytes32 => ShieldedPayment) shieldedPayments; // pmt ref to payments

  /* Proposal */
  struct BalanceProposal {
    bytes32 pmtRef;
    bytes32 startBalanceHash;
    bytes32 endBalanceHash;
    bool validated;
  }
  struct ProposalQueue { // random access queue
    bytes32[] qIdx; // id is pmtRef
    bool allInboundsSubmitted;
  }
  mapping (address => ProposalQueue) proposalQueue; // queued proposals for netting

  function getProposal(bytes32 _pmtRef, address _participant)
    internal constant returns (BalanceProposal)
  {
    if (shieldedPayments[_pmtRef].receiver == _participant) {
      return shieldedPayments[_pmtRef].receiverProposal;
    } else {
      return shieldedPayments[_pmtRef].senderProposal;
    }
  }

  function getAmountHash(bytes32 _pmtRef) constant returns (bytes32) {
    return shieldedPayments[_pmtRef].amountHash;
  }

  address[] participants; // participants of current netting round

  function lineUp() {
    participants.push(msg.sender);
  }


  function getParticipants() constant returns (address[]) {
    return participants;
  }


  mapping (address => bool) public done;


  modifier notProcessed (bytes32 _pmtRef) {
    require(!shieldedPayments[_pmtRef].processed);
    _
  }

  function SGDz() {
    zsl_address = new ZSLPrecompile();
    zsl = ZSLPrecompile(zsl_address);
  }

  function setShieldedBalance(address _owner, bytes32 _shieldedBalance) onlyOwner {
    shieldedBalances[_owner] = _shieldedBalance;
  }

  function paymentIsValidated(bytes32 _pmtRef) returns (bool) {
    return shieldedPayments[_pmtRef].processed;
  }


  // called right after a payment is submitted to payment agent
  event AmountHash(bytes32 pmtRef, bytes32 amountHash, address sender, address receiver);
  function submitShieldedPayment(bytes32 _pmtRef, address _receiver, bytes32 _amountHash, bool gridlocked) {
    shieldedPayments[_pmtRef].sender = msg.sender;
    shieldedPayments[_pmtRef].receiver = _receiver;
    shieldedPayments[_pmtRef].amountHash = _amountHash;
    if (!gridlocked) AmountHash(_pmtRef, _amountHash, msg.sender, _receiver);
  }

  // called right before a balance update in z contract
  // change proof length later; typical proof length is ~2200 bits
  // do gridlocked submission only after the netting set is agreed upon by everyone
  event ProposalCompleted(bytes32 pmtRef, address sender, address receiver);
  event ProposalInitiated(bytes32 pmtRef, address sender, address receiver);
  event BatchedProposalCompleted();
  function submitProposal(bytes _proof,
        bytes32 _pmtRef,
        bytes32 _startBalanceHash,
        bytes32 _endBalanceHash,
        bool _batched)
    notProcessed(_pmtRef)
  {
    // verify proof
    if (isReceiver(_pmtRef)) {
      require(zsl.verifyABC(_proof, _startBalanceHash, shieldedPayments[_pmtRef].amountHash, _endBalanceHash));
    } else {
      require(zsl.verifyABC(_proof, _endBalanceHash, shieldedPayments[_pmtRef].amountHash, _startBalanceHash));
    }
    BalanceProposal memory p = BalanceProposal(_pmtRef, _startBalanceHash, _endBalanceHash, true);
    if (isReceiver(_pmtRef)) {
      shieldedPayments[_pmtRef].receiverProposal = p;
    } else {
      shieldedPayments[_pmtRef].senderProposal = p;
    }
    // process proposal
    if (_batched) {
      enqueueProposal(_pmtRef);
    } else { // normal payment, proposal is accepted right away
      if (proofCompleted(_pmtRef) && proofNotExpired(_pmtRef)) { // atomic transaction
  shieldedBalances[shieldedPayments[_pmtRef].sender] =
    shieldedPayments[_pmtRef].senderProposal.endBalanceHash;
  shieldedBalances[shieldedPayments[_pmtRef].receiver] =
    shieldedPayments[_pmtRef].receiverProposal.endBalanceHash;
  shieldedPayments[_pmtRef].processed = true;
  ProposalCompleted(_pmtRef, shieldedPayments[_pmtRef].sender, shieldedPayments[_pmtRef].receiver);
      } else {
  ProposalInitiated(_pmtRef, shieldedPayments[_pmtRef].sender, shieldedPayments[_pmtRef].receiver);
      }
    }
  }

  function enqueueProposal(bytes32 _pmtRef) internal {
    // check chaining condition
    bytes32[] qIdx = proposalQueue[tx.origin].qIdx;
    if (qIdx.length == 0) { // proposal queue is empty
      require(shieldedBalances[tx.origin] == getProposal(_pmtRef, tx.origin).startBalanceHash);
    } else {
      require(getProposal(qIdx[qIdx.length-1], tx.origin).endBalanceHash ==
            getProposal(_pmtRef, tx.origin).startBalanceHash);
    }
    // enqueue
    /* if (isReceiver(_pmtRef)) { */
    /*   if (proposalQueue[tx.origin].allInboundsSubmitted) throw; */
    /* } else { */
    /*   proposalQueue[tx.origin].allInboundsSubmitted = true; */
    /* } */
    proposalQueue[tx.origin].qIdx.push(_pmtRef);
    done[tx.origin] = false;
  }

  /* called after all netting proof submitted */
  function batchedProofFinished() {
    done[msg.sender] = true;
    bool batchedProposalCompleted = true;
    for (uint i = 0; i < participants.length; i++) {
      if (!done[participants[i]]) {
  batchedProposalCompleted = false;
  break;
      }
    }
    if (batchedProposalCompleted) {
      verifyBatchedProposal();
      participants.length = 0;
    }
  }

  function proofNotExpired(bytes32 _pmtRef) internal constant returns (bool) {
    ShieldedPayment spmt = shieldedPayments[_pmtRef];
    if (spmt.receiverProposal.startBalanceHash != shieldedBalances[spmt.receiver]) return false;
    if (spmt.senderProposal.startBalanceHash != shieldedBalances[spmt.sender]) return false;
    return true;
  }

  function proofCompleted(bytes32 _pmtRef) constant returns (bool) {
    return shieldedPayments[_pmtRef].receiverProposal.validated && shieldedPayments[_pmtRef].senderProposal.validated;
  }

  // for netting and batch processing; called before settle() in PaymentAgent
  function verifyBatchedProposal() {
    for (uint i = 0; i < participants.length; i++) {
      bytes32[] qIdx = proposalQueue[participants[i]].qIdx;
      for (uint j = 0; j < qIdx.length; j++) {
  if (!proofCompleted(qIdx[j])) throw;
  shieldedPayments[qIdx[j]].processed = true;
      }
    }
    // Now all proof chains are verified; update shielded balance to what's proposed
    for (uint k = 0; k < participants.length; k++) {
      ProposalQueue q = proposalQueue[participants[k]];
      bytes32 finalProposalId = q.qIdx[q.qIdx.length-1];
      address p_ = participants[k];
      shieldedBalances[p_] = getProposal(finalProposalId, p_).endBalanceHash;
      // clean up
      q.qIdx.length = 0;
      q.allInboundsSubmitted = false;
    }
    BatchedProposalCompleted();
  }

  function isReceiver(bytes32 _pmtRef) internal constant returns (bool) {
    return (shieldedPayments[_pmtRef].receiver == tx.origin);
  }

  function pmtProcessed(bytes32 _pmtRef) external constant returns (bool) {
    return shieldedPayments[_pmtRef].processed;
  }

  function debugVerifyABC(bytes proof, bytes32 h1, bytes32 h2, bytes32 h3) constant external returns (bool) {
    return zsl.verifyABC(proof, h1, h2, h3);
  }

  function assert(bool assertion) internal {
      if (!assertion) {
    throw;
      }
  }

  function require(bool requirement) internal {
      if (!requirement) {
    throw;
      }
  }

  function revert() internal {
      throw;
  }

}
