import numpy as np
import pandas as pd
import functools
from collections import defaultdict
import re
from abc import ABC, abstractmethod
from tqdm import tqdm
import matplotlib.pyplot as plt
import logging

from plot import plot



logger = logging.getLogger('NETTING')


def partialcls(cls, *args, **kwds):
    class NewCls(cls):  __init__ = functools.partialmethod(cls.__init__, *args, **kwds)
    return NewCls


class Account:
    def __init__(self, name="", balance=0):
        self.name = name
        self.balance = balance
        self.position = balance
        
    def debit(self, amount):
        if amount < 0:
            raise Exception('Negative amount!')
        self.balance -= amount

    def safe_debit(self, amount):
        if amount > self.balance:
            raise Exception('No enough liquidity for this transaction!')
        self.balance -= amount     
        
    def credit(self, amount):
        if amount < 0:
            raise Exception('Negative amount!')
        self.balance += amount
            
    def __str__(self):
        return "{}  bal: {}".format(self.name, self.balance)


class Transaction:
    def __init__(self, txid, sender, receiver, amount):
        self.txid = txid
        self.sender = sender
        self.receiver = receiver
        self.amount = amount
        self.active = True

    def __eq__(self, other):
        """
        Method for trade compression
        Two tx are equal if the parties involves is the same
        """
        return {self.sender, self.receiver} == {other.sender, other.receiver}


    def __add__(self, other):
        """
        Method for trade compression
        Two tx are merged by calculating the net position
        """
        new_txid = str(self.txid)+str(other.txid)
        if self.sender == other.sender:
            return Transaction(new_txid,
                               self.sender,
                               self.receiver,
                               self.amount + other.amount)
        elif self.sender == other.receiver and self.amount >= other.amount:
            return Transaction(new_txid,
                               self.sender,
                               self.receiver,
                               self.amount - other.amount)
        elif self.sender == other.receiver and self.amount < other.amount:
            return Transaction(new_txid,
                               other.sender,
                               other.receiver,
                               other.amount - self.amount)
        
    
    def __str__(self):
        if self.active:
            status = 'active'
        else:
            status = 'inactive'
        return "-{}- {} -> {} amt: {:.2f} status: {}".format(self.txid,
                                                             self.sender,
                                                             self.receiver,
                                                             self.amount,
                                                             status)


