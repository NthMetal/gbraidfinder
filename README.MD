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

## Architecture

### Highlevel
![GBRaidfinder Prime Architecture](https://user-images.githubusercontent.com/7328874/203427171-1a6f3a73-b428-4218-a626-b74b1c75ee62.png)

### Redpanda/Kafka

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
