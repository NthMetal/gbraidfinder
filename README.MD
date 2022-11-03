# GBRaidfinder

Designed to get more information from a raid than what was tweeted.

front - Frontend UI (Angular, Angular material, bootsrap grid)
back - Main backend server that gets tweets and requests updated raid info. (Nodejs, Nestjs, socket.io, rxjs)
gbr - A node microservice that runs puppeteer and has a logged in gbf account active and waiting to get info about a tweeted raid (Nodejs, Nestjs, rxjs)
k8s - kubernetes helm chart configuration for deployment (Kubernetes, Helm)

Backend gets each tweet and passes it to the user and to a cluster of alt accounts at the same time. The backend chooses the account with the smallest queue.
The logged in alt accounts make requests to get information about a raid. Sends that info to everyone subscribed to updates for that raid.

Uses Twitter API Filtered Stream v2 to get tweets

You can deploy your own version of this, free if you use minikube for a local deployment. However, it's kinda pointless if you don't have alt accounts to get the updated info.

There's still alot that could be updated, the code isn't in the best state because the architecture went through a couple iterations and I didn't clean up the code.