class Simulator:
    def __init__(self, name, tx_mgr,
                 n_accounts=64,
                 min_start_bal=0.8 * 1e6,
                 blob_size=2500,
                 resolve_every=1,
                 rounds=16,
                 bal_range=0.6 * 1e6,
                 tx_avg=0,
                 tx_std=1e6,
                 n_sims=100,
                 log=True,
                 plot=True,
                 data_path=None,
                 q_threshold=5000):
        print(name)
        self.name = name
        self.n_accounts = n_accounts
        self.min_start_bal = min_start_bal
        self.tx_mgr_class = tx_mgr
        self.log = log
        self.blob_size = blob_size
        self.resolve_every = resolve_every
        self.rounds = rounds
        self.bal_range = bal_range
        self.tx_avg = tx_avg
        self.tx_std = tx_std
        self.plot = plot
        self.n_sims=n_sims
        self.q_threshold = q_threshold
        self.data_path = data_path

        if self.data_path is not None:
            self.tx_df = pd.read_csv(data_path['tx'], sep='|').dropna().applymap(
                    lambda i: i.strip() if isinstance(i, str) else i
                )
            self.tx_df = self.tx_df[self.tx_df['TXN DATE'] == '17-FEB-2016']
            self.tx_df = self.tx_df.iloc[:20000]
            
            # self.tx_df['UPDATED DATE'] = self.tx_df['UPDATED ON'].map(lambda d:d.split(' ')[0])
            # self.tx_df = self.tx_df[self.tx_df['UPDATED DATE'] == '18-FEB-2016']
            
            self.bank_df = pd.read_excel(data_path['bank'], sheetname='Banks')

    def simulate(self):
        stats = defaultdict(list)
        acc_names = None
        
        if self.data_path is None:
            for i in tqdm(range(self.n_sims)): # only log the first simulation
                logging = True if i == 0 and self.log else False

                balances = np.random.rand(self.n_accounts) * self.bal_range + self.min_start_bal
                accounts = {i:Account(i, bal) for i, bal in enumerate(balances)}
                self.tx_mgr = self.tx_mgr_class(accounts)
                n_deficits, deficit_amt, q_amt, q_len = self.simulate_with_random(logging=logging)
                stats['n_deficits'].append(n_deficits)
                stats['deficit_amt'].append(deficit_amt)
                stats['q_amt'].append(q_amt)
                stats['q_len'].append(q_len)
        else:
            acc_names = set(self.tx_df['PAYER'].tolist() + self.tx_df['RECEIVER'].tolist())
            # for missing data, use the average
            avg_balances = np.mean(self.bank_df['Account Position'])
            def get_bal(df, n):
                bal_list = df[df['Member'] == n]['Account Position'].tolist()
                if bal_list == []:
                    return avg_balances / 100
                else:
                    return bal_list[0] / 100
            accounts = {acc_name:Account(acc_name, get_bal(self.bank_df, acc_name))
                        for acc_name in acc_names}
            self.tx_mgr = self.tx_mgr_class(accounts)

            print('number of accounts: {}'.format(len(accounts)))
            
            n_deficits, deficit_amt, q_amt, q_len = self.simulate_with_data(acc_names,
                                                                            logging=True)
                
            stats['n_deficits'].append(n_deficits)
            stats['deficit_amt'].append(deficit_amt)
            stats['q_amt'].append(q_amt)
            stats['q_len'].append(q_len)

        mean = lambda x: sum(x)/len(x)
        
        log = open(self.name+'_stats.txt', 'w')
        print('-----------------STATS--------------------')
        for k, v in sorted(stats.items()):
            mean = np.mean(v)
            std = np.std(v)
            if mean > 1e6:
                buffer = '{}\t\t mean:{:.2f} Mil, std: {:.2f}'.format(k,
                                                                      mean/1e6,
                                                                      std)
            else:
                buffer = '{}\t\t mean:{:.2f}, std: {:.2f}'.format(k, mean, std)
            print(buffer)
            log.write(buffer+'\n')
        log.close()
            
        if plot:
            plot(self.name+'.csv', acc_names)
        
        
    def simulate_with_data(self, acc_names, logging=False):
        tx_counter = 1
        summaries = []

        if logging:
            log = open(self.name+'.csv', 'w')
            header = 'round,'+','.join(acc_names)+','
            header += ','.join(map(lambda n: 'b'+n, acc_names))
            header += ',n_deficits,deficit_amount,queued_amount,queue_length\n'
            log.write(header)

        for i in tqdm(range(len(self.tx_df))):
            tx_info = self.tx_df.iloc[i]
            # tx_id = tx_info['RTGS REF NO']
            tx_id = pd.to_datetime(tx_info['UPDATED ON'])
            sender = tx_info['PAYER']
            receiver = tx_info['RECEIVER']
            amount = float(re.sub(r'[^\d.]', '', tx_info['TXN AMOUNT']))
            self.tx_mgr.submit(Transaction(tx_id, sender, receiver, amount))

            # TO BE MODIFIED
            # simple resolve hook: resolve() is called whenever queue length hits
            # the threshold
            if len(self.tx_mgr.queue) > self.q_threshold:
                self.tx_mgr.resolve()
            if logging:
                buffer = str(i)+','+str(self.tx_mgr)+'\n'
                log.write(buffer)
            summaries.append(self.tx_mgr.get_summary())
            
        if logging: log.close()

        summary = np.mean(np.array(summaries).astype(float), axis=0) # get mean stats for the run
        n_deficits = summary[0].item()
        deficit_amt = summary[1].item()
        q_amt = summary[2].item()
        q_len = summary[3].item()
        
        return n_deficits, deficit_amt, q_amt, q_len            

            
    def simulate_with_random(self, logging=False):
        tx_counter = 1
        summaries = []

        if logging:
            log = open(self.name+'.csv', 'w')
            header = 'round,'+','.join(map(str, range(self.n_accounts)))+','
            header += ','.join(map(lambda n: 'b'+str(n), range(self.n_accounts)))
            header += ',n_deficits,deficit_amount,queued_amount,queue_length\n'
            log.write(header)

        for r in range(self.rounds):
            amounts = np.random.rand(self.blob_size) * self.tx_std + self.tx_avg
            parties = (np.random.sample((self.blob_size, 2)) * self.n_accounts).astype(int)
            parties = filter(lambda i: i[0]!=i[1], parties)
            for (sender, receiver), amount in zip(parties, amounts):
                self.tx_mgr.submit(
                    Transaction(tx_counter, sender.item(), receiver.item(), amount)
                )
                tx_counter += 1
            if r % self.resolve_every == 0 and len(self.tx_mgr.queue) >= 0:
                self.tx_mgr.resolve()
            if logging:
                buffer = str(r)+','+str(self.tx_mgr)+'\n'
                log.write(buffer)
            summaries.append(self.tx_mgr.get_summary())
                
        if logging: log.close()

        summary = np.mean(np.array(summaries).astype(float), axis=0) # get mean stats for the run
        n_deficits = summary[0].item()
        deficit_amt = summary[1].item()
        q_amt = summary[2].item()
        q_len = summary[3].item()
        
        return n_deficits, deficit_amt, q_amt, q_len
        

