pragma solidity ^0.4.11;

import "./Owned.sol";
import "./Stash.sol";
import "./SGDz.sol";

contract PaymentAgent is Owned { // Regulator node (MAS) should be the owner

  function PaymentAgent() {
    owner = msg.sender;
    agentState = AgentState.Normal;
    /* default config */
    maxQueueDepth = 100;
    timeout = 10 * 1000000000;   /* seconds */
    proofTimeout = 20 * 1000000000;   /* seconds */
  }

  address public zAddress;

  function setZAddress(address _zAddress) onlyOwner {
    zAddress = _zAddress;
  }

  /* stashes */
  bytes32[] public stashNames;
  // JMR stashName => stash contract address
  mapping (bytes32 => address) public stashRegistry;

  /* salt tracking */
  bytes16 public currentSalt; // used to retrieve shielded balance
  bytes16 public nettingSalt; // used to cache result salt after LSM calculation

  /* @pseudo-public
       during LSM / confirming pmt: banks and cb will call this to set their current salt
     @private for: [pledger]
       during pledge / redeem: MAS-regulator / cb will invoke this function
   */
  function setCurrentSalt(bytes16 _salt) {
    require(checkOwnedStash(acc2stash[msg.sender])); // non-owner will not update salt
    if (acc2stash[msg.sender] != centralBank) {// when banks are setting salt, cb should not update its salt
      require(msg.sender == owner || !isCentralBankNode()); // unless it invoked by MAS-regulator
    } else {
      require(isCentralBankNode()); // when cb are setting salt, banks should not update its salt
    }
    currentSalt = _salt;
  }

  /* @pseudo-public */
  function setNettingSalt(bytes16 _salt) {
    require(checkOwnedStash(acc2stash[msg.sender])); // non-owner will not update salt
    if (acc2stash[msg.sender] != centralBank) {// when banks are setting salt, cb should not update its salt
      require(msg.sender == owner || !isCentralBankNode()); // unless it invoked by MAS-regulator
    } else {
      require(isCentralBankNode()); // when cb are setting salt, banks should not update its salt
    }
    nettingSalt = _salt;
  }

  // @pseudo-public, all the banks besides cb will not execute this action
  function setCentralBankCurrentSalt(bytes16 _salt) onlyCentralBank {
    if (isCentralBankNode()) {
      currentSalt = _salt;
    }
  }

  function getCurrentSalt() constant returns (bytes16) {
    require(msg.sender == owner || checkOwnedStash(acc2stash[msg.sender]));
    return currentSalt;
  }

  /* set up central bank */
  bytes32 public centralBank;
  function setCentralBank(bytes32 _stashName) onlyOwner {
    centralBank = _stashName;
  }
  modifier onlyCentralBank() { 
      require(acc2stash[msg.sender] == centralBank); 
      _; 
  }

  /* Suspend bank / stash */
  mapping (bytes32 => bool) public suspended;
  function suspendStash(bytes32 _stashName) onlyOwner {
    suspended[_stashName] = true;
  }
  function unSuspendStash(bytes32 _stashName) onlyOwner {
    suspended[_stashName] = false;
  }

  //modifier notSuspended(bytes32 _stashName) { require(suspended[_stashName] == false); _; }
  event statusCode(int errorCode); // statusCode added to handle returns upon exceptions - Laks

  // workaround to handle exception as require/throw do not return errors - need to refactor - Laks
  modifier notSuspended(bytes32 _stashName) {
    if ( suspended[_stashName] ) {
      statusCode(100);
      return;
    }
    _;
  }

  /* pledge | redeem */
  struct Pledge {
    bytes32 txRef;
    bytes32 stashName;
    int amount;
    uint timestamp;
  }

  struct Redeem {
    bytes32 txRef;
    bytes32 stashName;
    int amount;
    uint timestamp;
  }

  bytes32[] public pledgeIdx;
  mapping (bytes32 => Pledge) public pledges;

  bytes32[] public redeemIdx;
  mapping (bytes32 => Redeem) public redeems;

  function getPledgeHistoryLength() constant returns (uint) {
    return pledgeIdx.length;
  }
  function getRedeemHistoryLength() constant returns (uint) {
    return redeemIdx.length;
  }
  /* payments */
  modifier isPositive(int _amount) {
      if (_amount <= 0 ) {
          throw;
      }
      _;
  }
  modifier isInvoled(bytes32 _sender, bytes32 _receiver) {
    if (!checkOwnedStash(_sender) && !checkOwnedStash(_receiver)) {
        throw;
     }
     _;
  }
  // Pending: waiting for value transfer in z-contract, or waiting as receiver, or waiting
  // for gridlock resolution procecss to finished
  // Confirmed: value transfer in z-contract is completed
  // Gridlocked: gridlocked payments
  //UBIN-61 : added Canceled state, UBIN-63/64 - put on hold status- Laks
  enum PmtState { 
      Pending, Confirmed, Onhold, Cancelled 
  }
  struct Pmt {
    bytes32 txRef;
    bytes32 sender;
    bytes32 receiver;
    int amount; // > 0
    PmtState state;
    int express;
    bool putInQueue;
    uint timestamp; // added to include sorting in API layer - Laks
    bytes16 salt;
  }
  uint public expressCount;
  bytes32[] public pmtIdx;                  // @private (list of all-trans)
  mapping (bytes32 => Pmt) public payments; // @private

  function getSalt(bytes32 _txRef) constant returns (bytes16) {
    return payments[_txRef].salt;
  }

  function getOutgoingQueueDepth() constant returns(uint) {
    uint result = 0;
    for (uint i = 0; i < gridlockQueue.length; ++i) {
      if (payments[gridlockQueue[i]].sender == acc2stash[msg.sender]) {
        result++;
      }
    }
    return result;
  }

  //uint public inactivationTracker; //RH - omit cancel and hold from queue

  bytes32[] public onholdPmts;

  function getOnholdCount() constant returns(uint) {
    return onholdPmts.length;
  }

  function getOnholdPmtDetails(uint index) constant returns( bytes32, bytes32, bytes32, int, PmtState, int, bool, uint) {
    bytes32 txRef = onholdPmts[index];
    return (txRef, payments[txRef].sender, payments[txRef].receiver, payments[txRef].amount, payments[txRef].state, payments[txRef].express, payments[txRef].putInQueue, payments[txRef].timestamp);
  }

  function getPaymentAmount(bytes32 _txRef) constant returns (int) {
    require(checkOwnedStash(payments[_txRef].sender) || checkOwnedStash(payments[_txRef].receiver));
    return payments[_txRef].amount;
  }

  bytes32[] public gridlockQueue;           // @private

  /* gridlock resolution facilities */
  enum GridlockState { Cancelled, Inactive, Active, Onhold, Released }
  struct GridlockedPmt {
    GridlockState state;
    bool receiverVote;  // for receiver to indicate whether inactivation is acceptable
  }
  // key should be pmt sha3 hash. But currently txRef is used
  // to globaqueue after checking queue.
  uint public globalGridlockQueueDepth;
  mapping (bytes32 => GridlockedPmt) public globalGridlockQueue;

  uint public maxQueueDepth;                 // queue depth trigger

  /* resolve sequence */
  address[] public resolveSequence;          // order of banks for round-robin in resolution steps

  /* struct Participant { */
  /*   address ethKey; */
  /*   bool exists; */
  /* } */
  /* mapping(uint => Participant) resolveSequence; */
  /* uint resolveSequenceLength; */

  uint public current;                       // current resolving bank

  mapping (address => bytes32) public acc2stash; // @pseudo-public
  function registerStash(address _acc, bytes32 _stashName) onlyOwner {
    acc2stash[_acc] = _stashName;
  }
  modifier isStashOwner(bytes32 _stashName) {
    require(msg.sender == owner || acc2stash[msg.sender] == _stashName);
    _;
  }
  modifier onlySender(bytes32 _txRef) {
      require(acc2stash[tx.origin] == payments[_txRef].sender); 
      _; 
  }
  modifier onlyTxParties(bytes32 _txRef) { 
      require(acc2stash[tx.origin] == payments[_txRef].sender || acc2stash[tx.origin] == payments[_txRef].receiver); 
      _;
  }
  modifier onlyReceiver(bytes32 _txRef) {
      require(acc2stash[tx.origin] == payments[_txRef].receiver);
      _;
 }

  modifier isYourTurn() { 
      if (resolveSequence[current] != msg.sender) {
        throw;
      } 
      _; 
   }

  /* state machine */
  uint lineOpenTime;                     // time when the first participant is in line
  uint public lastResolveTime;                  // time when the last participant did the resolve round
  uint public timeout;                          // wait time for participants to line up
  uint public proofTimeout;
  uint resolveEndTime;                  // time when the current the resolve round finishes

  function setTimeout(uint _timeout) onlyOwner {
    timeout = _timeout;
  }

  enum AgentState { Normal, Lineopen, Resolving, Settling }
  AgentState public agentState;
  modifier atState(AgentState _state) {
    if (agentState != _state) {
      throw;
    }
    _; 
  }
  event AgentStateChange(AgentState state);
  function nextState() internal {
    if (agentState == AgentState.Normal) {
        globalGridlockQueueDepth = 0;
    }
    if (agentState == AgentState.Lineopen) { 
        lineOpenTime = 0;
        lastResolveTime = now; 
    }
    if (agentState == AgentState.Resolving) { 
        current = 0; resolveEndTime = now; }
    if (agentState == AgentState.Settling) {
        resolveSequence.length = 0;
    }
    agentState = AgentState((uint(agentState) + 1) % 4);
    AgentStateChange(agentState);
  }
  // Note that this modifier is only added to resolution method, so if nobody
  // has started to resolve then one can still join even if time's up.
  mapping(address => uint) lastPingTime;
  event Ping(uint delta, uint _timeout);
  function ping() {
    lastPingTime[msg.sender] = now;
    Ping(now - lastResolveTime, timeout);
  }

  modifier timedTransitions() {
    if (agentState == AgentState.Lineopen) {
      if (resolveSequence.length == stashNames.length || now >= lineOpenTime + timeout) {
        nextState();
      }
    }

    /* Non-lenient timeout kick-out rule */

    int delta = getMyResolveSequenceId() - int(current);
    uint resolveTimeout;
    resolveTimeout = timeout * (uint(delta) + resolveSequence.length);
    if (delta >= 0) {
      resolveTimeout = timeout * uint(delta);
    }
    if (lastResolveTime == 0) {
        lastResolveTime = now;
    }
    if (agentState == AgentState.Resolving &&
        lastResolveTime + resolveTimeout <= lastPingTime[msg.sender] &&
        lastPingTime[msg.sender] > lastPingTime[resolveSequence[current]]) {
      for (uint i = current; i < resolveSequence.length-1; i++) {
        resolveSequence[i] = resolveSequence[i+1];
      }
      delete resolveSequence[resolveSequence.length-1];
      resolveSequence.length--;
    }
    _;


    /* if (agentState == AgentState.Resolving && */
    /*     lastResolveTime + timeout <= now) { */
    /*   for (uint i = current; i < resolveSequence.length-1; i++) { */
    /*     resolveSequence[i] = resolveSequence[i+1]; */
    /*   } */
    /*   delete resolveSequence[resolveSequence.length-1]; */
    /*   resolveSequence.length--; */
    /* } */
    /* _; */

  }

  /* Sync Messaging */
  mapping (bytes32 => bool) public done;
  bytes32[] inactivatedPmtRefs;
  bytes32[] doneStashes;
  bytes32[] notDoneStashes;
  bool committed;
  function arrayEqual(bytes32[] a, bytes32[] b) returns (bool) {
    if (a.length != b.length) {
        return false;
    }
    for (uint i = 0; i < a.length; i++) {
      if (a[i] != b[i]) {
          return false;
      }
    }
    return true;
  }
  modifier hasCommitted(bytes32[] _inactivatedPmtRefs,
                        bytes32[] _doneStashes,
                        bytes32[] _notDoneStashes)
  {
    if (checkOwnedStash(acc2stash[resolveSequence[current]]) &&
        !(acc2stash[resolveSequence[current]] != centralBank && isCentralBankNode())) {
      if (!committed) {
          throw;
      }
      else {
          committed = false;
      }
      if (checkOwnedStash(acc2stash[resolveSequence[current]])) {
        if (!arrayEqual(_inactivatedPmtRefs, inactivatedPmtRefs)) throw;
        if (!arrayEqual(_doneStashes, doneStashes)) throw;
        if (!arrayEqual(_notDoneStashes, notDoneStashes)) throw;
      }
    }
    _;
  }




  /* @pseudo-public */
  function createStash(bytes32 _stashName) onlyOwner returns (bool){
    address stash = new Stash(_stashName);
    stashRegistry[_stashName] = stash;
    stashNames.push(_stashName);
    return true;
  }

  /* @depolyment:
     privateFor = MAS and owner node */
  function markStash(bytes32 _stashName) onlyOwner {
    Stash stash = Stash(stashRegistry[_stashName]);
    stash.mark();
  }

  /* @live:
     privateFor = MAS and participating node

     In sender node, if the account has enough liquidity the payment would
     be in status pending until the corresponding payment is made in the z-contract,
     else the payment is copyed into the gridlock */
  // timestamp is created onchain now - Zekun
  event Payment(bytes32 txRef, bool gridlocked, bool confirmPmt);
  function submitPmt(bytes32 _txRef, bytes32 _sender, bytes32 _receiver, int _amount,
                     int _express, bool _putInQueue, bytes16 _salt)
    isPositive(_amount)
    isInvoled(_sender, _receiver)
    notSuspended(_sender)
    notSuspended(_receiver)
  {
    //JMR
    /* Stash sender = Stash(stashRegistry[_sender]); */
    /* Stash receiver = Stash(stashRegistry[_receiver]); */
    Pmt memory pmt = Pmt(_txRef,
                         _sender,
                         _receiver,
                         _amount,
                         PmtState.Pending,
                         _express,
                         _putInQueue,
                         now,
                         _salt);
    pmtIdx.push(_txRef);
    payments[_txRef] = pmt;

    //update positions
    Stash(stashRegistry[_sender]).dec_position(_amount);
    Stash(stashRegistry[_receiver]).inc_position(_amount);

    if (_putInQueue){
      if (checkOwnedStash(_sender)) {
        enqueue(_txRef, _express);
      }
      Payment(_txRef, true, false);
    } else {
      // enough balance (with LSM liquidity partition)
      if (checkOwnedStash(_sender) && Stash(stashRegistry[_sender]).getBalance() >= _amount) {
        if (getOutgoingQueueDepth() < 1 ||
            (_express == 1 && expressCount < 1) ) {  //no queue //express and no express queue
          Payment(_txRef, false, false);
        } else { //queue but enough balance
          enqueue(_txRef, _express);// put in end of queue
          Payment(_txRef, true, false);
        }
      } else if (checkOwnedStash(_sender)) {// if not enough balance all goes to queue
        enqueue(_txRef, _express);
        Payment(_txRef, true, false);
      }
    }
  }

  /* pseudo-public */
  function releasePmt(bytes32 _txRef) atState(AgentState.Normal) {
    /* require(pmtProved(_txRef)); */
    require(globalGridlockQueue[_txRef].state == GridlockState.Active ||
            globalGridlockQueue[_txRef].state == GridlockState.Inactive);
    delete globalGridlockQueue[_txRef];
    globalGridlockQueueDepth--;
    globalGridlockQueue[_txRef].state = GridlockState.Released;
    removeByValue("gridlockQueue", _txRef);
  }

  /* @pseudo-public */
  // need to orchestrate the adding to the global gridlockqueue
  function addToGlobalQueue(bytes32 _txRef) atState(AgentState.Normal) {
    globalGridlockQueueDepth++;
    globalGridlockQueue[_txRef].state = GridlockState.Active;
    globalGridlockQueue[_txRef].receiverVote = true;
    if (globalGridlockQueueDepth >= maxQueueDepth) {
        nextState();
    }
    if (isReceiver(_txRef)) {
        enqueue(_txRef, payments[_txRef].express);
    }
  }

  //UBIN-61 ***************************
  //remove items from global queue if not in LSM process
  /* function removeFromGlobalQueue(bytes32 txRef) atState(AgentState.Normal) { */
  /*   //delete item from the dictionary */
  /*   /\* delete globalGridlockQueue[txRef]; *\/ */
  /*   globalGridlockQueue[txRef].exists = false; */
  /*   //decrement the global queue */
  /*   globalGridlockQueueDepth--; */
  /*   if (isReceiver(txRef)) { */
  /*     //Delete the payment from the receiver's gridlockqueue */
  /*     removeByValue(gridlockQueue, txRef); */
  /*   } */
  /* } */

  function isReceiver(bytes32 txRef) private returns (bool) {
    for (uint i = 0; i < pmtIdx.length; i++) {
      //find matching payment index.
      if (pmtIdx[i] == txRef) {
        // N.B. only MAS will control both sender and receiver stash
        if (checkOwnedStash(payments[pmtIdx[i]].receiver) &&
            !checkOwnedStash(payments[pmtIdx[i]].sender)) {
          return true;
        }
      }
    }
    return false;
  }

  event Time(uint remainingTime);
  /* @pseudo-public
     Determine the resolve sequence, and broadcast gridlocked payments to
     receivers */
  function lineUp()
    atState(AgentState.Lineopen)
  {
    if (lineOpenTime == 0) {
        lineOpenTime = now; 
    }
    resolveSequence.push(msg.sender);
    /* acc2stash[msg.sender] = _stashName; */
    done[acc2stash[msg.sender]] = false;
    Time(lineOpenTime + timeout - now);
    if (resolveSequence.length == stashNames.length) {
        nextState();
    }
  }



  function isParticipating(bytes32 _stashName) internal returns (bool) {
    for (uint i = 0; i < resolveSequence.length; i++) {
      if (acc2stash[resolveSequence[i]] == _stashName) {
          return true;
      }
    }
    return false;
  }

  /* for testing */
  event Hash(bytes32 hash, bytes32 a);
  function doHash(uint256 _a) {
    bytes32 result = keccak256(_a);
    Hash(result, bytes32(_a));
  }
  function doHashBytes(bytes32 _a) {
    bytes32 result = keccak256(_a);
    Hash(result, _a);
  }
  function doHashBytes2(bytes32 _a, bytes32 _b) {
    bytes32 result = keccak256(_a, _b);
    Hash(result, _a);
  }
  event Answer(bool a);
  event Num(uint n);
  function verify() {
    bytes32 key = "R1231";
    Answer(payments[key].txRef == bytes32(""));
    Num(uint(-1));
  }
  event Array(bytes32[] a);
  bytes32[] array;
  function emitArray(bytes32 a, bytes32 b) {
    array.push(a);
    array.push(b);
    Array(array);
  }
  function bytesArrayInput(bytes32[] _input) {
    Array(_input);
  }
  /* function getStashNames() { */
  /*   Array(stashNames); */
  /* } */

  function getStashNames() constant returns (bytes32[]) {
    return stashNames;
  }

  /* @pseudo-public
     THIS METHOD WILL BREAK THE PSEUDO-PUBLIC STATES.
     However you should still make a pseudo-public call as we want to update PaymentAgent's
     state on all the nodes.
     You'll need to call syncPseudoPublicStates after calling this method to sync up
     the pseudo-public states. */
  event Sync(bytes32[] inactivatedPmtRefs, bytes32[] doneStashes, bytes32[] notDoneStashes);
  function doResolveRound()
    timedTransitions
    atState(AgentState.Resolving)
    isYourTurn
    returns (bool _didResolution)
  {
    lastResolveTime = now;
    bytes32 currentStash = acc2stash[resolveSequence[current]];
    if (!checkOwnedStash(currentStash)) { 
        return false;
    }
    if (currentStash != centralBank && isCentralBankNode()) { 
        return false;
    }
    for (uint i = 0; i < gridlockQueue.length; i++) {
      Pmt storage inflow = payments[gridlockQueue[i]];
      GridlockedPmt storage g_inflow = globalGridlockQueue[inflow.txRef]; /* to be changed */
      /* deactivate inflows from non-participant*/
      if (!isParticipating(inflow.sender) && g_inflow.state == GridlockState.Active) {
        g_inflow.state = GridlockState.Inactive;
        Stash(stashRegistry[inflow.sender]).inc_position(inflow.amount);
        Stash(stashRegistry[inflow.receiver]).dec_position(inflow.amount);
      }
    }
    /* Bilateral EAF2 */
    inactivatedPmtRefs.length = 0;
    for (uint j = gridlockQueue.length-1; j >= 0; j--) { // reverse chronological order
      if (Stash(stashRegistry[currentStash]).getPosition() >= 0) {
           break; // LSM liquidity partition
      }
      Pmt pmt = payments[gridlockQueue[j]];
      GridlockedPmt storage g_pmt = globalGridlockQueue[pmt.txRef]; /* to be changed */
      /* vote on your outflows */
      if (pmt.sender == currentStash && g_pmt.state == GridlockState.Active) {
        g_pmt.state = GridlockState.Inactive;
        inactivatedPmtRefs.push(pmt.txRef);
        Stash(stashRegistry[pmt.sender]).inc_position(pmt.amount);
        Stash(stashRegistry[pmt.receiver]).dec_position(pmt.amount);
        done[pmt.receiver] = false;
      }
    }
    done[currentStash] = true;

    /* emit sync info */
    doneStashes.length = 0;
    notDoneStashes.length = 0;
    for (uint k = 0; k < resolveSequence.length; k++) {
      bytes32 stashName = acc2stash[resolveSequence[k]];
      if (done[stashName]) { 
          doneStashes.push(stashName);
      } else {
          notDoneStashes.push(stashName);
      }
    }
    Sync(inactivatedPmtRefs, doneStashes, notDoneStashes);

    committed = true;

    return true;
  }

  function allDone() internal returns (bool) {
    bool alldone = true;
    for (uint i = 0; i < resolveSequence.length; i++) {
      if (!done[acc2stash[resolveSequence[i]]]) {
        alldone = false;
        break;
      }
    }
    return alldone;
  }

  function receiverInactivate(bytes32 _txRef) private returns (bool _isReceiver) {
    for (uint i = 0; i < gridlockQueue.length; i++) {
      Pmt pmt = payments[gridlockQueue[i]];
      if (pmt.txRef == _txRef) {
        if (!checkOwnedStash(pmt.receiver)) {
            return false;
        }
        Stash(stashRegistry[pmt.sender]).inc_position(pmt.amount);
        Stash(stashRegistry[pmt.receiver]).dec_position(pmt.amount);
        return true;
      }
    }
  }

  event AllDone(bool allDone, uint current);
  /* @pseudo-public */
  function syncPseudoPublicStates(bytes32[] _inactivatedPmtRefs,
                                  bytes32[] _doneStashes,
                                  bytes32[] _notDoneStashes)
    atState(AgentState.Resolving)
    isYourTurn
    hasCommitted(_inactivatedPmtRefs, _doneStashes, _notDoneStashes)
  {
    /* syncing global queue */
    globalGridlockQueueDepth += _inactivatedPmtRefs.length;
    for (uint i = 0; i < _inactivatedPmtRefs.length; i++) {
      globalGridlockQueue[_inactivatedPmtRefs[i]].state = GridlockState.Inactive;
      receiverInactivate(_inactivatedPmtRefs[i]);
    }
    /* syncing done mapping */
    for (uint j = 0; j < _doneStashes.length; j++) {
      done[_doneStashes[j]] = true;
    }
    for (uint k = 0; k < _notDoneStashes.length; k++) {
      done[_notDoneStashes[k]] = false;
    }
    /* if everyone is done, enter netting phase, else pass on to the next participant */
    bool alldone = allDone();
    current++;
    if (current == resolveSequence.length) {
        current = 0;
    }
    AllDone(alldone, current);
    if (alldone == true) {
        nextState();
    }
  }

  /* @pseudo-public */
  //update private balance , update zcontract first then local balance, used at the end of the
  // LSM process only.
  event Deadlock();
  function settle() atState(AgentState.Settling) {
    /* netting by doing net balance movement */
    for (uint i = 0; i < stashNames.length; i++) {
      Stash stash = Stash(stashRegistry[stashNames[i]]);
      int net_diff = stash.getPosition() - stash.getBalance();
      if (net_diff > 0) {
        stash.credit(net_diff);
      } else if (net_diff < 0) {
        if (checkOwnedStash(stashNames[i])) {
          stash.safe_debit(-net_diff);
        } else {
          stash.debit(-net_diff);
        }
      }
    }
    /* 1. confirm and dequeue active gridlocked payments
       2. reactivate inactive gridlocked payments and update position accordingly */
    uint beforeSettleGridlockCount = gridlockQueue.length;
    uint numGridlockedPmts = 0;
    for (uint j = 0; j < gridlockQueue.length; j++) {
      /* require(pmtProved(gridlockQueue[j])); */
      Pmt pmt = payments[gridlockQueue[j]];
      GridlockedPmt g_pmt = globalGridlockQueue[pmt.txRef]; /* to be changed */
      if (g_pmt.state == GridlockState.Active) {
        g_pmt.state = GridlockState.Released; // Changed
        pmt.state = PmtState.Confirmed;
      } else if (g_pmt.state == GridlockState.Inactive) { // reactivate inactive pmts
        g_pmt.state = GridlockState.Active;
        Stash(stashRegistry[pmt.sender]).dec_position(pmt.amount);
        Stash(stashRegistry[pmt.receiver]).inc_position(pmt.amount);
        gridlockQueue[numGridlockedPmts] = pmt.txRef;
        numGridlockedPmts++;
      } else if (g_pmt.state == GridlockState.Onhold) {
        gridlockQueue[numGridlockedPmts] = pmt.txRef;
        numGridlockedPmts++;
      }
    }
    if (beforeSettleGridlockCount == numGridlockedPmts) {
      Deadlock();
      /* maxQueueDepth += 5; // prevent recursive gridlock */
    } else if (isNettingParticipant()) {
      currentSalt = nettingSalt;
    }
    gridlockQueue.length = numGridlockedPmts;
    nextState();
  }

  // current resolve round leader can stop the LSM if timeout
  function moveOn() atState(AgentState.Settling) isYourTurn {
    require(now >= resolveEndTime + proofTimeout);
    nextState();
  }
  /* function pmtProved(bytes32 _txRef) external constant returns (bool) { */
  /*   return SGDz(zAddress).pmtProcessed(_txRef); */
  /* } */

  /* function pmtProved(bytes32 _txRef) external constant returns (bool) { */
  /*   return SGDz(zAddress).paymentIsValidated(_txRef); */
  /* } */

  function pmtProved(bytes32 _txRef) external constant returns (bool) {
    return SGDz(zAddress).proofCompleted(_txRef);
  }

  /* @private for: [sender, receiver, (MAS)] */
  function confirmPmt(bytes32 _txRef) atState(AgentState.Normal) onlyReceiver(_txRef) {
    //comment out to get it to work
    /* require(pmtProved(_txRef)); */

    transfer(payments[_txRef].sender,
             payments[_txRef].receiver,
             payments[_txRef].amount);
    payments[_txRef].state = PmtState.Confirmed;
    currentSalt = payments[_txRef].salt;
  }

  // update balance
  function transfer(bytes32 _sender, bytes32 _receiver, int _amount) private {
    Stash sender = Stash(stashRegistry[_sender]);
    Stash receiver = Stash(stashRegistry[_receiver]);
    if (checkOwnedStash(_sender)) {
      sender.safe_debit(_amount);
    } else {
      sender.debit(_amount);
    }
    receiver.credit(_amount);
  }

  // UBIN-61 ///////////////////////////////////////////////////
  // @pseudo-public == privateFor: [everyone]


  // ----------------------------------------------------------
  // UBIN-61	[Quorum] Cancel unsettled outgoing payment instruction - Laks
  // ----------------------------------------------------------
  function cancelPmtFromGlobalQueue(bytes32 _txRef)
    atState(AgentState.Normal)
    //onlySender(_txRef)
  {
    require(globalGridlockQueue[_txRef].state != GridlockState.Cancelled);

    if (globalGridlockQueue[_txRef].state != GridlockState.Onhold){
      globalGridlockQueueDepth--;
      delete globalGridlockQueue[_txRef];
    }

    globalGridlockQueue[_txRef].state = GridlockState.Cancelled;
  }

  //anything other than agent state Normal will get rejected
  // @privateFor: [receiver, (optional MAS)]
  // call this after cancelPmtFromGlobalQueue
  function cancelPmt(bytes32 _txRef)
    atState(AgentState.Normal)
    onlySender(_txRef)
  {

    if (suspended[payments[_txRef].sender]) {
      statusCode(600);
      return;
    }

    require(( payments[_txRef].state == PmtState.Pending ) ||
            ( payments[_txRef].state == PmtState.Onhold ));
    require(globalGridlockQueue[_txRef].state != GridlockState.Cancelled);

    bool changePosition = false;

    if (payments[_txRef].state == PmtState.Pending) {
        changePosition = true;
    }
    if (payments[_txRef].state == PmtState.Onhold) {
        removeByValue("onholdPmts", _txRef);
    }
    payments[_txRef].state = PmtState.Cancelled;
    //if high priority, decrement express count
    if (payments[_txRef].express  == 1) {
      expressCount--;
    }
    //remove item from gridlock array
    removeByValue("gridlockQueue", _txRef);
    // instead of doing this, we have compress the cancelled item in settle()

    if (changePosition) {
        updatePosition(_txRef, true);
    }
    //	if (success) Status(_txRef,true);
    //inactivationTracker++;
    Status(_txRef, true);
  }

  // ---------------------------------------------------------------------------
  // UBIN-62 - Put unsettled outgoing payment instruction on hold - Laks
  // @pseudo-public
  // ---------------------------------------------------------------------------
  function holdPmtFromGlobalQueue(bytes32 _txRef)
    atState(AgentState.Normal)
  {
    require((globalGridlockQueue[_txRef].state != GridlockState.Onhold) && (globalGridlockQueue[_txRef].state != GridlockState.Cancelled));
    GridlockedPmt g_pmt = globalGridlockQueue[_txRef];
    g_pmt.state = GridlockState.Onhold;
    globalGridlockQueueDepth--;
  }

  // ---------------------------------------------------------------------------
  // UBIN-62 - Put unsettled outgoing payment instruction on hold - Laks
  // @privateFor: [receiver, (optional MAS)]
  // ---------------------------------------------------------------------------
  event Status(bytes32 txRef, bool holdStatus);
  function holdPmt (bytes32 _txRef)
    atState(AgentState.Normal)
    onlySender(_txRef)
  {

    if (suspended[payments[_txRef].sender]){
      statusCode(700);
      return;
    }
    require(payments[_txRef].state == PmtState.Pending);
    require(globalGridlockQueue[_txRef].state != GridlockState.Onhold);
    payments[_txRef].state = PmtState.Onhold;
    onholdPmts.push(_txRef);
    updatePosition(_txRef, true);
    removeByValue("gridlockQueue", _txRef);
    if (payments[_txRef].state == PmtState.Onhold) {
      //inactivationTracker++;
      Status(_txRef, true);
    }
    else {
        Status(_txRef, false);
    }

    // Debug message - acc2stash[msg.sender] is empty leading to onlySender to fail - Laks
  }

  // ---------------------------------------------------------------------------
  // UBIN-63 - Reactivate unsettled payment instruction that is on hold - Laks
  // @privateFor: [receiver, (optional MAS)]
  // ---------------------------------------------------------------------------
  function unholdPmt (bytes32 _txRef)
    atState(AgentState.Normal)
    onlySender(_txRef)
  {
    if (suspended[payments[_txRef].sender]){
      statusCode(800);
      return;
    }
    require(payments[_txRef].state == PmtState.Onhold);
    require(globalGridlockQueue[_txRef].state == GridlockState.Onhold);
    payments[_txRef].state = PmtState.Pending;
    removeByValue("onholdPmts", _txRef);
    enqueue(_txRef, payments[_txRef].express);
    updatePosition(_txRef, false);
    if (payments[_txRef].state == PmtState.Pending) {
      //inactivationTracker--;
      Status(_txRef, false);
    }
    else {
        Status(_txRef, true);
    }

  }
  // ---------------------------------------------------------------------------
  // UBIN-63 - Reactivate unsettled payment instruction that is on hold - Laks
  // @pseudo-public
  // called after unholdPmt
  // ---------------------------------------------------------------------------
  function unholdPmtFromGlobalQueue(bytes32 _txRef)
    atState(AgentState.Normal)
    //onlySender(_txRef)
  {
    //remove item from globalGridlockQueue
    require(globalGridlockQueue[_txRef].state == GridlockState.Onhold);
    GridlockedPmt g_pmt = globalGridlockQueue[_txRef];
    g_pmt.state = GridlockState.Active;
    globalGridlockQueueDepth++;
  }

  function updatePosition(bytes32 _txRef, bool reverse) internal {
    Stash senderStash = Stash(stashRegistry[payments[_txRef].sender]);
    Stash receiverStash = Stash(stashRegistry[payments[_txRef].receiver]);
    if (reverse) {
      //increase sender's position, queued item removed
      senderStash.inc_position(payments[_txRef].amount);
      receiverStash.dec_position(payments[_txRef].amount);
    } else {
      //decrease sender's position, queue item added
      senderStash.dec_position(payments[_txRef].amount);
      receiverStash.inc_position(payments[_txRef].amount);
    }
  }
  ///////////////////////////////////////////////////////////////////

  /* @live:
     privateFor == MAS and owner node

     This method is set to onlyonwer as pledge include off-chain process
  */
  function pledge(bytes32 _txRef, bytes32 _stashName, int _amount)
    notSuspended(_stashName)
  {
    if (_stashName != centralBank || isCentralBankNode()) {
      Stash stash = Stash(stashRegistry[_stashName]);
      stash.credit(_amount);
      stash.inc_position(_amount);

      pledgeIdx.push(_txRef);
      pledges[_txRef].txRef = _txRef;
      pledges[_txRef].stashName = _stashName;
      pledges[_txRef].amount = _amount;
      pledges[_txRef].timestamp = now;
    }
  }

  /* @live:
     privateFor = MAS and owner node */
  function redeem(bytes32 _txRef, bytes32 _stashName, int _amount)
    //onlyCentralBank
    notSuspended(_stashName)
  {
    if (_stashName != centralBank || isCentralBankNode()) {
      Stash stash = Stash(stashRegistry[_stashName]);
      stash.safe_debit(_amount);
      stash.dec_position(_amount);

      redeemIdx.push(_txRef);
      redeems[_txRef].txRef = _txRef;
      redeems[_txRef].stashName = _stashName;
      redeems[_txRef].amount = _amount;
      redeems[_txRef].timestamp = now;
    }
  }

  /* UBIN-153 insert into queue based on priority level */
  function enqueue(bytes32 _txRef, int _express) internal {
    if (_express == 0) {
      gridlockQueue.push(_txRef);
    } else if (_express == 1) {
      // todo: can potentially use the updateGridlockQueue func
      if (gridlockQueue.length == expressCount) { // all express payment
        gridlockQueue.push(_txRef);
      } else {
        gridlockQueue.push(gridlockQueue[gridlockQueue.length-1]);
        for (uint i = gridlockQueue.length - 1; i > expressCount; i--) {
          gridlockQueue[i] = gridlockQueue[i-1];
        }
        gridlockQueue[expressCount] = _txRef;
      }
      expressCount++;
    }
  }

  /* @live:
     for stashes not owned by you this returns the net bilateral position */
  function getBalance(bytes32 _stashName) isStashOwner(_stashName) constant returns (int) {
    Stash stash = Stash(stashRegistry[_stashName]);
    return stash.getBalance();
  }

  function getPosition(bytes32 _stashName) isStashOwner(_stashName) constant returns (int) {
    Stash stash = Stash(stashRegistry[_stashName]);
    return stash.getPosition();
  }

  function getLineLength() constant returns (uint) {
    return resolveSequence.length;
  }

  function getHistoryLength() constant returns (uint) {
    return pmtIdx.length;
  }

  function getGridlockQueueDepth() constant returns (uint) {
    return gridlockQueue.length;
  }

  function getGlobalGridlockQueueDepth() constant returns (uint) {
    return globalGridlockQueueDepth;
  }

  function getIsPaymentActive(bytes32 _txRef) external constant returns(bool) {
    GridlockedPmt g_pmt = globalGridlockQueue[_txRef]; /* to be changed */
    if (g_pmt.state == GridlockState.Active) {
      return true;
    }
    return false;
  }

  //given a bank, check if it is the owner
  function checkOwnedStash(bytes32 _stashName) constant returns (bool) {
    if (msg.sender == owner) {
        return true; // MAS does not need to mark its own stash
    }
    Stash stash = Stash(stashRegistry[_stashName]);
    return stash.isControlled();
  }

  function isNettingParticipant() constant returns (bool) {
    bytes32 myStashName = getOwnedStash();
    for (uint i = 0; i < resolveSequence.length; ++i) {
      if (myStashName == acc2stash[resolveSequence[i]]) {
          return true;
      }
    }
    return false;
  }
  function getOwnedStash() constant returns (bytes32) {
    if (isCentralBankNode()) { 
        return centralBank;
    }
    for (uint i = 0; i < stashNames.length; i++) {
      Stash stash = Stash(stashRegistry[stashNames[i]]);
      if (stash.isControlled()) {
        return stashNames[i];
      }
    }
  }

  // Central bank controls all the stashes
  function isCentralBankNode() constant returns (bool) {
    for (uint i = 0; i < stashNames.length; i++) {
      Stash stash = Stash(stashRegistry[stashNames[i]]);
      if (!stash.isControlled()) {
        return false;
      }
    }
    return true;
  }

  function getThreshold() constant returns (uint) {
    return maxQueueDepth;
  }

  function setThreshold(uint _threshold) onlyOwner {
    maxQueueDepth = _threshold;
  }
  function getAgentState() constant returns (uint) {
    if (agentState == AgentState.Normal) {
      return 0;
    } else if (agentState == AgentState.Lineopen) {
      return 1;
    } else if (agentState == AgentState.Resolving) {
      return 2;
    } else if (agentState == AgentState.Settling) {
      return 3;
    }
  }

  function getResolveSequence() constant returns (address[]) {
    return resolveSequence;
  }

  function getResolveSequenceLength() constant returns (uint) {
    return resolveSequence.length;
  }

  function getCurrentStash() constant returns (bytes32) {
    return acc2stash[resolveSequence[current]];
  }

  function getMyResolveSequenceId() constant returns (int) {
    for (uint i = 0; i < resolveSequence.length; i++) {
      if (resolveSequence[i] == tx.origin) {
          return int(i);
      }
    }
    return -1;
  }

  function getActiveGridlockCount() constant returns (uint) {
    uint result = 0;
    for (uint i = 0; i < gridlockQueue.length-1; i++) {
      Pmt pmt = payments[gridlockQueue[i]];
      GridlockedPmt g_pmt = globalGridlockQueue[pmt.txRef]; /* to be changed */
      if (g_pmt.state == GridlockState.Active) {
          result++;
      }
    }
    return result;
  }

  function IndexOf(bytes32[] values, bytes32 value) returns(uint) {
    uint i = 0;
    bool found = true;
    for (i = 0; i < values.length; i++) {
      if ( values[i] == value ) {
        found = true;
        break;
      }
    }
    if (found)
      return i;
    return 99999999;
  }

  // ------------------------------
  // Implementation of UBIN-60 - Laks
  // ------------------------------
  function updatePriority(bytes32 _txRef, int _express) {
    var (i,found) = ArrayIndexOf(pmtIdx,_txRef);
    if (!found) {
      statusCode(300);
      return;
    }
    if ( suspended[payments[_txRef].sender] ) {
      statusCode(400);
      return;
    }
    require(payments[_txRef].express != _express); // no update when the priority level is the same
    if (payments[_txRef].express == 0) {
      expressCount++;
    } else if (payments[_txRef].express == 1) {
      expressCount--;
    }
    payments[_txRef].express = _express;
    updateGridlockQueue(_txRef);
  }

  // -----------------------------------------------------
  // TO DO - To be refactored into a common untils - Laks
  // -----------------------------------------------------
  function ArrayIndexOf(bytes32[] values, bytes32 value) constant internal returns (uint,bool) {
    bool found = false;
    uint i;
    for (i = 0; i < values.length; i++) {
      if ( values[i] == value ) {
        found = true;
        break;
      }
    }
    if (found)
      return (i,found);
    return (0,found);
  }

  // ------------------------------------
  // Keep the gridlock queue sorted by 1. priority level 2. timestamp
  // Might need a more generic quick sort function in future
  // Assumes that the gridlockqueue is already sorted before the current txn
  // ------------------------------------
  function updateGridlockQueue(bytes32 _txRef){
    uint tstamp = payments[_txRef].timestamp;
    uint i;
    bytes32 curTxRef;
    uint curTstamp;
    int curExpress;
    var (index, found) = ArrayIndexOf(gridlockQueue, _txRef);
    uint j = index;
    if (payments[_txRef].express == 1) {
      // shift the txn to the left
      if (index == 0) {
          return;
      }
      for (i = index-1; int(i) >= 0 ;i--) {      // rather painful discovery that uint i>=0 doesn't work :(  - Jay
        curTxRef = gridlockQueue[i];
        curTstamp = payments[curTxRef].timestamp;
        curExpress = payments[curTxRef].express;
        if (curExpress == 0 || tstamp < curTstamp){
          gridlockQueue[i] = _txRef;
          gridlockQueue[j] = curTxRef;
          j--;
        }
     }
    } else {
      // shift the txn to the right
      if (index == gridlockQueue.length-1) {
          return;
      }
      for (i = index+1;i <= gridlockQueue.length-1;i++) {
        curTxRef = gridlockQueue[i];
        curTstamp = payments[curTxRef].timestamp;
        curExpress = payments[curTxRef].express;
        if (curExpress == 1 || tstamp > curTstamp) {
          gridlockQueue[i] = _txRef;
          gridlockQueue[j] = curTxRef;
          j++;
        }
      }
    }
  }
  // ------------------------------------

  // ------------------------------------
  // Removes the given value in an array
  // Refactored to use ArrayIndexOf - Laks
  // ------------------------------------
  function removeByValue(bytes32 arrayName, bytes32 value) internal returns (bool) {
    bytes32[] array;
    //TODO use a mapping?
    if (arrayName == "onholdPmts") {
      array = onholdPmts;
    } else if (arrayName == "gridlockQueue") {
      array = gridlockQueue;
      if (payments[value].express == 1) {
          expressCount--;
      }
    } else {
      return false;
    }
    var (index, found) = ArrayIndexOf(array,value);
    if (found) {
      for (uint i = index;i < array.length-1;i++) {
        array[i] = array[i+1];
      }
      delete array[array.length-1];
      array.length--;
      return true;
    }
    return false;
  }

  //util functions- added for debug and testing///
  //not to be used by app. //////////////////////
  //Only use from debug and testing scripts///////
  function clearQueue() {
    for (uint i = 0; i < gridlockQueue.length; i++){
      delete globalGridlockQueue[gridlockQueue[i]];
    }
    globalGridlockQueueDepth = 0;
    gridlockQueue.length = 0;
    onholdPmts.length = 0;
    expressCount = 0;
    //inactivationTracker = 0;
  }

  function wipeout() {
    clearQueue();
    for (uint i = 0; i < pmtIdx.length; i++){
      delete payments[pmtIdx[i]];
    }
    pmtIdx.length = 0;
    agentState = AgentState.Normal;
    stashNames.length = 0;
    resolveSequence.length = 0;
    current = 0;
  }
}
