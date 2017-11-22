# Project Ubin Phase 2 - Quorum

This repository contains the source code and test scripts for the Quorum prototype in Project Ubin Phase 2.

Ubin Phase 2 is a collaborative design and rapid prototyping project, exploring the use of Distributed Ledger Technologies (DLT) for Real-Time Gross Settlement. 
* Read the **Project Ubin Phase 2 Report** [here](http://bit.ly/ubin2017rpt).
* For more detailed documentation, refer to the Technical Reports: [Overview](https://github.com/project-ubin/ubin-docs/blob/master/UbinPhase2-Overview.pdf), [Quorum](https://github.com/project-ubin/ubin-docs/blob/master/UbinPhase2-Quorum.pdf) and [Testing](https://github.com/project-ubin/ubin-docs/blob/master/UbinPhase2-Testing.pdf).

The Quorum smart contract code is written in Solidity and the API layer is written in JavaScript.

Additional notes:
* An external service (mock RTGS service) is to be deployed for Pledge and Redeem functions. It can be found in the [`ubin-ext-service`](https://github.com/project-ubin/ubin-ext-service)
* A common UI can be found in the [`ubin-ui`](https://github.com/project-ubin/ubin-ui) repository. 

# Quorum Network Setup

## A. Install Pre-requisites

1\.	Provision 14 Ubuntu (Xenial - LTS 16.04) VMs (11 banks, 1 MAS central bank, 1 MAS Regulatory Node, 1 deployment, 16GB, 2 cores)

2\.	A static IP address has to be configured for all the VMs

3\. Node v8.x.x is installed for all the VMs

4\. Npm v5.x.x is installed for all the VMs

5\. Java 8 installed in Central Bank VM

6\.	Confirm these ports are opened in the firewall rules

```
raft-http                           TCP 40000
geth-communicationNode              TCP 50000
geth-node                           TCP 20000
DEVp2p                              TCP 30301
constellation-network               TCP 9000
rpc                                 TCP 20010
API                                 TCP 3000
```


7\. SSH into the VM
Tip: Merge your pub key into the ~/.ssh/authorized_keys for seamless login

8\. Clone the installation setups/binaries from git repo 
https://github.com/project-ubin/ubin-quorum-setup.git, your directory structure should look like below

```sh
$ cd ~/ubin-quorum-setup
$ ls
binaries
```

9\. End any running instances of Geth and constellation instances on all the VMs

```sh
$ cd ~/ubin-quorum-setup/binaries/setup
$ ./cleanup_process.sh
```

10\. Install core prerequisites

```sh
$ cd ~/ubin-quorum-setup/binaries/setup
# Important! there is a space between the two periods

$ . ./setup_full.sh 
```

11\. Confirm installation

```sh
$ ls ubin-quorum-setup/binaries
constellation	geth
quorum-genesis	QuorumNetworkManager
setup         	
```

## B. Configure Quorum nodes using Quorum Network Manager (QNM)
Preparation for setting up new Quorum Raft network:

The VM setup for this document assumes VM nx01 is the Coordinator node and MAS Regulator node.

### 1.	Pre-requisites to be executed on all the nodes 
```sh
$ cd ~/ubin-quorum-setup/binaries/setup
$ ./cleanup_process.sh
$ ps -alef | grep geth # you should not see any geth instances running
$ ps -alef | grep constellation # you should not see any constellation instances running
$ cd ~/ubin-quorum-setup/binaries/QuorumNetworkManager

# if you are doing a re-setup and you will need to reattach to the existing screen instance
$ screen -r

# if you are doing a setup for the first time or if the screen process has been killed, execute the below
$ screen node index.js

```

### 2.	Configure coordinating node
1\. Identify the coordinator node, this is the node that all the participating nodes will join. This is the MAS Regulator node for Project Ubin - in this guide it will be named " nx01".

```sh
# Quorum Network Manager open, proceed only if ip address available.
# Type in the server name for the nodeName in the four character, this is only used for reference
# format nx01 - nx15
prompt: localIpAddress: (1.2.3.4)
prompt: nodeName: nx01
```

2\. Close any running instances of geth and constellation by selecting option 5.

```sh
prompt: nodeName: nx01
Please select an option:
1) Raft
2) QuorumChain
5) Kill all geth and constellation
prompt: option: 5
```

3\. In the menu select option 1, "Raft"

```sh
prompt: localIpAddress: (1.2.3.4)
prompt: nodeName: nx01
Please select an option:
1) Raft
2) QuorumChain
5) Kill all geth and constellation
prompt: option: 1
```

4\. Copy the IP address (this will be used when we configure the non-coordinating node)
Select 1, "Start a node as the setup coordinator"

```sh
Please select an option below:
----- Option 1 and 2 are for the initial setup of a raft network -----
1) Start a node as the setup coordinator [Ideally there should only be one coordinator]
2) Start a node as a non-coordinator
----- Option 3 is for joining a raft network post initial setup -----
3) Join a raft network if you were not part of the initial setup
4) TODO: Start whisper services and attach to already running node
5) killall geth constellation-node
0) Quit
prompt: option: 1

```

5\. Select 1, "Allow anyone to connect"

```sh
Please select an option below:
1) Allow anyone to connect
2) [TODO] Allow only people with pre-auth tokens to connect
prompt: option: 1
```

6\. Select 1, "Clear all files..."
 
```sh
Please select an option below:
1) Clear all files/configuration and start from scratch[WARNING: this clears everything]
2) Keep old files/configuration intact and start the node + whisper services
prompt: option: 1
[*] Starting new node...
Generating node key
enode: enode://b05e6feb06c36196bba57ca5e324f888b2c12f63e00503fbcc247d56f42cea2c8017cda9c90fca6381f8936582b1a5bcf3148c91891a22762665c6f33c8f0e16@52.187.61.155:20000
[*] Starting communication node...
[*] RPC connection established, Node started
Please wait for others to join. Hit any key + enter once done.
prompt: done:

```

7\. A message will appear that it is waiting for new nodes to join; at this point, participating nodes can join in. Go to Section 3 (Steps for Participating nodes (non-coordinator)) and execute the steps for each node you want to add. Return to this section and continue with the next step once you have finished adding all the new nodes.

*** Only do the next step once all the nodes have joined in ***

8\. Once all nodes have joined, press Enter to create the network config files.
Wait until all nodes have responded then press Ctrl+A+D to detach from the screen.


### 3. Steps for Participating nodes (non-coordinator)
Ensure Section 1: Pre-requisites are executed

1\.	Give the node a name (e.g. "nx02"), this name has to be unique.

```sh
prompt: localIpAddress: (1.2.3.5)
prompt: nodeName: nx02
```

2\.	Select 1, "Raft"

```sh
prompt: localIpAddress: (1.2.3.5)
prompt: nodeName: nx02
Please select an option:
1) Raft
2) QuorumChain
5) Kill all geth and constellation
prompt: option: 1
```

3\. Select 2, "Start a node as a non-coordinator"

```sh
Please select an option below:
----- Option 1 and 2 are for the initial setup of a raft network -----
1) Start a node as the setup coordinator [Ideally there should only be one coordinator]
2) Start a node as a non-coordinator
----- Option 3 is for joining a raft network post initial setup -----
3) Join a raft network if you were not part of the initial setup
4) TODO: Start whisper services and attach to already running node
5) killall geth constellation-node
0) Quit
prompt: option: 2
```

4\.	Select 1, "Clear all files..."

```sh
Please select an option below:
1) Clear all files/configuration and start from scratch[WARNING: this clears everything]
2) Keep old files/configuration intact and start the node + whisper services
prompt: option: 1
```

5\.	Enter the IP address of the coordinating node.

```sh
In order to join the network, please enter the ip address of the coordinating node
prompt: ipAddress: 1.2.3.4
```

6\.	After a short moment, a message should appear that the node has joined.

```sh
[*] Starting new node...
Account: 0xed0b370fc5d85293ed6278bfd2da15dae23f9879
Generating node key
enode: enode://0795cf843077067f740142548098dc7a01046fe9ac958984ee6ca923816e7c14ec32d98eb7816c55fcda7cd914b70bae3dca6c62063884900d7490acf40dcd7d@52.187.57.112:20000
[*] Joining communication network...
[*] RPC connection established, Node started
true
[*] Communication network joined
[*] Requesting network membership. This will block until the other node responds
[*] Network membership: ACCEPTED
[*] Requesting genesis block config. This will block until the other node is online

```

7\. The node setup is complete. Repeat the steps above for each node that will be part of the Quorum network. Detach from the screen sessions using key combos Ctrl+A+D.

8\. Confirm network setup by connecting to the geth console from within the same directory and examining the number of peers the node is connected to. The number should be total number of nodes - 1 to exclude the current node.

```sh
# if not already in this directory
$ cd ~/ubin-quorum-setup/binaries/QuorumNetworkManager
# execute script to attach to the local geth console
$ ./attachToLocalQuorumNode.sh
```

In the resulting geth console, execute command `admin.peers.length` to see the number of connected peers.

```sh
Welcome to the Geth JavaScript console!

instance: Geth/v1.5.0-unstable-f4adbc2e/linux/go1.7.3
coinbase: 0x517424387f40b6e7406ee33be7ac31700012d762
at block: 3656 (Fri, 11 Feb 47846936856 07:04:31 UTC)
 datadir: /home/azureuser/ubin-quorum-setup/binaries/QuorumNetworkManager/Blockchain
 modules: admin:1.0 debug:1.0 eth:1.0 net:1.0 personal:1.0 quorum:1.0 raft:1.0 rpc:1.0 shh:1.0 txpool:1.0 web3:1.0 zsl:1.0

> admin.peers.length
13
> 
```

9\. When all nodes have been added, return to Section 2, Step 8 to complete the network setup from the coordinator VM.


Once the coordinator steps have been completed and you have detacted from screen (Ctrl+A+D) in each of the VMs, the Raft Quorum network setup is complete.


# C. Contract Deployment
The VM setup for this document assumes the following:
VM nx01 – Coordinator node and MAS Regulator node
VM nx11 – Deployment node where smart contracts will be deployed from

If a new Quorum network has been setup by executing the steps from section B, make sure to run through steps 1 & 2, otherwise skip to step 3.

1\. Copy the network configuration (`networkNodeInfo.js`) from the coordinator node’s QuorumNetworkManager directory to the deployment node’s `ubin-quorum` directory.

2\.	Generate the Quorum configuration (from deployment node)

```sh
$ cd ~/ubin-quorum/
$ node convertConfig.js
```

3\.	Deploy contracts to the network.

```sh
$ cd ~/ubin-quorum/
$ ./deploy.sh
```

### Initialise Bank Balance
Initialise the bank stashes and balances

```sh
$ cd ~/ubin-quorum/test-scripts
$ ./initStash.sh 10 2000 3000 4000 5000 6000 7000 8000 9000 1000 1200 1400 1500
# Gridlock queue depth = 10
# Initialise bank balances for different banks = 2000 3000 4000 5000 6000 7000 8000 9000 1000 1200 1400 1500
```

The smart contracts have been deployed and initialised with balances.

### Reset Network
1\. To reset the banks and clear all transactions, new contracts must be deployed.

```sh
$ cd ~/ubin-quorum/
$ ./deploy.sh
```

2\. Once the contracts have been deployed, the stashes can be initialised.

```sh
$ cd ~/ubin-quorum/test-scripts
$ ./initStash.sh 10 2000 3000 4000 5000 6000 7000 8000 9000 1000 1200 1400 1500
# Grid lock queue depth = 10
# Initialise bank balances for different banks = 2000 3000 4000 5000 6000 7000 8000 9000 1000 1200 1400 1500
```

3\. Finally, the API servers must be updated with the latest contract definitions. Follow the steps in the next section "Starting the DApp"


# D. DApp Setup
### Initial Setup of DApp
1\. Each bank VM node will need to be setup with its own DApp instance. Within each VM, go to the home directory
2\. Clone the git repo for the DApp to each bank VM and the deployment node. You may need to provide your credentials.

```sh
$ git clone https://github.com/project-ubin/ubin-quorum.git
```

3\.	Go into the newly created directory on each server.

```sh
$ cd ubin-quorum
```

4\.	Install dependencies

```sh
$ npm install
```

### Starting the DApp
Launching the DApp requires loading the configuration file for the current network, smart contract ABI files (generated with each deployment), and launching the node server itself on each VM.  The `start-api.sh` script does this for each node in the network.

1\.	From the Deployment node, run the start script that launches the API servers on each of the VMs in the Quorum network.

```sh
$ cd ~/ubin-quorum
$ ./start-api.sh
```

2\.	In each VM running an API server, check the log file to make sure there are no errors

```sh
$ cd ~
$ cat api.log # Outputs the contents of the log file
$ tail -100f api.log  # Alternatively, run this to see live logging
```

3\.	To stop the DApp manually run the following command.

```sh
$ pkill -9 node
```

# E. Setup Ubin External Service

Ubin external service should be set up in the `Central Bank` virtual machine. This is a mock service of the current RTGS system, MEPS+. 

#### Build

1\. Clone the repository locally

```sh
$ git clone https://github.com/project-ubin/ubin-ext-service.git
```
2\. Go to newly created folder

```sh
$ cd ubin-ext-service
```

3\. Build project using gradle

```sh
$ ./gradlew build
```
4\. Build artifact can be found at

    build/libs/ubin-ext-service-0.0.1-SNAPSHOT.jar

### Start External Service
1\. Update the `application.properties` file 
```sh
ubin-ext-service/application.properties
```
With Quorum configurations:

```sh
PledgeURI=http://quorumnx02.southeastasia.cloudapp.azure.com:9001/api/fund/pledge
RedeemURI=http://quorumnx02.southeastasia.cloudapp.azure.com:9001/api/fund/redeem 
Dlt=Quorum  
```

Note:

- `quorumnx02.southeastasia.cloudapp.azure.com` is the Central Bank domain name in the current network.

2\. Copy built JAR artifact and properties files to the Central Bank VM
```shM
ubin-ext-service/build/libs/ubin-ext-service-0.0.1-SNAPSHOT.jar
ubin-ext-service/application.properties
```
Note: Ensure both files are in the same directory

3\. From Central Bank VM, start the mock service application
```sh
$ java -jar -Dspring.config.location=application.properties -Dserver.port=9001 ubin-ext-service-0.0.1-SNAPSHOT.jar
```

# Troubleshooting Guide

### A. “Waiting for RPC….. “
During the QNM setup, if you notice “waiting for RPC” as infinite loop, do the following on all the nodes

1\. Kill any running screens

```
control + c
killall -9 screen
killall -9 node
```

2\. Kill any geth and constellation

```
cd ~/ubin-quorum-setup/binaries/setup
./cleanup_process.sh
```

### B. Duplicate network joined message
While using the QNM, if the console indicates duplicate network joined messages (example as below)

```
[*] Starting communication node...
[*] RPC connection established, Node started
Please wait for others to join. Hit any key + enter once done.
prompt: done:  2 has joined the network
3 has joined the network
4 has joined the network
5 has joined the network
5 has joined the network
6 has joined the network
7 has joined the network
8 has joined the network
8 has joined the network
8 has joined the network
9 has joined the network
8 has joined the network
8 has joined the network
8 has joined the network
8 has joined the network
8 has joined the network
10 has joined the network
8 has joined the network
8 has joined the network
8 has joined the network
8 has joined the network
12 has joined the network
```

You need to do the following

1\. Stop geth and constellation on all the servers

```
cd ~/ubin-quorum-setup/binaries/setup
./cleanup_process.sh
```

2\. Check if the ports used by geth and constellation are closed

```
netstat -n | grep 8545
netstat -n | grep 2200
```

3\. If yes, execute the following

```
sleep 10
cd ~/ubin-quorum-setup/binaries/setup
./cleanup_process.sh
```

Note, port clearing on the server may take longer, can take up to a few minutes

### C. During network setup, “quorum-genesis is not found"
1\. Navigate to the respective folder
```
cd ~/ubin-quorum-setup/binaries/quorum-genesis
sudo npm -g install
```

2\. Confirm the installation by executing the below statement
```
$ which quorum-genesis
# should print  /usr/bin/quorum-genesis
```

### D. During Quorum network setup using QNM, if you encounter screen crash, do the following
```
cd ~/ubin-quorum-setup/binaries/QuorumNetworkManager
npm install
```

### E. VM server IP changes from last network setup
If the IP address changes for a server, the Quorum network will need to be re-setup. Follow the steps from above “B. Configure Quorum nodes using Quorum Network Manager (QNM)”.

### F. If a bank node crashes, the Quorum network will need to be re-setup and contracts redeployed.
Follow the steps from “B. Configure Quorum nodes using Quorum Network Manager (QNM)”.


# Test Scripts

[Postman](https://www.getpostman.com/) is the main testing tool used for this prototype. The Postman collection and environments are located in the [tests](tests/postman) folder in this repository. The API definitions can be found in the [Technical Report repository](https://github.com/project-ubin/ubin-docs/blob/master/api/UbinPhase2-QuorumAPI.pdf).


# License 
 
Copyright 2017 The Association of Banks in Singapore
 
   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at
 
     http://www.apache.org/licenses/LICENSE-2.0
 
   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
