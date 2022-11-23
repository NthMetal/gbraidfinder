https://gbraidfinder.ogres.cc/home

# GBRaidfinder

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

From there we can assign each partition to a gbr account seperately.

To do this we start by assigning the partitions for the topic with the highest ranks because those have the most restrictions and the least amount of possible accounts they can be assigned to. Each partition is assigned to the account with the least current number of assignments. This can likely be further improved in the future by biasing each topic by raid frequency because there are more raids tweeted in l101 than l20.

The diagram below shows an example assignment.

![Blank diagram](https://user-images.githubusercontent.com/7328874/203601827-09d25dc3-28cc-4409-8087-19afc6d7b4af.png)

<details>
  <summary>
    Example assignment with 10 accounts and 10 partitions:
  </summary>
<pre>
{
  'gbr-217-9830eabc-c9ea-4ef6-a28f-12c52bc124d0': {
    l200: [ 0, 2, 4, 6, 8 ],
    l150: [ 5 ],
    l130: [ 8 ],
    l80: [ 0 ],
    l40: [ 0 ],
    l30: [ 0 ],
    l20: [ 0 ]
  },
  'gbr-206-e026fbbe-f3e9-4f18-bc87-60fe1948465d': {
    l200: [ 1, 3, 5, 7, 9 ],
    l150: [ 6 ],
    l130: [ 9 ],
    l80: [ 1 ],
    l40: [ 1 ],
    l30: [ 1 ],
    l20: [ 1 ]
  },
  'gbr-187-16dee2e3-f22d-43c8-a812-80287610c0d2': {
    l170: [ 0, 4, 8 ],
    l151: [ 5 ],
    l150: [ 0, 7 ],
    l101: [ 2 ],
    l80: [ 2 ],
    l40: [ 2 ],
    l30: [ 2 ],
    l20: [ 2 ]
  },
  'gbr-179-7b89d143-f49b-4dec-a827-b8c134d07e0d': {
    l170: [ 1, 5, 9 ],
    l151: [ 6 ],
    l150: [ 1, 8 ],
    l101: [ 3 ],
    l80: [ 3 ],
    l40: [ 3 ],
    l30: [ 3 ],
    l20: [ 3 ]
  },
  'gbr-178-0bad5d7d-afe6-4920-91a7-ec62d158b725': {
    l170: [ 2, 6 ],
    l151: [ 2, 7 ],
    l150: [ 2, 9 ],
    l101: [ 4 ],
    l80: [ 4 ],
    l40: [ 4 ],
    l30: [ 4 ],
    l20: [ 4 ]
  },
  'gbr-175-c98b2cca-96a8-4f7e-b970-7800a54a2c3e': {
    l170: [ 3, 7 ],
    l151: [ 3, 8 ],
    l150: [ 3 ],
    l130: [ 5 ],
    l101: [ 5 ],
    l80: [ 5 ],
    l40: [ 5 ],
    l30: [ 5 ],
    l20: [ 5 ]
  },
  'gbr-161-37fee068-9c72-469c-94af-114c3d79d7d2': {
    l151: [ 0, 1, 4, 9 ],
    l150: [ 4 ],
    l130: [ 6 ],
    l101: [ 6 ],
    l80: [ 6 ],
    l40: [ 6 ],
    l30: [ 6 ],
    l20: [ 6 ]
  },
  'gbr-146-879e9ad4-8f9c-4dac-a8df-3b759ca454a5': {
    l130: [ 0, 1, 2, 3, 4, 7 ],
    l101: [ 7 ],
    l80: [ 7 ],
    l40: [ 7 ],
    l30: [ 7 ],
    l20: [ 7 ]
  },
  'gbr-126-0657a470-1bf6-4520-982e-2875d89da7c9': {
    l120: [ 0, 2, 4, 6, 8 ],
    l101: [ 0, 8 ],
    l80: [ 8 ],
    l40: [ 8 ],
    l30: [ 8 ],
    l20: [ 8 ]
  },
  'gbr-120-a1f296e4-2f47-4834-bcf2-38c431406019': {
    l120: [ 1, 3, 5, 7, 9 ],
    l101: [ 1, 9 ],
    l80: [ 9 ],
    l40: [ 9 ],
    l30: [ 9 ],
    l20: [ 9 ]
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
