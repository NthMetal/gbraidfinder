
# Helm Chart for gbraidfinder

## Helpful commands

kubectl delete all --all -n gbr-context && helm uninstall --namespace=gbr-context gbr

helm install --namespace=gbr-context --replace gbr .

helm template .

kubectl delete deploy raidfinder
kubectl apply -f ./templates/raidfinder-deployment.yaml

aws ecr get-login-password --region us-east-2 | do docker login --username AWS --password-stdin 833642098503.dkr.ecr.us-east-2.amazonaws.com
aws ecr get-login-password --region us-east-2 | docker login --username AWS --password-stdin 833642098503.dkr.ecr.us-east-2.amazonaws.com
docker tag d2018a50b26a 833642098503.dkr.ecr.us-east-2.amazonaws.com/gbr-containers:0.0.5
docker push 833642098503.dkr.ecr.us-east-2.amazonaws.com/gbr-containers:0.0.5

kubectl expose --namespace=gbr-context deployment raidfinder --type=LoadBalancer --port=3000 --target-port=3000 --name=raidfinder-service2

  // curl -k -H "Content-Type: application/json" -X POST http://afe2adbec799b4028a87105169e19b8c-535904035.us-east-2.elb.amazonaws.com:3001/3001/account/status
  // curl -k -H "Content-Type: application/json" -X POST http://a7174514fecf84321afff14ac8f28bfb-1968052504.us-east-2.elb.amazonaws.com:3000/account/status
  // curl -k -H "Content-Type: application/json" -X POST http://a7174514fecf84321afff14ac8f28bfb-1968052504.us-east-2.elb.amazonaws.com:3000/account/set -d "{\"username\":\"username@email.here\", \"password\":\"passwordhere\", \"rank\": 111}"
  // curl -k -H "Content-Type: application/json" -X POST http://localhost:3000/account/status
  // curl -k -H "Content-Type: application/json" -X POST http://localhost:3000/account/set -d "{\"username\":\"username@email.here\", \"password\":\"passwordhere\", \"rank\": 111}"
  // curl -k -H "Content-Type: application/json" -X POST http://localhost:3001/initializeBrowser
  // curl -k -H "Content-Type: application/json" -X POST http://localhost:3000/initializeLogin
  // curl -k -H "Content-Type: application/json" -X POST http://localhost:3000/initializeManually
  // curl -k -H "Content-Type: application/json" -X POST http://localhost:3001/1/getRaidInfo -d "{\"battleKey\":\"80A65145\"}"

  // curl -k -H "Content-Type: application/json" -X POST http://gbr-service-0:3001/1/account/status
  // curl -k -H "Content-Type: application/json" -X POST http://gbr-service-5:3001/1/account/set -d "{\"username\":\"username@email.here\", \"password\":\"passwordhere\", \"rank\": 111}"
  // curl -k -H "Content-Type: application/json" -X POST http://gbr-service-8:3001/1/getRaidInfo -d "{\"battleKey\":\"5C940415\"}"