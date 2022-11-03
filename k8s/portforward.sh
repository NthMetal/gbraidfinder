#!/bin/bash

# Bash script for forwarding multiple chrome debug ports

accounts=8
pids=()

x=0
while [ $x -le $accounts ]
do
    port=$(( 9222 + $x ))
    kubectl port-forward "deploy/gbr-$x" $port:9222 &
    pid=$!
    echo $pid
    pids+=($pid)
    x=$(( $x + 1 ))
done

kill_all () {
    echo 'killing all port forwards'
    for i in "${pids[@]}"
    do : 
        echo "killing $i"
        kill $i
    done
}

echo ${pids[@]}
trap '{
    kill_all
}' EXIT

read