# TODO => trade compression        
class TransactionManager(ABC):
    def __init__(self, accounts):
        self.queue = []
        self.accounts = accounts
        for key, acc in self.accounts.items():
            acc.queue = self.queue

    def submit(self, tx):
        """
        When tx enters the system, settle it immediately if the sender has enough
        liquidity, otherwise put it on queue
        """
        if self.accounts[tx.sender].balance >= tx.amount:
            self.accounts[tx.sender].debit(tx.amount)
            self.accounts[tx.receiver].credit(tx.amount)
            self.accounts[tx.sender].position -= tx.amount
            self.accounts[tx.receiver].position += tx.amount
        else:
            self.queue.append(tx)
            self.accounts[tx.sender].position -= tx.amount
            self.accounts[tx.receiver].position += tx.amount

    def get_position_calc_realtime(self, account):
        """
        position = balance + active inflows - active outflows
        Also stores the latest position info in account object
        """
        position = 0
        for tx in self.queue:
            if tx.active:
                if tx.sender == account.name:
                    position -= tx.amount
                elif tx.receiver == account.name:
                    position += tx.amount
        position += account.balance
        account.position = position
        return position

    def get_position(self, account):
        return account.position
    
    def get_txs(self, account, direction, order='amount_large_small', status='all'):
        """
        Returns (active) tx in given direction sorted with given order
        Optionally filter tx by its status
        """
        if direction == 'inflows':
            txs = [tx for tx in self.queue if tx.receiver == account.name]
        elif direction == 'outflows':
            txs = [tx for tx in self.queue if tx.sender == account.name]
        if status == 'active':
            txs = filter(lambda tx: tx.active == True, txs)
        elif status == 'inactive':
            txs = filter(lambda tx: tx.active == False, txs)
        if order == 'amount_large_small':
            sorted_txs = sorted(txs, key=lambda tx: -tx.amount)
        elif order == 'reverse_chronological':
            sorted_txs = sorted(txs, key=lambda tx: tx.txid)[::-1]
        return sorted_txs

    def get_txs_gen(self, account, direction, order='amount_large_small', status='all'):
        """
        Returns (active) tx in given direction sorted with given order
        Optionally filter tx by its status

        Generator version
        """
        if order == 'amount_large_small':
            sorted_txs = sorted(self.queue, key=lambda tx: -tx.amount)
        elif order == 'reverse_chronological':
            sorted_txs = sorted(self.queue, key=lambda tx: tx.txid)[::-1]
        for tx in sorted_txs:
            if (direction == 'inflows' and tx.receiver == account.name) or \
            (direction == 'outflows' and tx.sender == account.name):
                if (status == 'active' and tx.active == True) or \
                (status == 'inactive' and tx.active == False):
                    yield tx

    def inactivate(self, target_tx):
        target_tx.active = False
        self.accounts[target_tx.sender].position += target_tx.amount
        self.accounts[target_tx.receiver].position -= target_tx.amount
        # for tx in self.queue:
        #     if tx.txid == target_tx.txid:
        #         tx.active = False

    def activate(self, target_tx):
        target_tx.active = True
        self.accounts[target_tx.sender].position -= target_tx.amount
        self.accounts[target_tx.receiver].position += target_tx.amount
        # for tx in self.queue:
        #     if tx.txid == target_tx.txid:
        #         tx.active = True

    @abstractmethod
    def resolve(self):
        """
        Abstract method to resolve gridlock by inactivating transactions. Call settle()
        to settle active transactions at the end.
        """
        pass

    def settle_iter(self):
        """
        Settle all active tx iteratively then delete settled tx from queue.
        """
        for tx in self.queue:
            if tx.active:
                self.accounts[tx.sender].debit(tx.amount)
                self.accounts[tx.receiver].credit(tx.amount)
        self.queue = [tx for tx in self.queue if not tx.active]
        for tx in self.queue:
            self.activate(tx)


    def settle(self):
        """
        Settle all active tx BY DOING NET TRANSFER
        then delete settled tx from queue.
        """
        for acc_name, acc in self.accounts.items():
            net_diff = self.get_position(acc) - acc.balance
            if net_diff > 0:
                self.accounts[acc_name].credit(net_diff)
            elif net_diff < 0:
                self.accounts[acc_name].safe_debit(-net_diff)            
        self.queue = [tx for tx in self.queue if not tx.active]
        for tx in self.queue:
            self.activate(tx)

    def get_deficits(self, order='random'):
        deficits = np.array([a for k, a in self.accounts.items() if self.get_position(a) < 0])
        if order == 'random':
            return deficits[np.random.permutation(len(deficits))]
        elif order == 'deficit_large_small':
            return sorted(deficits, key=lambda a:self.get_position(a))

    def show_queue(self):
        return '\n'.join([str(tx) for tx in self.queue])

    def get_total_queued_amount(self):
        return sum([tx.amount for tx in self.queue])

    def show_accounts(self):
        return '\n'.join([str(acc)+' pos: '+str(self.get_position(acc))
                          for key, acc in self.accounts.items()])

    def get_summary(self):
        """
        Return
        # deficit parties, deficit amount, queued amount, and queue length.
        """
        return [str(len(self.get_deficits())), # n_deficit
                str(-sum(self.get_position(a) for a in self.get_deficits())), # deficit amt
                str(self.get_total_queued_amount()), # queued amount
                str(len(self.queue))] # queue length

    def __str__(self):
        """
        Show net positions, balances, # deficit parties, deficit amount,
        queued amount, and queue length.
        
        The returned string is used for logging.
        """
        positions = ','.join(map(str, [self.get_position(acc) for key, acc in
                                       self.accounts.items()]))
        balances = ','.join(map(str, [acc.balance for key, acc in
                                      self.accounts.items()]))
        return ','.join([positions, balances] + self.get_summary())


