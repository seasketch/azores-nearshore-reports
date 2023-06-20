#!/bin/bash

# Use to run the genFgb.sh script directly from your local machine
# Run from data folder
# Example command: bin/runGenFgb.sh dist dist ous_demographics.json ous_demographics 'SELECT * FROM azoresAnonymizedShapes' -explodeCollections

inPath=$1
outPath=$2
inFile=$3
outFile=$4
query=$5
explodeOption=$6

docker run --rm -v "$(bin/readlink.sh ${inPath})":/data/in -v "$(bin/readlink.sh ${outPath})":/data/out -v "$(bin/readlink.sh bin)":/data/bin seasketch/geoprocessing-workspace /data/bin/genFgb.sh /data/in/${inFile} /data/out ${outFile} "${query}" ${explodeOption}