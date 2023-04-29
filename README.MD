# THERE's AN IN GAME RAIDFINDER NOW AND ALL TWITTER RAIDFINDERS ARE DEAD INCLUDING THIS ONE!

# DUE TO CHANGES WITH THE TWITTER API THIS RAIDFINDER IS NO LONGER FUNCTIONAL

https://gbraidfinder.ogres.cc/home

# GBRaidfinder

<img src="https://user-images.githubusercontent.com/7328874/203625257-ad0f5736-4657-493b-908c-e782c5ba7010.gif">

Designed to get more information from a raid than what was tweeted.

* gbdist - server that listens to all raids and updates and accepts socket connections from users (Nodejs, Nestjs, socket.io, rxjs, kafkajs)
* gbr - A node microservice that runs puppeteer and has a logged in gbf account active and waiting to get info about a tweeted raid (Nodejs, Nestjs, rxjs, kafkajs)
* gbsource - server that gets tweets and sends them to redpanda (Nodejs, Nestjs, rxjs, kafkajs)
* k8s - kubernetes helm chart configuration for deployment (Kubernetes, Helm)
* redpanda - Helm chart for redpanda, taken from https://github.com/redpanda-data/helm-charts/tree/36cb1a3169c14f396924a7942dc4cfd07cfdbb22/charts/redpanda

Backend gets each tweet and passes it to the user and to a cluster of alt accounts at the same time. The backend chooses the account with the smallest queue.
The logged in alt accounts make requests to get information about a raid. Sends that info to everyone subscribed to updates for that raid.

Uses Twitter API Filtered Stream v2 to get tweets

You can deploy your own version of this, free if you use minikube for a local deployment. However, it's kinda pointless if you don't have alt accounts to get the updated info.

There's still alot that could be updated, the code isn't in the best state because the architecture went through a couple iterations and I didn't clean up the code.

## Contributing

1. Fork the repo
2. Clone it to a local directory
3. Create a branch
4. Make any neccessary changes (see "Running the Project Locally" Section)
5. Push changes to your forked repo
6. Open a pull request from your forked repo for review

For more information about contributing for the first time see here: https://github.com/firstcontributions/first-contributions/blob/main/README.md

## Running the Project Locally

### Frontend

The frontend of this project can be modified fairly easily by anyone.
You'll need to have npm and nodejs installed (preferably at latest stable version)

Open the project and cd into the `front` folder.
Run `npm install` to install dependencies. 
Run `npm start` to host a local version of the project at `localhost:4200`

Currently this will connect you to the backend that is already running without need to run the backend locally. (This may change in the future)

### Backend

To run the backend locally, you have the option to use minikube to run a local kubernetes cluster and deploy everything there using helm.

#### Using Minikube