class Bilateral_EAF2(TransactionManager):
    """
    Deactivate transactions in inverse chronological order for every deficit party until
    that party has positive position
    """
    def resolve(self):
        while len(self.get_deficits()) > 0:
            for acc in self.get_deficits():
                for tx in self.get_txs(acc, 'outflows', 'reverse_chronological', 'active'):
                    self.inactivate(tx)
                    if self.get_position(acc) >= 0:
                        break
        self.settle()


class Bilateral_Inactivation(TransactionManager):
    """
    Iterate deficit parties in round-robin, for each party iterate through all outflows:
    1. find transactions that when inactivated will allow the bank to be in surplus,
    then inactivate the SMALLEST one
    2. If (1) fails then find transactions that when inactivated will not cause receiving
    party to go in deficit, then inactivate the LARGEST one
    3. If (1) and (2) both fails then inactivate the smallest outflows for minimal impact
    to other party
    Repeat until all parties is in net positive position
    """
    def resolve(self):
        while len(self.get_deficits()) > 0:
            for acc in self.get_deficits():
                outflows = self.get_txs(acc, 'outflows', status='active')
                save_self = [tx for tx in outflows if
                             self.get_position(acc) + tx.amount >= 0]
                dont_kill_other = [tx for tx in outflows if
                                   self.get_position(self.accounts[tx.receiver]) - tx.amount >= 0]
                if save_self != []:
                    self.inactivate(min(save_self, key=lambda t:t.amount))
                elif dont_kill_other != []:
                    self.inactivate(max(dont_kill_other, key=lambda t:t.amount))
                else:
                    self.inactivate(min(outflows, key=lambda t:t.amount))
        self.settle()

        
