https://gbraidfinder.ogres.cc/home

# GBRaidfinder

Designed to get more information from a raid than what was tweeted.

* front - Frontend UI (Angular, Angular material, bootsrap grid)
* back - Main backend server that gets tweets and requests updated raid info. (Nodejs, Nestjs, socket.io, rxjs)
* gbr - A node microservice that runs puppeteer and has a logged in gbf account active and waiting to get info about a tweeted raid (Nodejs, Nestjs, rxjs)
* k8s - kubernetes helm chart configuration for deployment (Kubernetes, Helm)

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

![GB Raidfinder Architecture (1)](https://user-images.githubusercontent.com/7328874/200879189-95e078ac-307f-4c2c-9604-6afed6913dbb.png)

Account Access through chrome debug port preview:

![77UklZB85J](https://user-images.githubusercontent.com/7328874/200845657-eea8cc8f-021c-40e5-ad83-507d175f4bd9.gif)