* For this option you will need to install [docker](https://docs.docker.com/get-docker/), [minikube](https://minikube.sigs.k8s.io/docs/start/), and [helm](https://helm.sh/docs/intro/install/)

* Create a 'values.yaml' in the k8s directory and fill in at least 1 twitter api tokens, and add any account information you want to use. Use the values.example.yaml as a template.

* Note: You may also need to modify the `gbdist-service` template in `k8s/templates/gbdist-deployment.yaml`

* Install [redpanda](https://docs.redpanda.com/docs/platform/quickstart/kubernetes-qs-dev/) or kafka in your minikube cluster. 

* Install the helm chart for this project by going into the `k8s` directory and running `helm install .`

* To access chrome and log in to the accounts run `kubectl port-forward "deploy/gbr-0" 9222:9222` (incrementing values for multiple accounts ex. `kubectl port-forward "deploy/gbr-1" 9223:9222`)

* Then visit chrome://inspect/#devices and Configure as many additional ports you need. After a couple seconds it should allow you to inspect the page and log in.

* Reccomendations: I reccomend running the following in your k8s cluster: 
  * [weavescope](https://www.weave.works/docs/scope/latest/installing/#k8s) for monitoring pods more efficiently, accessing logs, and shells
  * [redpanda-console](https://github.com/redpanda-data/console/tree/master/helm) for monitoring redpanda, and checking which topics have been assigned to which topic partition
    * To install default console chart with specific brokers you can use the following command: `helm install -n redpanda redpanda-console redpanda-console/console --set-json 'console.config.kafka.brokers=["broker1:9092", "broker2:9093"]'`

#### Running Locally

* Run redpanda locally, you can use `redpanda/docker-compose.yaml` to run a cluster of three redpanda instances locally.

* Update any config files for apps you want to run (ex. `gbr/config/config.json`)

* For running gbr, you can also modify any credentials in `gbr/package.json`. 

* Alternatively you can also remove them and export the configs in your shell if running multiple instances.

* Run `npm start` to start all of the applications.

## Architecture

### Highlevel
![GBRaidfinder Prime Architecture](https://user-images.githubusercontent.com/7328874/203427171-1a6f3a73-b428-4218-a626-b74b1c75ee62.png)

### Redpanda/Kafka

Since each raid requires a minimum level to get updated info, each raid can't be distributed to every account. Therefore we create a topic for each minimum rank requirement (ex. l101, l120, l150, l151). From there accounts only get raids from topics that are less than or equal to their rank. For example a rank 160 account will get raids from l151, l150, l130, l120,... etc. But won't get raids from l170 or l200.

However, we also want to evenly distribute the raids so that one account isn't handling all of the raids for a topic. The way this is accomplished is by creating the same amount or more partitions as accounts. Raids per topic are distributed evenly per partition. For example if raid A, B, C are sent to topic l101, raid A will be sent to partition 0, raid B will be sent to partition 1, and raid C will be sent to partition 2.

From there we can assign each partition to a gbr account seperately. This is possible when the groupid of every gbr is the same. A group leader is chosen and can assign partitions to members of the group. The code for that can be found here: https://github.com/NthMetal/gbraidfinder/blob/master/gbr/src/kafka.service.ts

To do this we start by assigning the partitions for the topic with the highest ranks because those have the most restrictions and the least amount of possible accounts they can be assigned to. Each partition is assigned to the account with the least heuristic value. 

This heuristic value is calculated for an account by taking all of the currently assigned topics and multiplying the number of partitions in that topic by the current offset (which represents the amount of raids that topic gets).

The diagram below shows an example assignment withought weights.

![Blank diagram](https://user-images.githubusercontent.com/7328874/203601827-09d25dc3-28cc-4409-8087-19afc6d7b4af.png)

<details>
  <summary>
    Example weighted assignment with 10 accounts and 13 partitions:
  </summary>

Weights:
<pre>
{
  l80: '2990',
  l30: '319',
  l150: '25265',
  l120: '100499',
  l170: '3247',
  l20: '2',
  l130: '15595',
  l151: '31999',
  l200: '24856',
  l101: '58710',
  l40: '2384'
}
</pre>
Assignment (with weighted values shown):
<pre>
{
    'gbr-217-00a9ea52-3ebf-472d-9b00-8cc6dab76ffa-70d3db3e-a993-4ec1-9db7-2020bbb40d3a': { // Heuristic Value (total): 335,585
      l200: [ 0,  2,  4, 6, 8, 10, 12 ], // Weighted Value: 7 * 24856 = 173992
      l120: [ 11 ], // Weighted Value: 1 * 100499 = 100499
      l101: [ 9 ], // Weighted Value: 1 * 58710 = 58710
      l40: [ 12 ] // Weighted Value: 1 * 2384 = 2384
    },
    'gbr-206-58071966-ee27-4749-bb90-b82f0c597d11-331f2cd4-713f-4fef-a9c7-be5c039a89f4': { // Heuristic Value (total): 335,326
      l200: [ 1, 3, 5, 7, 9, 11 ], // Weighted Value: 6 * 24856 = 149136
      l130: [ 10 ], // Weighted Value: 1 * 15595 = 15595
      l120: [ 7 ], // Weighted Value: 1 * 100499 = 100499
      l101: [ 5 ], // Weighted Value: 1 * 58710 = 58710
      l80: [ 5, 9 ], // Weighted Value: 2 * 2990 = 5980
      l40: [ 1, 7 ], // Weighted Value: 2 * 2384 = 4768
      l30: [ 5, 8 ] // Weighted Value: 2 * 319 = 638
    },
    'gbr-187-be921fd0-860d-4068-b15a-7eaed3583358-8085ae9e-a35f-4219-a0de-e1a4580caf07': { // Heuristic Value (total): 335,375
      l170: [ 0, 4, 8, 12 ], // Weighted Value: 4 * 3247 = 12988
      l151: [ 4, 9 ], // Weighted Value: 2 * 31999 = 63998
      l150: [ 1, 4, 9 ], // Weighted Value: 3 * 25265 = 75795
      l130: [ 12 ], // Weighted Value: 1 * 15595 = 15595
      l120: [ 9 ], // Weighted Value: 1 * 100499 = 100499
      l101: [ 7 ], // Weighted Value: 1 * 58710 = 58710
      l40: [ 0, 2, 8 ], // Weighted Value: 3 * 2384 = 7152
      l30: [ 6, 9 ] // Weighted Value: 2 * 319 = 638
    },
    'gbr-179-797843ac-4b1b-4584-9e0d-91a701c13eda-ec720c1d-1da6-4a3c-876b-472b47b74960': { // Heuristic Value (total): 374,187
      l170: [ 1, 5, 9 ], // Weighted Value: 3 * 3247 = 9741
      l151: [ 1, 6, 11 ], // Weighted Value: 3 * 31999 = 95997
      l150: [ 5, 10 ], // Weighted Value: 2 * 25265 = 50530
      l120: [ 5 ], // Weighted Value: 1 * 100499 = 100499
      l101: [ 2, 12 ] // Weighted Value: 2 * 58710 = 117420
    },
    'gbr-178-042f43ec-ec27-4839-95a4-1872d93c6997-c5d6474b-f095-4599-b100-0a62516fda54': { // Heuristic Value (total): 335,514
      l170: [ 2, 6, 10 ], // Weighted Value: 3 * 3247 = 9741
      l151: [ 2, 7, 12 ], // Weighted Value: 3 * 31999 = 95997
      l150: [ 6, 11 ], // Weighted Value: 2 * 25265 = 50530
      l120: [ 6 ], // Weighted Value: 1 * 100499 = 100499
      l101: [ 3 ], // Weighted Value: 1 * 58710 = 58710
      l80: [ 0, 2, 4, 8, 12 ], // Weighted Value: 5 * 2990 = 14950
      l40: [ 5, 11 ], // Weighted Value: 2 * 2384 = 4768
      l30: [ 12 ] // Weighted Value: 1 * 319 = 319
    },
    'gbr-175-68c6d009-8996-40df-a64c-41492066cfe9-20e476c9-facd-41ec-9dbd-7a4f7a9657f4': { // Heuristic Value (total): 335,405
      l170: [ 3, 7, 11 ], // Weighted Value: 3 * 3247 = 9741
      l151: [ 3, 8 ], // Weighted Value: 2 * 31999 = 63998
      l150: [ 0, 3, 8 ], // Weighted Value: 3 * 25265 = 75795
      l130: [ 11 ], // Weighted Value: 1 * 15595 = 15595
      l120: [ 8 ], // Weighted Value: 1 * 100499 = 100499
      l101: [ 6 ], // Weighted Value: 1 * 58710 = 58710
      l80: [ 6, 10 ], // Weighted Value: 2 * 2990 = 5980
      l40: [ 3, 9 ], // Weighted Value: 2 * 2384 = 4768
      l30: [ 10 ] // Weighted Value: 1 * 319 = 319
    },
    'gbr-161-7806a832-01e7-4a89-a3ce-d8a649bc1b5f-c30eea20-ed03-4443-8a7a-2d1bee7d5a5a': { // Heuristic Value (total): 335,325
      l151: [ 0, 5, 10 ], // Weighted Value: 3 * 31999 = 95997
      l150: [ 2, 7, 12 ], // Weighted Value: 3 * 25265 = 75795
      l120: [ 10 ], // Weighted Value: 1 * 100499 = 100499
      l101: [ 8 ], // Weighted Value: 1 * 58710 = 58710
      l40: [ 6 ], // Weighted Value: 1 * 2384 = 2384
      l30: [ 0, 1, 2, 3, 4, 7 ], // Weighted Value: 6 * 319 = 1914
      l20: [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12 ] // Weighted Value: 13 * 2 = 26
    },
    'gbr-146-0a297ca5-ddba-430c-b0c7-3d31e113c4b1-b7346f27-b403-49c5-95b0-13c8f79acf77': { // Heuristic Value (total): 373,869
      l130: [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 ], // Weighted Value: 10 * 15595 = 155950
      l120: [ 4 ], // Weighted Value: 1 * 100499 = 100499
      l101: [ 1, 11 ] // Weighted Value: 2 * 58710 = 117420
    },
    'gbr-126-7ec4b018-668d-4f14-b997-2f4da680c057-4a1af67a-ea61-4f06-a745-f7db6744ba0b': {  // Heuristic Value (total): 360,207
        l120: [ 0, 2, 12 ], // Weighted Value: 3 * 100499 = 301497
        l101: [ 10 ] // Weighted Value: 1 * 58710 = 58710
    },
    'gbr-120-a6ac587c-a37d-4a92-ae7b-0e8739fca0bb-a488d853-4f38-4aed-b41b-fd41a31c3acc': { // Heuristic Value (total): 335,465
      l120: [ 1, 3 ], // Weighted Value: 2 * 100499 = 200998
      l101: [ 0, 4 ], // Weighted Value: 2 * 58710 = 117420
      l80: [ 1, 3, 7, 11 ], // Weighted Value: 4 * 2990 = 11960
      l40: [ 4, 10 ], // Weighted Value: 2 * 2384 = 4768
      l30: [ 11 ] // Weighted Value: 1 * 319 = 319
    }
  }
</pre>
</details>


#### Raid Lifecycle
1. Raid is tweeted and picked up by **gbsource** either through twitter or another source
2. **gbsource** determines the raid quest and level requirement to join
3. **gbsource** sends the raid message to the cooresponding level topic (the level prefixed with an "l" ex. l120)
4. **gbdist** is subscribed to all level topics and picks up the raid and sends it to users that are subscribed
5. at the same time a **gbr** that is assigned to the partition the message was sent in picks it up and gets the update (hp and other info)
6. the **gbr** that got the updated info posts that message to the "update" topic
7. **gbdist** is subscribed to the "update" topic and sends the updated info to users that got the original raid

Account Access through chrome debug port preview:

![77UklZB85J](https://user-images.githubusercontent.com/7328874/200845657-eea8cc8f-021c-40e5-ad83-507d175f4bd9.gif)