class Greedy(TransactionManager):
    """
    For each deficit party, process the largest possible (in total amount)
    combination of outbound transactions.
    As a proximation of the above, activate from the largest to smallest
    outbounds until unsolvent
    """
    def resolve(self):
        while len(self.get_deficits()) > 0:
            for acc in self.get_deficits():
                inflows = self.get_txs(acc, 'inflows', status='active')
                upperbound = sum(map(lambda t:t.amount, inflows)) + acc.balance
                activate_list = []
                for tx in self.get_txs(acc, 'outflows', 'amount_large_small', 'active'):
                    if upperbound - tx.amount >= 0:
                        activate_list.append(tx.txid)
                        upperbound -= tx.amount
                for tx in self.get_txs(acc, 'outflows', status='active'):
                    if tx.txid not in activate_list:
                        self.inactivate(tx)
        self.settle()
        

def bouncing_iter(l, key=None):
    l = np.array(l)
    if key:
        s = list(map(key, l))
        return l[np.argsort(np.abs(s-np.mean(s)))][::-1]
    else:
        return l[np.argsort(np.abs(l-np.mean(l)))][::-1]
        

class BouncingGreedy(TransactionManager):
    """
    For each deficit party, process the largest possible (in total amount)
    combination of outbound transactions.
    As a proximation of the above, activate between largest and smallest
    outbounds until solvent
    """
    def resolve(self):
        while len(self.get_deficits()) > 0:
            for acc in self.get_deficits():
                inflows = self.get_txs(acc, 'inflows', status='active')
                upperbound = sum(map(lambda t:t.amount, inflows)) + acc.balance
                activate_list = []
                for tx in bouncing_iter(self.get_txs(acc, 'outflows', status='active'),
                                        key=lambda t:t.amount):
                    if upperbound - tx.amount >= 0:
                        activate_list.append(tx.txid)
                        upperbound -= tx.amount
                for tx in self.get_txs(acc, 'outflows', status='active'):
                    if tx.txid not in activate_list:
                        self.inactivate(tx)
        self.settle()
        

def round_robin_iter(l):
    for i in range(len(l)):
        yield l[i:]+l[:i]
        

class IterativeGreedy(TransactionManager):
    """
    For each deficit party, process the largest possible (in total amount)
    combination of outbound transactions.
    As a proximation of the above, activate from the largest outbounds,
    skip if it makes the party unsolvent.
    It is like filling the jar with big stone, then smaller stone
    """
    def resolve(self):
        while len(self.get_deficits()) > 0:
            for acc in self.get_deficits():
                inflows = self.get_txs(acc, 'inflows', status='active')
                upperbound = sum(map(lambda t:t.amount, inflows)) + acc.balance
                # mini simulation to find the best activation set
                best_activation_set = []
                best_position = None # position after simulated activation. Smaller the better
                for outflows in round_robin_iter(self.get_txs(acc, 'outflows', status='active')):
                    sim_upperbound = upperbound
                    # for tx in outflows:
                    #     self.inactivate(tx)
                    activate_list = []
                    for tx in outflows:
                        if sim_upperbound - tx.amount >= 0:
                            activate_list.append(tx.txid)
                            # self.activate(tx)
                            sim_upperbound -= tx.amount
                    # simulated_position = self.get_position(acc)
                    simulated_position = sim_upperbound
                    if simulated_position == 0:
                        break
                    elif best_position is None or simulated_position < best_position:
                        best_position = simulated_position
                        # best_activation_set = self.get_txs(acc, 'outflows', status='active')
                        best_activation_set = activate_list
                # now use the best simulated setting
                for tx in self.get_txs(acc, 'outflows', status='active'):
                    if tx.txid not in best_activation_set:
                        self.inactivate(tx)
        self.settle()                

