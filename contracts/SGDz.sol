/* pragma solidity ^0.4.11; */
import "./Owned.sol";
import "./ZSLPrecompile.sol";


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
    _;
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
