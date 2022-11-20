Helpful commands/text

gbr-context

kubectl create namespace gbraidfinderprime

kubectl config set-context --current --namespace=gbraidfinderprime

helm create gbraidfinderprime

kubectl apply -f https://github.com/weaveworks/scope/releases/download/v1.13.2/k8s-scope.yaml
kubectl get pods -n weave
kubectl port-forward -n weave "service/weave-scope-app" 4201:80

helm install redpanda-operator redpanda/redpanda-operator \
    --namespace redpanda \
    --create-namespace \
    --set monitoring.enabled=true \
    --version v22.2.2


helm install redpanda redpanda/redpanda --namespace redpanda --create-namespace

helm repo add redpanda2 https://charts.vectorized.io/ && \
helm repo update

helm install \
  redpanda-operator \
  redpanda2/redpanda-operator \
  --namespace redpanda \
  --create-namespace \
  --version $VERSION

kubectl apply \
-n redpanda \
-f https://raw.githubusercontent.com/redpanda-data/redpanda/dev/src/go/k8s/config/samples/one_node_cluster.yaml



helm install redpanda redpanda/redpanda \
    --namespace redpanda \
    --create-namespace \
    --version 2.1.0

helm install redpanda-operator redpanda2/redpanda-operator \
    --namespace redpanda-system \
    --create-namespace \
    --set monitoring.enabled=true \
    --version v22.2.2

helm install redpanda . \
    -n redpanda \
    --create-namespace \
    --set statefulset.replicas=1
kubectl apply -f redpanda-cluster.yaml -n redpanda
helm search repo redpanda/redpanda --versions

kubectl delete all --all -n redpanda
kubectl delete all --all -n redpanda-system
helm uninstall redpanda-operator --namespace redpanda-system
helm uninstall redpanda --namespace redpanda

export POD_NAME=$(kubectl get pods --namespace redpanda -l "app.kubernetes.io/name=console,app.kubernetes.io/instance=redpanda-console" -o jsonpath="{.items[0].metadata.name}")
export CONTAINER_PORT=$(kubectl get pod --namespace redpanda $POD_NAME -o jsonpath="{.spec.containers[0].ports[0].containerPort}")
echo "Visit http://127.0.0.1:8080 to use your application"
kubectl --namespace redpanda port-forward $POD_NAME 8080:$CONTAINER_PORT

helm install redpanda-console redpanda-console/console --values values.yaml -n redpanda

helm install --namespace=gbraidfinderprime --replace gbr .
helm uninstall --namespace=gbraidfinderprime gbr

kubectl port-forward "deploy/gbr-0" 9222:9222 &

l20 
l30 
l40 
l80 
l101
l120
l130
l150
l151
l170
l200