class Inactivation_Run(TransactionManager):
    def __init__(self, accounts, order='deficit_large_small'):
        super(Inactivation_Run, self).__init__(accounts)
        self.order = order

    def resolve(self):
        for acc in self.get_deficits(self.order):
            # Run 1: withholding outflows without hurting others
            outflows = self.get_txs(acc, 'outflows', 'amount_large_small', 'active')
            dont_hurt_other = [tx for tx in outflows if
                               self.get_position(self.accounts[tx.receiver])
                               - self.accounts[tx.receiver].balance - tx.amount >= 0]
            for tx in dont_hurt_other:
                self.inactivate(tx)
                if self.get_position(acc) >= 0:
                    break
            # Run 2: withholding outflows without killing others
        for acc in self.get_deficits(self.order):
            outflows = self.get_txs(acc, 'outflows', 'amount_large_small', 'active')
            dont_kill_other = [tx for tx in outflows if
                               self.get_position(self.accounts[tx.receiver]) - tx.amount >= 0]
            for tx in dont_kill_other:
                self.inactivate(tx)
                if self.get_position(acc) >= 0:
                    break
        # Run 3: save yourself by withholding outflows no matter what
        while len(self.get_deficits()) > 0:
            # Run 3a
            for acc in self.get_deficits(self.order):
                outflows = self.get_txs(acc, 'outflows', 'amount_large_small', 'active')
                for tx in outflows:
                    self.inactivate(tx)
                    if self.get_position(acc) >= 0:
                        break
            # Run 3b
            for acc in self.get_deficits(self.order):
                outflows = self.get_txs(acc, 'outflows', 'amount_large_small', 'active')
                dont_kill_other = [tx for tx in outflows if
                                   self.get_position(self.accounts[tx.receiver]) - tx.amount >= 0]
                for tx in dont_kill_other:
                    self.inactivate(tx)
                    if self.get_position(acc) >= 0:
                        break
        self.settle()
        

class Multilateral_Reinactivation(TransactionManager):
    def __init__(self, accounts, order='deficit_large_small'):
        super(Multilateral_Reinactivation, self).__init__(accounts)
        self.order = order

    def resolve(self):
        while len(self.get_deficits()) > 0:
            for acc in self.get_deficits(self.order):
                # ask for liquidity while don't kill others
                inflows = self.get_txs(acc, 'inflows', status='inactive')
                dont_kill_other = [tx for tx in inflows if
                                   self.get_position(self.accounts[tx.sender])
                                   - tx.amount >= 0]
                if dont_kill_other != []:
                    self.activate(max(dont_kill_other, key=lambda t:t.amount))
                # if still in deficit, save yourself while don't kill others
                if self.get_position(acc) < 0:
                    outflows = self.get_txs(acc, 'outflows', status='active')
                    dont_kill_other = [tx for tx in outflows if
                                       self.get_position(self.accounts[tx.receiver])
                                       - tx.amount >= 0]
                    if dont_kill_other != []:
                        self.inactivate(max(dont_kill_other, key=lambda t:t.amount))
                    else:
                        self.inactivate(min(outflows, key=lambda t:t.amount))
                # if still in deficit... save yourself no matter what
                if self.get_position(acc) < 0:
                    outflows = self.get_txs(acc, 'outflows', status='active')
                    save_self = [tx for tx in outflows if
                                 self.get_position(acc) + tx.amount >= 0]
                    if save_self != []:
                        self.inactivate(min(save_self, key=lambda t:t.amount))
                    else:
                        self.inactivate(max(outflows, key=lambda t:t.amount))
            # post-optimization: propagate surplus liquidity out until you can't
            fully_propagated = {acc_name:False for acc_name in self.accounts.keys()}
            while not all(fully_propagated.values()):
                for acc_name in [k for k,v in fully_propagated.items() if not v]:
                    acc = self.accounts[acc_name]
                    liquidity = self.get_position(acc)
                    if liquidity < 0:
                        fully_propagated[acc_name] = True
                        break
                    outflows = self.get_txs(acc, 'outflows', status='inactive')
                    for tx in outflows:
                        if tx.amount < liquidity:
                            self.activate(tx)
                            liquidity -= tx.amount
                            fully_propagated[tx.receiver] = False
                    fully_propagated[acc_name] = True
        self.settle()


class Acyclic_Propagate(TransactionManager):
    def resolve(self):
        pass

    def get_compressed_tx(self):
        """
        Build a (possiblely cyclic) graph where edges is a Transaction object that
        represent the net bilateral trade position
        """
        compressed_tx = []
        for tx in self.queue:
            if tx not in compressed_tx:
                compressed_tx.append(tx)
            else:
                compressed_tx[compressed_tx.index(tx)] += tx
        return compressed_tx

        
    
if __name__ == "__main__":
    N_SIMS = 100

    data_path = {'tx': 'data/RTGS_TXN_DETAILS.csv',
                 'bank': 'data/Multilateral - 32banks_40000txns - Final - Copy.xlsx'}
    
    # Simulator('Bilateral_EAF2',
    #           Bilateral_EAF2,
    #           data_path=data_path).simulate()

    # Simulator('Bilateral_EAF2',
    #           Bilateral_EAF2).simulate()
    
    # Simulator('Bilateral_Inactivation',
    #           Bilateral_Inactivation,
    #           n_accounts=20,
    #           min_start_bal=20,
    #           blob_size=10,
    #           resolve_every=5,
    #           rounds=100,
    #           bal_range=100,
    #           tx_range=50,
    #           n_sims=N_SIMS).simulate()

    # Simulator('Bilateral_Inactivation',
    #           Bilateral_Inactivation).simulate()
    
    # Simulator('Greedy',
    #           Greedy,
    #           n_accounts=20,
    #           min_start_bal=20,
    #           blob_size=10,
    #           resolve_every=5,
    #           rounds=100,
    #           bal_range=100,
    #           tx_range=50,
    #           n_sims=N_SIMS).simulate()

    # Simulator('Greedy',
    #           Greedy).simulate()

    # Simulator('BouncingGreedy',
    #           BouncingGreedy).simulate()
    
    # Simulator('BouncingGreedy',
    #           BouncingGreedy,
    #           n_accounts=20,
    #           min_start_bal=20,
    #           blob_size=10,
    #           resolve_every=5,
    #           rounds=100,
    #           bal_range=100,
    #           tx_range=50,
    #           n_sims=N_SIMS).simulate()

    Simulator('IterativeGreedy',
              IterativeGreedy).simulate()
    
    # Simulator('IterativeGreedy',
    #           IterativeGreedy,
    #           n_accounts=20,
    #           min_start_bal=20,
    #           blob_size=10,
    #           resolve_every=5,
    #           rounds=100,
    #           bal_range=100,
    #           tx_range=50,
    #           n_sims=N_SIMS).simulate()

    # Simulator('Inactivation_Run',
    #           Inactivation_Run,
    #           n_accounts=20,
    #           min_start_bal=20,
    #           blob_size=10,
    #           resolve_every=5,
    #           rounds=100,
    #           bal_range=100,
    #           tx_range=50,
    #           n_sims=N_SIMS).simulate()

    # Simulator('Inactivation_Run with random order',
    #           partialcls(Inactivation_Run, order='random')).simulate()
    
    # Simulator('Inactivation_Run',
    #           Inactivation_Run).simulate()

    # Simulator('Inactivation_Run with random order',
    #           partialcls(Inactivation_Run, order='random'),
    #           n_accounts=20,
    #           min_start_bal=20,
    #           blob_size=10,
    #           resolve_every=5,
    #           rounds=100,
    #           bal_range=100,
    #           tx_range=50,
    #           n_sims=N_SIMS).simulate()
    


    # Simulator('Multilateral_Reinactivation',
    #           Multilateral_Reinactivation,
    #           n_accounts=20,
    #           min_start_bal=20,
    #           blob_size=10,
    #           resolve_every=5,
    #           rounds=100,
    #           bal_range=100,
    #           tx_range=50,
    #           n_sims=N_SIMS).simulate()
    
    # Simulator('Multilateral_Reinactivation',
    #           Multilateral_Reinactivation).simulate()

    # Simulator('Multilateral_Reinactivation with random order',
    #           partialcls(Multilateral_Reinactivation, order='random'),
    #           n_accounts=20,
    #           min_start_bal=20,
    #           blob_size=10,
    #           resolve_every=5,
    #           rounds=100,
    #           bal_range=100,
    #           tx_range=50,
    #           n_sims=N_SIMS).simulate()

    # Simulator('Multilateral_Reinactivation with random order',
    #           partialcls(Multilateral_Reinactivation, order='random')).simulate()


    plt.show()
